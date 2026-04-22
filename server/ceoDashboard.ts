/**
 * CEO Dashboard — Server-Side Data Aggregation
 * Renders a fully server-side HTML page at /briefing-room-m4x1q with all operational metrics.
 * All data is in raw HTML — no JavaScript required for reading.
 * v2 — route confirmed working in production build
 */
import { Express, Request, Response } from "express";
import * as db from "./db";
import { getQueueStatus } from "./xPostQueue";
import { getAttributionOverview } from "./attribution";
import { getXCredentials } from "./xTwitterService";
import { TwitterApi } from "twitter-api-v2";
import { callDataApi } from "./_core/dataApi";
import { WHITE_LABEL_CONFIG } from "../shared/brandConfig";
import { getIndexNowStats, loadIndexNowStats } from "./indexnow";
import { getGscSitemapStats, type GscSitemapStats } from "./gscClient";
import { getJsTrafficStats, getJsTrafficSources, getDailyAnalytics } from "./jsAnalytics";

// ─── Types ────────────────────────────────────────────────────────
interface SnapshotData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  daysSinceLaunch: number;
  avgPerDay: string;
}

interface XPerfData {
  followers: number;
  following: number;
  tweetCount: number;
  postsToday: number;
  postsThisWeek: number;
  dailyLimit: number;
  lastPostTime: string | null;
  queueRunning: boolean;
  error?: string;
}

interface AnalyticsData {
  // All traffic (includes internal dev/build URLs)
  totalViews30d: number;
  totalViews7d: number;
  totalViewsToday: number;
  sourceBreakdown: { source: string; views: number }[];
  dailyViews: { date: string; views: number }[];
  // External-only traffic (excludes manus.space, *.run.app, localhost)
  externalViews30d: number;
  externalViews7d: number;
  externalViews1d: number;
  externalSourceBreakdown: { source: string; views: number }[];
  // Internal traffic (dev/build/staging URLs only)
  internalSourceBreakdown: { source: string; views: number }[];
  // v4.9.0: JS-tracked verified traffic (bots excluded)
  jsUniqueVisitors30d: number;
  jsUniqueVisitors7d: number;
  jsUniqueVisitors1d: number;
  jsPageViews30d: number;
  jsPageViews7d: number;
  jsPageViews1d: number;
  jsSourceBreakdown: { source: string | null; uniqueVisitors: number; pageViews: number }[];
  jsDailyStats: { date: string; uniqueVisitors: number; pageViews: number }[];
  // Monetization
  affiliateClicks30d: number;
  affiliateClicks7d: number;
  amazonClicks30d: number;
  amazonClicks7d: number;
  sponsorClicks30d: number;
  sponsorClicks7d: number;
  merchLeads7d: number;
  merchLeads30d: number;
  topAffiliateArticles: { slug: string; clicks: number }[];
  error?: string;
}

interface InventoryData {
  total: number;
  byCategory: { name: string; count: number }[];
  recentArticles: { headline: string; slug: string; publishedAt: string }[];
  dailyCounts: { date: string; count: number }[];
}

interface CandidatePoolData {
  bySourceType: { sourceType: string; pending: number; selected: number; rejected: number; expired: number; total: number }[];
  totals: { pending: number; selected: number; rejected: number; expired: number; total: number };
  // v4.5: Scoring metrics
  scoring?: {
    scored: number;
    unscored: number;
    highPotential: number;
    mediumPotential: number;
    lowPotential: number;
    avgScore: number | null;
    loopEnabled: boolean;
    dailyTarget: number;
    todayCount: number;
    loopRunCount: number;
    loopLastMessage: string;
  };
  throughput24h?: { selected: number; rejected: number; expired: number };
  error?: string;
}

interface NewsletterData {
  total: number;
  thisWeek: number;
  thisMonth: number;
  unsubscribed: number;
}

interface SeoData {
  sitemapUrl: string;
  totalUrls: number;
  indexNowKey: string;
  indexNowKeyUrl: string;
  indexNowLastSubmit: string;
  indexNowTotalSubmitted: number;
  indexNowLastCount: number;
  gscContentSitemap: GscSitemapStats | null;
  gscConfigured: boolean;
}

interface FinancialData {
  ceoCost: number;
  xApiCost: number;
  totalMonthly: number;
  monthlyRevenue: number;
  runway: string;
}

interface Directive {
  directiveDate: string;
  priority: string;
  subject: string;
  body: string;
  status: string;
  completedDate?: string | null;
}

interface ImageStatsData {
  totalPublished: number;
  withImage: number;
  withoutImage: number;
  successRate: string;
  provider: string;
  aspectRatio: string;
  last7dWithImage: number;
  last7dWithoutImage: number;
  last7dSuccessRate: string;
  error?: string;
}

interface SnapshotTrends {
  todayVsTarget: { today: number; target: number; pct: number };
  weekVsPriorWeek: { thisWeek: number; priorWeek: number; pct: number };
  monthVsPriorMonth: { thisMonth: number; priorMonth: number; pct: number };
  oldestPendingCandidate: { title: string; sourceType: string; ageHours: number } | null;
}

interface ContentQuality {
  uncategorizedCount: number;
  noImageCount: number;
  totalPublished: number;
}

// ─── Cache ────────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; fetchedAt: number }>();
function clearDashboardCache(): void {
  cache.clear();
}

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) return null;
  return entry.data as T;
}
function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

// ─── Section 1: Company Snapshot ─────────────────────────────────
async function getCompanySnapshot(): Promise<SnapshotData> {
  const cached = getCached<SnapshotData>("snapshot", FIFTEEN_MIN);
  if (cached) return cached;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const launchDateSetting = await db.getSetting("brand_launch_date");
  const launchDateStr = launchDateSetting?.value || "2026-02-19";
  const launchDate = new Date(launchDateStr);

  const [total, today, thisWeek, thisMonth] = await Promise.all([
    db.countArticlesByStatus("published"),
    db.countArticlesPublishedSince(todayStart),
    db.countArticlesPublishedSince(weekStart),
    db.countArticlesPublishedSince(monthStart),
  ]);

  const daysSinceLaunch = Math.floor((now.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24));
  const avgPerDay = daysSinceLaunch > 0 ? (total / daysSinceLaunch).toFixed(1) : "0.0";

  const result: SnapshotData = { total, today, thisWeek, thisMonth, daysSinceLaunch, avgPerDay };
  setCached("snapshot", result);
  return result;
}

// ─── Section 2: X Performance ────────────────────────────────────
async function getXPerformance(): Promise<XPerfData> {
  const cached = getCached<XPerfData>("xperf", ONE_HOUR);
  if (cached) return cached;

  // Load queue stats from DB — these survive restarts (persisted by xPostQueue.ts)
  const [dailyLimitSetting, lastPostTimeSetting, queueRunningSetting, postsTodayDbSetting, postsTodayDateSetting] = await Promise.all([
    db.getSetting("x_daily_post_limit"),
    db.getSetting("_x_last_post_time"),
    db.getSetting("_x_queue_is_running"),
    db.getSetting("_x_posts_today"),
    db.getSetting("_x_posts_today_date"),
  ]);

  const dailyLimit = parseInt(dailyLimitSetting?.value || "48", 10);
  const lastPostTime = lastPostTimeSetting?.value || null;
  // Cross-check in-memory queue state with DB setting (in-memory wins if running)
  const dbQueueRunning = queueRunningSetting?.value === "true";
  const memState = getQueueStatus();
  const queueRunning = memState.isRunning || dbQueueRunning;

  // Use DB-persisted postsToday if it matches today's date
  const todayKey = new Date().toISOString().substring(0, 10);
  const dbPostsToday = postsTodayDateSetting?.value === todayKey
    ? parseInt(postsTodayDbSetting?.value || "0", 10)
    : 0;

  const creds = await getXCredentials();
  if (!creds) return { error: "X API credentials not configured", followers: 0, following: 0, tweetCount: 0, postsToday: dbPostsToday, postsThisWeek: 0, dailyLimit, lastPostTime, queueRunning };

  try {
    const client = new TwitterApi({ appKey: creds.apiKey, appSecret: creds.apiSecret, accessToken: creds.accessToken, accessSecret: creds.accessTokenSecret });
    const me = await client.v2.me({ "user.fields": ["public_metrics"] });
    const metrics = me.data.public_metrics;

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = await db.countSocialPostsPostedSince(weekStart);

    const result: XPerfData = {
      followers: metrics?.followers_count ?? 0,
      following: metrics?.following_count ?? 0,
      tweetCount: metrics?.tweet_count ?? 0,
      postsToday: dbPostsToday,
      postsThisWeek,
      dailyLimit,
      lastPostTime,
      queueRunning,
    };
    setCached("xperf", result);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `X API error: ${msg}`, followers: 0, following: 0, tweetCount: 0, postsToday: dbPostsToday, postsThisWeek: 0, dailyLimit, lastPostTime, queueRunning };
  }
}

// ─── Section 3: Analytics (First-Party) ─────────────────────────
async function getAnalytics(): Promise<AnalyticsData> {
  const cached = getCached<AnalyticsData>("analytics", FIFTEEN_MIN);
  if (cached) return cached;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalViews30d, totalViews7d, totalViewsToday, sourceBreakdown, dailyViews,
      externalViews30d, externalViews7d, externalViews1d,
      externalSourceBreakdown, internalSourceBreakdown,
      affiliateClicks30d, affiliateClicks7d, amazonClicks30d, amazonClicks7d,
      sponsorClicks30d, sponsorClicks7d, merchLeads7d, merchLeads30d, topAffiliateArticles,
      // v4.9.0: JS-tracked verified traffic
      jsStats30d, jsStats7d, jsStats1d, jsSourceBreakdown, jsDailyStats] = await Promise.all([
      db.countPageViews(30),
      db.countPageViews(7),
      db.countPageViews(1),
      db.getPageViewsBySource(30),
      db.getDailyPageViews(14),
      // External-only traffic (excludes manus.space, *.run.app, localhost)
      db.countExternalPageViews(30),
      db.countExternalPageViews(7),
      db.countExternalPageViews(1),
      db.getExternalPageViewsBySource(30),
      db.getInternalPageViewsBySource(30),
      db.countAffiliateClicks(30),
      db.countAffiliateClicks(7),
      db.countAffiliateClicksByType(30, 'amazon'),
      db.countAffiliateClicksByType(7, 'amazon'),
      db.countAffiliateClicksByType(30, 'sponsor'),
      db.countAffiliateClicksByType(7, 'sponsor'),
      db.countMerchLeads(7),
      db.countMerchLeads(30),
      db.getTopAffiliateArticles(30, 5),
      // v4.9.0: JS-only verified traffic
      getJsTrafficStats(30),
      getJsTrafficStats(7),
      getJsTrafficStats(1),
      getJsTrafficSources(30),
      getDailyAnalytics(30),
    ]);

    const result: AnalyticsData = {
      totalViews30d,
      totalViews7d,
      totalViewsToday,
      sourceBreakdown,
      dailyViews,
      externalViews30d,
      externalViews7d,
      externalViews1d,
      externalSourceBreakdown,
      internalSourceBreakdown,
      // v4.9.0: JS-tracked verified traffic
      jsUniqueVisitors30d: jsStats30d.uniqueVisitors,
      jsUniqueVisitors7d: jsStats7d.uniqueVisitors,
      jsUniqueVisitors1d: jsStats1d.uniqueVisitors,
      jsPageViews30d: jsStats30d.pageViews,
      jsPageViews7d: jsStats7d.pageViews,
      jsPageViews1d: jsStats1d.pageViews,
      jsSourceBreakdown,
      jsDailyStats,
      affiliateClicks30d,
      affiliateClicks7d,
      amazonClicks30d,
      amazonClicks7d,
      sponsorClicks30d,
      sponsorClicks7d,
      merchLeads7d,
      merchLeads30d,
      topAffiliateArticles,
    };
    setCached("analytics", result);
    return result;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      totalViews30d: 0, totalViews7d: 0, totalViewsToday: 0,
      sourceBreakdown: [], dailyViews: [],
      externalViews30d: 0, externalViews7d: 0, externalViews1d: 0,
      externalSourceBreakdown: [], internalSourceBreakdown: [],
      jsUniqueVisitors30d: 0, jsUniqueVisitors7d: 0, jsUniqueVisitors1d: 0,
      jsPageViews30d: 0, jsPageViews7d: 0, jsPageViews1d: 0,
      jsSourceBreakdown: [], jsDailyStats: [],
      affiliateClicks30d: 0, affiliateClicks7d: 0,
      amazonClicks30d: 0, amazonClicks7d: 0,
      sponsorClicks30d: 0, sponsorClicks7d: 0,
      merchLeads7d: 0, merchLeads30d: 0,
      topAffiliateArticles: [],
      error: `Analytics unavailable: ${msg}`,
    };
  }
}

// ─── Section 4: Content Inventory ────────────────────────────────
async function getContentInventory(): Promise<InventoryData> {
  const cached = getCached<InventoryData>("analytics", FIFTEEN_MIN);
  if (cached) return cached;

  const [total, byCategory, recentArticles, dailyCounts] = await Promise.all([
    db.countArticlesByStatus("published"),
    db.getArticleCountByCategory(),
    db.getRecentPublishedArticles(10),
    db.getDailyArticleCounts(30),
  ]);

  const result: InventoryData = {
    total,
    byCategory: byCategory.map((c: { name: string | null; count: number }) => ({ name: c.name ?? "Uncategorized", count: c.count })),
    recentArticles: recentArticles.map((a: { headline: string; slug: string; publishedAt: Date | null }) => ({
      headline: a.headline,
      slug: a.slug,
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown",
    })),
    dailyCounts: dailyCounts.map((d: { date: string; count: number }) => ({ date: d.date, count: d.count })),
  };
  setCached("inventory", result);
  return result;
}

// ─── Section 4b: Candidate Pool Stats ───────────────────────────
async function getCandidatePoolStats(): Promise<CandidatePoolData> {
  const cached = getCached<CandidatePoolData>("candidatePool", FIFTEEN_MIN);
  if (cached) return cached;
  try {
    const { getDb } = await import("./db");
    const { selectorCandidates } = await import("../drizzle/schema");
    const { sql, and, gte, ne } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) return { bySourceType: [], totals: { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 } };

    const rows = await dbConn
      .select({
        sourceType: selectorCandidates.sourceType,
        status: selectorCandidates.status,
        count: sql<number>`count(*)`,
      })
      .from(selectorCandidates)
      .groupBy(selectorCandidates.sourceType, selectorCandidates.status);

    // Aggregate by source type
    const bySource: Record<string, { pending: number; selected: number; rejected: number; expired: number; total: number }> = {};
    const totals = { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 };
    for (const row of rows) {
      const st = row.sourceType ?? "rss";
      if (!bySource[st]) bySource[st] = { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 };
      const n = Number(row.count);
      const status = row.status as "pending" | "selected" | "rejected" | "expired";
      if (status in bySource[st]) bySource[st][status] += n;
      bySource[st].total += n;
      if (status in totals) totals[status] += n;
      totals.total += n;
    }

    const bySourceType = Object.entries(bySource)
      .map(([sourceType, counts]) => ({ sourceType, ...counts }))
      .sort((a, b) => b.total - a.total);

    // v4.5: Fetch scoring stats
    let scoring: CandidatePoolData["scoring"] | undefined;
    try {
      const scoreRows = await dbConn
        .select({
          articlePotential: selectorCandidates.articlePotential,
          hasScore: sql<number>`CASE WHEN \${selectorCandidates.score} IS NOT NULL THEN 1 ELSE 0 END`,
          avgScore: sql<number>`AVG(\${selectorCandidates.score})`,
          count: sql<number>`count(*)`,
        })
        .from(selectorCandidates)
        .where(sql`\${selectorCandidates.status} = 'pending'`)
        .groupBy(selectorCandidates.articlePotential, sql`CASE WHEN \${selectorCandidates.score} IS NOT NULL THEN 1 ELSE 0 END`);
      let scored = 0, unscored = 0, high = 0, medium = 0, low = 0;
      let totalScore = 0, scoreCount = 0;
      for (const r of scoreRows) {
        const n = Number(r.count);
        if (Number(r.hasScore) === 0) { unscored += n; continue; }
        scored += n;
        if (r.articlePotential === "high") high += n;
        else if (r.articlePotential === "medium") medium += n;
        else low += n;
        if (r.avgScore != null) { totalScore += Number(r.avgScore) * n; scoreCount += n; }
      }
      // Production loop status
      const { getProductionLoopStatus } = await import("./production-loop");
      const loopStatus = getProductionLoopStatus();
      // Today's article count
      const { countArticlesPublishedSince } = await import("./db");
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayCount = await countArticlesPublishedSince(todayStart);
      // Daily target setting
      const { getSetting } = await import("./db");
      const [loopEnabledSetting, dailyTargetSetting] = await Promise.all([
        getSetting("production_loop_enabled"),
        getSetting("daily_article_target"),
      ]);
      scoring = {
        scored,
        unscored,
        highPotential: high,
        mediumPotential: medium,
        lowPotential: low,
        avgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : null,
        loopEnabled: loopEnabledSetting?.value !== "false",
        dailyTarget: parseInt(dailyTargetSetting?.value ?? "50"),
        todayCount,
        loopRunCount: loopStatus.runCount,
        loopLastMessage: loopStatus.lastResult?.message ?? "No ticks yet",
      };
    } catch (_scoreErr) {
      // scoring metrics are optional — don't fail the whole section
    }
    // 24h throughput: candidates processed (selected/rejected/expired) in last 24h
    let throughput24h: { selected: number; rejected: number; expired: number } | undefined;
    try {
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
      const t24rows = await dbConn
        .select({ status: selectorCandidates.status, count: sql<number>`count(*)` })
        .from(selectorCandidates)
        .where(and(
          ne(selectorCandidates.status, 'pending'),
          gte(selectorCandidates.createdAt, new Date(cutoff24h))
        ))
        .groupBy(selectorCandidates.status);
      throughput24h = {
        selected: Number(t24rows.find(r => r.status === 'selected')?.count ?? 0),
        rejected: Number(t24rows.find(r => r.status === 'rejected')?.count ?? 0),
        expired: Number(t24rows.find(r => r.status === 'expired')?.count ?? 0),
      };
    } catch (_t24err) { /* optional */ }
    const result: CandidatePoolData = { bySourceType, totals, scoring, throughput24h };
    setCached("candidatePool", result);
    return result;
  } catch (e: unknown) {
    return { bySourceType: [], totals: { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 }, error: String(e) };
  }
}

// ─── Section 5: Newsletter ────────────────────────────────────────
async function getNewsletterStats(): Promise<NewsletterData> {
  const cached = getCached<NewsletterData>("newsletter", FIFTEEN_MIN);
  if (cached) return cached;
  try {
    const [total, thisWeek, thisMonth, unsubscribed] = await Promise.all([
      db.countNewsletterSubscribers("active"),
      db.countNewsletterSubscribersJoinedSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      db.countNewsletterSubscribersJoinedSince(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      db.countNewsletterSubscribers("unsubscribed"),
    ]);
    const result: NewsletterData = { total, thisWeek, thisMonth, unsubscribed };
    setCached("newsletter", result);
    return result;
  } catch {
    return { total: 0, thisWeek: 0, thisMonth: 0, unsubscribed: 0 };
  }
}

// ─── Section 6: SEO Status ────────────────────────────────────────
async function getSeoStatus(): Promise<SeoData> {
  const cached = getCached<SeoData>("seo", FIFTEEN_MIN);
  if (cached) return cached;
  const total = await db.countArticlesByStatus("published");
  const siteUrlSetting = await db.getSetting("site_url");
  const siteUrl = (siteUrlSetting?.value || WHITE_LABEL_CONFIG.siteUrl).replace(/\/$/, "");
  // Count: published articles + categories + static pages (13)
  // Sitemap URL points to /api/ version which bypasses the Manus edge layer
  let categoryCount = 0;
  try {
    const cats = await db.listCategories();
    categoryCount = cats.length;
  } catch { categoryCount = 9; } // fallback to known category count
  const staticPageCount = 13; // matches STATIC_PAGES array in sitemap.ts
  const totalUrls = total + categoryCount + staticPageCount;
  // IndexNow stats — load from DB to survive restarts
  await loadIndexNowStats();
  const inStats = getIndexNowStats();
  const indexNowKey = process.env.INDEXNOW_KEY || "";
  const gscConfigured = !!(process.env.GSC_CLIENT_ID && process.env.GSC_CLIENT_SECRET && process.env.GSC_REFRESH_TOKEN);
  // GSC content sitemap stats — query sitemaps.get for the specific content sitemap
  // This gives submitted vs indexed counts directly from Google's sitemap report
  const contentSitemapUrl = `${siteUrl}/content-sitemap.xml`;
  let gscContentSitemap: GscSitemapStats | null = null;
  if (gscConfigured) {
    try {
      gscContentSitemap = await getGscSitemapStats(contentSitemapUrl);
    } catch {
      gscContentSitemap = null;
    }
  }
  const result: SeoData = {
    sitemapUrl: `${siteUrl}/api/sitemap.xml`,
    totalUrls,
    indexNowKey,
    indexNowKeyUrl: `${siteUrl}/${indexNowKey}.txt`,
    indexNowLastSubmit: inStats.lastSubmitTime || "Never",
    indexNowTotalSubmitted: inStats.totalSubmitted,
    indexNowLastCount: inStats.lastSubmitCount,
    gscContentSitemap,
    gscConfigured,
  };
  setCached("seo", result);
  return result;
}

// ─── Section 7: Financial Summary ────────────────────────────────
function getFinancialSummary(): FinancialData {
  return {
    ceoCost: 200,
    xApiCost: 0,
    totalMonthly: 500,
    monthlyRevenue: 0,
    runway: "Indefinite — owner funded",
  };
}

// ─── Section 8: CEO Directives ────────────────────────────────────
async function getCeoDirectives(): Promise<Directive[]> {
  try {
    return await db.listCeoDirectives();
  } catch {
    return [];
  }
}

// ─── HTML Helpers ─────────────────────────────────────────────────
function priorityBadge(p: string): string {
  const colors: Record<string, string> = { Critical: "#dc2626", High: "#ea580c", Medium: "#2563eb", Low: "#16a34a" };
  const bg = colors[p] ?? "#6b7280";
  return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">${p}</span>`;
}
function statusBadge(s: string): string {
  const colors: Record<string, string> = { Complete: "#16a34a", "In Progress": "#2563eb", Pending: "#d97706", Cancelled: "#6b7280" };
  const bg = colors[s] ?? "#6b7280";
  return `<span style="background:${bg};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">${s}</span>`;
}

// ─── HTML Renderer ────────────────────────────────────────────────
function renderHtml(params: {
  snapshot: SnapshotData;
  xPerf: XPerfData;
  analytics: AnalyticsData;
  inventory: InventoryData;
  candidatePool: CandidatePoolData;
  newsletter: NewsletterData;
  seo: SeoData;
  financial: FinancialData;
  directives: Directive[];
  promoCandidates: db.PromotionCandidate[];
  promoMaxAgeHours: number;
  promoMinXViews: number;
  generatedAt: string;
  siteName: string;
  siteUrl: string;
  twitterHandle: string;
  attributionRows: Awaited<ReturnType<typeof getAttributionOverview>>;
  adSpendSyncStatus: Record<string, { configured: boolean; lastRun: string | null; lastDate: string | null; lastStatus: string | null; lastDetail: string | null }>;
  searchSyncData: Array<{ engine: string; configured: boolean; lastRun: string | null; lastStatus: string | null; totalClicks: number; totalImpressions: number }>;
  searchDetailData: Record<string, { configured: boolean; lastRun: string | null; lastStatus: string | null; today: { clicks: number; impressions: number; avgPosition: number }; sevenDay: { clicks: number; impressions: number; avgPosition: number }; thirtyDay: { clicks: number; impressions: number; avgPosition: number }; topQueries: Array<{ query: string; clicks: number; impressions: number }>; topPages: Array<{ page: string; clicks: number; impressions: number }> }>;
  imageStats: ImageStatsData;
  snapshotTrends: SnapshotTrends;
  contentQuality: ContentQuality;
  sponsorAttributionHtml: string;
}): string {
  const { snapshot, xPerf, analytics, inventory, candidatePool, newsletter, seo, financial, directives, promoCandidates, promoMaxAgeHours, promoMinXViews, generatedAt, siteName, siteUrl, twitterHandle, attributionRows, adSpendSyncStatus, searchSyncData, searchDetailData, imageStats, snapshotTrends, contentQuality, sponsorAttributionHtml } = params;
  const statGridStyle = `display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:40px;`;
  const statCardStyle = `background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;`;
  const h2Style = `font-family:Georgia,serif;font-size:22px;font-weight:700;margin:0 0 16px 0;padding-bottom:8px;border-bottom:3px solid #1a1a1a;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta http-equiv="refresh" content="900">
  <title>CEO Dashboard — ${siteName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;color:#111;line-height:1.6;}
    .wrap{max-width:1100px;margin:0 auto;padding:32px 20px;}
    .hdr{background:#1a1a1a;color:#fff;padding:24px 32px;margin-bottom:32px;}
    .hdr h1{font-family:Georgia,serif;font-size:28px;font-weight:700;}
    .hdr .meta{font-size:13px;color:#9ca3af;margin-top:6px;}
    .stat-num{font-size:32px;font-weight:800;color:#1a1a1a;font-family:Georgia,serif;}
    .stat-lbl{font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;}
    section{margin:0 0 40px 0;}
    h2{${h2Style}}
    table{width:100%;border-collapse:collapse;font-size:15px;}
    th{background:#1a1a1a;color:#fff;padding:10px 14px;text-align:left;font-weight:600;}
    td{padding:10px 14px;border-bottom:1px solid #e5e7eb;}
    tr:nth-child(even) td{background:#f9fafb;}
    .na{color:#9ca3af;font-style:italic;}
    a{color:#2563eb;}
    @media(max-width:600px){.stat-num{font-size:24px;}.wrap{padding:16px 12px;}}
  </style>
</head>
<body>
<div class="hdr">
  <h1>📰 ${siteName} — CEO Dashboard</h1>
  <div class="meta">Last updated: ${generatedAt} UTC &nbsp;·&nbsp; <a href="${siteUrl}" style="color:#9ca3af;">${siteUrl.replace(/^https?:\/\//, '')}</a></div>
  <form method="POST" action="/api/briefing-room-m4x1q/refresh" style="margin-top:8px;">
    <button type="submit" style="background:#c41e3a;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600;">&#8635; Force Refresh</button>
    <span style="font-size:11px;color:#9ca3af;margin-left:8px;">Clears all cached data and reloads from live DB</span>
  </form>
</div>
<div class="wrap">

${(() => {
  const alerts: string[] = [];
  if (snapshotTrends.todayVsTarget.pct < 50 && new Date().getHours() >= 12)
    alerts.push(`⚠️ Article velocity low: ${snapshotTrends.todayVsTarget.today} published today vs target of ${snapshotTrends.todayVsTarget.target} (${snapshotTrends.todayVsTarget.pct}%)`);
  if (contentQuality.uncategorizedCount > 0)
    alerts.push(`⚠️ ${contentQuality.uncategorizedCount} published article${contentQuality.uncategorizedCount !== 1 ? 's' : ''} with no category assigned`);
  if (candidatePool.totals.pending === 0)
    alerts.push(`⚠️ Candidate pool is empty — no articles queued for generation`);
  else if (candidatePool.totals.pending < 10)
    alerts.push(`⚠️ Candidate pool low: only ${candidatePool.totals.pending} pending candidates`);
  if (!xPerf.queueRunning)
    alerts.push(`⚠️ X post queue is STOPPED — no social posts are being sent`);
  return alerts.length > 0
    ? `<section style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
  <h2 style="font-size:16px;font-weight:700;color:#92400e;margin:0 0 10px 0;">\u00a70 ALERT BAR (${alerts.length} active)</h2>
  ${alerts.map(a => `<div style="color:#92400e;font-size:14px;margin-bottom:6px;">${a}</div>`).join('')}
</section>`
    : `<section style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:12px 20px;margin-bottom:24px;">
  <div style="color:#065f46;font-size:14px;font-weight:600;">\u2705 All systems nominal — no active alerts</div>
</section>`;
})()}

<section>
  <h2>§1 Company Snapshot</h2>
  <div style="${statGridStyle}">
    <div style="${statCardStyle}"><div class="stat-num">${snapshot.total.toLocaleString()}</div><div class="stat-lbl">Total Articles Published</div></div>
    <div style="${statCardStyle}">
      <div class="stat-num">${snapshot.today}</div>
      <div class="stat-lbl">Published Today</div>
      <div style="font-size:12px;margin-top:4px;color:${snapshotTrends.todayVsTarget.pct >= 80 ? '#16a34a' : snapshotTrends.todayVsTarget.pct >= 50 ? '#d97706' : '#dc2626'};">${snapshotTrends.todayVsTarget.pct}% of ${snapshotTrends.todayVsTarget.target}-article target</div>
    </div>
    <div style="${statCardStyle}">
      <div class="stat-num">${snapshot.thisWeek}</div>
      <div class="stat-lbl">Published This Week</div>
      <div style="font-size:12px;margin-top:4px;color:${snapshotTrends.weekVsPriorWeek.pct >= 0 ? '#16a34a' : '#dc2626'};">${snapshotTrends.weekVsPriorWeek.pct >= 0 ? '+' : ''}${snapshotTrends.weekVsPriorWeek.pct}% vs prior week (${snapshotTrends.weekVsPriorWeek.priorWeek})</div>
    </div>
    <div style="${statCardStyle}">
      <div class="stat-num">${snapshot.thisMonth}</div>
      <div class="stat-lbl">Published This Month</div>
      <div style="font-size:12px;margin-top:4px;color:${snapshotTrends.monthVsPriorMonth.pct >= 0 ? '#16a34a' : '#dc2626'};">${snapshotTrends.monthVsPriorMonth.pct >= 0 ? '+' : ''}${snapshotTrends.monthVsPriorMonth.pct}% vs prior month (${snapshotTrends.monthVsPriorMonth.priorMonth})</div>
    </div>
    <div style="${statCardStyle}"><div class="stat-num">${snapshot.daysSinceLaunch}</div><div class="stat-lbl">Days Since Launch</div></div>
    <div style="${statCardStyle}"><div class="stat-num">${snapshot.avgPerDay}</div><div class="stat-lbl">Avg Articles / Day</div></div>
  </div>
  ${snapshotTrends.oldestPendingCandidate ? `
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;font-size:13px;color:#374151;">
    <strong>Oldest Pending Candidate:</strong> “${snapshotTrends.oldestPendingCandidate.title}”
    &nbsp;·&nbsp; Source: ${snapshotTrends.oldestPendingCandidate.sourceType}
    &nbsp;·&nbsp; Age: <strong style="color:${snapshotTrends.oldestPendingCandidate.ageHours > 24 ? '#dc2626' : '#d97706'}">${snapshotTrends.oldestPendingCandidate.ageHours}h</strong>
  </div>` : `<div style="font-size:13px;color:#6b7280;">No pending candidates in queue.</div>`}
</section>

<section>
  <h2>§2 X (Twitter) Performance — ${twitterHandle}</h2>
  ${xPerf.error ? `<p class="na">⚠ ${xPerf.error}</p>` : `
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Followers</td><td><strong>${xPerf.followers.toLocaleString()}</strong></td></tr>
    <tr><td>Following</td><td>${xPerf.following.toLocaleString()}</td></tr>
    <tr><td>Total Posts (all time)</td><td>${xPerf.tweetCount.toLocaleString()}</td></tr>
    <tr><td>Posts Today</td><td><strong>${xPerf.postsToday} / ${xPerf.dailyLimit}</strong> (${Math.round((xPerf.postsToday / xPerf.dailyLimit) * 100)}% of daily limit)</td></tr>
    <tr><td>Posts This Week</td><td>${xPerf.postsThisWeek}</td></tr>
    <tr><td>Queue Status</td><td>${xPerf.queueRunning ? '<strong style="color:#16a34a">&#9679; Running</strong>' : '<span style="color:#dc2626">&#9679; Stopped</span>'}</td></tr>
    <tr><td>Last Post Time</td><td>${xPerf.lastPostTime ? new Date(xPerf.lastPostTime).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' ET' : '<span class="na">No posts yet today</span>'}</td></tr>
    <tr><td>Avg Likes / Post</td><td class="na">Requires X Basic API ($100/mo)</td></tr>
    <tr><td>Avg Reposts / Post</td><td class="na">Requires X Basic API ($100/mo)</td></tr>
    <tr><td>Top Performing Post (7d)</td><td class="na">Requires X Basic API ($100/mo)</td></tr>
  </table>`}
</section>

<section>
  <h2>§3 Site Traffic &amp; Analytics (First-Party)</h2>
  ${analytics.error ? `<p class="na">⚠ ${analytics.error}</p>` : ``}

  <!-- v4.9.0: JS-Tracked Verified Traffic (bots excluded) -->
  <h2 style="font-size:17px;border-bottom:2px solid #1a1a1a;padding-bottom:6px;margin-bottom:12px;">✅ JS-Tracked Verified Traffic (Bots Excluded)</h2>
  <p style="font-size:13px;color:#666;margin-bottom:12px;">These numbers come from a client-side JavaScript beacon. Bots do not execute JavaScript, so only real human browser visits are counted. This is the primary source of truth for site traffic. Data accumulates from v4.9.0 deployment (Mar 10, 2026) forward.</p>
  <table style="margin-bottom:16px;">
    <tr><th>Metric</th><th>Today</th><th>Last 7 Days</th><th>Last 30 Days</th></tr>
    <tr><td><strong>Unique Visitors</strong></td><td><strong>${analytics.jsUniqueVisitors1d.toLocaleString()}</strong></td><td><strong>${analytics.jsUniqueVisitors7d.toLocaleString()}</strong></td><td><strong>${analytics.jsUniqueVisitors30d.toLocaleString()}</strong></td></tr>
    <tr><td>Page Views</td><td>${analytics.jsPageViews1d.toLocaleString()}</td><td>${analytics.jsPageViews7d.toLocaleString()}</td><td>${analytics.jsPageViews30d.toLocaleString()}</td></tr>
    <tr><td style="color:#999;">Views/Visitor ratio (30d)</td><td colspan="3" style="color:#999;">${analytics.jsUniqueVisitors30d > 0 ? (analytics.jsPageViews30d / analytics.jsUniqueVisitors30d).toFixed(2) : 'N/A'}</td></tr>
  </table>
  <h3 style="font-size:15px;margin-bottom:8px;">Traffic Sources — Last 30 Days (JS-Tracked)</h3>
  <table style="margin-bottom:16px;">
    <tr><th>Source</th><th>Unique Visitors</th><th>Page Views</th></tr>
    ${analytics.jsSourceBreakdown.length > 0
      ? analytics.jsSourceBreakdown.map(s => {
          const JS_SOURCE_LABELS: Record<string, string> = {
            google: 'Google Search', bing: 'Bing Search', yahoo: 'Yahoo Search',
            duckduckgo: 'DuckDuckGo', x_twitter: 'X (Twitter)', facebook: 'Facebook',
            instagram: 'Instagram', reddit: 'Reddit', linkedin: 'LinkedIn',
            tiktok: 'TikTok', youtube: 'YouTube', telegram: 'Telegram',
            threads: 'Threads', direct: 'Direct / No Referrer', internal: 'Internal Navigation',
          };
          const src = s.source || 'direct';
          const label = JS_SOURCE_LABELS[src] || src;
          return `<tr><td>${label}</td><td>${s.uniqueVisitors.toLocaleString()}</td><td>${s.pageViews.toLocaleString()}</td></tr>`;
        }).join('')
      : '<tr><td colspan="3" class="na">No JS-tracked data yet — accumulating from v4.9.0 deployment</td></tr>'}
  </table>
  ${analytics.jsDailyStats.length > 0 ? `
  <h3 style="font-size:15px;margin-bottom:8px;">Daily Unique Visitors — Last 30 Days (JS-Tracked)</h3>
  <div style="font-family:monospace;font-size:12px;overflow-x:auto;margin-bottom:24px;">
  ${(() => {
    const maxUV = Math.max(...analytics.jsDailyStats.map(d => d.uniqueVisitors), 1);
    const BAR_WIDTH = 40;
    return analytics.jsDailyStats.slice(0, 30).map(d => {
      const barLen = Math.round((d.uniqueVisitors / maxUV) * BAR_WIDTH);
      const bar = '█'.repeat(barLen) + '░'.repeat(BAR_WIDTH - barLen);
      return `<div style="margin-bottom:2px;"><span style="display:inline-block;width:80px;color:#6b7280;">${d.date.slice(5)}</span><span style="color:#1a1a1a;">${bar}</span> <span style="color:#374151;">${d.uniqueVisitors} UV / ${d.pageViews} PV</span></div>`;
    }).join('');
  })()}
  </div>` : ''}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

  <p style="font-size:13px;color:#666;margin-bottom:16px;"><strong>Legacy server-side tracking (below):</strong> Includes bot traffic. Use JS-tracked numbers above as the primary metric.</p>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">External Page Views (Real Visitors Only)</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td><strong>External Page Views — Today</strong></td><td><strong>${analytics.externalViews1d.toLocaleString()}</strong></td></tr>
    <tr><td><strong>External Page Views — Last 7 Days</strong></td><td><strong>${analytics.externalViews7d.toLocaleString()}</strong></td></tr>
    <tr><td><strong>External Page Views — Last 30 Days</strong></td><td><strong>${analytics.externalViews30d.toLocaleString()}</strong></td></tr>
    <tr><td style="color:#999;">Total (incl. internal) — Today</td><td style="color:#999;">${analytics.totalViewsToday.toLocaleString()}</td></tr>
    <tr><td style="color:#999;">Total (incl. internal) — Last 7 Days</td><td style="color:#999;">${analytics.totalViews7d.toLocaleString()}</td></tr>
    <tr><td style="color:#999;">Total (incl. internal) — Last 30 Days</td><td style="color:#999;">${analytics.totalViews30d.toLocaleString()}</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">External Traffic Sources — Last 30 Days</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Source</th><th>Views</th></tr>
    ${analytics.externalSourceBreakdown.length > 0
      ? analytics.externalSourceBreakdown.map(s => {
          const SOURCE_LABELS: Record<string, string> = {
            x: "X (Twitter)",
            twitter: "X (Twitter)",
            google: "Google Search",
            bing: "Bing Search",
            direct: "Direct / No Referrer",
            // own domain is handled dynamically via SITE_URL
            
          };
          const siteHost = siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
          const label = SOURCE_LABELS[s.source] || (s.source === siteHost ? "Direct / Internal Navigation" : s.source);
          return `<tr><td>${label}</td><td>${s.views.toLocaleString()}</td></tr>`;
        }).join("")
      : '<tr><td colspan="2" class="na">No external traffic recorded yet — referrer fix deployed Mar 3, 2026; data will accumulate from this point forward</td></tr>'}
    ${analytics.externalSourceBreakdown.length > 0 ? `<tr><td><strong>TOTAL EXTERNAL</strong></td><td><strong>${analytics.externalViews30d.toLocaleString()}</strong></td></tr>` : ''}
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">External Page Views — Last 30 Days (Bar Chart)</h2>
  ${(() => {
    if (analytics.dailyViews.length === 0) return '<p class="na">No data yet</p>';
    const maxViews = Math.max(...analytics.dailyViews.map(d => d.views), 1);
    const BAR_WIDTH = 40;
    return `<div style="font-family:monospace;font-size:12px;overflow-x:auto;margin-bottom:24px;">
${analytics.dailyViews.slice(-30).map(d => {
  const barLen = Math.round((d.views / maxViews) * BAR_WIDTH);
  const bar = '█'.repeat(barLen) + '░'.repeat(BAR_WIDTH - barLen);
  return `<div style="margin-bottom:2px;"><span style="display:inline-block;width:80px;color:#6b7280;">${d.date.slice(5)}</span><span style="color:#1a1a1a;">${bar}</span> <span style="color:#374151;">${d.views}</span></div>`;
}).join('')}
</div>`;
  })()}
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Daily Page Views — Last 14 Days (Table)</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Date</th><th>Views</th></tr>
    ${analytics.dailyViews.length > 0
      ? analytics.dailyViews.slice(-14).map(d => `<tr><td>${d.date}</td><td>${d.views.toLocaleString()}</td></tr>`).join("")
      : '<tr><td colspan="2" class="na">No data yet</td></tr>'}
  </table>
  <details style="margin-bottom:24px;">
    <summary style="cursor:pointer;font-size:14px;color:#666;padding:8px 0;">Internal / Dev Traffic — Last 30 Days (collapsed by default)</summary>
    <table style="margin-top:12px;">
      <tr><th>Source (Dev/Build URL)</th><th>Views</th></tr>
      ${analytics.internalSourceBreakdown.length > 0
        ? analytics.internalSourceBreakdown.map(s => `<tr><td style="font-size:12px;color:#999;">${s.source}</td><td style="color:#999;">${s.views.toLocaleString()}</td></tr>`).join("")
        : '<tr><td colspan="2" class="na">No internal traffic recorded</td></tr>'}
    </table>
  </details>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Monetization Clicks</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Metric</th><th>Last 7 Days</th><th>Last 30 Days</th></tr>
    <tr><td>Amazon Affiliate Clicks</td><td>${analytics.amazonClicks7d.toLocaleString()}</td><td>${analytics.amazonClicks30d.toLocaleString()}</td></tr>
    <tr><td>Sponsor Bar Clicks</td><td>${analytics.sponsorClicks7d.toLocaleString()}</td><td>${analytics.sponsorClicks30d.toLocaleString()}</td></tr>
    <tr><td><strong>Total Monetization Clicks</strong></td><td><strong>${analytics.affiliateClicks7d.toLocaleString()}</strong></td><td><strong>${analytics.affiliateClicks30d.toLocaleString()}</strong></td></tr>
  </table>
  ${analytics.topAffiliateArticles.length > 0 ? `
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Top Articles by Affiliate Clicks (30d)</h2>
  <table>
    <tr><th>Article Slug</th><th>Clicks</th></tr>
    ${analytics.topAffiliateArticles.map(a => `<tr><td><a href="${siteUrl}/article/${a.slug}">${a.slug}</a></td><td>${a.clicks}</td></tr>`).join("")}
  </table>` : ``}
</section>

<section>
  <h2>§4 Content Inventory</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Category</th><th>Article Count</th></tr>
    ${inventory.byCategory.map(c => `<tr><td>${c.name}</td><td>${c.count.toLocaleString()}</td></tr>`).join("")}
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Most Recent 10 Articles</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Headline</th><th>Published</th></tr>
    ${inventory.recentArticles.map(a => `<tr><td><a href="${siteUrl}/article/${a.slug}">${a.headline}</a></td><td style="white-space:nowrap;">${a.publishedAt}</td></tr>`).join("")}
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Daily Output — Last 30 Days (Velocity Chart)</h2>
  ${(() => {
    if (inventory.dailyCounts.length === 0) return '<p class="na">No data yet</p>';
    const maxCount = Math.max(...inventory.dailyCounts.map(d => d.count), 1);
    const BAR_WIDTH = 40;
    const total = inventory.dailyCounts.reduce((s, d) => s + d.count, 0);
    const avg = inventory.dailyCounts.length > 0 ? (total / inventory.dailyCounts.length).toFixed(1) : '0';
    return `<div style="font-family:monospace;font-size:12px;overflow-x:auto;margin-bottom:16px;">
${inventory.dailyCounts.map(d => {
  const barLen = Math.round((d.count / maxCount) * BAR_WIDTH);
  const bar = '█'.repeat(barLen) + '░'.repeat(BAR_WIDTH - barLen);
  const color = d.count >= 40 ? '#16a34a' : d.count >= 20 ? '#d97706' : '#dc2626';
  return `<div style="margin-bottom:2px;"><span style="display:inline-block;width:80px;color:#6b7280;">${d.date.slice(5)}</span><span style="color:${color};">${bar}</span> <span style="color:#374151;">${d.count}</span></div>`;
}).join('')}
</div><p style="font-size:13px;color:#6b7280;margin-bottom:24px;">30-day avg: <strong>${avg} articles/day</strong> &nbsp;·&nbsp; Total: <strong>${total}</strong></p>`;
  })()}
  ${(() => {
    const total = inventory.byCategory.reduce((s, c) => s + c.count, 0);
    if (total === 0) return '';
    return `<h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Category Distribution</h2>
<table style="margin-bottom:24px;">
  <tr><th>Category</th><th>Count</th><th>% of Total</th></tr>
  ${inventory.byCategory.map(c => `<tr><td>${c.name}</td><td>${c.count.toLocaleString()}</td><td>${((c.count / total) * 100).toFixed(1)}%</td></tr>`).join('')}
  ${contentQuality.uncategorizedCount > 0 ? `<tr style="color:#dc2626;"><td><strong>⚠ Uncategorized</strong></td><td><strong>${contentQuality.uncategorizedCount}</strong></td><td>${((contentQuality.uncategorizedCount / total) * 100).toFixed(1)}%</td></tr>` : ''}
</table>`;
  })()}
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">Candidate Pool — Source Breakdown</h2>
  <p style="color:#6b7280;font-size:14px;margin-bottom:12px;">Active selector_candidates table. Pending = available for next AI selection run. Source diversity improves article variety.</p>
  ${candidatePool.error ? `<p style="color:#dc2626;">Error loading candidate pool data: ${candidatePool.error}</p>` : candidatePool.totals.total === 0 ? `<p class="na">No candidates in pool yet. Enable sources in Admin → Setup Wizard → Screen 2 to start populating the pool.</p>` : `
  <table style="margin-bottom:16px;">
    <tr><th>Source Type</th><th>Pending</th><th>Selected</th><th>Rejected</th><th>Expired</th><th>Total</th></tr>
    ${candidatePool.bySourceType.map(s => `<tr>
      <td><strong>${s.sourceType.toUpperCase().replace('_', ' ')}</strong></td>
      <td style="color:#16a34a;font-weight:700;">${s.pending.toLocaleString()}</td>
      <td>${s.selected.toLocaleString()}</td>
      <td>${s.rejected.toLocaleString()}</td>
      <td style="color:#9ca3af;">${s.expired.toLocaleString()}</td>
      <td>${s.total.toLocaleString()}</td>
    </tr>`).join("")}
    <tr style="border-top:2px solid #1a1a1a;font-weight:700;">
      <td>TOTAL</td>
      <td style="color:#16a34a;font-weight:700;">${candidatePool.totals.pending.toLocaleString()}</td>
      <td>${candidatePool.totals.selected.toLocaleString()}</td>
      <td>${candidatePool.totals.rejected.toLocaleString()}</td>
      <td style="color:#9ca3af;">${candidatePool.totals.expired.toLocaleString()}</td>
      <td>${candidatePool.totals.total.toLocaleString()}</td>
    </tr>
  </table>`}
  ${candidatePool.scoring ? `
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">Candidate Scoring — Quality Distribution (v4.5)</h2>
  <table style="margin-bottom:16px;">
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Scored Candidates</td><td style="color:#16a34a;font-weight:700;">${candidatePool.scoring.scored.toLocaleString()}</td></tr>
    <tr><td>Unscored (pending scoring)</td><td style="color:#9ca3af;">${candidatePool.scoring.unscored.toLocaleString()}</td></tr>
    <tr><td>High Potential (≥70%)</td><td style="color:#16a34a;font-weight:700;">${candidatePool.scoring.highPotential.toLocaleString()}</td></tr>
    <tr><td>Medium Potential (40–70%)</td><td style="color:#2563eb;">${candidatePool.scoring.mediumPotential.toLocaleString()}</td></tr>
    <tr><td>Low Potential (&lt;40%)</td><td style="color:#9ca3af;">${candidatePool.scoring.lowPotential.toLocaleString()}</td></tr>
    <tr><td>Avg Composite Score</td><td>${candidatePool.scoring.avgScore != null ? (candidatePool.scoring.avgScore * 100).toFixed(1) + "%" : "N/A"}</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">Production Loop — Status (v4.5)</h2>
  <table style="margin-bottom:16px;">
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Loop Enabled</td><td style="${candidatePool.scoring.loopEnabled ? "color:#16a34a;font-weight:700;" : "color:#dc2626;"}">${candidatePool.scoring.loopEnabled ? "✓ YES" : "✗ DISABLED"}</td></tr>
    <tr><td>Daily Target</td><td>${candidatePool.scoring.dailyTarget.toLocaleString()} articles/day</td></tr>
    <tr><td>Published Today</td><td style="${candidatePool.scoring.todayCount >= candidatePool.scoring.dailyTarget ? "color:#16a34a;font-weight:700;" : candidatePool.scoring.todayCount >= candidatePool.scoring.dailyTarget * 0.5 ? "color:#d97706;" : "color:#dc2626;"}">${candidatePool.scoring.todayCount.toLocaleString()} / ${candidatePool.scoring.dailyTarget.toLocaleString()}</td></tr>
    <tr><td>Loop Ticks (since restart)</td><td>${candidatePool.scoring.loopRunCount.toLocaleString()}</td></tr>
    <tr><td>Last Loop Result</td><td style="font-size:13px;color:#6b7280;">${candidatePool.scoring.loopLastMessage}</td></tr>
  </table>` : ""}
  ${candidatePool.throughput24h ? `
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">24h Pipeline Throughput</h2>
  <table style="margin-bottom:16px;">
    <tr><th>Status</th><th>Count (last 24h)</th></tr>
    <tr><td>Selected → Published</td><td style="color:#16a34a;font-weight:700;">${candidatePool.throughput24h.selected.toLocaleString()}</td></tr>
    <tr><td>Rejected</td><td style="color:#dc2626;">${candidatePool.throughput24h.rejected.toLocaleString()}</td></tr>
    <tr><td>Expired</td><td style="color:#9ca3af;">${candidatePool.throughput24h.expired.toLocaleString()}</td></tr>
    <tr style="border-top:2px solid #1a1a1a;font-weight:700;"><td>Total Processed</td><td>${(candidatePool.throughput24h.selected + candidatePool.throughput24h.rejected + candidatePool.throughput24h.expired).toLocaleString()}</td></tr>
  </table>` : ""}
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">Image Generation — Success Rate</h2>
  ${imageStats.error ? `<p style="color:#dc2626;">Error loading image stats: ${imageStats.error}</p>` : `
  <table style="margin-bottom:16px;">
    <tr><th>Metric</th><th>All-Time</th><th>Last 7 Days</th></tr>
    <tr><td>Articles with Real Image</td><td style="color:#16a34a;font-weight:700;">${imageStats.withImage.toLocaleString()}</td><td style="color:#16a34a;font-weight:700;">${imageStats.last7dWithImage.toLocaleString()}</td></tr>
    <tr><td>Articles without Image (or /mascot.png fallback)</td><td style="color:#dc2626;">${imageStats.withoutImage.toLocaleString()}</td><td style="color:#dc2626;">${imageStats.last7dWithoutImage.toLocaleString()}</td></tr>
    <tr><td><strong>Image Success Rate</strong></td><td><strong>${imageStats.successRate}</strong></td><td><strong>${imageStats.last7dSuccessRate}</strong></td></tr>
    <tr><td>Active Image Provider</td><td colspan="2">${imageStats.provider === 'none' ? '<span style="color:#dc2626;">⚠ No provider configured</span>' : imageStats.provider.toUpperCase()}</td></tr>
    <tr><td>Aspect Ratio Setting</td><td colspan="2">${imageStats.aspectRatio}</td></tr>
  </table>`}
</section>

<section>
  <h2>§5 Newsletter &amp; Email</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Newsletter Platform</td><td>Custom (built-in subscriber list)</td></tr>
    <tr><td><strong>Total Active Subscribers</strong></td><td><strong>${newsletter.total.toLocaleString()}</strong></td></tr>
    <tr><td>New Subscribers This Week</td><td>${newsletter.thisWeek.toLocaleString()}</td></tr>
    <tr><td>New Subscribers This Month (30d)</td><td>${newsletter.thisMonth.toLocaleString()}</td></tr>
    <tr><td>Total Unsubscribed (all-time)</td><td>${newsletter.unsubscribed.toLocaleString()}</td></tr>
    <tr><td>Retention Rate</td><td>${newsletter.total + newsletter.unsubscribed > 0 ? ((newsletter.total / (newsletter.total + newsletter.unsubscribed)) * 100).toFixed(1) + '%' : 'N/A'}</td></tr>
    <tr><td>Last Newsletter Sent</td><td class="na">Newsletter send system not yet configured</td></tr>
  </table>
</section>

<section>
  <h2>§6 SEO Status</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Sitemap URL</td><td><a href="${seo.sitemapUrl}">${seo.sitemapUrl}</a></td></tr>
    <tr><td>Total URLs in Sitemap</td><td>${seo.totalUrls.toLocaleString()}</td></tr>
    <tr><td>Meta Tag Injection</td><td>✅ Active — all article pages have server-rendered OG, Twitter Card, JSON-LD, canonical</td></tr>
    <tr><td>Google Search Console</td><td>${(() => {
      const gsc = searchSyncData.find(s => s.engine === 'google');
      if (!gsc) return '<span class="na">Status unavailable</span>';
      if (!gsc.configured) return '<span class="na">Not configured — set GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN</span>';
      if (gsc.lastRun) return `✅ Configured — last sync ${new Date(gsc.lastRun).toLocaleString()}${gsc.lastStatus === 'error' ? ' ⚠️ (last sync had errors)' : ''}`;
      return '✅ Configured — awaiting first sync (runs daily at 7 AM UTC)';
    })()}</td></tr>
    <tr><td>Indexed Pages</td><td>${(() => {
      const gsc = searchSyncData.find(s => s.engine === 'google');
      if (!gsc || !gsc.configured) return '<span class="na">Configure GSC credentials to track indexed pages</span>';
      if (!gsc.lastRun) return '<span class="na">Awaiting first sync</span>';
      return `${gsc.totalClicks > 0 ? 'Data available — see §11 below' : 'Sync complete — no click data yet (may take 24–48h to populate)'}`;
    })()}</td></tr>
    <tr><td>Articles Without Category</td><td>${contentQuality.uncategorizedCount > 0 ? `<span style="color:#dc2626;">⚠ ${contentQuality.uncategorizedCount} uncategorized published articles</span>` : '✅ All published articles have a category'}</td></tr>
    <tr><td>Articles Without Featured Image</td><td>${contentQuality.noImageCount > 0 ? `<span style="color:#d97706;">${contentQuality.noImageCount} articles missing featured image</span>` : '✅ All published articles have a featured image'}</td></tr>
    <tr><td>Google Index — Content Sitemap</td><td>${(() => {
      if (!seo.gscConfigured) return '<span class="na">Configure GSC credentials to enable sitemap index tracking</span>';
      if (!seo.gscContentSitemap) return '<span class="na">Sitemap not yet submitted to GSC, or data unavailable</span>';
      const s = seo.gscContentSitemap;
      const pct = s.submitted > 0 ? Math.round((s.indexed / s.submitted) * 100) : 0;
      const status = s.isPending ? ' ⏳ (pending)' : (s.errors > 0 ? ` ⚠️ (${s.errors} error${s.errors !== 1 ? 's' : ''})` : '');
      const lastDl = s.lastDownloaded ? ` · last fetched ${new Date(s.lastDownloaded).toLocaleString()}` : '';
      return `<strong>${s.indexed.toLocaleString()} indexed</strong> / ${s.submitted.toLocaleString()} submitted (${pct}%)${status}${lastDl}`;
    })()}</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">IndexNow (Bing / Yahoo / DuckDuckGo / Yandex / ChatGPT)</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Status</td><td>✅ Active — fires on every article publish</td></tr>
    <tr><td>Key</td><td><code>${seo.indexNowKey}</code></td></tr>
    <tr><td>Key File URL</td><td><a href="${seo.indexNowKeyUrl}">${seo.indexNowKeyUrl}</a></td></tr>
    <tr><td>Last Submission</td><td>${seo.indexNowLastSubmit === "Never" ? '<span class="na">Never — backfill pending</span>' : seo.indexNowLastSubmit}</td></tr>
    <tr><td>URLs in Last Batch</td><td>${seo.indexNowLastCount.toLocaleString()}</td></tr>
    <tr><td>Total URLs Submitted (lifetime)</td><td>${seo.indexNowTotalSubmitted.toLocaleString()}</td></tr>
  </table>
</section>

<section>
  <h2>§7 Financial Summary</h2>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Monthly Operating Costs</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Item</th><th>Monthly Cost</th></tr>
    <tr><td>CEO Cost (Claude Max)</td><td>$${financial.ceoCost}/mo</td></tr>
    <tr><td>Hetzner VPS (CPX21)</td><td>$15/mo</td></tr>
    <tr><td>X API (Free Tier)</td><td>$${financial.xApiCost}/mo</td></tr>
    <tr><td><strong>Total Monthly Burn</strong></td><td><strong>$${financial.totalMonthly}/mo</strong></td></tr>
    <tr><td>Monthly Revenue (Actual)</td><td><strong style="color:${financial.monthlyRevenue > 0 ? '#16a34a' : '#6b7280'};">$${financial.monthlyRevenue.toFixed(2)}</strong>${financial.monthlyRevenue === 0 ? ' <span style="color:#6b7280;font-size:12px;">(pre-revenue)</span>' : ''}</td></tr>
    <tr><td>Net Monthly P&amp;L</td><td><strong style="color:${financial.monthlyRevenue - financial.totalMonthly >= 0 ? '#16a34a' : '#dc2626'};">$${(financial.monthlyRevenue - financial.totalMonthly).toFixed(2)}</strong></td></tr>
    <tr><td>Runway</td><td>${financial.runway}</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Revenue Targets (90-Day Plan)</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Milestone</th><th>Target</th><th>Status</th></tr>
    <tr><td>Day 30 (visitors)</td><td>10,000 monthly visitors</td><td>${analytics.externalViews30d >= 10000 ? '<span style="color:#16a34a;">✅ Hit</span>' : `<span style="color:#d97706;">${analytics.externalViews30d.toLocaleString()} / 10,000 (${Math.round((analytics.externalViews30d/10000)*100)}%)</span>`}</td></tr>
    <tr><td>Day 60 (visitors)</td><td>50,000 monthly visitors</td><td>${analytics.externalViews30d >= 50000 ? '<span style="color:#16a34a;">✅ Hit</span>' : `<span style="color:#6b7280;">Not yet</span>`}</td></tr>
    <tr><td>Day 90 (revenue)</td><td>$500–$700/mo</td><td>${financial.monthlyRevenue >= 500 ? '<span style="color:#16a34a;">✅ Hit</span>' : `<span style="color:#6b7280;">$${financial.monthlyRevenue.toFixed(2)} / $500 target</span>`}</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Unit Economics</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
    <tr><td>Cost per Article</td><td>${snapshot.total > 0 ? `$${(financial.totalMonthly / Math.max(snapshot.thisMonth, 1)).toFixed(3)}` : 'N/A'}</td><td>Monthly burn ÷ articles this month</td></tr>
    <tr><td>Revenue per 1,000 Visitors</td><td>${analytics.externalViews30d > 0 && financial.monthlyRevenue > 0 ? `$${((financial.monthlyRevenue / analytics.externalViews30d) * 1000).toFixed(2)}` : 'N/A (pre-revenue)'}</td><td>RPM estimate</td></tr>
    <tr><td>Visitors Needed to Break Even</td><td>${financial.monthlyRevenue > 0 ? `${Math.ceil((financial.totalMonthly / financial.monthlyRevenue) * analytics.externalViews30d).toLocaleString()}` : 'N/A (no revenue data)'}</td><td>At current RPM</td></tr>
  </table>
  <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Monetization Channels</h2>
  <table style="margin-bottom:24px;">
    <tr><th>Channel</th><th>Last 7 Days</th><th>Last 30 Days</th><th>Status</th></tr>
    <tr><td>Sponsor Bar Clicks</td><td>${analytics.sponsorClicks7d.toLocaleString()}</td><td>${analytics.sponsorClicks30d.toLocaleString()}</td><td class="na">Configure sponsor URL in Admin → Settings → Sponsor Settings</td></tr>
    <tr><td>Amazon Affiliate Clicks</td><td>${analytics.amazonClicks7d.toLocaleString()}</td><td>${analytics.amazonClicks30d.toLocaleString()}</td><td class="na">Requires Amazon Associates account</td></tr>
    <tr><td>Email Leads (Merch)</td><td>${analytics.merchLeads7d.toLocaleString()}</td><td>${analytics.merchLeads30d.toLocaleString()}</td><td class="na">Configure Printify in Admin → Settings → Merch Store</td></tr>
    <tr><td><strong>Total Monetization Clicks</strong></td><td><strong>${analytics.affiliateClicks7d.toLocaleString()}</strong></td><td><strong>${analytics.affiliateClicks30d.toLocaleString()}</strong></td><td></td></tr>
  </table>
  ${sponsorAttributionHtml}
</section>

<section>
  <h2>§8 CEO Directives</h2>
  ${directives.length === 0 ? `<p class="na">No directives on record. Add directives via the admin panel.</p>` : `
  <table>
    <tr><th>Date</th><th>Priority</th><th>Subject</th><th>Status</th><th>Completed</th></tr>
    ${directives.map(d => `<tr>
      <td style="white-space:nowrap;">${d.directiveDate}</td>
      <td>${priorityBadge(d.priority)}</td>
      <td><strong>${d.subject}</strong><br><span style="font-size:13px;color:#6b7280;">${d.body}</span></td>
      <td>${statusBadge(d.status)}</td>
      <td style="white-space:nowrap;">${d.completedDate ?? '<span class="na">—</span>'}</td>
    </tr>`).join("")}
  </table>`}
</section>

<section>
  <h2>§9 Promotion Candidates</h2>
  <p style="color:#6b7280;font-size:14px;margin-bottom:16px;">
    Articles published in the last ${promoMaxAgeHours}h that exceeded ${promoMinXViews} X-sourced page views.
    Ranked by composite score (X views × 10 + affiliate CTR × 50 + freshness bonus). Adjust thresholds in Admin → Settings → Promotion.
  </p>
  ${promoCandidates.length === 0
    ? '<p class="na">No articles currently meet promotion thresholds. Lower thresholds in Admin → Settings → Promotion, or wait for more X traffic to accumulate.</p>'
    : `<table>
      <tr><th>Rank</th><th>Headline</th><th>Category</th><th>Age</th><th>Total Views</th><th>X Views</th><th>Affiliate Clicks</th><th>Affiliate CTR</th><th>Score</th></tr>
      ${promoCandidates.map((c, i) => `<tr>
        <td><strong>${i + 1}</strong></td>
        <td><a href="${siteUrl}/article/${c.slug}">${c.headline}</a></td>
        <td>${c.category || '<span class="na">—</span>'}</td>
        <td>${c.hoursLive}h</td>
        <td>${c.totalViews}</td>
        <td><strong>${c.xViews}</strong></td>
        <td>${c.affiliateClicks}</td>
        <td>${c.affiliateCtr}%</td>
        <td><strong>${c.score}</strong></td>
      </tr>`).join("")}
    </table>`
  }
  <p style="color:#6b7280;font-size:13px;margin-top:12px;">
    Action: Boost top-ranked candidates via X Ads Manager. Use utm_medium=paid to track ROI vs organic.
  </p>
</section>
<section>
  <h2>\u00a710 Attribution Summary (Last 30 Days)</h2>
  ${(() => {
    if (!attributionRows || attributionRows.length === 0) {
      return '<p class="na">No attribution data yet. Add ad spend entries in Admin \u2192 Attribution, and ensure UTM tracking is live on paid campaigns.</p>';
    }
    const totSpend = attributionRows.reduce((s: number, r: {spendCents: number}) => s + r.spendCents, 0);
    const totRev = attributionRows.reduce((s: number, r: {revenueCents: number}) => s + r.revenueCents, 0);
    const totConv = attributionRows.reduce((s: number, r: {conversions: number}) => s + r.conversions, 0);
    const blendedRoas = totSpend > 0 ? (totRev / totSpend).toFixed(2) : '\u221e';
    const avgCpa = totConv > 0 ? '$' + (totSpend / totConv / 100).toFixed(2) : '\u2014';
    const cardStyle = 'background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;';
    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">
      <div style="${cardStyle}"><div style="font-size:22px;font-weight:700;">$${(totSpend/100).toFixed(2)}</div><div style="font-size:12px;color:#6b7280;">Total Spend</div></div>
      <div style="${cardStyle}"><div style="font-size:22px;font-weight:700;">$${(totRev/100).toFixed(2)}</div><div style="font-size:12px;color:#6b7280;">Total Revenue</div></div>
      <div style="${cardStyle}"><div style="font-size:22px;font-weight:700;">${blendedRoas}x</div><div style="font-size:12px;color:#6b7280;">Blended ROAS</div></div>
      <div style="${cardStyle}"><div style="font-size:22px;font-weight:700;">${totConv}</div><div style="font-size:12px;color:#6b7280;">Conversions</div></div>
      <div style="${cardStyle}"><div style="font-size:22px;font-weight:700;">${avgCpa}</div><div style="font-size:12px;color:#6b7280;">Avg CPA</div></div>
    </div>
    <table>
      <tr><th>Channel</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Visitors</th><th>Conversions</th><th>CPA</th></tr>
      ${attributionRows.map((r: {channel:string;spendCents:number;revenueCents:number;conversions:number;visitors:number}) => {
        const roas = r.spendCents > 0 ? (r.revenueCents / r.spendCents).toFixed(2) + 'x' : '\u221e';
        const cpa = r.conversions > 0 ? '$' + (r.spendCents / r.conversions / 100).toFixed(2) : '\u2014';
        return `<tr>
          <td style="text-transform:capitalize;font-weight:600;">${r.channel}</td>
          <td>$${(r.spendCents/100).toFixed(2)}</td>
          <td>$${(r.revenueCents/100).toFixed(2)}</td>
          <td>${roas}</td>
          <td>${r.visitors.toLocaleString()}</td>
          <td>${r.conversions}</td>
          <td>${cpa}</td>
        </tr>`;
      }).join('')}
    </table>
    <h3 style="font-size:15px;font-weight:700;margin:24px 0 8px 0;">Ad Spend Data Sources</h3>
    <table>
      <tr><th>Platform</th><th>Configured</th><th>Last Sync</th><th>Last Date</th><th>Status</th></tr>
      ${Object.entries(adSpendSyncStatus).map(([ch, s]) => {
        const label = ch === 'x' ? 'X Ads' : ch === 'google' ? 'Google Ads' : 'Meta Ads';
        const badge = !s.configured ? '<span style="color:#6b7280">Not configured</span>' : s.lastStatus === 'success' ? '<span style="color:#16a34a;font-weight:600">OK</span>' : s.lastStatus === 'error' ? '<span style="color:#dc2626;font-weight:600">Error</span>' : '<span style="color:#6b7280">Ready</span>';
        return `<tr><td style="font-weight:600">${label}</td><td>${s.configured ? 'Yes' : 'No'}</td><td>${s.lastRun ? new Date(s.lastRun).toLocaleString() : '—'}</td><td>${s.lastDate ?? '—'}</td><td>${badge}</td></tr>`;
      }).join('')}
    </table>`;
  })()}
</section>
<section>
  <h2>§11 Search Engine Traffic</h2>
  ${(() => {
    const cardStyle = 'background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;';
    const engines = ['google', 'bing'] as const;
    const engineLabels: Record<string, string> = { google: 'Google (GSC)', bing: 'Bing Webmaster' };
    return engines.map(eng => {
      const d = searchDetailData[eng];
      if (!d) return `<h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">${engineLabels[eng]}</h2><p class="na">Data unavailable</p>`;
      const badge = !d.configured ? '<span style="color:#6b7280">Not configured</span>' : d.lastStatus === 'success' ? '<span style="color:#16a34a;font-weight:600">Synced OK</span>' : d.lastStatus === 'error' ? '<span style="color:#dc2626;font-weight:600">Sync Error</span>' : '<span style="color:#6b7280">Ready — awaiting first sync</span>';
      const lastSyncStr = d.lastRun ? new Date(d.lastRun).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' ET' : '\u2014';
      if (!d.configured) return `<h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">${engineLabels[eng]}</h2><p class="na">${eng === 'google' ? 'Not configured — set GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN, GSC_SITE_IDENTIFIER' : 'Not configured — set BING_WEBMASTER_API_KEY'}</p>`;
      return `
      <h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;margin-top:24px;">${engineLabels[eng]} — ${badge} — Last sync: ${lastSyncStr}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.today.clicks}</div><div style="font-size:11px;color:#6b7280;">Clicks Today</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.today.impressions}</div><div style="font-size:11px;color:#6b7280;">Impressions Today</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.sevenDay.clicks}</div><div style="font-size:11px;color:#6b7280;">Clicks (7d)</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.sevenDay.impressions}</div><div style="font-size:11px;color:#6b7280;">Impressions (7d)</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.thirtyDay.clicks}</div><div style="font-size:11px;color:#6b7280;">Clicks (30d)</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.thirtyDay.impressions}</div><div style="font-size:11px;color:#6b7280;">Impressions (30d)</div></div>
        <div style="${cardStyle}"><div style="font-size:18px;font-weight:700;">${d.thirtyDay.avgPosition > 0 ? '#' + d.thirtyDay.avgPosition : '\u2014'}</div><div style="font-size:11px;color:#6b7280;">Avg Position (30d)</div></div>
      </div>
      ${d.topQueries.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px 0;">Top 5 Queries (Last 7 Days)</h3>
      <table style="margin-bottom:16px;">
        <tr><th>Query</th><th>Clicks</th><th>Impressions</th></tr>
        ${d.topQueries.map(q => `<tr><td>${q.query}</td><td>${q.clicks}</td><td>${q.impressions}</td></tr>`).join('')}
      </table>` : `<p class="na" style="margin-bottom:12px;">No query data yet — will populate once search clicks start coming in</p>`}
      ${d.topPages.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px 0;">Top 5 Pages (Last 7 Days)</h3>
      <table>
        <tr><th>Page URL</th><th>Clicks</th><th>Impressions</th></tr>
        ${d.topPages.map(p => `<tr><td style="font-size:12px;word-break:break-all;"><a href="${p.page}">${p.page.replace(/^https?:\/\/[^/]+/, '')}</a></td><td>${p.clicks}</td><td>${p.impressions}</td></tr>`).join('')}
      </table>` : `<p class="na">No page data yet — will populate once search clicks start coming in</p>`}
      `;
    }).join('');
  })()}
</section>

</div>
</body>
</html>`;
}

// ─── Section 4c: Image Generation Stats ─────────────────────────
async function getImageStats(): Promise<ImageStatsData> {
  const cached = getCached<ImageStatsData>("imageStats", FIFTEEN_MIN);
  if (cached) return cached;
  try {
    const { getDb } = await import("./db");
    const { articles } = await import("../drizzle/schema");
    const { sql: drizzleSql, eq, and, gte } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) return { totalPublished: 0, withImage: 0, withoutImage: 0, successRate: "N/A", provider: "N/A", aspectRatio: "N/A", last7dWithImage: 0, last7dWithoutImage: 0, last7dSuccessRate: "N/A" };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const imgWithImage = drizzleSql<number>`SUM(CASE WHEN ${articles.featuredImage} IS NOT NULL AND ${articles.featuredImage} != '' AND ${articles.featuredImage} != '/mascot.png' THEN 1 ELSE 0 END)`;
    const [allRows, last7dRows] = await Promise.all([
      dbConn.select({ total: drizzleSql<number>`COUNT(*)`, withImage: imgWithImage })
        .from(articles).where(eq(articles.status, "published")),
      dbConn.select({ total: drizzleSql<number>`COUNT(*)`, withImage: imgWithImage })
        .from(articles).where(and(eq(articles.status, "published"), gte(articles.createdAt, sevenDaysAgo))),
    ]);

    const total = Number(allRows[0]?.total ?? 0);
    const withImage = Number(allRows[0]?.withImage ?? 0);
    const withoutImage = total - withImage;
    const successRate = total > 0 ? ((withImage / total) * 100).toFixed(1) + "%" : "N/A";

    const last7dTotal = Number(last7dRows[0]?.total ?? 0);
    const last7dWithImage = Number(last7dRows[0]?.withImage ?? 0);
    const last7dWithoutImage = last7dTotal - last7dWithImage;
    const last7dSuccessRate = last7dTotal > 0 ? ((last7dWithImage / last7dTotal) * 100).toFixed(1) + "%" : "N/A";

    const providerSetting = await db.getSetting("image_provider");
    const aspectRatioSetting = await db.getSetting("image_aspect_ratio");
    const provider = providerSetting?.value || "none";
    const aspectRatio = aspectRatioSetting?.value || "1:1";

    const result: ImageStatsData = { totalPublished: total, withImage, withoutImage, successRate, provider, aspectRatio, last7dWithImage, last7dWithoutImage, last7dSuccessRate };
    setCached("imageStats", result);
    return result;
  } catch (e: unknown) {
    return { totalPublished: 0, withImage: 0, withoutImage: 0, successRate: "N/A", provider: "N/A", aspectRatio: "N/A", last7dWithImage: 0, last7dWithoutImage: 0, last7dSuccessRate: "N/A", error: String(e) };
  }
}

// ─── Section 1b: Snapshot Trends ─────────────────────────────────
async function getSnapshotTrends(snapshot: SnapshotData): Promise<SnapshotTrends> {
  const cached = getCached<SnapshotTrends>("snapshotTrends", ONE_HOUR);
  if (cached) return cached;
  const now = new Date();
  // Prior week: 14d ago to 7d ago
  const priorWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const priorWeekEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Prior month: 60d ago to 30d ago
  const priorMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const priorMonthEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Daily target from DB setting
  const targetSetting = await db.getSetting("daily_article_target");
  const target = parseInt(targetSetting?.value || "50", 10);
  const [priorWeek, priorMonth, oldestCandidate] = await Promise.all([
    db.countArticlesPublishedBetween(priorWeekStart, priorWeekEnd),
    db.countArticlesPublishedBetween(priorMonthStart, priorMonthEnd),
    db.getOldestPendingCandidate(),
  ]);
  const pctChange = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
  const result: SnapshotTrends = {
    todayVsTarget: { today: snapshot.today, target, pct: target > 0 ? Math.round((snapshot.today / target) * 100) : 0 },
    weekVsPriorWeek: { thisWeek: snapshot.thisWeek, priorWeek, pct: pctChange(snapshot.thisWeek, priorWeek) },
    monthVsPriorMonth: { thisMonth: snapshot.thisMonth, priorMonth, pct: pctChange(snapshot.thisMonth, priorMonth) },
    oldestPendingCandidate: oldestCandidate
      ? {
          title: oldestCandidate.title,
          sourceType: oldestCandidate.sourceType,
          ageHours: Math.round((Date.now() - oldestCandidate.createdAt.getTime()) / (1000 * 60 * 60)),
        }
      : null,
  };
  setCached("snapshotTrends", result);
  return result;
}

// ─── Content Quality ────────────────────────────────────────────────────
async function getContentQuality(): Promise<ContentQuality> {
  const cached = getCached<ContentQuality>("contentQuality", ONE_HOUR);
  if (cached) return cached;
  const [uncategorizedCount, noImageCount, totalPublished] = await Promise.all([
    db.countArticlesWithNullCategory(),
    db.countArticlesWithNoImage(),
    db.countArticlesByStatus("published"),
  ]);
  const result: ContentQuality = { uncategorizedCount, noImageCount, totalPublished };
  setCached("contentQuality", result);
  return result;
}

// ─── Express Route Registration ────────────────────────────────────────────────────
export function registerCeoDashboardRoute(app: Express): void {
  // Force refresh endpoint — clears all cached data and redirects to dashboard
  app.post("/api/briefing-room-m4x1q/refresh", (_req: Request, res: Response) => {
    clearDashboardCache();
    res.redirect(303, "/api/briefing-room-m4x1q");
  });

  app.get("/api/briefing-room-m4x1q", async (_req: Request, res: Response) => {
    try {
      const [snapshot, xPerf, analytics, inventory, candidatePool, newsletter, seo, directives, imageStats, contentQuality] = await Promise.all([
        getCompanySnapshot(),
        getXPerformance(),
        getAnalytics(),
        getContentInventory(),
        getCandidatePoolStats(),
        getNewsletterStats(),
        getSeoStatus(),
        getCeoDirectives(),
        getImageStats(),
        getContentQuality(),
      ]);
      const financial = getFinancialSummary();
      // Snapshot trends require snapshot to be resolved first
      const snapshotTrends = await getSnapshotTrends(snapshot);
      const generatedAt = new Date().toISOString().replace("T", " ").substring(0, 19);

      const siteUrlSetting = await db.getSetting("site_url");
      const siteNameSetting = await db.getSetting("brand_site_name");
      const twitterHandleSetting = await db.getSetting("brand_twitter_handle");
      const siteUrl = (siteUrlSetting?.value || WHITE_LABEL_CONFIG.siteUrl).replace(/\/$/, "");
      const siteName = siteNameSetting?.value || WHITE_LABEL_CONFIG.siteName;
      const twitterHandle = twitterHandleSetting?.value || WHITE_LABEL_CONFIG.twitterHandle;

      // §9 Promotion Candidates — read thresholds from settings
      const promoEnabled = (await db.getSetting("promo_enabled"))?.value !== "false";
      const promoMaxAgeHours = parseInt((await db.getSetting("promo_max_age_hours"))?.value || "48");
      const promoMinXViews = parseInt((await db.getSetting("promo_min_x_views"))?.value || "10");
      const promoMinAffiliateCtr = parseFloat((await db.getSetting("promo_min_affiliate_ctr"))?.value || "0");
      const promoMaxCandidates = parseInt((await db.getSetting("promo_max_candidates"))?.value || "10");
      const promoCategoryCap = parseInt((await db.getSetting("promo_category_cap"))?.value || "3");
      const promoCandidates = promoEnabled
        ? await db.getPromotionCandidates(promoMaxAgeHours, promoMinXViews, promoMinAffiliateCtr, promoMaxCandidates, promoCategoryCap)
        : [];

      // §10 Attribution Summary — last 30 days
      const attrEnd = new Date().toISOString().slice(0, 10);
      const attrStartDate = new Date(); attrStartDate.setDate(attrStartDate.getDate() - 30);
      const attrStart = attrStartDate.toISOString().slice(0, 10);
      const attributionRows = await getAttributionOverview(attrStart, attrEnd).catch(() => []);
      let adSpendSyncStatus: Record<string, { configured: boolean; lastRun: string | null; lastDate: string | null; lastStatus: string | null; lastDetail: string | null }> = {};
      try {
        const { getAdSpendSyncStatus } = await import("./adSpendSync");
        adSpendSyncStatus = await getAdSpendSyncStatus();
      } catch { /* non-critical */ }

      // §11 Search Engine Traffic — expanded with today/7d/30d, avg position, top queries/pages
      const todayStr = new Date().toISOString().slice(0, 10);
      const sevenDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
      type SearchPeriodMetrics = { clicks: number; impressions: number; avgPosition: number };
      type SearchEngineDetail = { configured: boolean; lastRun: string | null; lastStatus: string | null; today: SearchPeriodMetrics; sevenDay: SearchPeriodMetrics; thirtyDay: SearchPeriodMetrics; topQueries: Array<{ query: string; clicks: number; impressions: number }>; topPages: Array<{ page: string; clicks: number; impressions: number }> };
      let searchSyncData: Array<{ engine: string; configured: boolean; lastRun: string | null; lastStatus: string | null; totalClicks: number; totalImpressions: number }> = [];
      let searchDetailData: Record<string, SearchEngineDetail> = {};
      try {
        const { getSearchSyncStatus } = await import("./searchPerformanceSync");
        const syncStatus = await getSearchSyncStatus();
        const { getDb } = await import("./db");
        const { searchEnginePerformance } = await import("../drizzle/schema");
        const { sql: drizzleSql, and: drizzleAnd, gte: drizzleGte, lte: drizzleLte, eq: drizzleEq, isNotNull: drizzleIsNotNull, isNull: drizzleIsNull, desc: drizzleDesc } = await import("drizzle-orm");
        const dbInst = await getDb();
        const emptyMetrics = (): SearchPeriodMetrics => ({ clicks: 0, impressions: 0, avgPosition: 0 });
        for (const engineKey of ['google', 'bing'] as const) {
          const syncInfo = engineKey === 'google' ? syncStatus.gsc : syncStatus.bing;
          const detail: SearchEngineDetail = { configured: syncInfo.configured, lastRun: syncInfo.lastSync, lastStatus: syncInfo.lastError ? 'error' : syncInfo.lastSync ? 'success' : null, today: emptyMetrics(), sevenDay: emptyMetrics(), thirtyDay: emptyMetrics(), topQueries: [], topPages: [] };
          if (dbInst && syncInfo.configured) {
            const periodQuery = async (start: string, end: string): Promise<SearchPeriodMetrics> => {
              const rows = await dbInst.select({
                totalClicks: drizzleSql<number>`SUM(${searchEnginePerformance.clicks})`,
                totalImpressions: drizzleSql<number>`SUM(${searchEnginePerformance.impressions})`,
                avgPos: drizzleSql<number>`AVG(${searchEnginePerformance.position})`,
              }).from(searchEnginePerformance)
                .where(drizzleAnd(drizzleEq(searchEnginePerformance.engine, engineKey), drizzleGte(searchEnginePerformance.date, start), drizzleLte(searchEnginePerformance.date, end), drizzleIsNull(searchEnginePerformance.query)));
              const r = rows[0];
              return { clicks: Number(r?.totalClicks ?? 0), impressions: Number(r?.totalImpressions ?? 0), avgPosition: Math.round((Number(r?.avgPos ?? 0)) * 10) / 10 };
            };
            detail.today = await periodQuery(todayStr, todayStr);
            detail.sevenDay = await periodQuery(sevenDaysAgoStr, todayStr);
            detail.thirtyDay = await periodQuery(attrStart, attrEnd);
            const qRows = await dbInst.select({
              query: searchEnginePerformance.query,
              clicks: drizzleSql<number>`SUM(${searchEnginePerformance.clicks})`,
              impressions: drizzleSql<number>`SUM(${searchEnginePerformance.impressions})`,
            }).from(searchEnginePerformance)
              .where(drizzleAnd(drizzleEq(searchEnginePerformance.engine, engineKey), drizzleGte(searchEnginePerformance.date, sevenDaysAgoStr), drizzleLte(searchEnginePerformance.date, todayStr), drizzleIsNotNull(searchEnginePerformance.query)))
              .groupBy(searchEnginePerformance.query)
              .orderBy(drizzleDesc(drizzleSql`SUM(${searchEnginePerformance.clicks})`)).limit(5);
            detail.topQueries = qRows.map(r => ({ query: r.query ?? '', clicks: Number(r.clicks), impressions: Number(r.impressions) }));
            const pRows = await dbInst.select({
              page: searchEnginePerformance.pageUrl,
              clicks: drizzleSql<number>`SUM(${searchEnginePerformance.clicks})`,
              impressions: drizzleSql<number>`SUM(${searchEnginePerformance.impressions})`,
            }).from(searchEnginePerformance)
              .where(drizzleAnd(drizzleEq(searchEnginePerformance.engine, engineKey), drizzleGte(searchEnginePerformance.date, sevenDaysAgoStr), drizzleLte(searchEnginePerformance.date, todayStr), drizzleIsNotNull(searchEnginePerformance.pageUrl)))
              .groupBy(searchEnginePerformance.pageUrl)
              .orderBy(drizzleDesc(drizzleSql`SUM(${searchEnginePerformance.clicks})`)).limit(5);
            detail.topPages = pRows.map(r => ({ page: r.page ?? '', clicks: Number(r.clicks), impressions: Number(r.impressions) }));
          }
          searchDetailData[engineKey] = detail;
        }
        const gDetail = searchDetailData['google'];
        const bDetail = searchDetailData['bing'];
        searchSyncData = [
          { engine: 'google', configured: gDetail?.configured ?? false, lastRun: gDetail?.lastRun ?? null, lastStatus: gDetail?.lastStatus ?? null, totalClicks: gDetail?.thirtyDay.clicks ?? 0, totalImpressions: gDetail?.thirtyDay.impressions ?? 0 },
          { engine: 'bing', configured: bDetail?.configured ?? false, lastRun: bDetail?.lastRun ?? null, lastStatus: bDetail?.lastStatus ?? null, totalClicks: bDetail?.thirtyDay.clicks ?? 0, totalImpressions: bDetail?.thirtyDay.impressions ?? 0 },
        ];
      } catch { /* non-critical */ }

      // Pre-fetch sponsor attribution for §7
      let sponsorAttributionHtml = '<p class="na">Sponsor attribution data unavailable.</p>';
      try {
        const [topRows, totals, variants] = await Promise.all([
          db.getSponsorAttributionReport(30, 5, 'sponsor'),
          db.getSponsorAttributionTotals(30, 'sponsor'),
          db.countSponsorClicksByVariant(30),
        ]);
        const topTable = topRows.length > 0
          ? `<table style="margin-bottom:12px;"><tr><th>#</th><th>Article</th><th>Views</th><th>Sponsor Clicks</th><th>CTR</th></tr>${topRows.map((r, i) => `<tr><td>${i+1}</td><td><a href="${siteUrl}/api/article/${r.slug}">${r.headline.slice(0, 60)}${r.headline.length > 60 ? '...' : ''}</a></td><td>${r.views.toLocaleString()}</td><td>${r.sponsorClicks}</td><td>${r.ctr.toFixed(2)}%</td></tr>`).join('')}</table>`
          : '<p class="na">No sponsor clicks recorded yet.</p>';
        const abActive = variants.a + variants.b > 0;
        const abSection = abActive
          ? `<h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">A/B Sponsor Test Results (Last 30 Days)</h2><table style="margin-bottom:24px;"><tr><th>Variant</th><th>Clicks</th><th>Share</th></tr><tr><td>Variant A (control)</td><td>${variants.a}</td><td>${variants.a + variants.b > 0 ? ((variants.a / (variants.a + variants.b)) * 100).toFixed(1) : 0}%</td></tr><tr><td>Variant B (challenger)</td><td>${variants.b}</td><td>${variants.a + variants.b > 0 ? ((variants.b / (variants.a + variants.b)) * 100).toFixed(1) : 0}%</td></tr><tr><td><strong>Winner</strong></td><td colspan="2"><strong>${variants.a >= variants.b ? 'Variant A' : 'Variant B'} leads</strong></td></tr></table>`
          : '';
        sponsorAttributionHtml = `<h2 style="font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Sponsor Attribution — Top 5 Articles (Last 30 Days)</h2><p style="font-size:13px;color:#6b7280;margin-bottom:8px;">Blended CTR: ${totals.blendedCtr.toFixed(2)}% &nbsp;|&nbsp; Total sponsor clicks: ${totals.totalClicks.toLocaleString()}</p>${topTable}${abSection}`;
      } catch { /* non-critical, keep default */ }

      const html = renderHtml({ snapshot, xPerf, analytics, inventory, candidatePool, newsletter, seo, financial, directives, promoCandidates, promoMaxAgeHours, promoMinXViews, generatedAt, siteName, siteUrl, twitterHandle, attributionRows, adSpendSyncStatus, searchSyncData, searchDetailData, imageStats, snapshotTrends, contentQuality, sponsorAttributionHtml });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      // Defeat edge-layer / CDN caching — this page must always be live
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("CDN-Cache-Control", "no-store");
      res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
      res.setHeader("Expires", "0");
      res.send(html);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).send(`<h1>CEO Dashboard Error</h1><pre>${msg}</pre>`);
    }
  });
}
