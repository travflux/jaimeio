/**
 * Multi-provider image generation system
 * Supports internal (Manus) and external (OpenAI, Replicate, custom) providers
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import * as db from "../db";
import { addWatermark } from "../watermark";

export type ImageGenerationOptions = {
  prompt: string;
  licenseId?: number;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type ImageGenerationResponse = {
  url: string;
  provider: string;
};

// Note: Images uploaded before Sprint 3.9 use legacy flat path "generated/".
// All new uploads use "tenant-{licenseId}/images/" prefix for isolation.
// Do not attempt to move legacy images — they still serve correctly from S3.

function tenantImageKey(licenseId?: number): string {
  const ts = Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const folder = licenseId ? "tenant-" + licenseId + "/images" : "tenant-shared/images";
  return folder + "/" + ts + ".png";
}

// ─── Provider Interface ─────────────────────────────────────────────────────

interface ImageProvider {
  name: string;
  generate(options: ImageGenerationOptions): Promise<{ url: string }>;
}

// ─── Built-in Manus Provider ────────────────────────────────────────────────

class ManusImageProvider implements ImageProvider {
  name = "manus";

  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      throw new Error("BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY is not configured");
    }

    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

    const originalImages = options.originalImages || [];

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
        original_images: originalImages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Manus image generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { image: { b64Json: string; mimeType: string } };
    let buffer = Buffer.from(result.image.b64Json, "base64");
    
    // Add watermark if enabled
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    console.log('[Image Provider] Watermark enabled check:', watermarkEnabled?.value);
    if (watermarkEnabled?.value === "true") {
      const { getWatermarkSettings } = await import("../watermark");
      const watermarkOptions = await getWatermarkSettings();
      buffer = Buffer.from(await addWatermark(buffer, watermarkOptions));
    }
    
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, result.image.mimeType);
    return { url };
  }
}

// ─── OpenAI DALL-E Provider ─────────────────────────────────────────────────

class OpenAIImageProvider implements ImageProvider {
  name = "openai";

  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Map aspect ratio setting to DALL-E 3 supported sizes
    const aspectRatioSetting = await db.getSetting("image_aspect_ratio");
    const aspectRatio = aspectRatioSetting?.value || "1:1";
    const dalleSize = aspectRatio === "16:9" ? "1792x1024"
      : aspectRatio === "9:16" ? "1024x1792"
      : "1024x1024"; // default 1:1

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: options.prompt,
        n: 1,
        size: dalleSize,
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI image generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { data: Array<{ url: string }> };
    const imageUrl = result.data[0]?.url;
    if (!imageUrl) {
      throw new Error("OpenAI returned no image URL");
    }

    // Download and store in S3
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      throw new Error(`Failed to download OpenAI image: ${imageResp.status}`);
    }
    let buffer = Buffer.from(await imageResp.arrayBuffer());
    
    // Add watermark if enabled
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    console.log('[Image Provider] Watermark enabled check:', watermarkEnabled?.value);
    if (watermarkEnabled?.value === "true") {
      const { getWatermarkSettings } = await import("../watermark");
      const watermarkOptions = await getWatermarkSettings();
      buffer = Buffer.from(await addWatermark(buffer, watermarkOptions));
    }
    
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, "image/png");
    return { url };
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_openai_api_key");
    return setting?.value || null;
  }
}

// ─── Replicate Provider ─────────────────────────────────────────────────────

class ReplicateImageProvider implements ImageProvider {
  name = "replicate";

  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();
    
    if (!apiKey) {
      throw new Error("Replicate API key not configured");
    }

    // Create prediction
    // Pass aspect_ratio to Replicate models that support it (e.g., FLUX)
    const aspectRatioSetting = await db.getSetting("image_aspect_ratio");
    const aspectRatio = aspectRatioSetting?.value || "1:1";

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
          aspect_ratio: aspectRatio,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Replicate prediction creation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const prediction = (await response.json()) as { id: string; urls: { get: string } };

    // Poll for completion (max 60 seconds)
    let imageUrl: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResp = await fetch(prediction.urls.get, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      
      if (statusResp.ok) {
        const status = (await statusResp.json()) as { status: string; output?: string | string[] };
        if (status.status === "succeeded" && status.output) {
          imageUrl = Array.isArray(status.output) ? status.output[0] : status.output;
          break;
        } else if (status.status === "failed") {
          throw new Error("Replicate prediction failed");
        }
      }
    }

    if (!imageUrl) {
      throw new Error("Replicate image generation timed out");
    }

    // Download and upload to S3 for persistence
    console.log("[ImageGen] Replicate image ready, uploading to S3...");
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error("Failed to download Replicate image: " + imageResp.status);
    let buffer = Buffer.from(await imageResp.arrayBuffer());
    
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    if (watermarkEnabled?.value === "true") {
      try {
        const { addWatermark, getWatermarkSettings } = await import("../watermark");
        const watermarkOptions = await getWatermarkSettings();
        buffer = Buffer.from(await addWatermark(buffer, watermarkOptions));
      } catch { /* watermark optional */ }
    }
    
    const { storagePut } = await import("../storage");
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, "image/png");
    console.log("[ImageGen] Replicate image saved to S3:", url.substring(0, 80));
    return { url };
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_replicate_api_key");
    return setting?.value || null;
  }

  private async getModel(): Promise<string> {
    const setting = await db.getSetting("image_provider_replicate_model");
    // Default to Flux Schnell (fast, high-quality)
    return setting?.value || "black-forest-labs/flux-schnell";
  }
}

// ─── Custom API Provider ────────────────────────────────────────────────────

class CustomAPIImageProvider implements ImageProvider {
  name = "custom";

  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
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

    // Include aspect_ratio for custom APIs that support it
    const aspectRatioSetting = await db.getSetting("image_aspect_ratio");
    const aspectRatio = aspectRatioSetting?.value || "1:1";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: options.prompt, aspect_ratio: aspectRatio }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Custom API image generation failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const result = (await response.json()) as { url?: string; image_url?: string; data?: { url: string }[] };
    const imageUrl = result.url || result.image_url || result.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error("Custom API returned no image URL");
    }

    // Download and store in S3
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      throw new Error(`Failed to download custom API image: ${imageResp.status}`);
    }
    let buffer = Buffer.from(await imageResp.arrayBuffer());
    
    // Add watermark if enabled
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    console.log('[Image Provider] Watermark enabled check:', watermarkEnabled?.value);
    if (watermarkEnabled?.value === "true") {
      const { getWatermarkSettings } = await import("../watermark");
      const watermarkOptions = await getWatermarkSettings();
      buffer = Buffer.from(await addWatermark(buffer, watermarkOptions));
    }
    
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, "image/png");
    return { url };
  }

  private async getApiUrl(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_custom_api_url");
    return setting?.value || null;
  }

  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_custom_api_key");
    return setting?.value || null;
  }
}

// ─── Provider Registry ──────────────────────────────────────────────────────

// ─── Gemini Imagen 3 Provider ──────────────────────────────────────────────
class GeminiImageProvider implements ImageProvider {
  name = "gemini";
  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error("Gemini API key not configured. Add it in Settings > Images.");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=" + apiKey,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [{ prompt: options.prompt }], parameters: { sampleCount: 1, aspectRatio: options.aspectRatio === "16:9" ? "16:9" : "1:1" } }) }
    );
    if (!response.ok) { const err = await response.text(); throw new Error("Gemini Imagen API error: " + response.status + " " + err.substring(0, 200)); }
    const data = await response.json() as any;
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error("Gemini returned no image data");
    let buffer = Buffer.from(b64, "base64");
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    if (watermarkEnabled?.value === "true") { try { const { addWatermark, getWatermarkSettings } = await import("../watermark"); buffer = Buffer.from(await addWatermark(buffer, await getWatermarkSettings())); } catch {} }
    const { storagePut } = await import("../storage");
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, "image/png");
    return { url };
  }
  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_gemini_api_key");
    return setting?.value || process.env.GEMINI_API_KEY || null;
  }
}

// ─── xAI Grok (Aurora) Provider ───────────────────────────────────────────
class GrokImageProvider implements ImageProvider {
  name = "grok";
  async generate(options: ImageGenerationOptions): Promise<{ url: string }> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error("xAI Grok API key not configured. Add it in Settings > Images.");
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({ model: "grok-2-image", prompt: options.prompt, n: 1, response_format: "url" }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error("Grok API error: " + response.status + " " + err.substring(0, 200)); }
    const data = await response.json() as any;
    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) throw new Error("Grok returned no image URL");
    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new Error("Failed to download Grok image: " + imageResp.status);
    let buffer = Buffer.from(await imageResp.arrayBuffer());
    const watermarkEnabled = await db.getSetting("watermark_enabled");
    if (watermarkEnabled?.value === "true") { try { const { addWatermark, getWatermarkSettings } = await import("../watermark"); buffer = Buffer.from(await addWatermark(buffer, await getWatermarkSettings())); } catch {} }
    const { storagePut } = await import("../storage");
    const { url } = await storagePut(tenantImageKey(options.licenseId), buffer, "image/png");
    return { url };
  }
  private async getApiKey(): Promise<string | null> {
    const setting = await db.getSetting("image_provider_grok_api_key");
    return setting?.value || process.env.XAI_API_KEY || null;
  }
}

const providers: Record<string, ImageProvider> = {
  manus: new ManusImageProvider(),
  openai: new OpenAIImageProvider(),
  replicate: new ReplicateImageProvider(),
  custom: new CustomAPIImageProvider(),
  gemini: new GeminiImageProvider(),
  grok: new GrokImageProvider(),
};

// ─── Main Generation Function ───────────────────────────────────────────────

export async function generateImageWithProvider(
  options: ImageGenerationOptions
): Promise<ImageGenerationResponse> {
  // Get configured provider.
  // IMPORTANT: The default is intentionally "none" — NOT "manus".
  // This prevents white-label deployments from accidentally consuming the
  // engine operator's Manus credits. Every deployment must explicitly choose
  // and configure its own image provider in Admin → Settings → Images.
  const providerSetting = await db.getSetting("image_provider");
  const primaryProvider = providerSetting?.value || "none";

  if (!primaryProvider || primaryProvider === "none") {
    throw new Error(
      "Image provider not configured. Go to Admin → Settings → Images and select a provider (OpenAI, Replicate, or Custom API) before generating images."
    );
  }

  const fallbackEnabled = await db.getSetting("image_provider_fallback_enabled");
  const useFallback = fallbackEnabled?.value === "true";

  const provider = providers[primaryProvider];
  if (!provider) {
    throw new Error(`Unknown image provider: ${primaryProvider}. Valid options are: openai, replicate, custom, gemini, grok.`);
  }

  try {
    console.log(`[ImageGen] Using provider: ${provider.name}`);
    const result = await provider.generate(options);
    return { url: result.url, provider: provider.name };
  } catch (err: any) {
    console.error(`[ImageGen] ${provider.name} failed:`, err.message);

    // Fallback to a secondary provider if enabled.
    // NOTE: The fallback will NOT automatically use the Manus provider unless
    // the admin has explicitly set image_provider_fallback to "manus".
    const fallbackProviderSetting = await db.getSetting("image_provider_fallback");
    const fallbackProvider = fallbackProviderSetting?.value;
    if (useFallback && fallbackProvider && fallbackProvider !== primaryProvider && providers[fallbackProvider]) {
      console.log(`[ImageGen] Falling back to provider: ${fallbackProvider}`);
      try {
        const fb = providers[fallbackProvider];
        const result = await fb.generate(options);
        return { url: result.url, provider: `${fb.name} (fallback)` };
      } catch (fallbackErr: any) {
        throw new Error(`Both ${primaryProvider} and fallback (${fallbackProvider}) failed: ${err.message}; ${fallbackErr.message}`);
      }
    }

    throw err;
  }
}

// ─── Backward Compatibility ─────────────────────────────────────────────────

/**
 * Legacy generateImage function for backward compatibility
 * Delegates to the new multi-provider system
 * Falls back to placeholder if generation fails
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<{ url?: string }> {
  try {
    // Sanitize prompt to avoid Gemini safety filter issues
    const { sanitizePrompt } = await import("./promptSanitizer");
    const sanitizedPrompt = sanitizePrompt(options.prompt);
    
    const result = await generateImageWithProvider({
      ...options,
      prompt: sanitizedPrompt,
    });
    return { url: result.url };
  } catch (err: any) {
    console.error(`[ImageGen] All providers failed:`, err.message);
    // Return undefined — article saves with featuredImage: null
    // The frontend already handles null gracefully (no broken img tag)
    return { url: undefined };
  }
}
