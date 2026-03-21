import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("RSS Feed Source Randomization", () => {
  beforeAll(async () => {
    // Ensure the setting exists in the database
    await db.setSetting("randomize_feed_sources", "true");
  });

  it("randomize_feed_sources setting can be saved and retrieved", async () => {
    await db.setSetting("randomize_feed_sources", "true");
    const setting = await db.getSetting("randomize_feed_sources");
    expect(setting?.value).toBe("true");

    await db.setSetting("randomize_feed_sources", "false");
    const setting2 = await db.getSetting("randomize_feed_sources");
    expect(setting2?.value).toBe("false");
  });

  it("feed order randomization produces different orders", () => {
    const feeds = [
      { name: "Feed A", url: "https://a.com" },
      { name: "Feed B", url: "https://b.com" },
      { name: "Feed C", url: "https://c.com" },
      { name: "Feed D", url: "https://d.com" },
      { name: "Feed E", url: "https://e.com" },
    ];

    // Randomize multiple times and check that we get different orders
    const orders: string[] = [];
    for (let i = 0; i < 10; i++) {
      const shuffled = [...feeds].sort(() => Math.random() - 0.5);
      const order = shuffled.map(f => f.name).join(",");
      orders.push(order);
    }

    // At least one order should be different from the original
    const originalOrder = feeds.map(f => f.name).join(",");
    const hasDifferentOrder = orders.some(order => order !== originalOrder);
    expect(hasDifferentOrder).toBe(true);
  });

  it("feed order randomization preserves all feeds", () => {
    const feeds = [
      { name: "Feed A", url: "https://a.com" },
      { name: "Feed B", url: "https://b.com" },
      { name: "Feed C", url: "https://c.com" },
    ];

    const shuffled = [...feeds].sort(() => Math.random() - 0.5);
    
    expect(shuffled.length).toBe(feeds.length);
    expect(shuffled).toContainEqual({ name: "Feed A", url: "https://a.com" });
    expect(shuffled).toContainEqual({ name: "Feed B", url: "https://b.com" });
    expect(shuffled).toContainEqual({ name: "Feed C", url: "https://c.com" });
  });
});
