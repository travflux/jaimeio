/**
 * xAdsClient.ts
 * X Ads API v12 client — OAuth 1.0a signed requests + campaign analytics.
 * Upserts campaign spend into the ad_spend table.
 */

import crypto from "crypto";
import { getDb } from "./db";
import { adSpend } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const X_ADS_BASE = "https://ads-api.x.com/12";

// ─── OAuth 1.0a signature ─────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function buildOAuthHeader(method: string, url: string, params: Record<string, string>): string {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X API credentials not configured");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Combine all params for signature base
  const allParams = { ...params, ...oauthParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join("&");

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const headerValue = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return headerValue;
}

// ─── Campaign analytics query ─────────────────────────────────────────────────

interface XCampaignStat {
  id: string;
  name: string;
  billed_charge_local_micro: number;
  impressions: number;
  clicks: number;
}

async function fetchXCampaignStats(accountId: string, date: string): Promise<XCampaignStat[]> {
  // First get campaign IDs
  const campaignsUrl = `${X_ADS_BASE}/accounts/${accountId}/campaigns`;
  const campaignParams = { count: "200" };
  const campaignHeader = buildOAuthHeader("GET", campaignsUrl, campaignParams);

  const campaignsRes = await fetch(`${campaignsUrl}?count=200`, {
    headers: { Authorization: campaignHeader },
  });

  if (!campaignsRes.ok) {
    const err = await campaignsRes.text();
    throw new Error(`X Ads campaigns fetch failed: ${campaignsRes.status} ${err}`);
  }

  const campaignsBody = await campaignsRes.json() as { data?: Array<{ id: string; name: string }> };
  const campaigns = campaignsBody.data ?? [];
  if (campaigns.length === 0) return [];

  // Fetch stats for all campaigns
  const statsUrl = `${X_ADS_BASE}/stats/accounts/${accountId}`;
  const statsParams: Record<string, string> = {
    entity: "CAMPAIGN",
    entity_ids: campaigns.map(c => c.id).join(","),
    metric_groups: "BILLING,ENGAGEMENT",
    start_time: `${date}T00:00:00Z`,
    end_time: `${date}T23:59:59Z`,
    granularity: "DAY",
    placement: "ALL_ON_TWITTER",
  };

  const statsHeader = buildOAuthHeader("GET", statsUrl, statsParams);
  const statsRes = await fetch(`${statsUrl}?${new URLSearchParams(statsParams)}`, {
    headers: { Authorization: statsHeader },
  });

  if (!statsRes.ok) {
    const err = await statsRes.text();
    throw new Error(`X Ads stats fetch failed: ${statsRes.status} ${err}`);
  }

  const statsBody = await statsRes.json() as {
    data?: Array<{
      id: string;
      id_data?: Array<{
        metrics?: {
          billed_charge_local_micro?: number[];
          impressions?: number[];
          clicks?: number[];
        };
      }>;
    }>;
  };

  const results: XCampaignStat[] = [];
  for (const stat of statsBody.data ?? []) {
    const campaign = campaigns.find(c => c.id === stat.id);
    if (!campaign) continue;

    const metrics = stat.id_data?.[0]?.metrics;
    const billed = metrics?.billed_charge_local_micro?.[0] ?? 0;
    const impressions = metrics?.impressions?.[0] ?? 0;
    const clicks = metrics?.clicks?.[0] ?? 0;

    results.push({
      id: stat.id,
      name: campaign.name,
      billed_charge_local_micro: billed,
      impressions,
      clicks,
    });
  }

  return results;
}

// ─── Upsert into ad_spend ─────────────────────────────────────────────────────

async function upsertXSpend(
  date: string,
  campaignId: string,
  campaignName: string,
  spendCents: number,
  impressions: number,
  clicks: number
) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: adSpend.id })
    .from(adSpend)
    .where(and(eq(adSpend.channel, "x"), eq(adSpend.date, date), eq(adSpend.campaignId, campaignId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(adSpend)
      .set({ spendCents, impressions, clicks, campaignName })
      .where(eq(adSpend.id, existing[0].id));
  } else {
    await db.insert(adSpend).values({
      channel: "x",
      date,
      spendCents,
      impressions,
      clicks,
      campaignName,
      campaignId,
      notes: "Auto-synced from X Ads API",
    });
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function syncXAdsSpend(date: string): Promise<number> {
  const accountId = process.env.X_ADS_ACCOUNT_ID;
  if (!accountId) throw new Error("X_ADS_ACCOUNT_ID not set");

  const stats = await fetchXCampaignStats(accountId, date);

  let synced = 0;
  for (const stat of stats) {
    // X reports in local micro-currency units (1/1,000,000 of local currency)
    const spendCents = Math.round(stat.billed_charge_local_micro / 10000);
    if (spendCents === 0) continue;

    await upsertXSpend(date, stat.id, stat.name, spendCents, stat.impressions, stat.clicks);
    synced++;
  }

  console.log(`[XAds] Synced ${synced} campaigns for ${date}`);
  return synced;
}

// ─── Lightweight connection test ──────────────────────────────────────────────

export async function testXAdsConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const accountId = process.env.X_ADS_ACCOUNT_ID;
    if (!accountId) return { ok: false, error: "X_ADS_ACCOUNT_ID not set" };

    const url = `${X_ADS_BASE}/accounts/${accountId}`;
    const header = buildOAuthHeader("GET", url, {});
    const res = await fetch(url, { headers: { Authorization: header } });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
