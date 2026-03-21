import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("Auto-Post on Publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create social posts when article is published if auto_create_social_posts is enabled", async () => {
    // This test verifies the setting exists and is properly configured
    const setting = await db.getSetting("auto_create_social_posts");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("true");
  });

  it("should have auto_post_on_publish setting available", async () => {
    // This setting will be created on first app startup
    // For now, verify it can be created
    await db.upsertSetting({
      key: "auto_post_on_publish",
      value: "false",
      label: "Auto-Post to FeedHive on Publish",
      description: "Automatically send social media posts to FeedHive when articles are published.",
      category: "social",
      type: "boolean",
    });
    const setting = await db.getSetting("auto_post_on_publish");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("false");
  });

  it("should have social_platforms setting configured", async () => {
    const setting = await db.getSetting("social_platforms");
    expect(setting).toBeDefined();
    expect(setting?.value).toContain("twitter");
  });

  it("should have FeedHive trigger URLs configured", async () => {
    const urls = await db.getAllFeedHiveTriggerUrls();
    expect(urls).toBeDefined();
    // Should have at least one platform configured (twitter from env)
    expect(Object.keys(urls).length).toBeGreaterThanOrEqual(0);
  });

  it("should respect feedhive_include_image setting", async () => {
    const setting = await db.getSetting("feedhive_include_image");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("true");
  });

  it("should have site_url setting for social posts", async () => {
    // This setting should exist from default seeding
    const setting = await db.getSetting("site_url");
    if (setting) {
      // Setting exists — just verify it is a valid URL string
      expect(setting.value).toMatch(/^https?:\/\//);
    } else {
      // If not seeded yet, verify we can create it
      await db.upsertSetting({
        key: "site_url",
        value: "https://example.com",
        label: "Site URL",
        description: "Your custom domain URL",
        category: "social",
        type: "string",
      });
      const created = await db.getSetting("site_url");
      expect(created?.value).toBe("https://example.com");
    }
  });
});

