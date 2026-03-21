import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Homepage Settings", () => {
  beforeAll(async () => {
    // Ensure default settings are seeded
    await db.seedDefaultSettings();
  });

  describe("Database Defaults", () => {
    it("should have homepage_show_ticker setting with default value 'true'", async () => {
      const setting = await db.getSetting("homepage_show_ticker");
      expect(setting).toBeDefined();
      expect(setting?.value).toBe("true");
      expect(setting?.category).toBe("homepage");
    });

    it("should have homepage_show_trending setting with default value 'true'", async () => {
      const setting = await db.getSetting("homepage_show_trending");
      expect(setting).toBeDefined();
      expect(setting?.value).toBe("true");
      expect(setting?.category).toBe("homepage");
    });

    it("should have homepage_show_categories setting with default value 'true'", async () => {
      const setting = await db.getSetting("homepage_show_categories");
      expect(setting).toBeDefined();
      expect(setting?.value).toBe("true");
      expect(setting?.category).toBe("homepage");
    });

    it("should have homepage_show_sidebar setting with default value 'true'", async () => {
      const setting = await db.getSetting("homepage_show_sidebar");
      expect(setting).toBeDefined();
      expect(setting?.value).toBe("true");
      expect(setting?.category).toBe("homepage");
    });
  });

  describe("Settings CRUD", () => {
    it("should update homepage_show_ticker setting", async () => {
      await db.setSetting("homepage_show_ticker", "false");
      const setting = await db.getSetting("homepage_show_ticker");
      expect(setting?.value).toBe("false");
      
      // Restore default
      await db.setSetting("homepage_show_ticker", "true");
    });

    it("should update homepage_show_trending setting", async () => {
      await db.setSetting("homepage_show_trending", "false");
      const setting = await db.getSetting("homepage_show_trending");
      expect(setting?.value).toBe("false");
      
      // Restore default
      await db.setSetting("homepage_show_trending", "true");
    });

    it("should update homepage_show_categories setting", async () => {
      await db.setSetting("homepage_show_categories", "false");
      const setting = await db.getSetting("homepage_show_categories");
      expect(setting?.value).toBe("false");
      
      // Restore default
      await db.setSetting("homepage_show_categories", "true");
    });

    it("should update homepage_show_sidebar setting", async () => {
      await db.setSetting("homepage_show_sidebar", "false");
      const setting = await db.getSetting("homepage_show_sidebar");
      expect(setting?.value).toBe("false");
      
      // Restore default
      await db.setSetting("homepage_show_sidebar", "true");
    });
  });

  describe("Get Settings by Category", () => {
    it("should retrieve all homepage settings by category", async () => {
      const settings = await db.getSettingsByCategory("homepage");
      expect(settings.length).toBeGreaterThanOrEqual(5); // trending_time_window_hours + 4 toggles
      
      const keys = settings.map(s => s.key);
      expect(keys).toContain("homepage_show_ticker");
      expect(keys).toContain("homepage_show_trending");
      expect(keys).toContain("homepage_show_categories");
      expect(keys).toContain("homepage_show_sidebar");
      expect(keys).toContain("trending_time_window_hours");
    });
  });
});
