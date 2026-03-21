/**
 * adSpendSync.ts
 * Daily cron scheduler that pulls ad spend from Google Ads, Meta, and X Ads APIs.
 * Runs at 6:00 AM UTC. Each channel is independently optional — if env vars are
 * not set, that channel is silently skipped.
 */

import cron from "node-cron";
import { setSetting, getSetting } from "./db";
import { syncGoogleAdsSpend } from "./googleAdsClient";
import { syncMetaAdsSpend, refreshMetaToken } from "./metaAdsClient";
import { syncXAdsSpend } from "./xAdsClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function recordSyncResult(
  channel: string,
  status: "success" | "error" | "skipped",
  detail: string,
  date: string
) {
  const ts = new Date().toISOString();
  await setSetting(`_attribution_sync_${channel}_last_run`, ts, "_attribution_sync");
  await setSetting(`_attribution_sync_${channel}_last_date`, date, "_attribution_sync");
  await setSetting(`_attribution_sync_${channel}_last_status`, status, "_attribution_sync");
  await setSetting(`_attribution_sync_${channel}_last_detail`, detail, "_attribution_sync");
}

// ─── Per-channel sync wrappers ────────────────────────────────────────────────

async function runGoogleSync(date: string) {
  const key = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!key) {
    await recordSyncResult("google", "skipped", "Not configured", date);
    return { channel: "google", status: "skipped" as const, records: 0 };
  }
  try {
    const records = await syncGoogleAdsSpend(date);
    await recordSyncResult("google", "success", `${records} campaigns synced`, date);
    return { channel: "google", status: "success" as const, records };
  } catch (e: any) {
    await recordSyncResult("google", "error", e.message ?? "Unknown error", date);
    console.error("[AdSpendSync] Google failed:", e.message);
    return { channel: "google", status: "error" as const, records: 0, error: e.message };
  }
}

async function runMetaSync(date: string) {
  // Meta token may be stored in DB (refreshed weekly) or env
  const envToken = process.env.META_ADS_ACCESS_TOKEN;
  const dbToken = await getSetting("meta_ads_access_token");
  const token = dbToken?.value || envToken;
  if (!token || !process.env.META_ADS_ACCOUNT_ID) {
    await recordSyncResult("meta", "skipped", "Not configured", date);
    return { channel: "meta", status: "skipped" as const, records: 0 };
  }
  try {
    const records = await syncMetaAdsSpend(date, token);
    await recordSyncResult("meta", "success", `${records} campaigns synced`, date);
    return { channel: "meta", status: "success" as const, records };
  } catch (e: any) {
    await recordSyncResult("meta", "error", e.message ?? "Unknown error", date);
    console.error("[AdSpendSync] Meta failed:", e.message);
    return { channel: "meta", status: "error" as const, records: 0, error: e.message };
  }
}

async function runXSync(date: string) {
  if (!process.env.X_ADS_ACCOUNT_ID) {
    await recordSyncResult("x", "skipped", "Not configured", date);
    return { channel: "x", status: "skipped" as const, records: 0 };
  }
  try {
    const records = await syncXAdsSpend(date);
    await recordSyncResult("x", "success", `${records} campaigns synced`, date);
    return { channel: "x", status: "success" as const, records };
  } catch (e: any) {
    await recordSyncResult("x", "error", e.message ?? "Unknown error", date);
    console.error("[AdSpendSync] X failed:", e.message);
    return { channel: "x", status: "error" as const, records: 0, error: e.message };
  }
}

// ─── Main sync runner (exported for manual trigger) ───────────────────────────

export async function runAdSpendSync(date?: string): Promise<{
  date: string;
  results: Array<{ channel: string; status: string; records: number; error?: string }>;
}> {
  const syncDate = date ?? getYesterdayDate();
  console.log(`[AdSpendSync] Starting sync for ${syncDate}`);

  const [google, meta, x] = await Promise.allSettled([
    runGoogleSync(syncDate),
    runMetaSync(syncDate),
    runXSync(syncDate),
  ]);

  const results = [google, meta, x].map((r) =>
    r.status === "fulfilled" ? r.value : { channel: "unknown", status: "error", records: 0, error: String(r.reason) }
  );

  await setSetting("_attribution_sync_last_run", new Date().toISOString(), "_attribution_sync");
  console.log(`[AdSpendSync] Complete for ${syncDate}:`, results.map(r => `${r.channel}=${r.status}`).join(", "));
  return { date: syncDate, results };
}

// ─── Meta token refresh (weekly) ─────────────────────────────────────────────

async function runMetaTokenRefresh() {
  const appId = process.env.META_ADS_APP_ID;
  const appSecret = process.env.META_ADS_APP_SECRET;
  if (!appId || !appSecret) return;

  const dbToken = await getSetting("meta_ads_access_token");
  const envToken = process.env.META_ADS_ACCESS_TOKEN;
  const currentToken = dbToken?.value || envToken;
  if (!currentToken) return;

  try {
    const newToken = await refreshMetaToken(currentToken, appId, appSecret);
    await setSetting("meta_ads_access_token", newToken, "_attribution_sync");
    console.log("[AdSpendSync] Meta token refreshed successfully");
  } catch (e: any) {
    console.error("[AdSpendSync] Meta token refresh failed:", e.message);
  }
}

// ─── Scheduler init ───────────────────────────────────────────────────────────

let syncTask: ReturnType<typeof cron.schedule> | null = null;
let tokenRefreshTask: ReturnType<typeof cron.schedule> | null = null;

export function initAdSpendSync() {
  // Daily spend sync at 6:00 AM UTC
  syncTask = cron.schedule("0 6 * * *", async () => {
    await runAdSpendSync().catch(e => console.error("[AdSpendSync] Cron error:", e));
  }, { timezone: "UTC" });

  // Weekly Meta token refresh — Sundays at 5:00 AM UTC
  tokenRefreshTask = cron.schedule("0 5 * * 0", async () => {
    await runMetaTokenRefresh().catch(e => console.error("[AdSpendSync] Token refresh error:", e));
  }, { timezone: "UTC" });

  console.log("[AdSpendSync] Scheduler initialized (daily 06:00 UTC)");
}

export function stopAdSpendSync() {
  syncTask?.stop();
  tokenRefreshTask?.stop();
}

// ─── Sync status reader ───────────────────────────────────────────────────────

export async function getAdSpendSyncStatus() {
  const channels = ["google", "meta", "x"] as const;
  const status: Record<string, {
    configured: boolean;
    lastRun: string | null;
    lastDate: string | null;
    lastStatus: string | null;
    lastDetail: string | null;
  }> = {};

  for (const ch of channels) {
    const [lastRun, lastDate, lastStatus, lastDetail] = await Promise.all([
      getSetting(`_attribution_sync_${ch}_last_run`),
      getSetting(`_attribution_sync_${ch}_last_date`),
      getSetting(`_attribution_sync_${ch}_last_status`),
      getSetting(`_attribution_sync_${ch}_last_detail`),
    ]);
    const configured =
      ch === "google" ? !!process.env.GOOGLE_ADS_REFRESH_TOKEN :
      ch === "meta" ? !!(process.env.META_ADS_ACCESS_TOKEN || process.env.META_ADS_ACCOUNT_ID) :
      ch === "x" ? !!process.env.X_ADS_ACCOUNT_ID : false;

    status[ch] = {
      configured,
      lastRun: lastRun?.value ?? null,
      lastDate: lastDate?.value ?? null,
      lastStatus: lastStatus?.value ?? null,
      lastDetail: lastDetail?.value ?? null,
    };
  }
  return status;
}
