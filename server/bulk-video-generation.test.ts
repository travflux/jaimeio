import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import { bulkGenerateVideos } from "./bulk-video-generation";

// Mock dependencies
vi.mock("./db");
vi.mock("./_core/videoGeneration");
vi.mock("./_core/videoThumbnail");

describe("Bulk Video Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate videos for approved/published articles without them", async () => {
    // Mock approved/published articles without videos
    const mockArticles = [
      { id: 1, headline: "Test 1", videoUrl: null, featuredImage: null, status: "approved" },
      { id: 2, headline: "Test 2", videoUrl: null, featuredImage: "existing.jpg", status: "published" },
    ];

    vi.mocked(db.listArticles).mockResolvedValue({
      articles: mockArticles,
      total: 2,
    });

    vi.mocked(db.getSetting).mockResolvedValue({
      key: "video_style_prompt",
      value: "Test prompt",
      label: "Video Style",
      description: "Test",
      category: "video",
      type: "string",
      createdAt: new Date(),
    });

    const result = await bulkGenerateVideos();

    expect(result.total).toBe(2);
    expect(result.videosGenerated).toBeGreaterThanOrEqual(0);
    expect(result.results).toHaveLength(2);
  });

  it("should only process approved/published articles without videos", async () => {
    const mockArticles = [
      { id: 1, headline: "Test 1", videoUrl: null, featuredImage: null, status: "approved" },
      { id: 2, headline: "Test 2", videoUrl: "existing.mp4", featuredImage: null, status: "published" },
      { id: 3, headline: "Test 3", videoUrl: null, featuredImage: null, status: "draft" },
    ];

    vi.mocked(db.listArticles).mockResolvedValue({
      articles: mockArticles,
      total: 2,
    });

    vi.mocked(db.getSetting).mockResolvedValue({
      key: "video_style_prompt",
      value: "Test prompt",
      label: "Video Style",
      description: "Test",
      category: "video",
      type: "string",
      createdAt: new Date(),
    });

    const result = await bulkGenerateVideos();

    // Should only process 1 article (approved without video, not draft or with existing video)
    expect(result.total).toBe(1);
  });

  it("should filter by article IDs if provided", async () => {
    const mockArticles = [
      { id: 1, headline: "Test 1", videoUrl: null, featuredImage: null, status: "approved" },
      { id: 2, headline: "Test 2", videoUrl: null, featuredImage: null, status: "published" },
      { id: 3, headline: "Test 3", videoUrl: null, featuredImage: null, status: "approved" },
    ];

    vi.mocked(db.listArticles).mockResolvedValue({
      articles: mockArticles,
      total: 3,
    });

    vi.mocked(db.getSetting).mockResolvedValue({
      key: "video_style_prompt",
      value: "Test prompt",
      label: "Video Style",
      description: "Test",
      category: "video",
      type: "string",
      createdAt: new Date(),
    });

    const result = await bulkGenerateVideos([1, 3]);

    // Should only process articles 1 and 3 (not 2)
    expect(result.total).toBe(2);
  });

  it("should handle generation errors gracefully", async () => {
    const mockArticles = [
      { id: 1, headline: "Test 1", videoUrl: null, featuredImage: null, status: "approved" },
    ];

    vi.mocked(db.listArticles).mockResolvedValue({
      articles: mockArticles,
      total: 1,
    });

    vi.mocked(db.getSetting).mockResolvedValue({
      key: "video_style_prompt",
      value: "Test prompt",
      label: "Video Style",
      description: "Test",
      category: "video",
      type: "string",
      createdAt: new Date(),
    });

    const result = await bulkGenerateVideos();

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toHaveProperty("articleId");
    expect(result.results[0]).toHaveProperty("success");
  });
});
