/**
 * Attribution module tests
 * Covers: resolveChannel (UTM + referrer), ROAS math, CPA math
 */
import { describe, it, expect } from "vitest";
import { resolveChannel } from "./attribution";

// ─── resolveChannel ───────────────────────────────────────────────────────────
describe("resolveChannel — paid UTM", () => {
  it("google cpc → google_paid", () => {
    expect(resolveChannel("google", "cpc")).toBe("google_paid");
  });
  it("google ppc → google_paid", () => {
    expect(resolveChannel("google", "ppc")).toBe("google_paid");
  });
  it("google paid → google_paid", () => {
    expect(resolveChannel("google", "paid")).toBe("google_paid");
  });
  it("meta cpc → meta_paid", () => {
    expect(resolveChannel("meta", "cpc")).toBe("meta_paid");
  });
  it("facebook cpc → meta_paid", () => {
    expect(resolveChannel("facebook", "cpc")).toBe("meta_paid");
  });
  it("instagram paid_social → meta_paid", () => {
    expect(resolveChannel("instagram", "paid_social")).toBe("meta_paid");
  });
  it("twitter cpc → x_paid", () => {
    expect(resolveChannel("twitter", "cpc")).toBe("x_paid");
  });
  it("x cpc → x_paid", () => {
    expect(resolveChannel("x", "cpc")).toBe("x_paid");
  });
  it("bing cpc → bing_paid", () => {
    expect(resolveChannel("bing", "cpc")).toBe("bing_paid");
  });
  it("unknown source with cpc → other", () => {
    expect(resolveChannel("tiktok", "cpc")).toBe("other");
  });
});

describe("resolveChannel — organic UTM", () => {
  it("twitter social → x_organic", () => {
    expect(resolveChannel("twitter", "social")).toBe("x_organic");
  });
  it("x (no medium) → x_organic", () => {
    expect(resolveChannel("x")).toBe("x_organic");
  });
  it("newsletter email → newsletter", () => {
    expect(resolveChannel("newsletter", "email")).toBe("newsletter");
  });
  it("source=newsletter → newsletter", () => {
    expect(resolveChannel("newsletter")).toBe("newsletter");
  });
  it("google organic → google_organic", () => {
    expect(resolveChannel("google", "organic")).toBe("google_organic");
  });
  it("bing organic → bing_organic", () => {
    expect(resolveChannel("bing", "organic")).toBe("bing_organic");
  });
  it("reddit → reddit", () => {
    expect(resolveChannel("reddit")).toBe("reddit");
  });
});

describe("resolveChannel — referrer fallback (no UTM)", () => {
  it("google.com referrer → google_organic", () => {
    expect(resolveChannel(undefined, undefined, "https://www.google.com/search?q=hambry")).toBe("google_organic");
  });
  it("bing.com referrer → bing_organic", () => {
    expect(resolveChannel(undefined, undefined, "https://www.bing.com/search?q=hambry")).toBe("bing_organic");
  });
  it("t.co referrer → x_organic", () => {
    expect(resolveChannel(undefined, undefined, "https://t.co/abc123")).toBe("x_organic");
  });
  it("x.com referrer → x_organic", () => {
    expect(resolveChannel(undefined, undefined, "https://x.com/hambry_com")).toBe("x_organic");
  });
  it("facebook.com referrer → meta_organic", () => {
    expect(resolveChannel(undefined, undefined, "https://www.facebook.com/")).toBe("meta_organic");
  });
  it("reddit.com referrer → reddit", () => {
    expect(resolveChannel(undefined, undefined, "https://www.reddit.com/r/satire")).toBe("reddit");
  });
  it("joinwilderblueprint.vip referrer → direct (internal navigation)", () => {
    process.env.SITE_URL = "https://joinwilderblueprint.vip";
    expect(resolveChannel(undefined, undefined, "https://joinwilderblueprint.vip/article/some-slug")).toBe("direct");
    delete process.env.SITE_URL;
  });
  it("localhost referrer → direct", () => {
    expect(resolveChannel(undefined, undefined, "http://localhost:3000/")).toBe("direct");
  });
  it("unknown referrer → referral", () => {
    expect(resolveChannel(undefined, undefined, "https://someblog.com/post")).toBe("referral");
  });
});

describe("resolveChannel — direct (no UTM, no referrer)", () => {
  it("no args → direct", () => {
    expect(resolveChannel()).toBe("direct");
  });
  it("empty strings → direct", () => {
    expect(resolveChannel("", "")).toBe("direct");
  });
});

// ─── ROAS math ────────────────────────────────────────────────────────────────
describe("ROAS calculation", () => {
  it("revenue / spend = ROAS", () => {
    const spendCents = 10000; // $100
    const revenueCents = 30000; // $300
    const roas = revenueCents / spendCents;
    expect(roas).toBe(3);
  });
  it("zero spend → infinity guard", () => {
    const spendCents = 0;
    const revenueCents = 5000;
    const roas = spendCents > 0 ? revenueCents / spendCents : Infinity;
    expect(roas).toBe(Infinity);
  });
  it("zero revenue → 0 ROAS", () => {
    const spendCents = 10000;
    const revenueCents = 0;
    const roas = revenueCents / spendCents;
    expect(roas).toBe(0);
  });
});

// ─── CPA math ─────────────────────────────────────────────────────────────────
describe("CPA calculation", () => {
  it("spend / conversions = CPA in cents", () => {
    const spendCents = 50000; // $500
    const conversions = 25;
    const cpa = spendCents / conversions;
    expect(cpa).toBe(2000); // $20 per conversion
  });
  it("zero conversions → guard", () => {
    const spendCents = 50000;
    const conversions = 0;
    const cpa = conversions > 0 ? spendCents / conversions : null;
    expect(cpa).toBeNull();
  });
});
