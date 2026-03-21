import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => {
  const settingsStore: Record<string, { key: string; value: string }> = {};

  return {
    getSetting: vi.fn(async (key: string) => settingsStore[key]),
    getAllSettings: vi.fn(async () => Object.values(settingsStore)),
    upsertSetting: vi.fn(async (data: { key: string; value: string }) => {
      settingsStore[data.key] = data;
    }),
    getFeedHiveTriggerUrl: vi.fn(async (platform: string) => {
      const platformKey = `feedhive_trigger_url_${platform}`;
      if (settingsStore[platformKey]?.value) return settingsStore[platformKey].value;
      if (settingsStore["feedhive_trigger_url"]?.value) return settingsStore["feedhive_trigger_url"].value;
      return undefined;
    }),
    getAllFeedHiveTriggerUrls: vi.fn(async () => {
      const result: Record<string, string> = {};
      const defaultUrl = settingsStore["feedhive_trigger_url"]?.value || "";
      const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"];
      for (const platform of platforms) {
        const platformUrl = settingsStore[`feedhive_trigger_url_${platform}`]?.value;
        if (platformUrl) {
          result[platform] = platformUrl;
        } else if (defaultUrl) {
          result[platform] = defaultUrl;
        }
      }
      return result;
    }),
    // Expose store for test manipulation
    _settingsStore: settingsStore,
  };
});

import * as db from "./db";

// Access the mock store for test setup
const mockStore = (db as any)._settingsStore as Record<string, { key: string; value: string }>;

describe("FeedHive Multi-Platform Trigger URLs", () => {
  beforeEach(() => {
    // Clear the mock store
    Object.keys(mockStore).forEach(key => delete mockStore[key]);
    vi.clearAllMocks();
  });

  describe("getFeedHiveTriggerUrl", () => {
    it("should return platform-specific URL when configured", async () => {
      mockStore["feedhive_trigger_url_twitter"] = {
        key: "feedhive_trigger_url_twitter",
        value: "https://api.feedhive.com/triggers/twitter-123",
      };
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-456",
      };

      const url = await db.getFeedHiveTriggerUrl("twitter");
      expect(url).toBe("https://api.feedhive.com/triggers/twitter-123");
    });

    it("should fall back to default URL when platform-specific URL is not set", async () => {
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-456",
      };

      const url = await db.getFeedHiveTriggerUrl("facebook");
      expect(url).toBe("https://api.feedhive.com/triggers/default-456");
    });

    it("should return undefined when no URL is configured", async () => {
      const url = await db.getFeedHiveTriggerUrl("instagram");
      expect(url).toBeUndefined();
    });

    it("should not fall back if platform-specific URL exists but is empty", async () => {
      mockStore["feedhive_trigger_url_linkedin"] = {
        key: "feedhive_trigger_url_linkedin",
        value: "",
      };
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-456",
      };

      const url = await db.getFeedHiveTriggerUrl("linkedin");
      // Empty string is falsy, so it should fall back to default
      expect(url).toBe("https://api.feedhive.com/triggers/default-456");
    });
  });

  describe("getAllFeedHiveTriggerUrls", () => {
    it("should return all platform-specific URLs", async () => {
      mockStore["feedhive_trigger_url_twitter"] = {
        key: "feedhive_trigger_url_twitter",
        value: "https://api.feedhive.com/triggers/twitter-123",
      };
      mockStore["feedhive_trigger_url_facebook"] = {
        key: "feedhive_trigger_url_facebook",
        value: "https://api.feedhive.com/triggers/facebook-456",
      };

      const urls = await db.getAllFeedHiveTriggerUrls();
      expect(urls.twitter).toBe("https://api.feedhive.com/triggers/twitter-123");
      expect(urls.facebook).toBe("https://api.feedhive.com/triggers/facebook-456");
      expect(urls.linkedin).toBeUndefined();
    });

    it("should fill unconfigured platforms with default URL", async () => {
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-789",
      };
      mockStore["feedhive_trigger_url_twitter"] = {
        key: "feedhive_trigger_url_twitter",
        value: "https://api.feedhive.com/triggers/twitter-123",
      };

      const urls = await db.getAllFeedHiveTriggerUrls();
      expect(urls.twitter).toBe("https://api.feedhive.com/triggers/twitter-123");
      expect(urls.facebook).toBe("https://api.feedhive.com/triggers/default-789");
      expect(urls.linkedin).toBe("https://api.feedhive.com/triggers/default-789");
      expect(urls.instagram).toBe("https://api.feedhive.com/triggers/default-789");
      expect(urls.threads).toBe("https://api.feedhive.com/triggers/default-789");
    });

    it("should return empty object when nothing is configured", async () => {
      const urls = await db.getAllFeedHiveTriggerUrls();
      expect(Object.keys(urls).length).toBe(0);
    });

    it("should handle all platforms configured individually", async () => {
      const platforms = ["twitter", "facebook", "linkedin", "instagram", "threads"];
      for (const p of platforms) {
        mockStore[`feedhive_trigger_url_${p}`] = {
          key: `feedhive_trigger_url_${p}`,
          value: `https://api.feedhive.com/triggers/${p}-unique`,
        };
      }

      const urls = await db.getAllFeedHiveTriggerUrls();
      for (const p of platforms) {
        expect(urls[p]).toBe(`https://api.feedhive.com/triggers/${p}-unique`);
      }
    });
  });

  describe("Platform-specific routing logic", () => {
    it("should route each platform to its own trigger URL", async () => {
      mockStore["feedhive_trigger_url_twitter"] = {
        key: "feedhive_trigger_url_twitter",
        value: "https://api.feedhive.com/triggers/twitter-abc",
      };
      mockStore["feedhive_trigger_url_facebook"] = {
        key: "feedhive_trigger_url_facebook",
        value: "https://api.feedhive.com/triggers/facebook-def",
      };
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-ghi",
      };

      // Twitter should use its own URL
      const twitterUrl = await db.getFeedHiveTriggerUrl("twitter");
      expect(twitterUrl).toBe("https://api.feedhive.com/triggers/twitter-abc");

      // Facebook should use its own URL
      const facebookUrl = await db.getFeedHiveTriggerUrl("facebook");
      expect(facebookUrl).toBe("https://api.feedhive.com/triggers/facebook-def");

      // Instagram should fall back to default
      const instagramUrl = await db.getFeedHiveTriggerUrl("instagram");
      expect(instagramUrl).toBe("https://api.feedhive.com/triggers/default-ghi");
    });

    it("should handle unknown platform gracefully by using default", async () => {
      mockStore["feedhive_trigger_url"] = {
        key: "feedhive_trigger_url",
        value: "https://api.feedhive.com/triggers/default-xyz",
      };

      const url = await db.getFeedHiveTriggerUrl("tiktok");
      expect(url).toBe("https://api.feedhive.com/triggers/default-xyz");
    });
  });
});
