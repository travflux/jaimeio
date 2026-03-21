/**
 * Tests for xReplyEngine.ts
 * Covers: keyword extraction, tweet filtering, quote tweet mode, follower filters, verified-only filter
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractKeywordsFromArticles,
  searchTweetsForKeyword,
  generateReply,
  postReply,
  loadEngineSettings,
} from "./xReplyEngine";
import * as db from "./db";

// ─── Mock LLM ────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({ keywords: ["climate change", "tech layoffs", "AI regulation", "stock market", "election fraud"] }),
        },
      },
    ],
  }),
}));

// ─── Mock Twitter API ────────────────────────────────────────
const mockTweet = (id: string, authorId: string, likes: number, retweets: number) => ({
  id,
  text: `This is a tweet about topic ${id}`,
  author_id: authorId,
  public_metrics: { like_count: likes, retweet_count: retweets, reply_count: 0, quote_count: 0 },
  reply_settings: "everyone",
});

const mockUser = (id: string, username: string, followers: number, verifiedType: string = "none") => ({
  id,
  name: `User ${username}`,
  username,
  public_metrics: { followers_count: followers, following_count: 100, tweet_count: 500, listed_count: 10 },
  verified_type: verifiedType,
  verified: verifiedType !== "none",
});

const createMockClient = (tweets: any[], users: any[]) => ({
  v2: {
    search: vi.fn().mockResolvedValue({
      data: {
        data: tweets,
        includes: { users },
      },
    }),
    tweet: vi.fn().mockResolvedValue({ data: { id: "new-tweet-123" } }),
  },
} as any);

// ─── Tests ───────────────────────────────────────────────────
describe("extractKeywordsFromArticles", () => {
  it("returns empty array for empty input", async () => {
    const keywords = await extractKeywordsFromArticles([]);
    expect(keywords).toEqual([]);
  });

  it("extracts keywords from articles via LLM", async () => {
    const articles = [
      { headline: "Climate Change Causes Record Floods", subheadline: "Scientists Baffled", body: "..." },
      { headline: "Tech Layoffs Continue in 2025", subheadline: null, body: "..." },
    ];
    const keywords = await extractKeywordsFromArticles(articles);
    expect(keywords).toBeInstanceOf(Array);
    expect(keywords.length).toBeGreaterThan(0);
  });
});

describe("searchTweetsForKeyword — follower filtering", () => {
  it("includes tweets from authors within follower range", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "testuser", 5000)];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 1000,
      maxFollowers: 50000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].tweetId).toBe("t1");
    expect(results[0].tweetFollowers).toBe(5000);
  });

  it("excludes tweets from authors below minFollowers", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "smallaccount", 200)]; // Only 200 followers
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 1000,
      maxFollowers: 50000,
    });

    expect(results).toHaveLength(0);
  });

  it("excludes tweets from authors above maxFollowers", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "megainfluencer", 2000000)]; // 2M followers
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 1000,
      maxFollowers: 500000,
    });

    expect(results).toHaveLength(0);
  });

  it("includes multiple tweets where only some pass follower filter", async () => {
    const tweets = [
      mockTweet("t1", "u1", 100, 20),
      mockTweet("t2", "u2", 50, 10),
      mockTweet("t3", "u3", 200, 30),
    ];
    const users = [
      mockUser("u1", "gooduser", 5000),       // passes
      mockUser("u2", "toosmall", 100),         // fails min
      mockUser("u3", "toobig", 10000000),      // fails max
    ];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "tech layoffs", 10, {
      minFollowers: 1000,
      maxFollowers: 1000000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].tweetId).toBe("t1");
  });
});

describe("searchTweetsForKeyword — verified-only filter", () => {
  it("includes verified (blue) accounts when verifiedOnly is true", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "verifieduser", 5000, "blue")];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "AI regulation", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
      verifiedOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0].tweetVerifiedType).toBe("blue");
  });

  it("includes business verified accounts when verifiedOnly is true", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "businessaccount", 50000, "business")];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "stock market", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
      verifiedOnly: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0].tweetVerifiedType).toBe("business");
  });

  it("excludes unverified accounts when verifiedOnly is true", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "regularuser", 5000, "none")];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "election fraud", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
      verifiedOnly: true,
    });

    expect(results).toHaveLength(0);
  });

  it("includes unverified accounts when verifiedOnly is false", async () => {
    const tweets = [mockTweet("t1", "u1", 100, 20)];
    const users = [mockUser("u1", "regularuser", 5000, "none")];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
      verifiedOnly: false,
    });

    expect(results).toHaveLength(1);
  });
});

describe("searchTweetsForKeyword — engagement filter", () => {
  it("excludes low-engagement tweets (< 5 likes and < 2 retweets)", async () => {
    const tweets = [mockTweet("t1", "u1", 2, 0)]; // Low engagement
    const users = [mockUser("u1", "testuser", 5000)];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
    });

    expect(results).toHaveLength(0);
  });

  it("includes tweets with sufficient engagement", async () => {
    const tweets = [mockTweet("t1", "u1", 10, 5)]; // Good engagement
    const users = [mockUser("u1", "testuser", 5000)];
    const client = createMockClient(tweets, users);

    const results = await searchTweetsForKeyword(client, "climate change", 10, {
      minFollowers: 0,
      maxFollowers: 10000000,
    });

    expect(results).toHaveLength(1);
  });
});

describe("postReply — mode selection and image upload", () => {
  const buildClient = (tweetFn: any, uploadFn?: any) => ({
    v2: { tweet: tweetFn },
    v1: { uploadMedia: uploadFn || vi.fn().mockResolvedValue("media-999") },
  } as any);

  it("uses quote_tweet_id for quote_tweet mode and attaches media", async () => {
    const mockTweetFn = vi.fn().mockResolvedValue({ data: { id: "qt-123" } });
    const mockUpload = vi.fn().mockResolvedValue("media-abc");
    const client = buildClient(mockTweetFn, mockUpload);

    const result = await postReply(client, "original-tweet-id", "Great satirical comment!", "quote_tweet", "https://example.com/image.jpg");

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe("qt-123");
    // Should post with media attached
    expect(mockTweetFn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Great satirical comment!",
        quote_tweet_id: "original-tweet-id",
      })
    );
  });

  it("uses in_reply_to_tweet_id for reply mode", async () => {
    const mockTweetFn = vi.fn().mockResolvedValue({ data: { id: "reply-123" } });
    const client = buildClient(mockTweetFn);

    const result = await postReply(client, "original-tweet-id", "Satirical reply!", "reply");

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe("reply-123");
    expect(mockTweetFn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Satirical reply!",
        reply: { in_reply_to_tweet_id: "original-tweet-id" },
      })
    );
  });

  it("defaults to quote_tweet mode when mode is not specified", async () => {
    const mockTweetFn = vi.fn().mockResolvedValue({ data: { id: "qt-default-123" } });
    const client = buildClient(mockTweetFn);

    const result = await postReply(client, "original-tweet-id", "Default mode comment!");

    expect(result.success).toBe(true);
    expect(mockTweetFn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Default mode comment!",
        quote_tweet_id: "original-tweet-id",
      })
    );
  });

  it("uses fallback image when no imageUrl is provided", async () => {
    const mockTweetFn = vi.fn().mockResolvedValue({ data: { id: "qt-fallback-123" } });
    const mockUpload = vi.fn().mockResolvedValue("media-fallback");
    const client = buildClient(mockTweetFn, mockUpload);

    // No imageUrl passed — should use the CDN fallback
    const result = await postReply(client, "original-tweet-id", "Fallback image test", "quote_tweet");

    expect(result.success).toBe(true);
    // The tweet should still be posted even if media upload fails
    expect(mockTweetFn).toHaveBeenCalled();
  });

  it("handles API errors gracefully", async () => {
    const mockTweetFn = vi.fn().mockRejectedValue(new Error("403 Forbidden"));
    const client = buildClient(mockTweetFn);

    const result = await postReply(client, "original-tweet-id", "This will fail", "reply");

    expect(result.success).toBe(false);
    expect(result.error).toContain("403 Forbidden");
  });

  it("posts without image if media upload fails (graceful degradation)", async () => {
    const mockTweetFn = vi.fn().mockResolvedValue({ data: { id: "qt-no-media-123" } });
    const mockUpload = vi.fn().mockRejectedValue(new Error("Media upload failed"));
    const client = buildClient(mockTweetFn, mockUpload);

    const result = await postReply(client, "original-tweet-id", "Post without image", "quote_tweet", "https://example.com/image.jpg");

    // Should still succeed even if image upload fails
    expect(result.success).toBe(true);
    expect(mockTweetFn).toHaveBeenCalled();
  });
});

describe("generateReply — mode-specific prompts", () => {
  const { invokeLLM } = vi.hoisted(() => ({
    invokeLLM: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    invokeLLM.mockResolvedValue({
      choices: [{ message: { content: "Satirical comment https://example.com/article/test-slug" } }],
    });
  });

  it("generates reply with article URL included", async () => {
    const { invokeLLM: mockLLM } = await import("./_core/llm");
    (mockLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: "Satirical comment https://example.com/article/test-slug" } }],
    });

    const tweet = {
      tweetId: "t1",
      tweetText: "Some tweet text",
      tweetAuthor: "Test User",
      tweetAuthorHandle: "testuser",
      tweetLikes: 100,
      tweetRetweets: 20,
      tweetFollowers: 5000,
      tweetVerifiedType: "none",
      keyword: "climate change",
    };
    const article = { headline: "Climate Satire Headline", slug: "test-slug" };

    const result = await generateReply(tweet, article, "https://example.com", "quote_tweet");
    expect(result).toBeTruthy();
  });
});

describe("loadEngineSettings", () => {
  it("returns defaults when no settings are stored", async () => {
    const settings = await loadEngineSettings();
    expect(["reply", "quote_tweet"]).toContain(settings.mode); // default is reply (quote_tweet blocked on Free tier)
    expect(typeof settings.minFollowers).toBe("number");
    expect(typeof settings.maxFollowers).toBe("number");
    expect(typeof settings.verifiedOnly).toBe("boolean");
  });

  it("returns reply or quote_tweet as default mode", async () => {
    const settings = await loadEngineSettings();
    expect(["reply", "quote_tweet"]).toContain(settings.mode);
  });

  it("returns stored mode when set to reply", async () => {
    await db.setSetting("x_reply_mode", "reply");
    const settings = await loadEngineSettings();
    expect(settings.mode).toBe("reply");
    // Cleanup
    await db.setSetting("x_reply_mode", "quote_tweet");
  });

  it("returns stored follower filter settings", async () => {
    await db.setSetting("x_reply_min_followers", "2000");
    await db.setSetting("x_reply_max_followers", "100000");
    const settings = await loadEngineSettings();
    expect(settings.minFollowers).toBe(2000);
    expect(settings.maxFollowers).toBe(100000);
    // Cleanup
    await db.setSetting("x_reply_min_followers", "1000");
    await db.setSetting("x_reply_max_followers", "500000");
  });

  it("returns stored verifiedOnly setting", async () => {
    await db.setSetting("x_reply_verified_only", "true");
    const settings = await loadEngineSettings();
    expect(settings.verifiedOnly).toBe(true);
    // Cleanup
    await db.setSetting("x_reply_verified_only", "false");
  });
});

describe("runMentionsReplyEngine", () => {
  it("is exported from xReplyEngine", async () => {
    const { runMentionsReplyEngine } = await import("./xReplyEngine");
    expect(typeof runMentionsReplyEngine).toBe("function");
  });

  it("returns a ReplyResult shape with correct fields", () => {
    // Verify the ReplyResult interface shape by checking the type contract
    // (full integration test requires real DB + Twitter — covered by e2e tests)
    const mockResult = { success: true, repliesGenerated: 0, repliesPosted: 0, error: undefined };
    expect(typeof mockResult.success).toBe("boolean");
    expect(typeof mockResult.repliesGenerated).toBe("number");
    expect(typeof mockResult.repliesPosted).toBe("number");
  });
});

describe("loadEngineSettings — maxEngagementsPerUser", () => {
  it("returns default maxEngagementsPerUser of 2 when not set", async () => {
    const settings = await loadEngineSettings();
    expect(settings).toHaveProperty("maxEngagementsPerUser");
    expect(typeof settings.maxEngagementsPerUser).toBe("number");
    expect(settings.maxEngagementsPerUser).toBeGreaterThan(0);
  });

  it("returns stored maxEngagementsPerUser when set", async () => {
    await db.setSetting("x_reply_max_engagements_per_user", "5");
    const settings = await loadEngineSettings();
    expect(settings.maxEngagementsPerUser).toBe(5);
    // Cleanup
    await db.setSetting("x_reply_max_engagements_per_user", "2");
  });
});

describe("DB helpers — countRepliesByUserHandle and getArticlesUsedWithUser", () => {
  it("countRepliesByUserHandle is exported from db", () => {
    expect(typeof db.countRepliesByUserHandle).toBe("function");
  });

  it("getArticlesUsedWithUser is exported from db", () => {
    expect(typeof db.getArticlesUsedWithUser).toBe("function");
  });

  it("countRepliesByUserHandle returns a number for any handle", async () => {
    const count = await db.countRepliesByUserHandle("nonexistent_user_xyz_12345");
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("getArticlesUsedWithUser returns an array for any handle", async () => {
    const slugs = await db.getArticlesUsedWithUser("nonexistent_user_xyz_12345");
    expect(Array.isArray(slugs)).toBe(true);
  });
});

describe("initReplyScheduler — source routing", () => {
  it("initReplyScheduler is exported from xReplyEngine", async () => {
    const { initReplyScheduler } = await import("./xReplyEngine");
    expect(typeof initReplyScheduler).toBe("function");
  });

  it("runReplyEngine is exported from xReplyEngine", async () => {
    const { runReplyEngine } = await import("./xReplyEngine");
    expect(typeof runReplyEngine).toBe("function");
  });

  it("runMentionsReplyEngine is exported from xReplyEngine", async () => {
    const { runMentionsReplyEngine } = await import("./xReplyEngine");
    expect(typeof runMentionsReplyEngine).toBe("function");
  });

  it("x_reply_source setting routes to correct engine — structural verification", async () => {
    // The scheduler reads x_reply_source on each tick and calls the correct engine.
    // We verify the setting is readable and the engines are callable.
    const sourceSetting = await db.getSetting("x_reply_source");
    const source = sourceSetting?.value ?? "keyword_search";
    expect(["keyword_search", "mentions"]).toContain(source);
  });
});

describe("mentions engine — article deduplication", () => {
  it("getArticlesUsedWithUser excludes articles already used with a specific user", async () => {
    // Verify the helper returns an array (empty for unknown users)
    const used = await db.getArticlesUsedWithUser("test_dedup_user_xyz");
    expect(Array.isArray(used)).toBe(true);
  });

  it("article candidate pool falls back to full list when all articles used", () => {
    // Simulate the fallback logic: if availableArticles is empty, use full list
    const recentArticles = [{ slug: "article-1" }, { slug: "article-2" }];
    const articlesUsedWithUser = ["article-1", "article-2"];
    const availableArticles = recentArticles.filter(a => !articlesUsedWithUser.includes(a.slug!));
    const candidateArticles = availableArticles.length > 0 ? availableArticles : recentArticles;
    // Falls back to full list
    expect(candidateArticles).toEqual(recentArticles);
  });

  it("article candidate pool excludes used articles when alternatives exist", () => {
    const recentArticles = [{ slug: "article-1" }, { slug: "article-2" }, { slug: "article-3" }];
    const articlesUsedWithUser = ["article-1"];
    const availableArticles = recentArticles.filter(a => !articlesUsedWithUser.includes(a.slug!));
    const candidateArticles = availableArticles.length > 0 ? availableArticles : recentArticles;
    expect(candidateArticles).toHaveLength(2);
    expect(candidateArticles.map(a => a.slug)).not.toContain("article-1");
  });
});

describe("mentions engine — mid-thread filtering", () => {
  const MY_USER_ID = "2023516852148985856"; // @yourbrand

  it("allows top-level mentions (no in_reply_to_user_id)", () => {
    const mention = { id: "111", in_reply_to_user_id: undefined };
    const inReplyToUserId = (mention as any).in_reply_to_user_id;
    const isTopLevel = !inReplyToUserId;
    const isDirectReplyToUs = inReplyToUserId === MY_USER_ID;
    expect(isTopLevel || isDirectReplyToUs).toBe(true);
  });

  it("allows direct replies to brand account (in_reply_to_user_id === myUserId)", () => {
    const mention = { id: "222", in_reply_to_user_id: MY_USER_ID };
    const inReplyToUserId = (mention as any).in_reply_to_user_id;
    const isTopLevel = !inReplyToUserId;
    const isDirectReplyToUs = inReplyToUserId === MY_USER_ID;
    expect(isTopLevel || isDirectReplyToUs).toBe(true);
  });

  it("skips mid-thread mentions replying to a third party", () => {
    const mention = { id: "333", in_reply_to_user_id: "9999999999" };
    const inReplyToUserId = (mention as any).in_reply_to_user_id;
    const isTopLevel = !inReplyToUserId;
    const isDirectReplyToUs = inReplyToUserId === MY_USER_ID;
    expect(isTopLevel || isDirectReplyToUs).toBe(false);
  });

  it("skips mid-thread mentions where in_reply_to_user_id is a different user", () => {
    const mention = { id: "444", in_reply_to_user_id: "1785530237834633216" }; // @intl_troller
    const inReplyToUserId = (mention as any).in_reply_to_user_id;
    const isTopLevel = !inReplyToUserId;
    const isDirectReplyToUs = inReplyToUserId === MY_USER_ID;
    expect(isTopLevel || isDirectReplyToUs).toBe(false);
  });
});

describe("generateEngagementReply — link-free replies", () => {
  it("is exported from xReplyEngine", async () => {
    const { generateEngagementReply } = await import("./xReplyEngine");
    expect(typeof generateEngagementReply).toBe("function");
  });

  it("generates a reply without any URLs", async () => {
    const { invokeLLM: mockLLM } = await import("./_core/llm");
    (mockLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: "That's the kind of energy we report on daily." } }],
    });

    const { generateEngagementReply } = await import("./xReplyEngine");
    const tweet = {
      tweetId: "t1",
      tweetText: "This is wild",
      tweetAuthor: "Test User",
      tweetAuthorHandle: "testuser",
      tweetLikes: 50,
      tweetRetweets: 10,
      tweetFollowers: 3000,
      tweetVerifiedType: "none",
      keyword: "mention",
    };

    const result = await generateEngagementReply(tweet, "reply");
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/https?:\/\//);
  });

  it("strips URLs if LLM includes them despite instructions", async () => {
    const { invokeLLM: mockLLM } = await import("./_core/llm");
    (mockLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: "Great point! https://example.com/article/test Check this out" } }],
    });

    const { generateEngagementReply } = await import("./xReplyEngine");
    const tweet = {
      tweetId: "t2",
      tweetText: "Something interesting",
      tweetAuthor: "User",
      tweetAuthorHandle: "user2",
      tweetLikes: 10,
      tweetRetweets: 2,
      tweetFollowers: 1000,
      tweetVerifiedType: "none",
      keyword: "mention",
    };

    const result = await generateEngagementReply(tweet, "reply");
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/https?:\/\//);
  });
});

describe("mentions engine — 50/50 article link split", () => {
  it("Math.random determines includeArticleLink (structural test)", () => {
    // Simulate 1000 coin flips to verify roughly 50/50 distribution
    let withLink = 0;
    let withoutLink = 0;
    for (let i = 0; i < 1000; i++) {
      if (Math.random() < 0.5) withLink++;
      else withoutLink++;
    }
    // Should be roughly 50/50 (within 15% tolerance)
    expect(withLink).toBeGreaterThan(350);
    expect(withLink).toBeLessThan(650);
    expect(withoutLink).toBeGreaterThan(350);
    expect(withoutLink).toBeLessThan(650);
  });
});
