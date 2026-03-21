/**
 * Google Search Console API Client
 * Uses the Search Analytics API (searchanalytics.query) to pull
 * query-level and page-level performance data.
 *
 * Auth: OAuth 2.0 — uses GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN.
 * Ensure the refresh token was generated with the
 * `https://www.googleapis.com/auth/webmasters.readonly` scope.
 */

import { getDb } from "./db";
import { searchEnginePerformance } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Use GSC_SITE_IDENTIFIER env var if set (e.g., "sc-domain:hambry.com" for domain properties).
// Falls back to building from SITE_URL with trailing slash for URL-prefix properties.
// White-label compatible — each deployment sets its own GSC_SITE_IDENTIFIER or SITE_URL.
const GSC_SITE_URL = process.env.GSC_SITE_IDENTIFIER
  ? process.env.GSC_SITE_IDENTIFIER
  : (() => {
      const s = process.env.SITE_URL ?? "";
      return s.endsWith("/") ? s : s + "/";
    })();
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

// ─── Token Exchange ────────────────────────────────────────────────────────────

export async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refreshToken = process.env.GSC_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth credentials (GSC_CLIENT_ID/SECRET/REFRESH_TOKEN)");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── GSC Search Analytics Query ───────────────────────────────────────────────

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscResponse {
  rows?: GscRow[];
}

async function queryGsc(
  accessToken: string,
  date: string,
  dimensions: ("query" | "page")[],
): Promise<GscRow[]> {
  const body = {
    startDate: date,
    endDate: date,
    dimensions,
    rowLimit: 1000,
    dataState: "final",
  };

  const res = await fetch(
    `${GSC_API_BASE}/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API error: ${res.status} ${err}`);
  }

  const data = await res.json() as GscResponse;
  return data.rows ?? [];
}

// ─── Upsert Helper ────────────────────────────────────────────────────────────

async function upsertGscRow(
  date: string,
  query: string | null,
  pageUrl: string | null,
  clicks: number,
  impressions: number,
  ctr: number,
  position: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if row exists
  const existing = await db
    .select({ id: searchEnginePerformance.id })
    .from(searchEnginePerformance)
    .where(
      and(
        eq(searchEnginePerformance.engine, "google"),
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
      engine: "google",
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

// ─── Main Sync ────────────────────────────────────────────────────────────────

export interface GscSyncResult {
  date: string;
  queryRowsUpserted: number;
  pageRowsUpserted: number;
}

export async function syncGoogleSearchConsole(date: string): Promise<GscSyncResult> {
  const accessToken = await getGoogleAccessToken();

  // Pull query-level data
  const queryRows = await queryGsc(accessToken, date, ["query"]);
  for (const row of queryRows) {
    await upsertGscRow(date, row.keys[0], null, row.clicks, row.impressions, row.ctr, row.position);
  }

  // Pull page-level data
  const pageRows = await queryGsc(accessToken, date, ["page"]);
  for (const row of pageRows) {
    await upsertGscRow(date, null, row.keys[0], row.clicks, row.impressions, row.ctr, row.position);
  }

  return {
    date,
    queryRowsUpserted: queryRows.length,
    pageRowsUpserted: pageRows.length,
  };
}

// ─── Sitemap Stats (submitted vs indexed for a specific sitemap) ─────────────

export interface GscSitemapStats {
  submitted: number;
  indexed: number;
  lastDownloaded: string | null;
  isPending: boolean;
  errors: number;
  warnings: number;
}

/**
 * Query GSC sitemaps.get for a specific sitemap URL.
 * Returns submitted and indexed counts from the GSC sitemap report.
 * White-label compatible — siteUrl and sitemapUrl are passed in, not hardcoded.
 */
export async function getGscSitemapStats(
  sitemapUrl: string,
): Promise<GscSitemapStats | null> {
  try {
    const accessToken = await getGoogleAccessToken();
    const res = await fetch(
      `${GSC_API_BASE}/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      contents?: Array<{ type?: string; submitted?: string | number; indexed?: string | number }>;
      lastDownloaded?: string;
      isPending?: boolean;
      errors?: string | number;
      warnings?: string | number;
    };
    let submitted = 0;
    let indexed = 0;
    for (const c of data.contents ?? []) {
      submitted += Number(c.submitted ?? 0);
      indexed += Number(c.indexed ?? 0);
    }
    return {
      submitted,
      indexed,
      lastDownloaded: data.lastDownloaded ?? null,
      isPending: data.isPending ?? false,
      errors: Number(data.errors ?? 0),
      warnings: Number(data.warnings ?? 0),
    };
  } catch {
    return null;
  }
}

// ─── Indexed Page Count ────────────────────────────────────────────────────────

export async function getGscIndexedPageCount(): Promise<number | null> {
  try {
    const accessToken = await getGoogleAccessToken();
    const res = await fetch(
      `${GSC_API_BASE}/sites/${encodeURIComponent(GSC_SITE_URL)}/sitemaps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as { sitemap?: Array<{ contents?: Array<{ submitted?: number; indexed?: number }> }> };
    let indexed = 0;
    for (const sitemap of data.sitemap ?? []) {
      for (const content of sitemap.contents ?? []) {
        indexed += content.indexed ?? 0;
      }
    }
    return indexed;
  } catch {
    return null;
  }
}
