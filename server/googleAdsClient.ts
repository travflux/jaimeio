/**
 * googleAdsClient.ts
 * Google Ads API v17 client — OAuth 2.0 token exchange + GAQL campaign spend query.
 * Upserts results into the ad_spend table.
 */

import { getDb } from "./db";
import { adSpend } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v17";

// ─── OAuth token exchange ─────────────────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Ads OAuth credentials not configured");
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
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── GAQL query ───────────────────────────────────────────────────────────────

interface GoogleAdsCampaignRow {
  campaign: { id: string; name: string };
  metrics: { cost_micros: string; impressions: string; clicks: string };
  segments: { date: string };
}

async function queryCampaignSpend(
  accessToken: string,
  customerId: string,
  date: string
): Promise<GoogleAdsCampaignRow[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not set");

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      segments.date
    FROM campaign
    WHERE segments.date = '${date}'
    ORDER BY campaign.name
  `;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const res = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error: ${res.status} ${err}`);
  }

  // searchStream returns newline-delimited JSON objects
  const text = await res.text();
  const rows: GoogleAdsCampaignRow[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "[" || trimmed === "]") continue;
    try {
      const parsed = JSON.parse(trimmed.replace(/^,/, ""));
      if (parsed.results) rows.push(...parsed.results);
    } catch {
      // skip malformed lines
    }
  }
  return rows;
}

// ─── Upsert into ad_spend ─────────────────────────────────────────────────────

async function upsertGoogleSpend(
  date: string,
  campaignId: string,
  campaignName: string,
  spendCents: number,
  impressions: number,
  clicks: number
) {
  const db = await getDb();
  if (!db) return;

  // Check for existing row (same channel + date + campaignId)
  const existing = await db
    .select({ id: adSpend.id })
    .from(adSpend)
    .where(and(eq(adSpend.channel, "google"), eq(adSpend.date, date), eq(adSpend.campaignId, campaignId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(adSpend)
      .set({ spendCents, impressions, clicks, campaignName })
      .where(eq(adSpend.id, existing[0].id));
  } else {
    await db.insert(adSpend).values({
      channel: "google",
      date,
      spendCents,
      impressions,
      clicks,
      campaignName,
      campaignId,
      notes: "Auto-synced from Google Ads API",
    });
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function syncGoogleAdsSpend(date: string): Promise<number> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!customerId) throw new Error("GOOGLE_ADS_CUSTOMER_ID not set");

  const accessToken = await getGoogleAccessToken();
  const rows = await queryCampaignSpend(accessToken, customerId, date);

  let synced = 0;
  for (const row of rows) {
    const costMicros = parseInt(row.metrics.cost_micros ?? "0", 10);
    if (costMicros === 0) continue; // skip zero-spend campaigns

    const spendCents = Math.round(costMicros / 10000);
    const impressions = parseInt(row.metrics.impressions ?? "0", 10);
    const clicks = parseInt(row.metrics.clicks ?? "0", 10);

    await upsertGoogleSpend(
      date,
      row.campaign.id,
      row.campaign.name,
      spendCents,
      impressions,
      clicks
    );
    synced++;
  }

  console.log(`[GoogleAds] Synced ${synced} campaigns for ${date}`);
  return synced;
}

// ─── Lightweight connection test ──────────────────────────────────────────────

export async function testGoogleAdsConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getGoogleAccessToken();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
