/**
 * Phase 4 Source Tests — YouTube Agent + Web Scraper
 *
 * Tests config parsing, enabled flags, graceful skipping,
 * URL resolution, and scraper config validation.
 * No real HTTP calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── YouTube Agent Tests ──────────────────────────────────────────────────────

describe("YouTube Agent", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 0 when youtube_enabled is false", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async (key: string) => {
        if (key === "youtube_enabled") return { value: "false" };
        return null;
      }),
    }));
    const { fetchYouTubeCandidates } = await import("./sources/youtube-agent");
    const result = await fetchYouTubeCandidates("2026-03-08");
    expect(result).toBe(0);
  });

  it("returns 0 when no YOUTUBE_API_KEY is set", async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;

    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async (key: string) => {
        if (key === "youtube_enabled") return { value: "true" };
        if (key === "youtube_channels") return { value: "UCtest123" };
        return null;
      }),
    }));

    const { fetchYouTubeCandidates } = await import("./sources/youtube-agent");
    const result = await fetchYouTubeCandidates("2026-03-08");
    expect(result).toBe(0);

    process.env.YOUTUBE_API_KEY = originalKey;
  });

  it("returns 0 when no channels or queries are configured", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key-for-test";

    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async (key: string) => {
        if (key === "youtube_enabled") return { value: "true" };
        if (key === "youtube_channels") return { value: "" };
        if (key === "youtube_search_queries") return { value: "" };
        return null;
      }),
    }));

    const { fetchYouTubeCandidates } = await import("./sources/youtube-agent");
    const result = await fetchYouTubeCandidates("2026-03-08");
    expect(result).toBe(0);

    delete process.env.YOUTUBE_API_KEY;
  });

  it("getConfiguredYouTubeChannels parses newline-separated channel IDs", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({
        value: "UCabc123\nUCdef456\n  UCghi789  \n",
      })),
    }));
    const { getConfiguredYouTubeChannels } = await import("./sources/youtube-agent");
    const channels = await getConfiguredYouTubeChannels();
    expect(channels).toEqual(["UCabc123", "UCdef456", "UCghi789"]);
  });

  it("getConfiguredYouTubeChannels caps at 10 channels", async () => {
    const manyChannels = Array.from({ length: 15 }, (_, i) => `UC${i}`).join("\n");
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({ value: manyChannels })),
    }));
    const { getConfiguredYouTubeChannels } = await import("./sources/youtube-agent");
    const channels = await getConfiguredYouTubeChannels();
    expect(channels.length).toBe(10);
  });

  it("isYouTubeEnabled returns true by default", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const { isYouTubeEnabled } = await import("./sources/youtube-agent");
    const enabled = await isYouTubeEnabled();
    expect(enabled).toBe(true);
  });

  it("isYouTubeEnabled returns false when set to false", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({ value: "false" })),
    }));
    const { isYouTubeEnabled } = await import("./sources/youtube-agent");
    const enabled = await isYouTubeEnabled();
    expect(enabled).toBe(false);
  });
});

// ─── Web Scraper Tests ────────────────────────────────────────────────────────

describe("Web Scraper", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 0 when web_scraper_enabled is false", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async (key: string) => {
        if (key === "web_scraper_enabled") return { value: "false" };
        return null;
      }),
    }));
    const { fetchScraperCandidates } = await import("./sources/web-scraper");
    const result = await fetchScraperCandidates("2026-03-08");
    expect(result).toBe(0);
  });

  it("returns 0 when no scrapers are configured", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async (key: string) => {
        if (key === "web_scraper_enabled") return { value: "true" };
        if (key === "web_scraper_configs") return { value: "[]" };
        return null;
      }),
    }));
    const { fetchScraperCandidates } = await import("./sources/web-scraper");
    const result = await fetchScraperCandidates("2026-03-08");
    expect(result).toBe(0);
  });

  it("getConfiguredScrapers returns empty array for invalid JSON", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({ value: "not valid json {{" })),
    }));
    const { getConfiguredScrapers } = await import("./sources/web-scraper");
    const scrapers = await getConfiguredScrapers();
    expect(scrapers).toEqual([]);
  });

  it("getConfiguredScrapers filters out invalid entries", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({
        value: JSON.stringify([
          { name: "Valid", url: "https://example.com", itemSelector: "article", titleSelector: "h2" },
          { name: "Missing URL", itemSelector: "article", titleSelector: "h2" },
          { url: "https://example.com", itemSelector: "article", titleSelector: "h2" },
          null,
          42,
        ]),
      })),
    }));
    const { getConfiguredScrapers } = await import("./sources/web-scraper");
    const scrapers = await getConfiguredScrapers();
    expect(scrapers.length).toBe(1);
    expect(scrapers[0].name).toBe("Valid");
  });

  it("getConfiguredScrapers returns empty array for non-array JSON", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => ({ value: '{"name": "not an array"}' })),
    }));
    const { getConfiguredScrapers } = await import("./sources/web-scraper");
    const scrapers = await getConfiguredScrapers();
    expect(scrapers).toEqual([]);
  });

  it("isWebScraperEnabled returns true by default", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const { isWebScraperEnabled } = await import("./sources/web-scraper");
    const enabled = await isWebScraperEnabled();
    expect(enabled).toBe(true);
  });

  it("scrapeUrl handles fetch errors gracefully", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    // Patch global fetch to throw
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { scrapeUrl } = await import("./sources/web-scraper");
    const result = await scrapeUrl({
      name: "Test",
      url: "https://example.com/news",
      itemSelector: "article",
      titleSelector: "h2",
    });
    expect(result).toEqual([]);

    global.fetch = originalFetch;
  });

  it("scrapeUrl handles non-200 status gracefully", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "Forbidden" } as any);

    const { scrapeUrl } = await import("./sources/web-scraper");
    const result = await scrapeUrl({
      name: "Test",
      url: "https://example.com/news",
      itemSelector: "article",
      titleSelector: "h2",
    });
    expect(result).toEqual([]);

    global.fetch = originalFetch;
  });

  it("scrapeUrl parses HTML and extracts items", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const html = `
      <html><body>
        <article><h2><a href="/story-1">Big Story One</a></h2></article>
        <article><h2><a href="/story-2">Another Story Here</a></h2></article>
        <article><h2></h2></article>
      </body></html>
    `;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => html,
    } as any);

    const { scrapeUrl } = await import("./sources/web-scraper");
    const items = await scrapeUrl({
      name: "Test Site",
      url: "https://example.com/news",
      itemSelector: "article",
      titleSelector: "h2",
      priority: 60,
    });

    expect(items.length).toBe(2);
    expect(items[0].title).toBe("Big Story One");
    expect(items[1].title).toBe("Another Story Here");
    expect(items[0].priority).toBe(60);
    expect(items[0].sourceType).toBe("scraper");

    global.fetch = originalFetch;
  });

  it("scrapeUrl resolves relative URLs against base", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const html = `
      <html><body>
        <article><h2><a href="/news/story-1">Story One</a></h2></article>
      </body></html>
    `;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => html } as any);

    const { scrapeUrl } = await import("./sources/web-scraper");
    const items = await scrapeUrl({
      name: "Test",
      url: "https://example.com/news",
      itemSelector: "article",
      titleSelector: "h2",
    });

    expect(items[0].sourceUrl).toBe("https://example.com/news/story-1");

    global.fetch = originalFetch;
  });

  it("scrapeUrl caps results at 20 items", async () => {
    vi.doMock("../server/db", () => ({
      getSetting: vi.fn(async () => null),
    }));
    const articles = Array.from({ length: 30 }, (_, i) =>
      `<article><h2><a href="/story-${i}">Story ${i}</a></h2></article>`
    ).join("");
    const html = `<html><body>${articles}</body></html>`;
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => html } as any);

    const { scrapeUrl } = await import("./sources/web-scraper");
    const items = await scrapeUrl({
      name: "Test",
      url: "https://example.com/news",
      itemSelector: "article",
      titleSelector: "h2",
    });

    expect(items.length).toBe(20);

    global.fetch = originalFetch;
  });
});
