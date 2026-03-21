/**
 * Attribution & Revenue Pipeline
 *
 * Tracking endpoints (registered before tRPC):
 *   POST /api/track/session    — Create/update visitor session with UTM data
 *   POST /api/track/pageview   — Record page view within session
 *   POST /api/track/event      — Record conversion event
 *   POST /api/track/heartbeat  — Update session duration
 *
 * Also exports helpers for wiring into existing conversion points.
 */

import { createHash } from "crypto";
import { getDb } from "./db";
import {
  adSpend, visitorSessions, conversionEvents, revenueEvents,
  type InsertAdSpend, type InsertRevenueEvent,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type { Express, Request, Response } from "express";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Channel =
  | "google_paid" | "google_organic"
  | "meta_paid" | "meta_organic"
  | "x_paid" | "x_organic"
  | "bing_paid" | "bing_organic"
  | "reddit" | "newsletter" | "direct" | "referral" | "other";

export type ConversionEventType =
  | "page_view" | "newsletter_signup" | "merch_lead" | "affiliate_click"
  | "sponsor_click" | "stripe_checkout_start" | "stripe_payment_complete"
  | "ad_impression" | "custom";

// ─── Bot detection ────────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /exabot/i, /facebot/i, /ia_archiver/i,
  /msnbot/i, /semrushbot/i, /ahrefsbot/i, /dotbot/i, /rogerbot/i,
  /screaming.frog/i, /lighthouse/i, /headlesschrome/i, /phantomjs/i,
];

export function isBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some(p => p.test(userAgent));
}

// ─── Channel resolution ───────────────────────────────────────────────────────

export function resolveChannel(
  utmSource?: string,
  utmMedium?: string,
  referrer?: string
): Channel {
  const src = utmSource?.toLowerCase() ?? "";
  const med = utmMedium?.toLowerCase() ?? "";

  // Paid traffic
  if (["cpc", "ppc", "paid", "paidsocial", "paid_social"].includes(med)) {
    if (src.includes("google")) return "google_paid";
    if (src.includes("meta") || src.includes("facebook") || src.includes("instagram")) return "meta_paid";
    if (src.includes("twitter") || src.includes("x")) return "x_paid";
    if (src.includes("bing")) return "bing_paid";
    return "other";
  }

  // Organic social / newsletter via UTM
  if (med === "social" || src === "twitter" || src === "x") return "x_organic";
  if (src === "newsletter" || med === "email") return "newsletter";
  if (src.includes("google") && med === "organic") return "google_organic";
  if (src.includes("bing") && med === "organic") return "bing_organic";
  if (src === "reddit") return "reddit";

  // Referrer-based fallback
  if (referrer) {
    const ref = referrer.toLowerCase();
    if (ref.includes("google.")) return "google_organic";
    if (ref.includes("bing.")) return "bing_organic";
    if (/\/\/t\.co[\/\?#]/.test(ref) || ref.endsWith("//t.co") || ref.includes("twitter.") || /\/\/x\.com[\/\?#]/.test(ref) || ref.endsWith("//x.com")) return "x_organic";
    if (ref.includes("facebook.") || ref.includes("instagram.")) return "meta_organic";
    if (ref.includes("reddit.")) return "reddit";
    // Internal navigation — treat as direct
    const ownHost = (process.env.SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, ""); if ((ownHost && ref.includes(ownHost)) || ref.includes("localhost")) return "direct";
    return "referral";
  }

  return "direct";
}

// ─── IP hashing ───────────────────────────────────────────────────────────────

function hashIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.HASH_SALT || process.env.JWT_SECRET || "satire-engine-salt"; return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

// ─── Rate limiting (in-memory, per session) ───────────────────────────────────

const sessionCreated = new Set<string>();
const recentPageviews = new Map<string, number>(); // key: `${sessionId}:${url}`, value: timestamp

function canCreateSession(sessionId: string): boolean {
  if (sessionCreated.has(sessionId)) return false;
  sessionCreated.add(sessionId);
  // Prune after 30 min to avoid unbounded growth
  setTimeout(() => sessionCreated.delete(sessionId), 30 * 60 * 1000);
  return true;
}

function canRecordPageview(sessionId: string, url: string): boolean {
  const key = `${sessionId}:${url}`;
  const last = recentPageviews.get(key) ?? 0;
  const now = Date.now();
  if (now - last < 5000) return false;
  recentPageviews.set(key, now);
  setTimeout(() => recentPageviews.delete(key), 10000);
  return true;
}

// ─── DB helpers (exported for use in routers.ts and conversion hooks) ─────────

export async function createVisitorSession(data: {
  sessionId: string;
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}): Promise<void> {
  const channel = resolveChannel(data.utmSource, data.utmMedium, data.referrer);
  const db = await getDb();
  if (!db) return;
  await db.insert(visitorSessions).values({
    sessionId: data.sessionId,
    visitorId: data.visitorId,
    utmSource: data.utmSource,
    utmMedium: data.utmMedium,
    utmCampaign: data.utmCampaign,
    utmTerm: data.utmTerm,
    utmContent: data.utmContent,
    channel,
    landingPage: data.landingPage.slice(0, 500),
    referrer: data.referrer?.slice(0, 500),
    userAgent: data.userAgent?.slice(0, 500),
    ipHash: data.ipHash,
    pageViews: 1,
    durationSeconds: 0,
    maxScrollDepth: 0,
  }).onDuplicateKeyUpdate({ set: { lastActivityAt: sql`now()` } });
}

export async function recordConversionEvent(data: {
  sessionId: string;
  visitorId?: string;
  eventType: ConversionEventType;
  articleId?: number;
  articleSlug?: string;
  eventValueCents?: number;
  eventMetadata?: Record<string, unknown>;
  channel?: Channel;
  utmSource?: string;
  utmCampaign?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Look up session channel if not provided
  let channel = data.channel ?? "direct";
  let utmSource = data.utmSource;
  let utmCampaign = data.utmCampaign;

  if (!data.channel) {
    try {
      const sessions = await db.select({
        channel: visitorSessions.channel,
        utmSource: visitorSessions.utmSource,
        utmCampaign: visitorSessions.utmCampaign,
      }).from(visitorSessions).where(eq(visitorSessions.sessionId, data.sessionId)).limit(1);
      if (sessions[0]) {
        channel = sessions[0].channel as Channel;
        utmSource = sessions[0].utmSource ?? undefined;
        utmCampaign = sessions[0].utmCampaign ?? undefined;
      }
    } catch { /* fire-and-forget */ }
  }

  await db.insert(conversionEvents).values({
    sessionId: data.sessionId,
    visitorId: data.visitorId,
    eventType: data.eventType,
    articleId: data.articleId,
    articleSlug: data.articleSlug,
    eventValueCents: data.eventValueCents ?? 0,
    eventMetadata: data.eventMetadata ?? null,
    channel,
    utmSource,
    utmCampaign,
  });
}

export async function updateSessionConversionFlag(
  sessionId: string,
  flag: "newsletterSignup" | "merchLead" | "affiliateClick" | "stripePurchase"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(visitorSessions)
    .set({ [flag]: true, lastActivityAt: sql`now()` })
    .where(eq(visitorSessions.sessionId, sessionId));
}

// ─── Ad Spend CRUD ────────────────────────────────────────────────────────────

export async function insertAdSpend(data: InsertAdSpend) {
  const db = await getDb();
  if (!db) return;
  return db.insert(adSpend).values(data);
}

export async function listAdSpend(opts?: { startDate?: string; endDate?: string; channel?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(adSpend);
  const conditions = [];
  if (opts?.startDate) conditions.push(gte(adSpend.date, opts.startDate));
  if (opts?.endDate) conditions.push(lte(adSpend.date, opts.endDate));
  if (opts?.channel) conditions.push(eq(adSpend.channel, opts.channel as any));
  if (conditions.length) query = query.where(and(...conditions)) as any;
  return query.orderBy(desc(adSpend.date));
}

export async function updateAdSpend(id: number, data: Partial<InsertAdSpend>) {
  const db = await getDb();
  if (!db) return;
  return db.update(adSpend).set(data).where(eq(adSpend.id, id));
}

export async function deleteAdSpend(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.delete(adSpend).where(eq(adSpend.id, id));
}

// ─── Revenue helpers ──────────────────────────────────────────────────────────

export async function insertRevenueEvent(data: InsertRevenueEvent) {
  const db = await getDb();
  if (!db) return;
  return db.insert(revenueEvents).values(data);
}

export async function listRevenueEvents(opts?: { startDate?: string; endDate?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(revenueEvents);
  const conditions = [];
  if (opts?.startDate) conditions.push(gte(revenueEvents.createdAt, new Date(opts.startDate)));
  if (opts?.endDate) conditions.push(lte(revenueEvents.createdAt, new Date(opts.endDate + "T23:59:59Z")));
  if (conditions.length) query = query.where(and(...conditions)) as any;
  return query.orderBy(desc(revenueEvents.createdAt));
}

// ─── Attribution analytics queries ───────────────────────────────────────────

export async function getAttributionOverview(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const start = new Date(startDate);
  const end = new Date(endDate + "T23:59:59Z");

  const [spendRows, sessionRows, convRows, revRows] = await Promise.all([
    db.select({
      channel: adSpend.channel,
      totalSpend: sql<number>`SUM(${adSpend.spendCents})`,
      totalImpressions: sql<number>`SUM(${adSpend.impressions})`,
      totalClicks: sql<number>`SUM(${adSpend.clicks})`,
    }).from(adSpend)
      .where(and(gte(adSpend.date, startDate), lte(adSpend.date, endDate)))
      .groupBy(adSpend.channel),

    db.select({
      channel: visitorSessions.channel,
      visitors: sql<number>`COUNT(*)`,
    }).from(visitorSessions)
      .where(and(gte(visitorSessions.firstSeenAt, start), lte(visitorSessions.firstSeenAt, end)))
      .groupBy(visitorSessions.channel),

    db.select({
      channel: conversionEvents.channel,
      conversions: sql<number>`COUNT(*)`,
    }).from(conversionEvents)
      .where(and(
        gte(conversionEvents.createdAt, start),
        lte(conversionEvents.createdAt, end),
        sql`${conversionEvents.eventType} != 'page_view'`
      ))
      .groupBy(conversionEvents.channel),

    db.select({
      channel: revenueEvents.channel,
      revenue: sql<number>`SUM(${revenueEvents.amountCents})`,
    }).from(revenueEvents)
      .where(and(gte(revenueEvents.createdAt, start), lte(revenueEvents.createdAt, end)))
      .groupBy(revenueEvents.channel),
  ]);

  // Merge by channel
  const channels = new Map<string, {
    channel: string; spendCents: number; visitors: number;
    conversions: number; revenueCents: number; impressions: number; clicks: number;
  }>();

  const allChannelSet = new Set<string>([
    ...spendRows.map((r: { channel: string }) => r.channel),
    ...sessionRows.map((r: { channel: string }) => r.channel),
    ...convRows.map((r: { channel: string }) => r.channel),
    ...revRows.map((r: { channel: string | null }) => r.channel ?? "other"),
  ]);
  const allChannels = Array.from(allChannelSet);

  for (const ch of allChannels) {
    const spend = spendRows.find((r: { channel: string }) => r.channel === ch);
    const sess = sessionRows.find((r: { channel: string }) => r.channel === ch);
    const conv = convRows.find((r: { channel: string }) => r.channel === ch);
    const rev = revRows.find((r: { channel: string | null }) => r.channel === ch);
    channels.set(ch, {
      channel: ch,
      spendCents: Number(spend?.totalSpend ?? 0),
      impressions: Number(spend?.totalImpressions ?? 0),
      clicks: Number(spend?.totalClicks ?? 0),
      visitors: Number(sess?.visitors ?? 0),
      conversions: Number(conv?.conversions ?? 0),
      revenueCents: Number(rev?.revenue ?? 0),
    });
  }

  return Array.from(channels.values()).sort((a, b) => b.visitors - a.visitors);
}

export async function getRecentSessions(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitorSessions)
    .orderBy(desc(visitorSessions.lastActivityAt))
    .limit(limit);
}

export async function getArticleAttribution(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const start = new Date(startDate);
  const end = new Date(endDate + "T23:59:59Z");
  return db.select({
    articleSlug: conversionEvents.articleSlug,
    channel: conversionEvents.channel,
    eventType: conversionEvents.eventType,
    count: sql<number>`COUNT(*)`,
    revenueCents: sql<number>`SUM(${conversionEvents.eventValueCents})`,
  }).from(conversionEvents)
    .where(and(gte(conversionEvents.createdAt, start), lte(conversionEvents.createdAt, end)))
    .groupBy(conversionEvents.articleSlug, conversionEvents.channel, conversionEvents.eventType)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(200);
}

// ─── Express route registration ───────────────────────────────────────────────

const SKIP_PATHS = ["/admin", "/api/trpc", "/api/briefing-room"];

export function registerAttributionRoutes(app: Express): void {

  // POST /api/track/session
  app.post("/api/track/session", async (req: Request, res: Response) => {
    res.json({ ok: true }); // respond immediately
    try {
      const { sessionId, visitorId, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, landingPage, referrer } = req.body as Record<string, string>;
      if (!sessionId || !landingPage) return;
      const ua = req.headers["user-agent"] ?? "";
      if (isBot(ua)) return;
      if (SKIP_PATHS.some(p => landingPage?.includes(p))) return;
      if (!canCreateSession(sessionId)) return;
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
      // Fire-and-forget
      createVisitorSession({
        sessionId, visitorId: visitorId || undefined, utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined, utmCampaign: utmCampaign || undefined,
        utmTerm: utmTerm || undefined, utmContent: utmContent || undefined,
        landingPage, referrer: referrer || undefined, userAgent: ua.slice(0, 500), ipHash: hashIp(ip),
      }).catch(() => {});
    } catch { /* never throw */ }
  });

  // POST /api/track/pageview
  app.post("/api/track/pageview", async (req: Request, res: Response) => {
    res.json({ ok: true });
    try {
      const { sessionId, visitorId, url, articleSlug, articleId } = req.body as Record<string, string>;
      if (!sessionId || !url) return;
      const ua = req.headers["user-agent"] ?? "";
      if (isBot(ua)) return;
      if (SKIP_PATHS.some(p => url?.includes(p))) return;
      if (!canRecordPageview(sessionId, url)) return;

      // Update session page view count (fire-and-forget)
      getDb().then(db => db?.update(visitorSessions)
        .set({ pageViews: sql`${visitorSessions.pageViews} + 1`, lastActivityAt: sql`now()` })
        .where(eq(visitorSessions.sessionId, sessionId))).catch(() => {});

      // Log page_view conversion event
      recordConversionEvent({
        sessionId, visitorId: visitorId || undefined,
        eventType: "page_view",
        articleId: articleId ? parseInt(articleId) : undefined,
        articleSlug: articleSlug || undefined,
      }).catch(() => {});
    } catch { /* never throw */ }
  });

  // POST /api/track/event
  app.post("/api/track/event", async (req: Request, res: Response) => {
    res.json({ ok: true });
    try {
      const { sessionId, visitorId, eventType, articleId, articleSlug, eventValueCents, eventMetadata } = req.body as Record<string, any>;
      if (!sessionId || !eventType) return;
      const ua = req.headers["user-agent"] ?? "";
      if (isBot(ua)) return;

      recordConversionEvent({
        sessionId, visitorId,
        eventType: eventType as ConversionEventType,
        articleId: articleId ? parseInt(articleId) : undefined,
        articleSlug,
        eventValueCents: eventValueCents ? parseInt(eventValueCents) : 0,
        eventMetadata: eventMetadata ? (typeof eventMetadata === "string" ? JSON.parse(eventMetadata) : eventMetadata) : undefined,
      }).catch(() => {});
    } catch { /* never throw */ }
  });

  // POST /api/track/heartbeat
  app.post("/api/track/heartbeat", async (req: Request, res: Response) => {
    res.json({ ok: true });
    try {
      const { sessionId, seconds, scrollDepth } = req.body as Record<string, any>;
      if (!sessionId) return;
      const ua = req.headers["user-agent"] ?? "";
      if (isBot(ua)) return;

      const addSecs = parseInt(seconds) || 0;
      const depth = parseInt(scrollDepth) || 0;

      getDb().then(db => db?.update(visitorSessions).set({
        durationSeconds: sql`${visitorSessions.durationSeconds} + ${addSecs}`,
        maxScrollDepth: sql`GREATEST(${visitorSessions.maxScrollDepth}, ${depth})`,
        lastActivityAt: sql`now()`,
      }).where(eq(visitorSessions.sessionId, sessionId))).catch(() => {});
    } catch { /* never throw */ }
  });
}
