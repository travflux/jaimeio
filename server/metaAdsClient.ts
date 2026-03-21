/**
 * metaAdsClient.ts
 * Meta Marketing API v22 client — Insights API + long-lived token refresh.
 * Upserts campaign spend into the ad_spend table.
 */

import { getDb } from "./db";
import { adSpend } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const META_GRAPH_BASE = "https://graph.facebook.com/v22.0";

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshMetaToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<string> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", currentToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta token refresh failed: ${err}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── Insights API ─────────────────────────────────────────────────────────────

interface MetaCampaignInsight {
  campaign_name: string;
  campaign_id: string;
  spend: string;
  impressions: string;
  clicks: string;
}

async function fetchMetaInsights(
  accountId: string,
  accessToken: string,
  date: string
): Promise<MetaCampaignInsight[]> {
  const url = new URL(`${META_GRAPH_BASE}/act_${accountId}/insights`);
  url.searchParams.set("fields", "campaign_name,campaign_id,spend,impressions,clicks");
  url.searchParams.set("time_range", JSON.stringify({ since: date, until: date }));
  url.searchParams.set("level", "campaign");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta Insights API error: ${res.status} ${err}`);
  }

  const body = await res.json() as { data?: MetaCampaignInsight[]; error?: { message: string } };
  if (body.error) throw new Error(`Meta API error: ${body.error.message}`);
  return body.data ?? [];
}

// ─── Upsert into ad_spend ─────────────────────────────────────────────────────

async function upsertMetaSpend(
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
    .where(and(eq(adSpend.channel, "meta"), eq(adSpend.date, date), eq(adSpend.campaignId, campaignId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(adSpend)
      .set({ spendCents, impressions, clicks, campaignName })
      .where(eq(adSpend.id, existing[0].id));
  } else {
    await db.insert(adSpend).values({
      channel: "meta",
      date,
      spendCents,
      impressions,
      clicks,
      campaignName,
      campaignId,
      notes: "Auto-synced from Meta Marketing API",
    });
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function syncMetaAdsSpend(date: string, accessToken: string): Promise<number> {
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!accountId) throw new Error("META_ADS_ACCOUNT_ID not set");

  const insights = await fetchMetaInsights(accountId, accessToken, date);

  let synced = 0;
  for (const row of insights) {
    const spendCents = Math.round(parseFloat(row.spend ?? "0") * 100);
    if (spendCents === 0) continue;

    const impressions = parseInt(row.impressions ?? "0", 10);
    const clicks = parseInt(row.clicks ?? "0", 10);

    await upsertMetaSpend(date, row.campaign_id, row.campaign_name, spendCents, impressions, clicks);
    synced++;
  }

  console.log(`[MetaAds] Synced ${synced} campaigns for ${date}`);
  return synced;
}

// ─── Lightweight connection test ──────────────────────────────────────────────

export async function testMetaAdsConnection(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const accountId = process.env.META_ADS_ACCOUNT_ID;
    if (!accountId) return { ok: false, error: "META_ADS_ACCOUNT_ID not set" };

    const url = new URL(`${META_GRAPH_BASE}/act_${accountId}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
