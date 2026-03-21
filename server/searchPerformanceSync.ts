/**
 * Search Performance Sync Scheduler
 * Runs daily at 7:00 AM UTC (1 hour after ad spend sync).
 * - Google Search Console: syncs data from 3 days ago (GSC data settles in ~3 days)
 * - Bing Webmaster Tools: syncs latest available rolling window
 *
 * Each integration is independently optional — if env var is missing, that
 * channel is silently skipped. No errors, no broken UI.
 */

import cron from "node-cron";
import { syncGoogleSearchConsole } from "./gscClient";
import { syncBingWebmasterTools } from "./bingWebmasterClient";
import { setSetting, getSetting } from "./db";

const SEARCH_SYNC_CRON = "0 7 * * *"; // 7:00 AM UTC daily

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Sync Status Tracking ─────────────────────────────────────────────────────

export interface SearchSyncStatus {
  gsc: {
    configured: boolean;
    lastSync: string | null;
    lastQueryRows: number;
    lastPageRows: number;
    lastError: string | null;
  };
  bing: {
    configured: boolean;
    lastSync: string | null;
    lastQueryRows: number;
    lastPageRows: number;
    lastError: string | null;
  };
}

export async function getSearchSyncStatus(): Promise<SearchSyncStatus> {
  const [
    gscLastSyncRow,
    gscLastQueryRowsRow,
    gscLastPageRowsRow,
    gscLastErrorRow,
    bingLastSyncRow,
    bingLastQueryRowsRow,
    bingLastPageRowsRow,
    bingLastErrorRow,
  ] = await Promise.all([
    getSetting("search_sync_gsc_last_sync"),
    getSetting("search_sync_gsc_last_query_rows"),
    getSetting("search_sync_gsc_last_page_rows"),
    getSetting("search_sync_gsc_last_error"),
    getSetting("search_sync_bing_last_sync"),
    getSetting("search_sync_bing_last_query_rows"),
    getSetting("search_sync_bing_last_page_rows"),
    getSetting("search_sync_bing_last_error"),
  ]);

  return {
    gsc: {
      configured: !!(process.env.GSC_CLIENT_ID && process.env.GSC_REFRESH_TOKEN),
      lastSync: gscLastSyncRow?.value ?? null,
      lastQueryRows: parseInt(gscLastQueryRowsRow?.value ?? "0", 10),
      lastPageRows: parseInt(gscLastPageRowsRow?.value ?? "0", 10),
      lastError: gscLastErrorRow?.value ?? null,
    },
    bing: {
      configured: !!process.env.BING_WEBMASTER_API_KEY,
      lastSync: bingLastSyncRow?.value ?? null,
      lastQueryRows: parseInt(bingLastQueryRowsRow?.value ?? "0", 10),
      lastPageRows: parseInt(bingLastPageRowsRow?.value ?? "0", 10),
      lastError: bingLastErrorRow?.value ?? null,
    },
  };
}

// ─── Core Sync Logic ──────────────────────────────────────────────────────────

export async function runSearchPerformanceSync(): Promise<{
  gsc: { success: boolean; queryRows?: number; pageRows?: number; error?: string };
  bing: { success: boolean; queryRows?: number; pageRows?: number; error?: string };
}> {
  const results = {
    gsc: { success: false } as { success: boolean; queryRows?: number; pageRows?: number; error?: string },
    bing: { success: false } as { success: boolean; queryRows?: number; pageRows?: number; error?: string },
  };

  // Google Search Console — sync data from 3 days ago
  if (process.env.GSC_CLIENT_ID && process.env.GSC_REFRESH_TOKEN) {
    try {
      const gscDate = getDateDaysAgo(3);
      const gscResult = await syncGoogleSearchConsole(gscDate);
      results.gsc = {
        success: true,
        queryRows: gscResult.queryRowsUpserted,
        pageRows: gscResult.pageRowsUpserted,
      };
      const now = new Date().toISOString();
      await Promise.all([
        setSetting("search_sync_gsc_last_sync", now),
        setSetting("search_sync_gsc_last_query_rows", String(gscResult.queryRowsUpserted)),
        setSetting("search_sync_gsc_last_page_rows", String(gscResult.pageRowsUpserted)),
        setSetting("search_sync_gsc_last_error", ""),
      ]);
      console.log(`[SearchSync] GSC synced ${gscResult.queryRowsUpserted} queries + ${gscResult.pageRowsUpserted} pages for ${gscDate}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.gsc = { success: false, error: msg };
      await setSetting("search_sync_gsc_last_error", msg);
      console.error("[SearchSync] GSC failed:", msg);
    }
  }

  // Bing Webmaster Tools — sync latest rolling window
  if (process.env.BING_WEBMASTER_API_KEY) {
    try {
      const bingResult = await syncBingWebmasterTools();
      results.bing = {
        success: true,
        queryRows: bingResult.queryRowsUpserted,
        pageRows: bingResult.pageRowsUpserted,
      };
      const now = new Date().toISOString();
      await Promise.all([
        setSetting("search_sync_bing_last_sync", now),
        setSetting("search_sync_bing_last_query_rows", String(bingResult.queryRowsUpserted)),
        setSetting("search_sync_bing_last_page_rows", String(bingResult.pageRowsUpserted)),
        setSetting("search_sync_bing_last_error", ""),
      ]);
      console.log(`[SearchSync] Bing synced ${bingResult.queryRowsUpserted} queries + ${bingResult.pageRowsUpserted} pages`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.bing = { success: false, error: msg };
      await setSetting("search_sync_bing_last_error", msg);
      console.error("[SearchSync] Bing failed:", msg);
    }
  }

  return results;
}

// ─── Individual Engine Sync ─────────────────────────────────────────────────────

export async function runGscSync(): Promise<{
  success: boolean; queryRows?: number; pageRows?: number; error?: string;
}> {
  if (!process.env.GSC_CLIENT_ID || !process.env.GSC_REFRESH_TOKEN) {
    return { success: false, error: "GSC credentials not configured" };
  }
  try {
    const gscDate = getDateDaysAgo(3);
    const gscResult = await syncGoogleSearchConsole(gscDate);
    const now = new Date().toISOString();
    await Promise.all([
      setSetting("search_sync_gsc_last_sync", now),
      setSetting("search_sync_gsc_last_query_rows", String(gscResult.queryRowsUpserted)),
      setSetting("search_sync_gsc_last_page_rows", String(gscResult.pageRowsUpserted)),
      setSetting("search_sync_gsc_last_error", ""),
    ]);
    console.log(`[SearchSync] GSC synced ${gscResult.queryRowsUpserted} queries + ${gscResult.pageRowsUpserted} pages for ${gscDate}`);
    return { success: true, queryRows: gscResult.queryRowsUpserted, pageRows: gscResult.pageRowsUpserted };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await setSetting("search_sync_gsc_last_error", msg);
    console.error("[SearchSync] GSC failed:", msg);
    return { success: false, error: msg };
  }
}

export async function runBingSync(): Promise<{
  success: boolean; queryRows?: number; pageRows?: number; error?: string;
}> {
  if (!process.env.BING_WEBMASTER_API_KEY) {
    return { success: false, error: "Bing Webmaster API key not configured" };
  }
  try {
    const bingResult = await syncBingWebmasterTools();
    const now = new Date().toISOString();
    await Promise.all([
      setSetting("search_sync_bing_last_sync", now),
      setSetting("search_sync_bing_last_query_rows", String(bingResult.queryRowsUpserted)),
      setSetting("search_sync_bing_last_page_rows", String(bingResult.pageRowsUpserted)),
      setSetting("search_sync_bing_last_error", ""),
    ]);
    console.log(`[SearchSync] Bing synced ${bingResult.queryRowsUpserted} queries + ${bingResult.pageRowsUpserted} pages`);
    return { success: true, queryRows: bingResult.queryRowsUpserted, pageRows: bingResult.pageRowsUpserted };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await setSetting("search_sync_bing_last_error", msg);
    console.error("[SearchSync] Bing failed:", msg);
    return { success: false, error: msg };
  }
}

// ─── Scheduler Init ───────────────────────────────────────────────────────────

export function initSearchPerformanceSync(): void {
  cron.schedule(SEARCH_SYNC_CRON, async () => {
    console.log("[SearchSync] Starting daily search performance sync...");
    await runSearchPerformanceSync();
    console.log("[SearchSync] Daily sync complete.");
  });
  console.log("[SearchSync] Scheduler initialized (7:00 AM UTC daily)");
}
