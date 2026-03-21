/**
 * adsenseClient.ts
 * Google AdSense Management API v2 client — daily revenue pull.
 * Inserts/updates revenue_events with revenue_type = 'adsense'.
 * Build now, activates automatically when AdSense account is approved.
 */

import { getDb } from "./db";
import { revenueEvents } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { setSetting, getSetting } from "./db";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADSENSE_API_BASE = "https://adsense.googleapis.com/v2";

// ─── OAuth token exchange ─────────────────────────────────────────────────────

async function getAdSenseAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  // Use dedicated AdSense refresh token if provided, otherwise share Google Ads token
  const refreshToken = process.env.ADSENSE_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("AdSense OAuth credentials not configured");
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
    throw new Error(`AdSense token exchange failed: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── AdSense reports API ──────────────────────────────────────────────────────

interface AdSenseReportRow {
  cells: Array<{ value: string }>;
}

async function fetchAdSenseRevenue(
  accountId: string,
  accessToken: string,
  date: string
): Promise<{ estimatedEarnings: number; impressions: number; clicks: number }> {
  // Parse date into year/month/day parts
  const [year, month, day] = date.split("-").map(Number);

  const params = new URLSearchParams({
    "dateRange.startDate.year": String(year),
    "dateRange.startDate.month": String(month),
    "dateRange.startDate.day": String(day),
    "dateRange.endDate.year": String(year),
    "dateRange.endDate.month": String(month),
    "dateRange.endDate.day": String(day),
    "metrics": "ESTIMATED_EARNINGS,IMPRESSIONS,CLICKS",
    "dimensions": "DATE",
  });

  const res = await fetch(
    `${ADSENSE_API_BASE}/${accountId}/reports:generate?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AdSense API error: ${res.status} ${err}`);
  }

  const body = await res.json() as { rows?: AdSenseReportRow[]; totals?: { cells: Array<{ value: string }> } };

  // Use totals row if available, otherwise first data row
  const row = body.totals ?? body.rows?.[0];
  if (!row) return { estimatedEarnings: 0, impressions: 0, clicks: 0 };

  const cells = row.cells ?? [];
  // Cells order: ESTIMATED_EARNINGS, IMPRESSIONS, CLICKS
  const estimatedEarnings = parseFloat(cells[0]?.value ?? "0");
  const impressions = parseInt(cells[1]?.value ?? "0", 10);
  const clicks = parseInt(cells[2]?.value ?? "0", 10);

  return { estimatedEarnings, impressions, clicks };
}

// ─── Upsert revenue event ─────────────────────────────────────────────────────

async function upsertAdSenseRevenue(date: string, earningsCents: number) {
  const db = await getDb();
  if (!db) return;

  // Use a deterministic stripeEventId for AdSense entries: adsense_{date}
  const eventId = `adsense_${date}`;

  const existing = await db
    .select({ id: revenueEvents.id })
    .from(revenueEvents)
    .where(eq(revenueEvents.stripeEventId, eventId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(revenueEvents)
      .set({ amountCents: earningsCents })
      .where(eq(revenueEvents.id, existing[0].id));
  } else {
    await db.insert(revenueEvents).values({
      stripeEventId: eventId,
      amountCents: earningsCents,
      currency: "usd",
      revenueType: "adsense" as any,
      description: `AdSense revenue for ${date}`,
      channel: null as any,
      sessionId: null,
      visitorId: null,
    });
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function syncAdSenseRevenue(date: string): Promise<{ earningsCents: number }> {
  const accountId = process.env.ADSENSE_ACCOUNT_ID;
  if (!accountId) throw new Error("ADSENSE_ACCOUNT_ID not set");

  const accessToken = await getAdSenseAccessToken();
  const { estimatedEarnings, impressions, clicks } = await fetchAdSenseRevenue(accountId, accessToken, date);

  const earningsCents = Math.round(estimatedEarnings * 100);

  if (earningsCents > 0) {
    await upsertAdSenseRevenue(date, earningsCents);
  }

  // Record sync metadata
  await setSetting("_attribution_sync_adsense_last_run", new Date().toISOString(), "_attribution_sync");
  await setSetting("_attribution_sync_adsense_last_date", date, "_attribution_sync");
  await setSetting("_attribution_sync_adsense_last_status", "success", "_attribution_sync");
  await setSetting(
    "_attribution_sync_adsense_last_detail",
    `$${estimatedEarnings.toFixed(2)} | ${impressions} impressions | ${clicks} clicks`,
    "_attribution_sync"
  );

  console.log(`[AdSense] Synced $${estimatedEarnings.toFixed(2)} for ${date}`);
  return { earningsCents };
}

// ─── Lightweight connection test ──────────────────────────────────────────────

export async function testAdSenseConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const accountId = process.env.ADSENSE_ACCOUNT_ID;
    if (!accountId) return { ok: false, error: "ADSENSE_ACCOUNT_ID not set" };
    await getAdSenseAccessToken();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
