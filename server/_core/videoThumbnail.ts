/**
 * Video thumbnail extraction helper
 * Generates thumbnail images from video URLs at specified timestamps
 */

export interface ThumbnailOptions {
  videoUrl: string;
  timestamp?: number; // seconds, default 5
  width?: number; // default 1280
  height?: number; // default 720
}

export interface ThumbnailResult {
  url: string | null;
  error?: string;
}

/**
 * Extract a thumbnail from a video URL
 * Uses the Manus Forge API to generate thumbnails
 */
export async function extractVideoThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    const { videoUrl, timestamp = 5, width = 1280, height = 720 } = options;

    // Validate video URL
    if (!videoUrl || !videoUrl.startsWith("http")) {
      return { url: null, error: "Invalid video URL" };
    }

    // Use Manus Forge API for thumbnail extraction
    const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";
    const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

    if (!FORGE_API_KEY) {
      return { url: null, error: "Forge API key not configured" };
    }

    // Call Manus Forge API for video thumbnail
    const response = await fetch(`${FORGE_API_URL}/v1/media/video-thumbnail`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FORGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl,
        timestamp,
        width,
        height,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { url: null, error: `Forge API error: ${response.status} - ${error}` };
    }

    const data = await response.json() as { url?: string; error?: string };

    if (data.url) {
      return { url: data.url };
    }

    return { url: null, error: data.error || "No thumbnail URL returned" };
  } catch (err: any) {
    return { url: null, error: err.message || "Unknown error" };
  }
}

/**
 * Extract thumbnail and return as data URL for immediate use
 * Falls back to a solid color if extraction fails
 */
export async function extractVideoThumbnailAsDataUrl(videoUrl: string): Promise<string> {
  try {
    const result = await extractVideoThumbnail({ videoUrl });
    if (result.url) {
      return result.url;
    }
  } catch {
    // Fall through to default
  }

  // Return a default placeholder color (dark gray)
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Crect fill='%23333' width='1280' height='720'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='%23999' text-anchor='middle' dominant-baseline='middle'%3EVideo Thumbnail%3C/text%3E%3C/svg%3E";
}
