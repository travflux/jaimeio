import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("X Post Queue Ordering", () => {
  let article1Id: number;
  let article2Id: number;
  let article3Id: number;

  beforeAll(async () => {
    // Ensure database is initialized
    await db.getAllSettings();
    
    // Create test articles with different published dates
    // Article 1: Oldest (2 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2);
    article1Id = await db.createArticle({
      headline: "Test Article 1 (Oldest)",
      slug: "test-article-1-oldest-" + Date.now(),
      body: "Test body 1",
      status: "published",
      publishedAt: oldDate,
    });
    
    // Article 2: Newest (now)
    article2Id = await db.createArticle({
      headline: "Test Article 2 (Newest)",
      slug: "test-article-2-newest-" + Date.now(),
      body: "Test body 2",
      status: "published",
      publishedAt: new Date(),
    });
    
    // Article 3: Middle (1 day ago)
    const middleDate = new Date();
    middleDate.setDate(middleDate.getDate() - 1);
    article3Id = await db.createArticle({
      headline: "Test Article 3 (Middle)",
      slug: "test-article-3-middle-" + Date.now(),
      body: "Test body 3",
      status: "published",
      publishedAt: middleDate,
    });
    
    // Create social posts for each article (in random order)
    await db.createSocialPost({
      articleId: article1Id,
      platform: "twitter",
      content: "Post for oldest article",
      status: "scheduled",
    });
    
    await db.createSocialPost({
      articleId: article3Id,
      platform: "twitter",
      content: "Post for middle article",
      status: "scheduled",
    });
    
    await db.createSocialPost({
      articleId: article2Id,
      platform: "twitter",
      content: "Post for newest article",
      status: "scheduled",
    });
  });

  afterAll(async () => {
    // Clean up test data — delete social posts first (they reference articles)
    // Note: deleteArticle() now cascades to social posts, but we also clean up
    // explicitly here to guard against any future refactor that removes the cascade.
    if (article1Id) {
      const posts1 = await db.listSocialPosts({ articleId: article1Id });
      for (const p of posts1) await db.deleteSocialPost(p.id);
      await db.deleteArticle(article1Id);
    }
    if (article2Id) {
      const posts2 = await db.listSocialPosts({ articleId: article2Id });
      for (const p of posts2) await db.deleteSocialPost(p.id);
      await db.deleteArticle(article2Id);
    }
    if (article3Id) {
      const posts3 = await db.listSocialPosts({ articleId: article3Id });
      for (const p of posts3) await db.deleteSocialPost(p.id);
      await db.deleteArticle(article3Id);
    }
  });

  it("should order queue by article publishedAt date (newest first)", async () => {
    const posts = await db.listSocialPosts({ status: "scheduled" });
    
    // Filter to only our test posts
    const testPosts = posts.filter(p => 
      p.articleId === article1Id || 
      p.articleId === article2Id || 
      p.articleId === article3Id
    );
    
    expect(testPosts.length).toBe(3);
    
    // Verify order: newest article first, then middle, then oldest
    expect(testPosts[0].articleId).toBe(article2Id); // Newest
    expect(testPosts[1].articleId).toBe(article3Id); // Middle
    expect(testPosts[2].articleId).toBe(article1Id); // Oldest
  });

  it("should prioritize newer articles in the queue", async () => {
    const posts = await db.listSocialPosts({ status: "scheduled" });
    
    // Find our test posts
    const newestPost = posts.find(p => p.articleId === article2Id);
    const oldestPost = posts.find(p => p.articleId === article1Id);
    
    expect(newestPost).toBeDefined();
    expect(oldestPost).toBeDefined();
    
    // The newest article's post should appear before the oldest in the queue
    const newestIndex = posts.findIndex(p => p.articleId === article2Id);
    const oldestIndex = posts.findIndex(p => p.articleId === article1Id);
    
    expect(newestIndex).toBeLessThan(oldestIndex);
  });
});
