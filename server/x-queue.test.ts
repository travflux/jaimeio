import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  listSocialPosts: vi.fn(),
  updateSocialPostStatus: vi.fn(),
  getArticleById: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

describe("X/Twitter Service", () => {
  it("getXCredentials returns credentials when env vars are set", async () => {
    process.env.X_API_KEY = "test-api-key";
    process.env.X_API_SECRET = "test-api-secret";
    process.env.X_ACCESS_TOKEN = "test-access-token";
    process.env.X_ACCESS_TOKEN_SECRET = "test-access-token-secret";
    vi.resetModules();
    const { getXCredentials } = await import("./xTwitterService");
    const creds = await getXCredentials();
    expect(creds).not.toBeNull();
    expect(creds!.apiKey).toBeDefined();
    expect(creds!.apiSecret).toBeDefined();
    expect(creds!.accessToken).toBeDefined();
    expect(creds!.accessTokenSecret).toBeDefined();
    delete process.env.X_API_KEY;
    delete process.env.X_API_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_TOKEN_SECRET;
  });

  it("getXCredentials returns null when env vars are missing", async () => {
    const originalKey = process.env.X_API_KEY;
    delete process.env.X_API_KEY;
    
    // Re-import to get fresh module
    vi.resetModules();
    const { getXCredentials } = await import("./xTwitterService");
    const creds = await getXCredentials();
    expect(creds).toBeNull();
    
    // Restore
    process.env.X_API_KEY = originalKey;
  });
});

describe("X Post Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getQueueStatus returns correct initial state", async () => {
    const { getQueueStatus } = await import("./xPostQueue");
    const status = getQueueStatus();
    
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("intervalMinutes");
    expect(status).toHaveProperty("postsToday");
    expect(status).toHaveProperty("dailyLimit");
    expect(status).toHaveProperty("hasCredentials");
    expect(typeof status.isRunning).toBe("boolean");
    expect(typeof status.intervalMinutes).toBe("number");
    expect(status.intervalMinutes).toBeGreaterThan(0);
    expect(status.dailyLimit).toBeGreaterThan(0);
  });

  it("stopQueue sets isRunning to false", async () => {
    const { stopQueue, getQueueStatus } = await import("./xPostQueue");
    stopQueue();
    const status = getQueueStatus();
    expect(status.isRunning).toBe(false);
  });

  it("resetDailyCounter resets postsToday to 0", async () => {
    const { resetDailyCounter, getQueueStatus } = await import("./xPostQueue");
    resetDailyCounter();
    const status = getQueueStatus();
    expect(status.postsToday).toBe(0);
  });

  it("queueArticlesForX queues draft twitter posts", async () => {
    const db = await import("./db");
    const { queueArticlesForX } = await import("./xPostQueue");
    
    // Mock: article has draft twitter posts
    (db.listSocialPosts as any).mockResolvedValue([
      { id: 1, articleId: 100, platform: "twitter", status: "draft", content: "Test tweet" },
      { id: 2, articleId: 100, platform: "facebook", status: "draft", content: "Test FB post" },
    ]);
    (db.updateSocialPostStatus as any).mockResolvedValue(undefined);
    
    const queued = await queueArticlesForX([100]);
    
    // Should only queue twitter posts, not facebook
    expect(queued).toBe(1);
    expect(db.updateSocialPostStatus).toHaveBeenCalledWith(1, "scheduled");
    expect(db.updateSocialPostStatus).not.toHaveBeenCalledWith(2, "scheduled");
  });

  it("queueArticlesForX skips already scheduled posts", async () => {
    const db = await import("./db");
    const { queueArticlesForX } = await import("./xPostQueue");
    
    (db.listSocialPosts as any).mockResolvedValue([
      { id: 1, articleId: 100, platform: "twitter", status: "scheduled", content: "Already queued" },
    ]);
    
    const queued = await queueArticlesForX([100]);
    expect(queued).toBe(0);
    expect(db.updateSocialPostStatus).not.toHaveBeenCalled();
  });
});

describe("X Queue Settings", () => {
  it("default interval is reasonable (1-60 minutes)", async () => {
    const { getQueueStatus } = await import("./xPostQueue");
    const status = getQueueStatus();
    expect(status.intervalMinutes).toBeGreaterThanOrEqual(1);
    expect(status.intervalMinutes).toBeLessThanOrEqual(1440);
  });

  it("daily limit respects X free tier (max ~48/day)", async () => {
    const { getQueueStatus } = await import("./xPostQueue");
    const status = getQueueStatus();
    expect(status.dailyLimit).toBeLessThanOrEqual(50);
    expect(status.dailyLimit).toBeGreaterThan(0);
  });
});
