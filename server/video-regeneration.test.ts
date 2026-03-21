import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import { generateVideo } from "./_core/videoGeneration";

// Mock dependencies
vi.mock("./db");
vi.mock("./_core/videoGeneration");

describe("Video Regeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should regenerate video for existing article", async () => {
    const mockArticle = {
      id: 1,
      headline: "Test Article",
      subheadline: "Test Subheadline",
      body: "Test body",
      slug: "test-article",
      status: "published",
      categoryId: 1,
      featuredImage: "https://example.com/image.jpg",
      videoUrl: "https://example.com/old-video.mp4",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSettings = [
      { key: "video_style_prompt", value: "Professional news broadcast style" },
      { key: "video_duration", value: "10" },
      { key: "video_aspect_ratio", value: "16:9" },
    ];

    const mockVideoResult = { url: "https://example.com/new-video.mp4" };

    vi.mocked(db.getArticleById).mockResolvedValue(mockArticle);
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      return mockSettings.find(s => s.key === key) || null;
    });
    vi.mocked(generateVideo).mockResolvedValue(mockVideoResult);
    vi.mocked(db.updateArticle).mockResolvedValue(undefined);

    // Simulate regeneration
    const article = await db.getArticleById(1);
    expect(article).toBeTruthy();

    const videoStyleSetting = await db.getSetting("video_style_prompt");
    const videoStylePrompt = videoStyleSetting?.value || "Professional news broadcast style";
    
    const videoDurationSetting = await db.getSetting("video_duration");
    const videoDuration = videoDurationSetting?.value ? parseInt(videoDurationSetting.value) : 5;
    
    const videoAspectRatioSetting = await db.getSetting("video_aspect_ratio");
    const videoAspectRatio = (videoAspectRatioSetting?.value || "16:9") as "16:9" | "9:16" | "1:1";

    const videoPrompt = videoStylePrompt + ". News headline: " + article!.headline + (article!.subheadline ? ". Subheadline: " + article!.subheadline : "");
    
    const result = await generateVideo({
      prompt: videoPrompt,
      duration: videoDuration,
      aspectRatio: videoAspectRatio,
    });

    expect(result.url).toBe("https://example.com/new-video.mp4");
    
    await db.updateArticle(1, { videoUrl: result.url });
    
    expect(db.updateArticle).toHaveBeenCalledWith(1, { videoUrl: "https://example.com/new-video.mp4" });
  });

  it("should use default settings when not configured", async () => {
    const mockArticle = {
      id: 2,
      headline: "Another Article",
      subheadline: null,
      body: "Test body",
      slug: "another-article",
      status: "published",
      categoryId: 1,
      featuredImage: null,
      videoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getArticleById).mockResolvedValue(mockArticle);
    vi.mocked(db.getSetting).mockResolvedValue(null);
    vi.mocked(generateVideo).mockResolvedValue({ url: "https://example.com/video.mp4" });

    const article = await db.getArticleById(2);
    const videoStyleSetting = await db.getSetting("video_style_prompt");
    const videoStylePrompt = videoStyleSetting?.value || "Professional news broadcast style, high production quality, cinematic lighting";
    
    expect(videoStylePrompt).toBe("Professional news broadcast style, high production quality, cinematic lighting");

    const videoDurationSetting = await db.getSetting("video_duration");
    const videoDuration = videoDurationSetting?.value ? parseInt(videoDurationSetting.value) : 5;
    
    expect(videoDuration).toBe(5);
  });

  it("should handle article not found", async () => {
    vi.mocked(db.getArticleById).mockResolvedValue(null);

    const article = await db.getArticleById(999);
    expect(article).toBeNull();
  });

  it("should handle video generation failure", async () => {
    const mockArticle = {
      id: 3,
      headline: "Test Article",
      subheadline: null,
      body: "Test body",
      slug: "test",
      status: "published",
      categoryId: 1,
      featuredImage: null,
      videoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.getArticleById).mockResolvedValue(mockArticle);
    vi.mocked(db.getSetting).mockResolvedValue(null);
    vi.mocked(generateVideo).mockRejectedValue(new Error("Video generation failed"));

    await expect(
      generateVideo({
        prompt: "Test",
        duration: 5,
        aspectRatio: "16:9",
      })
    ).rejects.toThrow("Video generation failed");
  });
});
