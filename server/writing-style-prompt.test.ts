import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Writing Style Prompt Configuration", () => {
  beforeAll(async () => {
    // Ensure database is initialized
    await db.getAllSettings();
  });

  afterAll(async () => {
    // Clean up test settings
    await db.setSetting("writing_style_prompt", "");
    await db.setSetting("ai_custom_prompt", "");
  });

  it("should have writing_style_prompt setting available", async () => {
    // This is the key that the admin UI saves to
    await db.setSetting("writing_style_prompt", "Test custom writing style");
    const setting = await db.getSetting("writing_style_prompt");
    expect(setting).toBeDefined();
    expect(setting?.key).toBe("writing_style_prompt");
    expect(setting?.value).toBe("Test custom writing style");
  });

  it("should have ai_custom_prompt setting available for additional instructions", async () => {
    // This is for additional instructions, not the primary writing style
    await db.setSetting("ai_custom_prompt", "Test additional instructions");
    const setting = await db.getSetting("ai_custom_prompt");
    expect(setting).toBeDefined();
    expect(setting?.key).toBe("ai_custom_prompt");
    expect(setting?.value).toBe("Test additional instructions");
  });

  it("should allow both writing_style_prompt and ai_custom_prompt to be set independently", async () => {
    await db.setSetting("writing_style_prompt", "Custom style prompt");
    await db.setSetting("ai_custom_prompt", "Additional instructions");
    
    const stylePrompt = await db.getSetting("writing_style_prompt");
    const additionalPrompt = await db.getSetting("ai_custom_prompt");
    
    expect(stylePrompt?.value).toBe("Custom style prompt");
    expect(additionalPrompt?.value).toBe("Additional instructions");
  });

  it("should persist writing_style_prompt across updates", async () => {
    await db.setSetting("writing_style_prompt", "Initial value");
    let setting = await db.getSetting("writing_style_prompt");
    expect(setting?.value).toBe("Initial value");
    
    await db.setSetting("writing_style_prompt", "Updated value");
    setting = await db.getSetting("writing_style_prompt");
    expect(setting?.value).toBe("Updated value");
  });
});
