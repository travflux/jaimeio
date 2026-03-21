import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateVideo } from "./_core/videoGeneration";

// Mock dependencies
vi.mock("./_core/videoGeneration");

describe("Article Video Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate video from article prompt", async () => {
    const mockResult = { url: "https://example.com/video.mp4" };
    vi.mocked(generateVideo).mockResolvedValue(mockResult);

    const result = await generateVideo({
      prompt: "Test news headline",
      duration: 5,
      aspectRatio: "16:9",
    });

    expect(result.url).toBe("https://example.com/video.mp4");
    expect(generateVideo).toHaveBeenCalledWith({
      prompt: "Test news headline",
      duration: 5,
      aspectRatio: "16:9",
    });
  });

  it("should handle different aspect ratios", async () => {
    const mockResult = { url: "https://example.com/video.mp4" };
    vi.mocked(generateVideo).mockResolvedValue(mockResult);

    await generateVideo({
      prompt: "Test",
      duration: 10,
      aspectRatio: "9:16",
    });

    expect(generateVideo).toHaveBeenCalledWith({
      prompt: "Test",
      duration: 10,
      aspectRatio: "9:16",
    });
  });

  it("should handle different durations", async () => {
    const mockResult = { url: "https://example.com/video.mp4" };
    vi.mocked(generateVideo).mockResolvedValue(mockResult);

    await generateVideo({
      prompt: "Test",
      duration: 30,
      aspectRatio: "16:9",
    });

    expect(generateVideo).toHaveBeenCalledWith({
      prompt: "Test",
      duration: 30,
      aspectRatio: "16:9",
    });
  });

  it("should handle generation errors", async () => {
    vi.mocked(generateVideo).mockRejectedValue(new Error("Generation failed"));

    await expect(
      generateVideo({
        prompt: "Test",
        duration: 5,
        aspectRatio: "16:9",
      })
    ).rejects.toThrow("Generation failed");
  });
});
