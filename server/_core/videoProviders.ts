/**
 * Multi-provider video generation system
 * Supports internal (Manus) and external (OpenAI, Replicate, custom) providers
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import * as db from "../db";

export type VideoGenerationOptions = {
  prompt: string;
  duration?: number; // seconds (default: 5)
  aspectRatio?: "16:9" | "9:16" | "1:1"; // default: 16:9
};

export type VideoGenerationResponse = {
  url: string;
  provider: string;
  duration?: number;
};

// ─── Provider Interface ─────────────────────────────────────────────────────

interface VideoProvider {
  name: string;
  generate(options: VideoGenerationOptions): Promise<{ url: string; duration?: number }>;
}

// ─── Built-in Manus Provider ────────────────────────────────────────────────

class ManusVideoProvider implements VideoProvider {
  name = "manus";

  async generate(options: VideoGenerationOptions): Promise<{ url: string; duration?: number }> {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      throw new Error("BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY is not configured");
    }

    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL("videos.v1.VideoService/GenerateVideo", baseUrl).toString();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        duration_seconds: options.duration || 5,
        aspect_ratio: options.aspectRatio || "16:9",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Manus video generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { video: { b64Json: string; mimeType: string }; duration_seconds?: number };
    const buffer = Buffer.from(result.video.b64Json, "base64");
    const { url } = await storagePut(`generated/${Date.now()}.mp4`, buffer, result.video.mimeType);
    return { url, duration: result.duration_seconds };
  }
}

// ─── OpenAI Video Provider (GPT-4 Vision + DALL-E) ────────────────────────

class OpenAIVideoProvider implements VideoProvider {
  name = "openai";

  async generate(options: VideoGenerationOptions): Promise<{ url: string; duration?: number }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // OpenAI doesn't have native video generation yet, but we can use their API for future support
    // For now, throw a helpful error
    throw new Error("OpenAI video generation is not yet available. Please use Manus or Replicate provider.");
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("video_provider_openai_api_key");
    return setting?.value || null;
  }
}

// ─── Replicate Provider (Runway, Kling, or other models) ────────────────────

class ReplicateVideoProvider implements VideoProvider {
  name = "replicate";

  async generate(options: VideoGenerationOptions): Promise<{ url: string; duration?: number }> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();
    
    if (!apiKey) {
      throw new Error("Replicate API key not configured");
    }

    // Create prediction for video generation
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        version: model,
        input: {
          prompt: options.prompt,
          duration: options.duration || 5,
          aspect_ratio: options.aspectRatio || "16:9",
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Replicate prediction creation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const prediction = (await response.json()) as { id: string; urls: { get: string } };

    // Poll for completion (max 5 minutes for video generation)
    let videoUrl: string | null = null;
    for (let i = 0; i < 150; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResp = await fetch(prediction.urls.get, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      
      if (statusResp.ok) {
        const status = (await statusResp.json()) as { 
          status: string; 
          output?: string | string[] | { url?: string };
          metrics?: { predict_time?: number };
        };
        if (status.status === "succeeded" && status.output) {
          if (typeof status.output === "string") {
            videoUrl = status.output;
          } else if (Array.isArray(status.output) && status.output.length > 0) {
            videoUrl = status.output[0];
          } else if (typeof status.output === "object" && !Array.isArray(status.output) && "url" in status.output && status.output.url) {
            videoUrl = status.output.url;
          }
          if (videoUrl) break;
        } else if (status.status === "failed") {
          throw new Error("Replicate prediction failed");
        }
      }
    }

    if (!videoUrl) {
      throw new Error("Replicate video generation timed out");
    }

    // Download and store in S3
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) {
      throw new Error(`Failed to download Replicate video: ${videoResp.status}`);
    }
    const buffer = Buffer.from(await videoResp.arrayBuffer());
    const { url } = await storagePut(`generated/${Date.now()}.mp4`, buffer, "video/mp4");
    return { url, duration: options.duration || 5 };
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("video_provider_replicate_api_key");
    return setting?.value || null;
  }

  private async getModel(): Promise<string> {
    const setting = await db.getSetting("video_provider_replicate_model");
    // Default to Runway Gen3 (high quality video generation)
    return setting?.value ?? "runway/gen-3-lite";
  }
}

// ─── Custom API Provider ────────────────────────────────────────────────────

class CustomAPIVideoProvider implements VideoProvider {
  name = "custom";

  async generate(options: VideoGenerationOptions): Promise<{ url: string; duration?: number }> {
    const apiUrl = await this.getApiUrl();
    const apiKey = await this.getApiKey();
    
    if (!apiUrl) {
      throw new Error("Custom API URL not configured");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ 
        prompt: options.prompt,
        duration: options.duration || 5,
        aspect_ratio: options.aspectRatio || "16:9",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Custom API video generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { 
      url?: string; 
      video_url?: string; 
      data?: { url: string }[];
      duration?: number;
    };
    const videoUrl = result.url || result.video_url || result.data?.[0]?.url;
    
    if (!videoUrl) {
      throw new Error("Custom API returned no video URL");
    }

    // Download and store in S3
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) {
      throw new Error(`Failed to download custom API video: ${videoResp.status}`);
    }
    const buffer = Buffer.from(await videoResp.arrayBuffer());
    const { url } = await storagePut(`generated/${Date.now()}.mp4`, buffer, "video/mp4");
    return { url, duration: result.duration || options.duration || 5 };
  }

  private async getApiUrl(): Promise<string | null> {
    const setting = await db.getSetting("video_provider_custom_api_url");
    return setting?.value || null;
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("video_provider_custom_api_key");
    return setting?.value || null;
  }
}

// ─── Provider Registry ──────────────────────────────────────────────────────

const providers: Record<string, VideoProvider> = {
  manus: new ManusVideoProvider(),
  openai: new OpenAIVideoProvider(),
  replicate: new ReplicateVideoProvider(),
  custom: new CustomAPIVideoProvider(),
};

// ─── Main Generation Function ───────────────────────────────────────────────

export async function generateVideoWithProvider(
  options: VideoGenerationOptions
): Promise<VideoGenerationResponse> {
  // Get configured provider
  const providerSetting = await db.getSetting("video_provider");
  const primaryProvider = providerSetting?.value || "manus";
  const fallbackEnabled = await db.getSetting("video_provider_fallback_enabled");
  const useFallback = fallbackEnabled?.value === "true";

  const provider = providers[primaryProvider];
  if (!provider) {
    throw new Error(`Unknown video provider: ${primaryProvider}`);
  }

  try {
    console.log(`[VideoGen] Using provider: ${provider.name}`);
    const result = await provider.generate(options);
    return { url: result.url, provider: provider.name, duration: result.duration };
  } catch (err: any) {
    console.error(`[VideoGen] ${provider.name} failed:`, err.message);
    
    // Fallback to Manus if enabled and primary provider is not Manus
    if (useFallback && primaryProvider !== "manus") {
      console.log(`[VideoGen] Falling back to Manus provider`);
      try {
        const manusProvider = providers.manus;
        const result = await manusProvider.generate(options);
        return { url: result.url, provider: "manus (fallback)", duration: result.duration };
      } catch (fallbackErr: any) {
        throw new Error(`Both ${primaryProvider} and fallback failed: ${err.message}; ${fallbackErr.message}`);
      }
    }
    
    throw err;
  }
}

// ─── Backward Compatibility ─────────────────────────────────────────────────

/**
 * Legacy generateVideo function for backward compatibility
 * Delegates to the new multi-provider system
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<{ url?: string; duration?: number }> {
  const result = await generateVideoWithProvider(options);
  return { url: result.url, duration: result.duration };
}
