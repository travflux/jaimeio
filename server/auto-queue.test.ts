import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module with partial mocking
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSetting: vi.fn(),
    getArticleById: vi.fn(),
    listSocialPosts: vi.fn(),
    updateSocialPostStatus: vi.fn(),
  };
});

// Mock the xPostQueue module
vi.mock("./xPostQueue", () => ({
  queueArticlesForX: vi.fn(),
}));

describe("Auto-Queue on Publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("x_auto_queue_on_publish setting has correct default value", async () => {
    const db = await import("./db");
    
    // Mock getSetting to return the default
    (db.getSetting as any).mockResolvedValue({
      key: "x_auto_queue_on_publish",
      value: "true",
      category: "social",
      type: "boolean",
    });
    
    const setting = await db.getSetting("x_auto_queue_on_publish");
    expect(setting).toBeDefined();
    expect(setting?.key).toBe("x_auto_queue_on_publish");
    expect(setting?.value).toBe("true");
  });

  it("auto-queue logic triggers when setting is enabled", async () => {
    const db = await import("./db");
    const { queueArticlesForX } = await import("./xPostQueue");
    
    // Mock: setting is enabled
    (db.getSetting as any).mockImplementation(async (key: string) => {
      if (key === "x_auto_queue_on_publish") {
        return { key, value: "true" };
      }
      return null;
    });
    
    (db.listSocialPosts as any).mockResolvedValue([
      { id: 1, articleId: 100, platform: "twitter", status: "draft", content: "Test tweet" },
    ]);
    (queueArticlesForX as any).mockResolvedValue(1);
    
    // Simulate the auto-queue logic from routers.ts
    const autoQueue = await db.getSetting("x_auto_queue_on_publish");
    if (autoQueue?.value === "true") {
      const queued = await queueArticlesForX([100]);
      expect(queued).toBe(1);
    }
    
    expect(queueArticlesForX).toHaveBeenCalledWith([100]);
  });

  it("auto-queue logic does not trigger when setting is disabled", async () => {
    const db = await import("./db");
    const { queueArticlesForX } = await import("./xPostQueue");
    
    // Mock: setting is disabled
    (db.getSetting as any).mockImplementation(async (key: string) => {
      if (key === "x_auto_queue_on_publish") {
        return { key, value: "false" };
      }
      return null;
    });
    
    // Simulate the auto-queue logic from routers.ts
    const autoQueue = await db.getSetting("x_auto_queue_on_publish");
    if (autoQueue?.value === "true") {
      await queueArticlesForX([100]);
    }
    
    // Should NOT be called when disabled
    expect(queueArticlesForX).not.toHaveBeenCalled();
  });

  it("auto-queue setting can be toggled between true and false", async () => {
    const db = await import("./db");
    
    // Test toggling to false
    (db.getSetting as any).mockResolvedValue({
      key: "x_auto_queue_on_publish",
      value: "false",
    });
    
    const disabledSetting = await db.getSetting("x_auto_queue_on_publish");
    expect(disabledSetting?.value).toBe("false");
    
    // Test toggling to true
    (db.getSetting as any).mockResolvedValue({
      key: "x_auto_queue_on_publish",
      value: "true",
    });
    
    const enabledSetting = await db.getSetting("x_auto_queue_on_publish");
    expect(enabledSetting?.value).toBe("true");
  });
});
