import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("Video Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have auto_generate_videos setting available", async () => {
    // This setting will be created on first app startup
    // For now, verify it can be created
    await db.upsertSetting({
      key: "auto_generate_videos",
      value: "false",
      label: "Auto-Generate Videos",
      description: "Automatically generate videos for each article during the workflow.",
      category: "video_providers",
      type: "boolean",
    });
    const setting = await db.getSetting("auto_generate_videos");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("false");
  });

  it("should have video_provider setting configured", async () => {
    await db.upsertSetting({
      key: "video_provider",
      value: "manus",
      label: "Video Provider",
      description: "Primary video generation provider (manus, openai, replicate, custom).",
      category: "video_providers",
      type: "string",
    });
    const setting = await db.getSetting("video_provider");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("manus");
  });

  it("should have video_duration setting", async () => {
    await db.upsertSetting({
      key: "video_duration",
      value: "5",
      label: "Video Duration (seconds)",
      description: "Default duration for generated videos (5-60 seconds).",
      category: "video_providers",
      type: "number",
    });
    const setting = await db.getSetting("video_duration");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("5");
  });

  it("should have video_aspect_ratio setting", async () => {
    await db.upsertSetting({
      key: "video_aspect_ratio",
      value: "16:9",
      label: "Video Aspect Ratio",
      description: "Aspect ratio for generated videos (16:9, 9:16, or 1:1).",
      category: "video_providers",
      type: "string",
    });
    const setting = await db.getSetting("video_aspect_ratio");
    expect(setting).toBeDefined();
    expect(["16:9", "9:16", "1:1"]).toContain(setting?.value);
  });

  it("should have video_style_prompt setting", async () => {
    await db.upsertSetting({
      key: "video_style_prompt",
      value: "Professional news broadcast style, high production quality, cinematic lighting",
      label: "Video Style Prompt",
      description: "Base style description for video generation.",
      category: "video_providers",
      type: "text",
    });
    const setting = await db.getSetting("video_style_prompt");
    expect(setting).toBeDefined();
    expect(setting?.value).toContain("Professional");
  });

  it("should have video_provider_fallback_enabled setting", async () => {
    await db.upsertSetting({
      key: "video_provider_fallback_enabled",
      value: "true",
      label: "Enable Fallback to Manus",
      description: "If the primary video provider fails, automatically fall back to the built-in Manus provider.",
      category: "video_providers",
      type: "boolean",
    });
    const setting = await db.getSetting("video_provider_fallback_enabled");
    expect(setting).toBeDefined();
    expect(setting?.value).toBe("true");
  });

  it("should have video provider API key settings", async () => {
    const settings = [
      { key: "video_provider_replicate_api_key", label: "Replicate API Key" },
      { key: "video_provider_custom_api_url", label: "Custom API URL" },
      { key: "video_provider_custom_api_key", label: "Custom API Key" },
    ];

    for (const setting of settings) {
      await db.upsertSetting({
        key: setting.key,
        value: "",
        label: setting.label,
        description: "API configuration for video generation",
        category: "video_providers",
        type: "string",
      });
      const saved = await db.getSetting(setting.key);
      expect(saved).toBeDefined();
      expect(saved?.category).toBe("video_providers");
    }
  });

  it("should have video_provider_replicate_model setting", async () => {
    await db.upsertSetting({
      key: "video_provider_replicate_model",
      value: "runway/gen-3-lite",
      label: "Replicate Model",
      description: "Replicate model version ID or name for video generation.",
      category: "video_providers",
      type: "string",
    });
    const setting = await db.getSetting("video_provider_replicate_model");
    expect(setting).toBeDefined();
    expect(setting?.value).toContain("runway");
  });

  it("should retrieve video settings by category", async () => {
    const settings = await db.getSettingsByCategory("video_providers");
    expect(settings).toBeDefined();
    expect(Array.isArray(settings)).toBe(true);
    // Should have at least the settings we just created
    expect(settings.length).toBeGreaterThan(0);
  });
});
