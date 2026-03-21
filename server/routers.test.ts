import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Mock database functions ─────────────────────────────────────────────
vi.mock("./db", () => {
  const mockCategories = [
    { id: 1, name: "Politics", slug: "politics", description: "Political satire", color: "#ef4444", createdAt: new Date() },
    { id: 2, name: "Tech", slug: "tech", description: "Technology satire", color: "#3b82f6", createdAt: new Date() },
    { id: 3, name: "Business", slug: "business", description: "Business satire", color: "#14b8a6", createdAt: new Date() },
  ];

  const mockArticles: any[] = [];
  let articleIdCounter = 1;

  const mockSubscribers: any[] = [];
  const mockSocialPosts: any[] = [];
  let socialPostIdCounter = 1;

  const mockBatches: any[] = [];
  let batchIdCounter = 1;

  const mockSettings: any[] = [
    { key: "articles_per_batch", value: "20", label: "Articles Per Batch", category: "generation", type: "number", updatedAt: new Date() },
    { key: "ai_writing_style", value: "onion", label: "AI Writing Style", category: "generation", type: "string", updatedAt: new Date() },
    { key: "workflow_enabled", value: "true", label: "Workflow Enabled", category: "schedule", type: "boolean", updatedAt: new Date() },
    { key: "max_publish_per_day", value: "20", label: "Max Publish Per Day", category: "publishing", type: "number", updatedAt: new Date() },
  ];

  return {
    listCategories: vi.fn(() => Promise.resolve(mockCategories)),
    getCategoryBySlug: vi.fn((slug: string) => Promise.resolve(mockCategories.find(c => c.slug === slug))),
    createCategory: vi.fn((data: any) => Promise.resolve()),
    updateCategory: vi.fn((id: number, data: any) => Promise.resolve()),
    deleteCategory: vi.fn((id: number) => Promise.resolve()),
    seedDefaultCategories: vi.fn(() => Promise.resolve()),

    listArticles: vi.fn((opts: any) => {
      let filtered = [...mockArticles];
      if (opts.status) filtered = filtered.filter(a => a.status === opts.status);
      if (opts.categoryId) filtered = filtered.filter(a => a.categoryId === opts.categoryId);
      if (opts.search) filtered = filtered.filter(a => a.headline.toLowerCase().includes(opts.search.toLowerCase()));
      return Promise.resolve({ articles: filtered, total: filtered.length });
    }),
    getArticleBySlug: vi.fn((slug: string) => Promise.resolve(mockArticles.find(a => a.slug === slug))),
    getArticleById: vi.fn((id: number) => Promise.resolve(mockArticles.find(a => a.id === id))),
    incrementArticleViews: vi.fn(() => Promise.resolve()),
    getArticleStats: vi.fn(() => Promise.resolve({
      total: mockArticles.length,
      published: mockArticles.filter(a => a.status === "published").length,
      pending: mockArticles.filter(a => a.status === "pending").length,
      approved: mockArticles.filter(a => a.status === "approved").length,
      rejected: mockArticles.filter(a => a.status === "rejected").length,
      draft: mockArticles.filter(a => a.status === "draft").length,
      totalViews: 0,
    })),
    createArticle: vi.fn((data: any) => {
      const id = articleIdCounter++;
      mockArticles.push({ id, ...data, views: 0, createdAt: new Date(), publishedAt: null });
      return Promise.resolve(id);
    }),
    bulkCreateArticles: vi.fn((dataList: any[]) => {
      const ids: number[] = [];
      for (const data of dataList) {
        const id = articleIdCounter++;
        mockArticles.push({ id, ...data, views: 0, createdAt: new Date(), publishedAt: null });
        ids.push(id);
      }
      return Promise.resolve(ids);
    }),
    updateArticle: vi.fn((id: number, data: any) => {
      const idx = mockArticles.findIndex(a => a.id === id);
      if (idx >= 0) Object.assign(mockArticles[idx], data);
      return Promise.resolve();
    }),
    updateArticleStatus: vi.fn((id: number, status: string) => {
      const idx = mockArticles.findIndex(a => a.id === id);
      if (idx >= 0) mockArticles[idx].status = status;
      return Promise.resolve();
    }),
    deleteArticle: vi.fn((id: number) => {
      const idx = mockArticles.findIndex(a => a.id === id);
      if (idx >= 0) mockArticles.splice(idx, 1);
      return Promise.resolve();
    }),

    subscribeNewsletter: vi.fn((email: string) => {
      mockSubscribers.push({ email, status: "active" });
      return Promise.resolve();
    }),
    unsubscribeNewsletter: vi.fn((email: string) => {
      const idx = mockSubscribers.findIndex(s => s.email === email);
      if (idx >= 0) mockSubscribers[idx].status = "unsubscribed";
      return Promise.resolve();
    }),
    listSubscribers: vi.fn(() => Promise.resolve(mockSubscribers)),

    listSocialPosts: vi.fn(() => Promise.resolve(mockSocialPosts)),
    createSocialPost: vi.fn((data: any) => {
      const id = socialPostIdCounter++;
      mockSocialPosts.push({ id, ...data, createdAt: new Date() });
      return Promise.resolve(id);
    }),
    bulkCreateSocialPosts: vi.fn((posts: any[]) => {
      for (const p of posts) {
        const id = socialPostIdCounter++;
        mockSocialPosts.push({ id, ...p, createdAt: new Date() });
      }
      return Promise.resolve();
    }),
    updateSocialPostStatus: vi.fn((id: number, status: string) => {
      const idx = mockSocialPosts.findIndex(p => p.id === id);
      if (idx >= 0) mockSocialPosts[idx].status = status;
      return Promise.resolve();
    }),

    listWorkflowBatches: vi.fn(() => Promise.resolve(mockBatches)),
    getWorkflowBatch: vi.fn((id: number) => Promise.resolve(mockBatches.find(b => b.id === id))),
    getWorkflowBatchByDate: vi.fn((date: string) => Promise.resolve(mockBatches.find(b => b.batchDate === date))),
    createWorkflowBatch: vi.fn((data: any) => {
      const id = batchIdCounter++;
      mockBatches.push({ id, ...data, articlesGenerated: 0, articlesApproved: 0, articlesPublished: 0, articlesRejected: 0, createdAt: new Date() });
      return Promise.resolve(id);
    }),
    updateWorkflowBatch: vi.fn((id: number, data: any) => {
      const idx = mockBatches.findIndex(b => b.id === id);
      if (idx >= 0) Object.assign(mockBatches[idx], data);
      return Promise.resolve();
    }),

    getFirstAdmin: vi.fn(() => Promise.resolve({ id: 1, openId: "admin-user", role: "admin" })),

    getAllSettings: vi.fn(() => {
      return Promise.resolve(mockSettings);
    }),
    getSetting: vi.fn((key: string) => {
      return Promise.resolve(mockSettings.find((s: any) => s.key === key) || null);
    }),
    getSettingsByCategory: vi.fn((category: string) => {
      return Promise.resolve(mockSettings.filter((s: any) => s.category === category));
    }),
    upsertSetting: vi.fn((data: any) => {
      const idx = mockSettings.findIndex((s: any) => s.key === data.key);
      if (idx >= 0) {
        Object.assign(mockSettings[idx], data);
      } else {
        mockSettings.push({ ...data, updatedAt: new Date() });
      }
      return Promise.resolve();
    }),
    bulkUpsertSettings: vi.fn((items: any[]) => {
      for (const data of items) {
        const idx = mockSettings.findIndex((s: any) => s.key === data.key);
        if (idx >= 0) {
          Object.assign(mockSettings[idx], data);
        } else {
          mockSettings.push({ ...data, updatedAt: new Date() });
        }
      }
      return Promise.resolve();
    }),
    deleteSetting: vi.fn((key: string) => {
      const idx = mockSettings.findIndex((s: any) => s.key === key);
      if (idx >= 0) mockSettings.splice(idx, 1);
      return Promise.resolve();
    }),
    seedDefaultSettings: vi.fn(() => Promise.resolve()),
    setSetting: vi.fn((key: string, value: string) => {
      const idx = mockSettings.findIndex((s: any) => s.key === key);
      if (idx >= 0) {
        mockSettings[idx].value = value;
      } else {
        mockSettings.push({ key, value, label: key, category: "general", type: "string", updatedAt: new Date() });
      }
      return Promise.resolve();
    }),
  };
});

// ─── Tests ───────────────────────────────────────────────────────────────

describe("categories", () => {
  it("lists categories as public user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.categories.list();
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("slug");
  });

  it("gets category by slug", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.categories.getBySlug({ slug: "politics" });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Politics");
  });

  it("creates category as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.categories.create({ name: "Sports", slug: "sports", description: "Sports satire" });
    // Should not throw
  });

  it("rejects category creation from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.categories.create({ name: "Test", slug: "test" })
    ).rejects.toThrow();
  });
});

describe("articles", () => {
  it("creates an article as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.articles.create({
      headline: "Test Satirical Article",
      subheadline: "This is a test subheadline",
      body: "<p>This is the body of the article.</p>",
      slug: "test-satirical-article",
      status: "pending",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("bulk creates articles as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.articles.bulkCreate({
      articles: [
        { headline: "Article 1", body: "<p>Body 1</p>", slug: "article-1", status: "pending", batchDate: "2026-02-16" },
        { headline: "Article 2", body: "<p>Body 2</p>", slug: "article-2", status: "pending", batchDate: "2026-02-16" },
        { headline: "Article 3", body: "<p>Body 3</p>", slug: "article-3", status: "draft", batchDate: "2026-02-16" },
      ],
    });
    expect(result.count).toBe(3);
    expect(result.ids).toHaveLength(3);
  });

  it("lists articles as public user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.articles.list({});
    expect(result).toHaveProperty("articles");
    expect(result).toHaveProperty("total");
  });

  it("updates article status as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // First create an article
    const { id } = await caller.articles.create({
      headline: "Status Test Article",
      body: "<p>Test</p>",
      slug: "status-test-article",
      status: "pending",
    });
    // Then update its status
    await caller.articles.updateStatus({ id, status: "approved" });
    // Should not throw
  });

  it("rejects article creation from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.articles.create({
        headline: "Unauthorized",
        body: "<p>Test</p>",
        slug: "unauthorized",
      })
    ).rejects.toThrow();
  });

  it("gets article stats as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.articles.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("published");
    expect(stats).toHaveProperty("pending");
  });
});

describe("newsletter", () => {
  it("subscribes an email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await caller.newsletter.subscribe({ email: "reader@example.com" });
    // Should not throw
  });

  it("unsubscribes an email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await caller.newsletter.unsubscribe({ email: "reader@example.com" });
    // Should not throw
  });

  it("rejects invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.newsletter.subscribe({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

describe("social posts", () => {
  it("creates a social post as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.social.create({
      articleId: 1,
      platform: "twitter",
      content: "Check out this satirical article! #satire",
      status: "draft",
    });
    expect(typeof result).toBe("number");
  });

  it("bulk creates social posts as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.social.bulkCreate({
      posts: [
        { articleId: 1, platform: "facebook", content: "Facebook post", status: "draft" },
        { articleId: 1, platform: "linkedin", content: "LinkedIn post", status: "draft" },
      ],
    });
    // Should not throw
  });

  it("updates social post status as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.social.updateStatus({ id: 1, status: "posted" });
    // Should not throw
  });
});

describe("workflow batches", () => {
  it("creates a workflow batch as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.workflow.create({
      batchDate: "2026-02-16",
      totalEvents: 20,
    });
    expect(result).toHaveProperty("id");
  });

  it("updates a workflow batch as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const { id } = await caller.workflow.create({
      batchDate: "2026-02-17",
      totalEvents: 15,
    });
    await caller.workflow.update({
      id,
      status: "generating",
      articlesGenerated: 15,
    });
    // Should not throw
  });

  it("lists workflow batches as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.workflow.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("settings", () => {
  it("lists all settings as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.settings.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result[0]).toHaveProperty("key");
    expect(result[0]).toHaveProperty("value");
  });

  it("gets a single setting by key", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.settings.get({ key: "articles_per_batch" });
    expect(result).toBeDefined();
    expect(result?.value).toBe("20");
  });

  it("gets settings by category", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.settings.getByCategory({ category: "generation" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("updates a setting as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({
      key: "articles_per_batch",
      value: "30",
    });
    // Verify the update
    const result = await caller.settings.get({ key: "articles_per_batch" });
    expect(result?.value).toBe("30");
  });

  it("bulk updates settings as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.bulkUpdate({
      settings: [
        { key: "articles_per_batch", value: "15" },
        { key: "ai_writing_style", value: "babylon" },
      ],
    });
    const result = await caller.settings.get({ key: "ai_writing_style" });
    expect(result?.value).toBe("babylon");
  });

  it("creates a new setting via update", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({
      key: "new_custom_setting",
      value: "custom_value",
      label: "Custom Setting",
      category: "custom",
      type: "string",
    });
    const result = await caller.settings.get({ key: "new_custom_setting" });
    expect(result?.value).toBe("custom_value");
  });

  it("deletes a setting as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.delete({ key: "new_custom_setting" });
    const result = await caller.settings.get({ key: "new_custom_setting" });
    expect(result).toBeNull();
  });

  it("rejects settings access from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.settings.list()).rejects.toThrow();
  });

  it("rejects settings update from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.settings.update({ key: "articles_per_batch", value: "5" })
    ).rejects.toThrow();
  });
});

describe("auth", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Admin User");
    expect(result?.role).toBe("admin");
  });
});

describe("scheduler settings integration", () => {
  it("can update schedule_hour setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_hour", value: "8" });
    const result = await caller.settings.get({ key: "schedule_hour" });
    expect(result?.value).toBe("8");
  });

  it("can update schedule_minute setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_minute", value: "30" });
    const result = await caller.settings.get({ key: "schedule_minute" });
    expect(result?.value).toBe("30");
  });

  it("can update schedule_timezone setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_timezone", value: "America/New_York" });
    const result = await caller.settings.get({ key: "schedule_timezone" });
    expect(result?.value).toBe("America/New_York");
  });

  it("can update schedule_days setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_days", value: "mon,wed,fri" });
    const result = await caller.settings.get({ key: "schedule_days" });
    expect(result?.value).toBe("mon,wed,fri");
  });

  it("can update workflow_enabled setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "workflow_enabled", value: "false" });
    const result = await caller.settings.get({ key: "workflow_enabled" });
    expect(result?.value).toBe("false");
  });

  it("can bulk update schedule settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.bulkUpdate({
      settings: [
        { key: "schedule_hour", value: "6", category: "schedule", type: "number" },
        { key: "schedule_minute", value: "15", category: "schedule", type: "number" },
        { key: "schedule_timezone", value: "UTC", category: "schedule", type: "string" },
        { key: "schedule_days", value: "mon,tue,wed,thu,fri,sat,sun", category: "schedule", type: "string" },
      ],
    });
    const hour = await caller.settings.get({ key: "schedule_hour" });
    const minute = await caller.settings.get({ key: "schedule_minute" });
    const tz = await caller.settings.get({ key: "schedule_timezone" });
    const days = await caller.settings.get({ key: "schedule_days" });
    expect(hour?.value).toBe("6");
    expect(minute?.value).toBe("15");
    expect(tz?.value).toBe("UTC");
    expect(days?.value).toBe("mon,tue,wed,thu,fri,sat,sun");
  });
});

// FeedHive tests archived (Feb 21, 2026) - see /archive/feedhive/feedhive-triggers.test.ts

describe("multi-run scheduler settings", () => {
  it("can update schedule_runs_per_day setting", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_runs_per_day", value: "3" });
    const result = await caller.settings.get({ key: "schedule_runs_per_day" });
    expect(result?.value).toBe("3");
  });

  it("can update schedule_run2_hour and schedule_run2_minute settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_run2_hour", value: "11" });
    await caller.settings.update({ key: "schedule_run2_minute", value: "30" });
    const hour = await caller.settings.get({ key: "schedule_run2_hour" });
    const minute = await caller.settings.get({ key: "schedule_run2_minute" });
    expect(hour?.value).toBe("11");
    expect(minute?.value).toBe("30");
  });

  it("can update schedule_run3_hour and schedule_run3_minute settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.update({ key: "schedule_run3_hour", value: "17" });
    await caller.settings.update({ key: "schedule_run3_minute", value: "0" });
    const hour = await caller.settings.get({ key: "schedule_run3_hour" });
    const minute = await caller.settings.get({ key: "schedule_run3_minute" });
    expect(hour?.value).toBe("17");
    expect(minute?.value).toBe("0");
  });

  it("can bulk update all multi-run schedule settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.settings.bulkUpdate({
      settings: [
        { key: "schedule_runs_per_day", value: "3", category: "schedule", type: "number" },
        { key: "schedule_hour", value: "5", category: "schedule", type: "number" },
        { key: "schedule_minute", value: "0", category: "schedule", type: "number" },
        { key: "schedule_run2_hour", value: "11", category: "schedule", type: "number" },
        { key: "schedule_run2_minute", value: "0", category: "schedule", type: "number" },
        { key: "schedule_run3_hour", value: "17", category: "schedule", type: "number" },
        { key: "schedule_run3_minute", value: "0", category: "schedule", type: "number" },
      ],
    });
    const runsPerDay = await caller.settings.get({ key: "schedule_runs_per_day" });
    const run2Hour = await caller.settings.get({ key: "schedule_run2_hour" });
    const run3Hour = await caller.settings.get({ key: "schedule_run3_hour" });
    expect(runsPerDay?.value).toBe("3");
    expect(run2Hour?.value).toBe("11");
    expect(run3Hour?.value).toBe("17");
  });
});

describe("standalone tweet scheduler settings", () => {
  it("can get standalone tweet settings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const settings = await caller.standaloneTweet.getSettings();
    expect(settings).toBeDefined();
    expect(typeof settings.enabled).toBe("boolean");
    expect(typeof settings.autoApprove).toBe("boolean");
    expect(typeof settings.dailyLimit).toBe("number");
    expect(typeof settings.scheduleTime).toBe("string");
    expect(typeof settings.batchSize).toBe("number");
  });

  it("can save standalone tweet schedule time", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.standaloneTweet.saveSettings({ scheduleTime: "08:30" });
    const settings = await caller.standaloneTweet.getSettings();
    expect(settings.scheduleTime).toBe("08:30");
  });

  it("can save standalone tweet batch size", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.standaloneTweet.saveSettings({ batchSize: 5 });
    const settings = await caller.standaloneTweet.getSettings();
    expect(settings.batchSize).toBe(5);
  });

  it("can enable/disable standalone tweet scheduler", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.standaloneTweet.saveSettings({ enabled: false });
    const settings = await caller.standaloneTweet.getSettings();
    expect(settings.enabled).toBe(false);
  });
});
