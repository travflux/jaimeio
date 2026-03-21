import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import { postArticleToReddit } from "./reddit-article-poster";

// Mock dependencies
vi.mock("./db");
vi.mock("./_core/redditPoster", () => ({
  postToReddit: vi.fn()
}));

describe("Reddit Auto-Posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not post when Reddit is disabled", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "reddit_enabled") return { id: 1, key, value: "false", label: null, description: null, category: null, type: "boolean", updatedAt: new Date() };
      return undefined;
    });

    const result = await postArticleToReddit({
      articleId: 1,
      articleUrl: "https://example.com/article/test",
      headline: "Test Article"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Reddit posting is not enabled");
  });

  it("should fail when credentials are missing", async () => {
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      if (key === "reddit_enabled") return { id: 1, key, value: "true", label: null, description: null, category: null, type: "boolean", updatedAt: new Date() };
      return undefined;
    });

    const result = await postArticleToReddit({
      articleId: 1,
      articleUrl: "https://example.com/article/test",
      headline: "Test Article"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Reddit credentials are not configured");
  });

  it("should post to Reddit with valid credentials", async () => {
    const { postToReddit } = await import("./_core/redditPoster");
    
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      const settings: Record<string, any> = {
        reddit_enabled: { id: 1, key, value: "true", label: null, description: null, category: null, type: "boolean", updatedAt: new Date() },
        reddit_client_id: { id: 2, key, value: "test_client_id", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_client_secret: { id: 3, key, value: "test_secret", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_username: { id: 4, key, value: "test_user", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_password: { id: 5, key, value: "test_pass", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_subreddit: { id: 6, key, value: "test", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_post_type: { id: 7, key, value: "link", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_title_template: { id: 8, key, value: "{{headline}}", label: null, description: null, category: null, type: "text", updatedAt: new Date() },
      };
      return settings[key];
    });

    vi.mocked(postToReddit).mockResolvedValue({
      success: true,
      postUrl: "https://reddit.com/r/test/comments/abc123/test_article",
      postId: "abc123"
    });

    const result = await postArticleToReddit({
      articleId: 1,
      articleUrl: "https://example.com/article/test",
      headline: "Test Article"
    });

    expect(result.success).toBe(true);
    expect(result.postUrl).toBe("https://reddit.com/r/test/comments/abc123/test_article");
    expect(postToReddit).toHaveBeenCalledWith({
      clientId: "test_client_id",
      clientSecret: "test_secret",
      username: "test_user",
      password: "test_pass",
      subreddit: "test",
      title: "Test Article",
      url: "https://example.com/article/test",
      selftext: undefined
    });
  });

  it("should use text post format when configured", async () => {
    const { postToReddit } = await import("./_core/redditPoster");
    
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      const settings: Record<string, any> = {
        reddit_enabled: { id: 1, key, value: "true", label: null, description: null, category: null, type: "boolean", updatedAt: new Date() },
        reddit_client_id: { id: 2, key, value: "test_client_id", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_client_secret: { id: 3, key, value: "test_secret", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_username: { id: 4, key, value: "test_user", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_password: { id: 5, key, value: "test_pass", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_subreddit: { id: 6, key, value: "test", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_post_type: { id: 7, key, value: "text", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_title_template: { id: 8, key, value: "{{headline}}", label: null, description: null, category: null, type: "text", updatedAt: new Date() },
      };
      return settings[key];
    });

    vi.mocked(postToReddit).mockResolvedValue({
      success: true,
      postUrl: "https://reddit.com/r/test/comments/abc123/test_article",
      postId: "abc123"
    });

    const result = await postArticleToReddit({
      articleId: 1,
      articleUrl: "https://example.com/article/test",
      headline: "Test Article"
    });

    expect(result.success).toBe(true);
    expect(postToReddit).toHaveBeenCalledWith({
      clientId: "test_client_id",
      clientSecret: "test_secret",
      username: "test_user",
      password: "test_pass",
      subreddit: "test",
      title: "Test Article",
      url: undefined,
      selftext: "Test Article\n\nRead more: https://example.com/article/test"
    });
  });

  it("should apply title template correctly", async () => {
    const { postToReddit } = await import("./_core/redditPoster");
    
    vi.mocked(db.getSetting).mockImplementation(async (key: string) => {
      const settings: Record<string, any> = {
        reddit_enabled: { id: 1, key, value: "true", label: null, description: null, category: null, type: "boolean", updatedAt: new Date() },
        reddit_client_id: { id: 2, key, value: "test_client_id", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_client_secret: { id: 3, key, value: "test_secret", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_username: { id: 4, key, value: "test_user", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_password: { id: 5, key, value: "test_pass", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_subreddit: { id: 6, key, value: "test", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_post_type: { id: 7, key, value: "link", label: null, description: null, category: null, type: "string", updatedAt: new Date() },
        reddit_title_template: { id: 8, key, value: "[Satire] {{headline}}", label: null, description: null, category: null, type: "text", updatedAt: new Date() },
      };
      return settings[key];
    });

    vi.mocked(postToReddit).mockResolvedValue({
      success: true,
      postUrl: "https://reddit.com/r/test/comments/abc123/test_article",
      postId: "abc123"
    });

    await postArticleToReddit({
      articleId: 1,
      articleUrl: "https://example.com/article/test",
      headline: "Breaking News"
    });

    expect(postToReddit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "[Satire] Breaking News"
      })
    );
  });
});
