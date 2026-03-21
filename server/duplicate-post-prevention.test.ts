import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { queueArticlesForX } from "./xPostQueue";

describe("Duplicate Post Prevention", () => {
  let testArticleId: number;

  beforeAll(async () => {
    // Ensure database is initialized
    await db.getAllSettings();
    
    // Create a test article
    testArticleId = await db.createArticle({
      headline: "Test Article for Duplicate Prevention",
      slug: "test-duplicate-prevention-" + Date.now(),
      body: "Test body",
      status: "published",
      publishedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testArticleId) {
      await db.deleteArticle(testArticleId);
    }
  });

  it("should not queue article that already has a posted tweet", async () => {
    // Create a posted social post
    await db.createSocialPost({
      articleId: testArticleId,
      platform: "twitter",
      content: "Already posted tweet",
      status: "posted",
    });
    
    // Try to queue the article
    const queued = await queueArticlesForX([testArticleId]);
    
    // Should return 0 because article already has a posted tweet
    expect(queued).toBe(0);
  });

  it("should not queue article that already has a scheduled tweet", async () => {
    // Clean up previous test
    const existingPosts = await db.listSocialPosts({ articleId: testArticleId });
    for (const post of existingPosts) {
      await db.deleteSocialPost(post.id);
    }
    
    // Create a scheduled social post
    await db.createSocialPost({
      articleId: testArticleId,
      platform: "twitter",
      content: "Already scheduled tweet",
      status: "scheduled",
    });
    
    // Try to queue the article
    const queued = await queueArticlesForX([testArticleId]);
    
    // Should return 0 because article already has a scheduled tweet
    expect(queued).toBe(0);
  });

  it("should queue article with a single draft tweet exactly once", async () => {
    // Clean up previous test
    const existingPosts = await db.listSocialPosts({ articleId: testArticleId });
    for (const post of existingPosts) {
      await db.deleteSocialPost(post.id);
    }

    // With the unique constraint, only one draft per article+platform can exist.
    // bulkCreateSocialPosts silently skips duplicates.
    await db.createSocialPost({
      articleId: testArticleId,
      platform: "twitter",
      content: "Draft tweet",
      status: "draft",
    });

    // Attempt a duplicate insert via bulk — should not throw
    await expect(
      db.bulkCreateSocialPosts([{
        articleId: testArticleId,
        platform: "twitter",
        content: "Duplicate tweet",
        status: "draft",
      }])
    ).resolves.not.toThrow();

    // Queue the article — should schedule exactly 1 post
    const queued = await queueArticlesForX([testArticleId]);
    expect(queued).toBe(1);

    const posts = await db.listSocialPosts({ articleId: testArticleId });
    const scheduledPosts = posts.filter(p => p.status === "scheduled");
    expect(scheduledPosts.length).toBe(1);
  });

  it("should skip articles with no draft tweets", async () => {
    // Clean up previous test
    const existingPosts = await db.listSocialPosts({ articleId: testArticleId });
    for (const post of existingPosts) {
      await db.deleteSocialPost(post.id);
    }
    
    // Try to queue article with no social posts
    const queued = await queueArticlesForX([testArticleId]);
    
    // Should return 0 because there are no draft tweets
    expect(queued).toBe(0);
  });

  it("should prevent re-queuing after article is posted", async () => {
    // Clean up previous test
    const existingPosts = await db.listSocialPosts({ articleId: testArticleId });
    for (const post of existingPosts) {
      await db.deleteSocialPost(post.id);
    }
    
    // Create and queue a draft post
    await db.createSocialPost({
      articleId: testArticleId,
      platform: "twitter",
      content: "First tweet",
      status: "draft",
    });
    
    const queued1 = await queueArticlesForX([testArticleId]);
    expect(queued1).toBe(1);
    
    // Simulate posting (change status to posted)
    const posts = await db.listSocialPosts({ articleId: testArticleId });
    await db.updateSocialPostStatus(posts[0].id, "posted");

    // The unique constraint means we can't insert another twitter post for this article.
    // queueArticlesForX should see the posted status and skip.
    const queued2 = await queueArticlesForX([testArticleId]);

    // Should return 0 because article already has a posted tweet
    expect(queued2).toBe(0);
  });
});
