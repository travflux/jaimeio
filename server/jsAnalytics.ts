/**
 * jsAnalytics.ts — v4.9.0
 *
 * Server-side helpers for the JS-tracked analytics system.
 *
 * Responsibilities:
 * - Insert rows into js_page_views (called from /api/track endpoint)
 * - Spam referrer filtering (hardcoded list + DB-configurable list)
 * - Daily rollup into daily_analytics table
 * - Query helpers for the CEO Dashboard §3
 *
 * White-label compatible: no Hambry-specific logic.
 */

import { getDb, getSetting } from "./db";
import { jsPageViews, dailyAnalytics } from "../drizzle/schema";
import { eq, gte, sql, and, count, countDistinct, desc } from "drizzle-orm";

// ─── Spam Referrer Blocklist ──────────────────────────────────────────────────
// Known spam blog networks that generate fake referrer traffic.
// These are hardcoded as the default set; additional patterns can be added
// via the analytics_spam_referrer_blocklist DB setting (JSON array of strings).
const HARDCODED_SPAM_PATTERNS: RegExp[] = [
  /blogdosaga\.com/, /win-blog\.com/, /wikinarration\.com/, /webdesign96\.com/,
  /life3dblog\.com/, /designi1\.com/, /thezenweb\.com/, /bmswiki\.com/,
  /wikiexcerpt\.com/, /tinyblogging\.com/, /wikievia\.com/, /arwebo\.com/,
  /is-blog\.com/, /vblogetin\.com/, /azuria-wiki\.com/, /bluxeblog\.com/,
  /isblog\.net/, /bloggin-ads\.com/, /snack-blog\.com/, /blogmazing\.com/,
  /nico-wiki\.com/, /losblogos\.com/, /thecomputerwiki\.com/, /mdkblog\.com/,
  /jasperwiki\.com/, /sasugawiki\.com/, /iyublog\.com/, /elbloglibre\.com/,
  /dgbloggers\.com/, /articlesblogger\.com/, /prublogger\.com/, /free-blogz\.com/,
  /blogs100\.com/, /wikiap\.com/, /yourkwikimage\.com/, /wikiconverse\.com/,
  /vigilwiki\.com/, /boyblogguide\.com/, /blog-eye\.com/, /ktwiki\.com/,
  /wikiusnews\.com/, /timeblog\.net/, /goabroadblog\.com/, /theisblog\.com/,
];

// Cache DB-configured patterns for 10 minutes
let cachedDbPatterns: RegExp[] | null = null;
let dbPatternsCachedAt = 0;
const DB_PATTERN_CACHE_TTL = 10 * 60 * 1000;

async function getSpamPatterns(): Promise<RegExp[]> {
  const now = Date.now();
  if (cachedDbPatterns && now - dbPatternsCachedAt < DB_PATTERN_CACHE_TTL) {
    return [...HARDCODED_SPAM_PATTERNS, ...cachedDbPatterns];
  }
  try {
    const setting = await getSetting('analytics_spam_referrer_blocklist');
    if (setting?.value) {
      const parsed = JSON.parse(setting.value) as string[];
      cachedDbPatterns = parsed.map(p => new RegExp(p));
    } else {
      cachedDbPatterns = [];
    }
  } catch {
    cachedDbPatterns = [];
  }
  dbPatternsCachedAt = now;
  return [...HARDCODED_SPAM_PATTERNS, ...cachedDbPatterns];
}

export async function isSpamReferrer(referrer: string): Promise<boolean> {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const patterns = await getSpamPatterns();
    return patterns.some(p => p.test(host));
  } catch {
    return false;
  }
}

// ─── Referrer Source Parser ───────────────────────────────────────────────────
export function parseReferrerSource(referrer: string, siteHostname?: string): string {
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();

    // Reject non-http schemes (javascript:, data:, etc.)
    if (!url.protocol.startsWith('http')) return 'unknown';

    // Reject empty hostname
    if (!host) return 'unknown';

    // Internal navigation (same domain)
    if (siteHostname && host === siteHostname) return 'internal';

    // Known search engines
    if (host.includes('google.')) return 'google';
    if (host.includes('bing.com')) return 'bing';
    if (host.includes('yahoo.')) return 'yahoo';
    if (host.includes('duckduckgo.com')) return 'duckduckgo';
    if (host.includes('yandex.')) return 'yandex';
    if (host.includes('baidu.com')) return 'baidu';

    // Known social platforms
    if (host === 't.co' || host.includes('twitter.com') || (host === 'x.com' || host.endsWith('.x.com'))) return 'x_twitter';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('telegram.org') || host.includes('t.me')) return 'telegram';
    if (host.includes('threads.net')) return 'threads';

    // Everything else — return the domain
    return host;
  } catch {
    return 'unknown';
  }
}

// ─── Insert Page View ─────────────────────────────────────────────────────────
export interface TrackPayload {
  path: string;
  referrer?: string;
  sessionId: string;
  screenWidth?: number;
  ip?: string;
  timestamp?: string;
}

export async function insertJsPageView(payload: TrackPayload): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database unavailable');
  const source = parseReferrerSource(payload.referrer || '');
  const viewedAt = payload.timestamp ? new Date(payload.timestamp) : new Date();

  await db.insert(jsPageViews).values({
    path: payload.path.slice(0, 2000),
    referrer: payload.referrer ? payload.referrer.slice(0, 2000) : null,
    source,
    sessionId: payload.sessionId.slice(0, 64),
    screenWidth: payload.screenWidth || null,
    ip: payload.ip ? payload.ip.slice(0, 45) : null,
    viewedAt,
  });
}

// ─── Daily Rollup ─────────────────────────────────────────────────────────────
// Rolls up js_page_views into daily_analytics for the given date.
// Upserts rows for 'all' (total) and per-source breakdowns.
export async function rollupDailyAnalytics(dateStr?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const date = dateStr || new Date().toISOString().slice(0, 10);

  // Get start/end of the day in UTC
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  // Total for the day
  const [totals] = await db
    .select({
      uniqueVisitors: countDistinct(jsPageViews.sessionId),
      pageViews: count(jsPageViews.id),
    })
    .from(jsPageViews)
    .where(and(gte(jsPageViews.viewedAt, dayStart), sql`${jsPageViews.viewedAt} <= ${dayEnd}`));

  await db
    .insert(dailyAnalytics)
    .values({ date, uniqueVisitors: totals.uniqueVisitors, pageViews: totals.pageViews, source: 'all' })
    .onDuplicateKeyUpdate({ set: { uniqueVisitors: totals.uniqueVisitors, pageViews: totals.pageViews } });

  // Per-source breakdown
  const sourceRows = await (db
    .select({
      source: jsPageViews.source,
      uniqueVisitors: countDistinct(jsPageViews.sessionId),
      pageViews: count(jsPageViews.id),
    })
    .from(jsPageViews)
    .where(and(gte(jsPageViews.viewedAt, dayStart), sql`${jsPageViews.viewedAt} <= ${dayEnd}`))
    .groupBy(jsPageViews.source));

  for (const row of sourceRows) {
    const src = row.source || 'direct';
    await db
      .insert(dailyAnalytics)
      .values({ date, uniqueVisitors: row.uniqueVisitors, pageViews: row.pageViews, source: src })
      .onDuplicateKeyUpdate({ set: { uniqueVisitors: row.uniqueVisitors, pageViews: row.pageViews } });
  }
}

// ─── Dashboard Query Helpers ──────────────────────────────────────────────────

/** Unique visitors and page views for a time window (live query from js_page_views). */
export async function getJsTrafficStats(days: number): Promise<{ uniqueVisitors: number; pageViews: number }> {
  const db = await getDb();
  if (!db) return { uniqueVisitors: 0, pageViews: 0 };
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      uniqueVisitors: countDistinct(jsPageViews.sessionId),
      pageViews: count(jsPageViews.id),
    })
    .from(jsPageViews)
    .where(gte(jsPageViews.viewedAt, since));
  return { uniqueVisitors: row?.uniqueVisitors ?? 0, pageViews: row?.pageViews ?? 0 };
}

/** Traffic source breakdown for the last N days. */
export async function getJsTrafficSources(days: number): Promise<Array<{ source: string | null; uniqueVisitors: number; pageViews: number }>> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      source: jsPageViews.source,
      uniqueVisitors: countDistinct(jsPageViews.sessionId),
      pageViews: count(jsPageViews.id),
    })
    .from(jsPageViews)
    .where(gte(jsPageViews.viewedAt, since))
    .groupBy(jsPageViews.source)
    .orderBy(desc(count(jsPageViews.id)));
}

/** Daily unique visitors and page views for the last N days (from daily_analytics rollup). */
export async function getDailyAnalytics(days: number): Promise<Array<{ date: string; uniqueVisitors: number; pageViews: number }>> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 10);
  return db
    .select({ date: dailyAnalytics.date, uniqueVisitors: dailyAnalytics.uniqueVisitors, pageViews: dailyAnalytics.pageViews })
    .from(dailyAnalytics)
    .where(and(eq(dailyAnalytics.source, 'all'), gte(dailyAnalytics.date, sinceStr)))
    .orderBy(desc(dailyAnalytics.date));
}
