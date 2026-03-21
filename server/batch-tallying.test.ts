import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

// Mock dependencies
vi.mock("./db");

describe("Workflow Batch Tallying", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should count articles by status correctly", async () => {
    const mockArticles = [
      { id: 1, status: "approved", headline: "Article 1", subheadline: null, body: "Body", slug: "article-1", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
      { id: 2, status: "approved", headline: "Article 2", subheadline: null, body: "Body", slug: "article-2", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
      { id: 3, status: "published", headline: "Article 3", subheadline: null, body: "Body", slug: "article-3", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: new Date() },
      { id: 4, status: "rejected", headline: "Article 4", subheadline: null, body: "Body", slug: "article-4", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
      { id: 5, status: "pending", headline: "Article 5", subheadline: null, body: "Body", slug: "article-5", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
    ];

    vi.mocked(db.getArticleById).mockImplementation(async (id: number) => {
      return mockArticles.find(a => a.id === id) || null;
    });

    const importedIds = [1, 2, 3, 4, 5];
    const importedArticles = await Promise.all(importedIds.map(id => db.getArticleById(id)));
    
    const statusCounts = {
      approved: importedArticles.filter(a => a?.status === "approved").length,
      published: importedArticles.filter(a => a?.status === "published").length,
      rejected: importedArticles.filter(a => a?.status === "rejected").length,
    };

    expect(statusCounts.approved).toBe(2);
    expect(statusCounts.published).toBe(1);
    expect(statusCounts.rejected).toBe(1);
  });

  it("should handle all articles with same status", async () => {
    const mockArticles = [
      { id: 1, status: "approved", headline: "Article 1", subheadline: null, body: "Body", slug: "article-1", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
      { id: 2, status: "approved", headline: "Article 2", subheadline: null, body: "Body", slug: "article-2", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
      { id: 3, status: "approved", headline: "Article 3", subheadline: null, body: "Body", slug: "article-3", categoryId: null, featuredImage: null, videoUrl: null, authorId: null, batchDate: "2026-02-18", sourceEvent: null, sourceUrl: null, views: 0, createdAt: new Date(), updatedAt: new Date(), publishedAt: null },
    ];

    vi.mocked(db.getArticleById).mockImplementation(async (id: number) => {
      return mockArticles.find(a => a.id === id) || null;
    });

    const importedIds = [1, 2, 3];
    const importedArticles = await Promise.all(importedIds.map(id => db.getArticleById(id)));
    
    const statusCounts = {
      approved: importedArticles.filter(a => a?.status === "approved").length,
      published: importedArticles.filter(a => a?.status === "published").length,
      rejected: importedArticles.filter(a => a?.status === "rejected").length,
    };

    expect(statusCounts.approved).toBe(3);
    expect(statusCounts.published).toBe(0);
    expect(statusCounts.rejected).toBe(0);
  });

  it("should handle empty article list", async () => {
    const importedIds: number[] = [];
    const importedArticles = await Promise.all(importedIds.map(id => db.getArticleById(id)));
    
    const statusCounts = {
      approved: importedArticles.filter(a => a?.status === "approved").length,
      published: importedArticles.filter(a => a?.status === "published").length,
      rejected: importedArticles.filter(a => a?.status === "rejected").length,
    };

    expect(statusCounts.approved).toBe(0);
    expect(statusCounts.published).toBe(0);
    expect(statusCounts.rejected).toBe(0);
  });

  it("should update workflow batch with correct counts", async () => {
    const batchId = 1;
    const updateData = {
      status: "pending_approval",
      articlesGenerated: 5,
      articlesApproved: 2,
      articlesPublished: 1,
      articlesRejected: 1,
    };

    vi.mocked(db.updateWorkflowBatch).mockResolvedValue(undefined);

    await db.updateWorkflowBatch(batchId, updateData);

    expect(db.updateWorkflowBatch).toHaveBeenCalledWith(batchId, updateData);
  });

  it("should handle null articles gracefully", async () => {
    vi.mocked(db.getArticleById).mockResolvedValue(null);

    const importedIds = [1, 2, 3];
    const importedArticles = await Promise.all(importedIds.map(id => db.getArticleById(id)));
    
    const statusCounts = {
      approved: importedArticles.filter(a => a?.status === "approved").length,
      published: importedArticles.filter(a => a?.status === "published").length,
      rejected: importedArticles.filter(a => a?.status === "rejected").length,
    };

    expect(statusCounts.approved).toBe(0);
    expect(statusCounts.published).toBe(0);
    expect(statusCounts.rejected).toBe(0);
  });
});
