/**
 * Bing Webmaster Tools API Client
 * Pulls query-level and page-level traffic data via the Bing Webmaster API.
 *
 * Auth: API key — set BING_WEBMASTER_API_KEY in env.
 * Quirks:
 *   - Dates use ASP.NET format: /Date(1399100400000-0700)/
 *   - Positions are multiplied by 10 (divide by 10 for actual position)
 *   - No date range selection — returns a rolling window
 *   - Data retention: 6 months
 */

import { getDb } from "./db";
import { searchEnginePerformance } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
// Use SITE_URL env var so this works for any deployment (white-label compatible).
const SITE_URL = process.env.SITE_URL ?? "";

// ─── Date Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse ASP.NET date format: "/Date(1399100400000-0700)/"
 * Returns YYYY-MM-DD string.
 */
export function parseBingDate(raw: string): string {
  const match = raw.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (!match) return "";
  const ms = parseInt(match[1], 10);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function bingGet<T>(path: string, apiKey: string): Promise<T> {
  const url = `${BING_API_BASE}/${path}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bing API error: ${res.status} ${err}`);
  }
  const data = await res.json() as { d?: T };
  return (data.d ?? data) as T;
}

// ─── Upsert Helper ────────────────────────────────────────────────────────────

async function upsertBingRow(
  date: string,
  query: string | null,
  pageUrl: string | null,
  clicks: number,
  impressions: number,
  position: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ctr = impressions > 0 ? clicks / impressions : 0;

  const existing = await db
    .select({ id: searchEnginePerformance.id })
    .from(searchEnginePerformance)
    .where(
      and(
        eq(searchEnginePerformance.engine, "bing"),
        eq(searchEnginePerformance.date, date),
        query
          ? eq(searchEnginePerformance.query, query)
          : eq(searchEnginePerformance.query, ""),
        pageUrl
          ? eq(searchEnginePerformance.pageUrl, pageUrl)
          : eq(searchEnginePerformance.pageUrl, ""),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(searchEnginePerformance)
      .set({ clicks, impressions, ctr, position })
      .where(eq(searchEnginePerformance.id, existing[0].id));
  } else {
    await db.insert(searchEnginePerformance).values({
      engine: "bing",
      date,
      query: query ?? undefined,
      pageUrl: pageUrl ?? undefined,
      clicks,
      impressions,
      ctr,
      position,
    });
  }
}

// ─── Query Stats ──────────────────────────────────────────────────────────────

interface BingQueryStat {
  Query: string;
  Clicks: number;
  Impressions: number;
  AvgClickPosition: number;
  AvgImpressionPosition: number;
  Date: string;
}

export async function syncBingQueryStats(apiKey: string): Promise<number> {
  const siteUrl = encodeURIComponent(SITE_URL);
  const rows = await bingGet<BingQueryStat[]>(
    `GetQueryStats?siteUrl=${siteUrl}`,
    apiKey,
  );

  let count = 0;
  for (const row of rows) {
    const date = parseBingDate(row.Date);
    if (!date) continue;
    // Bing positions are multiplied by 10
    const position = row.AvgClickPosition / 10;
    await upsertBingRow(date, row.Query, null, row.Clicks, row.Impressions, position);
    count++;
  }
  return count;
}

// ─── Page / Rank Stats ────────────────────────────────────────────────────────

interface BingPageStat {
  Url: string;
  Clicks: number;
  Impressions: number;
  AvgClickPosition: number;
  Date: string;
}

export async function syncBingPageStats(apiKey: string): Promise<number> {
  const siteUrl = encodeURIComponent(SITE_URL);
  const rows = await bingGet<BingPageStat[]>(
    `GetRankAndTrafficStats?siteUrl=${siteUrl}`,
    apiKey,
  );

  let count = 0;
  for (const row of rows) {
    const date = parseBingDate(row.Date);
    if (!date) continue;
    const position = row.AvgClickPosition / 10;
    await upsertBingRow(date, null, row.Url, row.Clicks, row.Impressions, position);
    count++;
  }
  return count;
}

// ─── Main Sync ────────────────────────────────────────────────────────────────

export interface BingSyncResult {
  queryRowsUpserted: number;
  pageRowsUpserted: number;
}

export async function syncBingWebmasterTools(): Promise<BingSyncResult> {
  const apiKey = process.env.BING_WEBMASTER_API_KEY;
  if (!apiKey) throw new Error("BING_WEBMASTER_API_KEY not configured");

  const [queryRowsUpserted, pageRowsUpserted] = await Promise.all([
    syncBingQueryStats(apiKey),
    syncBingPageStats(apiKey),
  ]);

  return { queryRowsUpserted, pageRowsUpserted };
}
