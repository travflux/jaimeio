/**
 * jsAnalytics.test.ts — v4.9.0
 * Unit tests for the JS-tracked analytics module.
 * Tests spam filter, referrer source parser, and payload validation logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseReferrerSource, isSpamReferrer } from "./jsAnalytics";

// Mock getSetting so tests don't need a DB connection
vi.mock("./db", () => ({
  getSetting: vi.fn().mockResolvedValue({ value: "[]" }),
  getDb: vi.fn().mockResolvedValue(null),
}));

// ─── parseReferrerSource ──────────────────────────────────────────────────────
describe("parseReferrerSource", () => {
  it("returns 'direct' for empty referrer", () => {
    expect(parseReferrerSource("")).toBe("direct");
  });

  it("returns 'direct' for undefined-like empty string", () => {
    expect(parseReferrerSource("")).toBe("direct");
  });

  it("identifies Google search", () => {
    expect(parseReferrerSource("https://www.google.com/search?q=satire+news")).toBe("google");
    expect(parseReferrerSource("https://google.co.uk/search?q=test")).toBe("google");
  });

  it("identifies Bing search", () => {
    expect(parseReferrerSource("https://www.bing.com/search?q=hambry")).toBe("bing");
  });

  it("identifies DuckDuckGo", () => {
    expect(parseReferrerSource("https://duckduckgo.com/?q=hambry")).toBe("duckduckgo");
  });

  it("identifies X/Twitter", () => {
    expect(parseReferrerSource("https://t.co/abc123")).toBe("x_twitter");
    expect(parseReferrerSource("https://twitter.com/hambry_com")).toBe("x_twitter");
    expect(parseReferrerSource("https://x.com/hambry_com")).toBe("x_twitter");
  });

  it("identifies Facebook", () => {
    expect(parseReferrerSource("https://www.facebook.com/sharer")).toBe("facebook");
    expect(parseReferrerSource("https://fb.com/post/123")).toBe("facebook");
  });

  it("identifies Reddit", () => {
    expect(parseReferrerSource("https://www.reddit.com/r/satire")).toBe("reddit");
  });

  it("identifies LinkedIn", () => {
    expect(parseReferrerSource("https://www.linkedin.com/feed")).toBe("linkedin");
  });

  it("identifies YouTube", () => {
    expect(parseReferrerSource("https://www.youtube.com/watch?v=abc")).toBe("youtube");
    expect(parseReferrerSource("https://youtu.be/abc123")).toBe("youtube");
  });

  it("identifies internal navigation when siteHostname matches", () => {
    expect(parseReferrerSource("https://hambry.com/article/some-slug", "hambry.com")).toBe("internal");
  });

  it("returns domain for unknown referrers", () => {
    expect(parseReferrerSource("https://example.com/page")).toBe("example.com");
  });

  it("returns 'unknown' for malformed URLs", () => {
    expect(parseReferrerSource("not-a-url")).toBe("unknown");
    expect(parseReferrerSource("javascript:void(0)")).toBe("unknown");
  });
});

// ─── isSpamReferrer ───────────────────────────────────────────────────────────
describe("isSpamReferrer", () => {
  it("returns false for empty referrer", async () => {
    expect(await isSpamReferrer("")).toBe(false);
  });

  it("returns false for legitimate referrers", async () => {
    expect(await isSpamReferrer("https://google.com/search?q=test")).toBe(false);
    expect(await isSpamReferrer("https://twitter.com/hambry_com")).toBe(false);
    expect(await isSpamReferrer("https://reddit.com/r/satire")).toBe(false);
  });

  it("returns true for known spam blog networks", async () => {
    expect(await isSpamReferrer("https://blogdosaga.com/post/123")).toBe(true);
    expect(await isSpamReferrer("https://win-blog.com/article")).toBe(true);
    expect(await isSpamReferrer("https://wikinarration.com/page")).toBe(true);
    expect(await isSpamReferrer("https://webdesign96.com/")).toBe(true);
    expect(await isSpamReferrer("https://life3dblog.com/post")).toBe(true);
  });

  it("returns false for malformed spam referrer URL", async () => {
    expect(await isSpamReferrer("not-a-url")).toBe(false);
  });
});

// ─── Session ID validation (inline test of the regex used in /api/track) ─────
describe("sessionId validation regex", () => {
  const UUID_REGEX = /^[0-9a-f-]{32,36}$/i;

  it("accepts valid UUIDs", () => {
    expect(UUID_REGEX.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(UUID_REGEX.test("550e8400e29b41d4a716446655440000")).toBe(true);
  });

  it("rejects injection attempts", () => {
    expect(UUID_REGEX.test("'; DROP TABLE js_page_views; --")).toBe(false);
    expect(UUID_REGEX.test("<script>alert(1)</script>")).toBe(false);
    expect(UUID_REGEX.test("../../../etc/passwd")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(UUID_REGEX.test("")).toBe(false);
  });
});
