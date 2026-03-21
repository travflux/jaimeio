import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getSetting: vi.fn(),
  getPendingArticlesOlderThan: vi.fn(),
  updateArticleStatus: vi.fn(),
  updateArticle: vi.fn(),
  listSocialPosts: vi.fn(),
  bulkCreateSocialPosts: vi.fn(),
}));

vi.mock("./xPostQueue", () => ({
  queueArticlesForX: vi.fn(),
}));

vi.mock("./workflow", () => ({
  generateSocialPosts: vi.fn(),
}));

import * as db from "./db";
import { queueArticlesForX } from "./xPostQueue";
import { generateSocialPosts } from "./workflow";
import { runAutoApproveCheck } from "./autoApproveTimer";

describe("runAutoApproveCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeros when auto_approve_enabled is false", async () => {
    vi.mocked(db.getSetting).mockResolvedValue({ value: "false" } as any);
    const result = await runAutoApproveCheck();
    expect(result).toEqual({ checked: 0, approved: 0, published: 0 });
    expect(db.getPendingArticlesOlderThan).not.toHaveBeenCalled();
  });

  it("returns zeros when no pending articles are old enough", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "auto_approve_enabled") return { value: "true" } as any;
      if (key === "auto_approve_after_hours") return { value: "4" } as any;
      return { value: "false" } as any;
    });
    vi.mocked(db.getPendingArticlesOlderThan).mockResolvedValue([]);
    const result = await runAutoApproveCheck();
    expect(result).toEqual({ checked: 0, approved: 0, published: 0 });
  });

  it("approves pending articles older than threshold", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "auto_approve_enabled") return { value: "true" } as any;
      if (key === "auto_approve_after_hours") return { value: "4" } as any;
      if (key === "auto_publish_approved") return { value: "false" } as any;
      return { value: "false" } as any;
    });
    vi.mocked(db.getPendingArticlesOlderThan).mockResolvedValue([
      { id: 101, headline: "Test Article 1", slug: "test-1" } as any,
      { id: 102, headline: "Test Article 2", slug: "test-2" } as any,
    ]);
    vi.mocked(db.updateArticleStatus).mockResolvedValue(undefined as any);

    const result = await runAutoApproveCheck();
    expect(result.checked).toBe(2);
    expect(result.approved).toBe(2);
    expect(result.published).toBe(0);
    expect(db.updateArticleStatus).toHaveBeenCalledWith(101, "approved");
    expect(db.updateArticleStatus).toHaveBeenCalledWith(102, "approved");
  });

  it("approves and publishes when auto_publish_approved is true", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "auto_approve_enabled") return { value: "true" } as any;
      if (key === "auto_approve_after_hours") return { value: "4" } as any;
      if (key === "auto_publish_approved") return { value: "true" } as any;
      if (key === "auto_create_social_posts") return { value: "false" } as any;
      return { value: "false" } as any;
    });
    vi.mocked(db.getPendingArticlesOlderThan).mockResolvedValue([
      { id: 201, headline: "Auto Publish Test", slug: "auto-pub" } as any,
    ]);
    vi.mocked(db.updateArticleStatus).mockResolvedValue(undefined as any);
    vi.mocked(db.updateArticle).mockResolvedValue(undefined as any);

    const result = await runAutoApproveCheck();
    expect(result.checked).toBe(1);
    expect(result.approved).toBe(1);
    expect(result.published).toBe(1);
    expect(db.updateArticleStatus).toHaveBeenCalledWith(201, "approved");
    expect(db.updateArticleStatus).toHaveBeenCalledWith(201, "published");
    expect(db.updateArticle).toHaveBeenCalledWith(201, expect.objectContaining({ publishedAt: expect.any(Date) }));
  });

  it("creates social posts and queues X post when all flags enabled", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "auto_approve_enabled") return { value: "true" } as any;
      if (key === "auto_approve_after_hours") return { value: "2" } as any;
      if (key === "auto_publish_approved") return { value: "true" } as any;
      if (key === "auto_create_social_posts") return { value: "true" } as any;
      if (key === "x_auto_queue_on_publish") return { value: "true" } as any;
      if (key === "site_url") return { value: "https://example.com" } as any;
      if (key === "social_platforms") return { value: "twitter" } as any;
      return { value: "false" } as any;
    });
    vi.mocked(db.getPendingArticlesOlderThan).mockResolvedValue([
      { id: 301, headline: "Full Pipeline Test", slug: "full-pipeline", subheadline: "Sub" } as any,
    ]);
    vi.mocked(db.updateArticleStatus).mockResolvedValue(undefined as any);
    vi.mocked(db.updateArticle).mockResolvedValue(undefined as any);
    vi.mocked(db.listSocialPosts).mockResolvedValue([]);
    vi.mocked(generateSocialPosts).mockResolvedValue([
      { articleId: 301, platform: "twitter", content: "Test post", status: "draft" } as any,
    ]);
    vi.mocked(db.bulkCreateSocialPosts).mockResolvedValue(undefined as any);
    vi.mocked(queueArticlesForX).mockResolvedValue(1);

    const result = await runAutoApproveCheck();
    expect(result.approved).toBe(1);
    expect(result.published).toBe(1);
    expect(generateSocialPosts).toHaveBeenCalled();
    expect(db.bulkCreateSocialPosts).toHaveBeenCalled();
    expect(queueArticlesForX).toHaveBeenCalledWith([301]);
  });
});
