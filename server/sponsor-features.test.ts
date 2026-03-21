/**
 * sponsor-features.test.ts
 * Tests for v4.8.3: per-article attribution, A/B testing, and sponsor scheduling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sponsorIsActive(
  enabled: string,
  activeFrom: string,
  activeUntil: string,
  now: Date = new Date()
): boolean {
  if (enabled !== "true") return false;
  if (activeFrom) {
    const from = new Date(activeFrom);
    if (!isNaN(from.getTime()) && now < from) return false;
  }
  if (activeUntil) {
    const until = new Date(activeUntil);
    if (!isNaN(until.getTime()) && now > until) return false;
  }
  return true;
}

function pickVariant(abEnabled: string): "a" | "b" {
  if (abEnabled !== "true") return "a";
  return Math.random() < 0.5 ? "a" : "b";
}

function buildTrackingUrl(
  baseUrl: string,
  slug: string,
  variant: "a" | "b"
): string {
  return `/api/go/article-sponsor?slug=${encodeURIComponent(slug)}&variant=${variant}&dest=${encodeURIComponent(baseUrl)}`;
}

// ─── Scheduling tests ─────────────────────────────────────────────────────────

describe("Sponsor scheduling", () => {
  it("returns false when enabled is false regardless of dates", () => {
    expect(sponsorIsActive("false", "", "")).toBe(false);
    expect(sponsorIsActive("false", "2020-01-01", "2099-01-01")).toBe(false);
  });

  it("returns true when enabled and no date restrictions", () => {
    expect(sponsorIsActive("true", "", "")).toBe(true);
  });

  it("returns false when current time is before active_from", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString(); // +1 day
    expect(sponsorIsActive("true", future, "")).toBe(false);
  });

  it("returns true when current time is after active_from", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString(); // -1 day
    expect(sponsorIsActive("true", past, "")).toBe(true);
  });

  it("returns false when current time is after active_until", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString(); // -1 day
    expect(sponsorIsActive("true", "", past)).toBe(false);
  });

  it("returns true when current time is before active_until", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString(); // +1 day
    expect(sponsorIsActive("true", "", future)).toBe(true);
  });

  it("returns true when within active window", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(sponsorIsActive("true", past, future)).toBe(true);
  });

  it("returns false when outside active window (expired)", () => {
    const past1 = new Date(Date.now() - 172_800_000).toISOString(); // -2 days
    const past2 = new Date(Date.now() - 86_400_000).toISOString();  // -1 day
    expect(sponsorIsActive("true", past1, past2)).toBe(false);
  });

  it("ignores invalid date strings gracefully", () => {
    expect(sponsorIsActive("true", "not-a-date", "also-not-a-date")).toBe(true);
  });
});

// ─── A/B testing tests ────────────────────────────────────────────────────────

describe("A/B sponsor testing", () => {
  it("always returns variant a when A/B test is disabled", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickVariant("false")).toBe("a");
    }
  });

  it("returns a or b when A/B test is enabled", () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(pickVariant("true"));
    }
    // With 100 trials, both variants should appear (probability of all-a is 2^-100)
    expect(results.has("a")).toBe(true);
    expect(results.has("b")).toBe(true);
  });

  it("only returns a or b, never other values", () => {
    for (let i = 0; i < 50; i++) {
      const v = pickVariant("true");
      expect(["a", "b"]).toContain(v);
    }
  });
});

// ─── Attribution tracking URL tests ───────────────────────────────────────────

describe("Sponsor attribution tracking URL", () => {
  it("includes slug and variant in tracking URL", () => {
    const url = buildTrackingUrl("https://example.com", "my-article-slug", "a");
    expect(url).toContain("slug=my-article-slug");
    expect(url).toContain("variant=a");
    expect(url).toContain("/api/go/article-sponsor");
  });

  it("URL-encodes the destination", () => {
    const url = buildTrackingUrl("https://example.com/path?foo=bar", "slug", "b");
    expect(url).toContain("dest=https%3A%2F%2Fexample.com%2Fpath%3Ffoo%3Dbar");
  });

  it("URL-encodes slug with special characters", () => {
    const url = buildTrackingUrl("https://example.com", "slug with spaces", "a");
    expect(url).toContain("slug=slug%20with%20spaces");
  });

  it("variant b produces different URL than variant a", () => {
    const urlA = buildTrackingUrl("https://example.com", "slug", "a");
    const urlB = buildTrackingUrl("https://example.com", "slug", "b");
    expect(urlA).not.toBe(urlB);
    expect(urlA).toContain("variant=a");
    expect(urlB).toContain("variant=b");
  });
});

// ─── DEFAULT_SETTINGS coverage ────────────────────────────────────────────────

describe("Sponsor DEFAULT_SETTINGS keys", () => {
  const EXPECTED_KEYS = [
    // Scheduling
    "sponsor_bar_active_from",
    "sponsor_bar_active_until",
    "article_sponsor_active_from",
    "article_sponsor_active_until",
    // A/B testing
    "article_sponsor_ab_test_enabled",
    "article_sponsor_b_label",
    "article_sponsor_b_cta",
    "article_sponsor_b_description",
    "article_sponsor_b_image_url",
    "article_sponsor_b_bg_color",
    "article_sponsor_b_border_color",
    "article_sponsor_b_header_bg_color",
    "article_sponsor_b_cta_bg_color",
    "article_sponsor_b_cta_text_color",
  ];

  it("all expected v4.8.3 keys are defined", async () => {
    const { DEFAULT_SETTINGS } = await import("./db.js");
    // DEFAULT_SETTINGS is an array of { key, value, ... } objects
    const keySet = new Set(DEFAULT_SETTINGS.map((s: { key: string }) => s.key));
    for (const key of EXPECTED_KEYS) {
      expect(
        keySet.has(key),
        `DEFAULT_SETTINGS missing key: ${key}`
      ).toBe(true);
    }
  });
});
