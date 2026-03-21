import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractVideoThumbnail, extractVideoThumbnailAsDataUrl } from "./videoThumbnail";

// Mock fetch
global.fetch = vi.fn();

describe("Video Thumbnail Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract thumbnail from valid video URL", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ url: "https://example.com/thumbnail.jpg" }),
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await extractVideoThumbnail({
      videoUrl: "https://example.com/video.mp4",
      timestamp: 5,
    });

    expect(result.url).toBe("https://example.com/thumbnail.jpg");
    expect(result.error).toBeUndefined();
  });

  it("should handle invalid video URLs", async () => {
    const result = await extractVideoThumbnail({
      videoUrl: "not-a-url",
      timestamp: 5,
    });

    expect(result.url).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("should handle API errors", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await extractVideoThumbnail({
      videoUrl: "https://example.com/video.mp4",
    });

    expect(result.url).toBeNull();
    expect(result.error).toContain("Forge API error");
  });

  it("should use default timestamp if not provided", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ url: "https://example.com/thumbnail.jpg" }),
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    await extractVideoThumbnail({
      videoUrl: "https://example.com/video.mp4",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"timestamp":5'),
      })
    );
  });

  it("should return data URL fallback when extraction fails", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const result = await extractVideoThumbnailAsDataUrl(
      "https://example.com/video.mp4"
    );

    expect(result).toContain("data:image");
  });

  it("should return extracted URL when successful", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ url: "https://example.com/thumbnail.jpg" }),
    };

    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

    const result = await extractVideoThumbnailAsDataUrl(
      "https://example.com/video.mp4"
    );

    expect(result).toBe("https://example.com/thumbnail.jpg");
  });
});
