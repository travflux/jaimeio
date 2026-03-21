/**
 * Attribution Pipeline v2 — Vitest
 * Tests: ad spend sync framework, channel clients, Stripe webhook, Printify webhook
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getYesterdayDate, getTodayDate } from "./adSpendSync";

// ─── Date helpers ──────────────────────────────────────────────────────────────
describe("adSpendSync date helpers", () => {
  it("getYesterdayDate returns YYYY-MM-DD format", () => {
    const d = getYesterdayDate();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getYesterdayDate is one day before today", () => {
    const yesterday = getYesterdayDate();
    const today = getTodayDate();
    const diff = new Date(today).getTime() - new Date(yesterday).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it("getTodayDate returns YYYY-MM-DD format", () => {
    const d = getTodayDate();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── Google Ads client ────────────────────────────────────────────────────────
describe("googleAdsClient", () => {
  it("testGoogleAdsConnection is a function", async () => {
    const { testGoogleAdsConnection } = await import("./googleAdsClient");
    expect(typeof testGoogleAdsConnection).toBe("function");
  });

  it("syncGoogleAdsSpend is a function", async () => {
    const { syncGoogleAdsSpend } = await import("./googleAdsClient");
    expect(typeof syncGoogleAdsSpend).toBe("function");
  });
});

// ─── Meta Ads client ──────────────────────────────────────────────────────────
describe("metaAdsClient", () => {
  it("syncMetaAdsSpend is a function", async () => {
    const { syncMetaAdsSpend } = await import("./metaAdsClient");
    expect(typeof syncMetaAdsSpend).toBe("function");
  });

  it("testMetaAdsConnection is a function", async () => {
    const { testMetaAdsConnection } = await import("./metaAdsClient");
    expect(typeof testMetaAdsConnection).toBe("function");
  });
});

// ─── X Ads client ─────────────────────────────────────────────────────────────
describe("xAdsClient", () => {
  it("syncXAdsSpend is a function", async () => {
    const { syncXAdsSpend } = await import("./xAdsClient");
    expect(typeof syncXAdsSpend).toBe("function");
  });

  it("testXAdsConnection is a function", async () => {
    const { testXAdsConnection } = await import("./xAdsClient");
    expect(typeof testXAdsConnection).toBe("function");
  });
});

// ─── AdSense client ───────────────────────────────────────────────────────────
describe("adsenseClient", () => {
  it("syncAdSenseRevenue is a function", async () => {
    const { syncAdSenseRevenue } = await import("./adsenseClient");
    expect(typeof syncAdSenseRevenue).toBe("function");
  });

  it("testAdSenseConnection is a function", async () => {
    const { testAdSenseConnection } = await import("./adsenseClient");
    expect(typeof testAdSenseConnection).toBe("function");
  });
});

// ─── Stripe webhook ───────────────────────────────────────────────────────────
describe("stripeWebhook", () => {
  it("registerStripeWebhookRoute is a function", async () => {
    const { registerStripeWebhookRoute } = await import("./stripeWebhook");
    expect(typeof registerStripeWebhookRoute).toBe("function");
  });
});

// ─── Printify webhook ─────────────────────────────────────────────────────────
describe("printifyWebhook", () => {
  it("registerPrintifyWebhook is a function", async () => {
    const { registerPrintifyWebhook } = await import("./printifyWebhook");
    expect(typeof registerPrintifyWebhook).toBe("function");
  });
});

// ─── runAdSpendSync — no credentials → all skipped ────────────────────────────
describe("runAdSpendSync", () => {
  it("returns results array with google, meta, x channels", async () => {
    // Ensure no credentials so all providers skip gracefully
    const origGoogle = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const origMeta = process.env.META_ADS_ACCESS_TOKEN;
    const origX = process.env.X_ADS_ACCOUNT_ID;
    delete process.env.GOOGLE_ADS_REFRESH_TOKEN;
    delete process.env.META_ADS_ACCESS_TOKEN;
    delete process.env.X_ADS_ACCOUNT_ID;

    const { runAdSpendSync } = await import("./adSpendSync");
    const result = await runAdSpendSync("2026-01-01");
    expect(result).toHaveProperty("results");
    expect(Array.isArray(result.results)).toBe(true);
    const channels = result.results.map((r: { channel: string }) => r.channel);
    expect(channels).toEqual(expect.arrayContaining(["google", "meta", "x"]));

    if (origGoogle) process.env.GOOGLE_ADS_REFRESH_TOKEN = origGoogle;
    if (origMeta) process.env.META_ADS_ACCESS_TOKEN = origMeta;
    if (origX) process.env.X_ADS_ACCOUNT_ID = origX;
  });

  it("each result has channel, status, records fields", async () => {
    const { runAdSpendSync } = await import("./adSpendSync");
    const result = await runAdSpendSync("2026-01-01");
    for (const r of result.results) {
      expect(r).toHaveProperty("channel");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("records");
    }
  });
});

// ─── getAdSpendSyncStatus ─────────────────────────────────────────────────────
describe("getAdSpendSyncStatus", () => {
  it("returns an object with google, meta, x keys", async () => {
    const { getAdSpendSyncStatus } = await import("./adSpendSync");
    const status = await getAdSpendSyncStatus();
    expect(status).toHaveProperty("google");
    expect(status).toHaveProperty("meta");
    expect(status).toHaveProperty("x");
  });

  it("each entry has configured, lastRun, lastDate, lastStatus, lastDetail", async () => {
    const { getAdSpendSyncStatus } = await import("./adSpendSync");
    const status = await getAdSpendSyncStatus();
    for (const [, s] of Object.entries(status)) {
      expect(s).toHaveProperty("configured");
      expect(s).toHaveProperty("lastRun");
      expect(s).toHaveProperty("lastDate");
      expect(s).toHaveProperty("lastStatus");
      expect(s).toHaveProperty("lastDetail");
    }
  });
});
