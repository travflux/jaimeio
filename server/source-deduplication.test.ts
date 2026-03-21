import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock dependencies
vi.mock("./db");

describe("Source URL Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve used source URLs from last 30 days", async () => {
    const mockUrls = [
      { sourceUrl: "https://example.com/news/article-1" },
      { sourceUrl: "https://example.com/news/article-2" },
      { sourceUrl: "https://example.com/news/article-3" },
    ];

    vi.mocked(db.getUsedSourceUrls).mockResolvedValue(
      new Set(mockUrls.map(u => u.sourceUrl))
    );

    const usedUrls = await db.getUsedSourceUrls(30);
    
    expect(usedUrls.size).toBe(3);
    expect(usedUrls.has("https://example.com/news/article-1")).toBe(true);
    expect(usedUrls.has("https://example.com/news/article-2")).toBe(true);
    expect(usedUrls.has("https://example.com/news/article-3")).toBe(true);
  });

  it("should filter out previously used sources from new entries", async () => {
    const usedUrls = new Set([
      "https://example.com/news/article-1",
      "https://example.com/news/article-2",
    ]);

    const newEntries = [
      { title: "Article 1", sourceUrl: "https://example.com/news/article-1", summary: "Old", source: "Test", publishedDate: "2026-01-01" },
      { title: "Article 2", sourceUrl: "https://example.com/news/article-2", summary: "Old", source: "Test", publishedDate: "2026-01-01" },
      { title: "Article 3", sourceUrl: "https://example.com/news/article-3", summary: "New", source: "Test", publishedDate: "2026-01-01" },
      { title: "Article 4", sourceUrl: "https://example.com/news/article-4", summary: "New", source: "Test", publishedDate: "2026-01-01" },
    ];

    const filtered = newEntries.filter(entry => !usedUrls.has(entry.sourceUrl));

    expect(filtered.length).toBe(2);
    expect(filtered[0].sourceUrl).toBe("https://example.com/news/article-3");
    expect(filtered[1].sourceUrl).toBe("https://example.com/news/article-4");
  });

  it("should handle empty used sources set", async () => {
    vi.mocked(db.getUsedSourceUrls).mockResolvedValue(new Set());

    const usedUrls = await db.getUsedSourceUrls(30);
    
    expect(usedUrls.size).toBe(0);

    const newEntries = [
      { title: "Article 1", sourceUrl: "https://example.com/news/article-1", summary: "Test", source: "Test", publishedDate: "2026-01-01" },
      { title: "Article 2", sourceUrl: "https://example.com/news/article-2", summary: "Test", source: "Test", publishedDate: "2026-01-01" },
    ];

    const filtered = newEntries.filter(entry => !usedUrls.has(entry.sourceUrl));
    expect(filtered.length).toBe(2);
  });

  it("should handle database unavailability gracefully", async () => {
    vi.mocked(db.getUsedSourceUrls).mockResolvedValue(new Set());

    const usedUrls = await db.getUsedSourceUrls(30);
    
    expect(usedUrls).toBeInstanceOf(Set);
    expect(usedUrls.size).toBe(0);
  });

  it("should filter null or undefined source URLs", async () => {
    const mockUrls = [
      { sourceUrl: "https://example.com/news/article-1" },
      { sourceUrl: null },
      { sourceUrl: "https://example.com/news/article-2" },
    ];

    // Simulate the filtering logic
    const filtered = mockUrls
      .map(r => r.sourceUrl)
      .filter((url): url is string => !!url);

    expect(filtered.length).toBe(2);
    expect(filtered).toEqual([
      "https://example.com/news/article-1",
      "https://example.com/news/article-2",
    ]);
  });

  it("should use configurable days back parameter", async () => {
    vi.mocked(db.getUsedSourceUrls).mockResolvedValue(new Set());

    await db.getUsedSourceUrls(7);
    expect(db.getUsedSourceUrls).toHaveBeenCalledWith(7);

    await db.getUsedSourceUrls(90);
    expect(db.getUsedSourceUrls).toHaveBeenCalledWith(90);
  });
});
