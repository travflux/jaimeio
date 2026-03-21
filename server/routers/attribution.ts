/**
 * Attribution tRPC Router
 *
 * Provides admin procedures for:
 * - Ad spend CRUD (create, list, update, delete)
 * - Revenue event entry (manual)
 * - Attribution overview (ROAS, CPA, channel breakdown)
 * - Article attribution (which articles drive conversions)
 * - Real-time sessions (last 50 visitor sessions)
 */
import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import {
  insertAdSpend,
  listAdSpend,
  updateAdSpend,
  deleteAdSpend,
  insertRevenueEvent,
  listRevenueEvents,
  getAttributionOverview,
  getArticleAttribution,
  getRecentSessions,
} from "../attribution";

const CHANNEL_ENUM = z.enum(["google", "meta", "x", "bing", "reddit", "other"]);

const DATE_RANGE = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const attributionRouter = router({
  // ─── Ad Spend ──────────────────────────────────────────────────────────────

  adSpend: router({
    create: adminProcedure
      .input(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        channel: CHANNEL_ENUM,
        platform: z.string().min(1).max(100),
        campaignName: z.string().max(255).optional(),
        spendCents: z.number().int().min(0),
        impressions: z.number().int().min(0).optional(),
        clicks: z.number().int().min(0).optional(),
        notes: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        await insertAdSpend(input);
        return { success: true };
      }),

    list: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        channel: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return listAdSpend(input ?? {});
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        channel: CHANNEL_ENUM.optional(),
        platform: z.string().min(1).max(100).optional(),
        campaignName: z.string().max(255).optional(),
        spendCents: z.number().int().min(0).optional(),
        impressions: z.number().int().min(0).optional(),
        clicks: z.number().int().min(0).optional(),
        notes: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateAdSpend(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await deleteAdSpend(input.id);
        return { success: true };
      }),
  }),

  // ─── Revenue Events ────────────────────────────────────────────────────────

  revenue: router({
    create: adminProcedure
      .input(z.object({
        amountCents: z.number().int().min(0),
        currency: z.string().default("usd"),
        revenueType: z.enum(["subscription", "one_time", "merch", "sponsorship", "adsense", "other"]),
        description: z.string().max(500).optional(),
        sessionId: z.string().optional(),
        visitorId: z.string().optional(),
        stripeEventId: z.string().optional(),
        stripeCustomerId: z.string().optional(),
        stripePaymentIntentId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { stripeEventId, ...rest } = input;
        await insertRevenueEvent({
          ...rest,
          stripeEventId: stripeEventId ?? `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        });
        return { success: true };
      }),

    list: adminProcedure
      .input(DATE_RANGE.optional())
      .query(async ({ input }) => {
        return listRevenueEvents(input);
      }),
  }),

  // ─── Ad Spend Sync ────────────────────────────────────────────────────────

  sync: router({
    status: adminProcedure.query(async () => {
      const { getAdSpendSyncStatus } = await import("../adSpendSync");
      return getAdSpendSyncStatus();
    }),

    trigger: adminProcedure
      .input(z.object({ date: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { runAdSpendSync } = await import("../adSpendSync");
        return runAdSpendSync(input.date);
      }),

    adsenseStatus: adminProcedure.query(async () => {
      const { getSetting } = await import("../db");
      const [lastRun, lastDate, lastStatus, lastDetail] = await Promise.all([
        getSetting("_attribution_sync_adsense_last_run"),
        getSetting("_attribution_sync_adsense_last_date"),
        getSetting("_attribution_sync_adsense_last_status"),
        getSetting("_attribution_sync_adsense_last_detail"),
      ]);
      return {
        configured: !!(process.env.ADSENSE_ACCOUNT_ID && (process.env.ADSENSE_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN)),
        lastRun: lastRun?.value ?? null,
        lastDate: lastDate?.value ?? null,
        lastStatus: lastStatus?.value ?? null,
        lastDetail: lastDetail?.value ?? null,
      };
    }),

    printifyStatus: adminProcedure.query(async () => {
      const { getSetting } = await import("../db");
      const lastWebhook = await getSetting("_attribution_sync_printify_last_webhook");
      return {
        configured: !!process.env.PRINTIFY_WEBHOOK_SECRET,
        lastWebhook: lastWebhook?.value ?? null,
      };
    }),
  }),

  // ─── Attribution Analytics ─────────────────────────────────────────────────

  overview: adminProcedure
    .input(DATE_RANGE)
    .query(async ({ input }) => {
      return getAttributionOverview(input.startDate, input.endDate);
    }),

  articleAttribution: adminProcedure
    .input(DATE_RANGE)
    .query(async ({ input }) => {
      return getArticleAttribution(input.startDate, input.endDate);
    }),

  recentSessions: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      return getRecentSessions(input?.limit ?? 50);
    }),

  // ─── Search Engine Performance ──────────────────────────────────────────────

  searchSyncStatus: adminProcedure.query(async () => {
    const { getSearchSyncStatus } = await import("../searchPerformanceSync");
    return getSearchSyncStatus();
  }),

  triggerSearchSync: adminProcedure.mutation(async () => {
    const { runSearchPerformanceSync } = await import("../searchPerformanceSync");
    return runSearchPerformanceSync();
  }),

  triggerGscSync: adminProcedure.mutation(async () => {
    const { runGscSync } = await import("../searchPerformanceSync");
    return runGscSync();
  }),

  triggerBingSync: adminProcedure.mutation(async () => {
    const { runBingSync } = await import("../searchPerformanceSync");
    return runBingSync();
  }),

  searchPerformance: adminProcedure
    .input(z.object({
      engine: z.enum(["google", "bing", "all"]).default("all"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().int().min(1).max(1000).default(100),
      type: z.enum(["query", "page", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { searchEnginePerformance } = await import("../../drizzle/schema");
      const { desc, and, eq, gte, lte, isNotNull } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];

      const conditions: ReturnType<typeof eq>[] = [];
      if (input.engine !== "all") {
        conditions.push(eq(searchEnginePerformance.engine, input.engine as "google" | "bing"));
      }
      if (input.startDate) conditions.push(gte(searchEnginePerformance.date, input.startDate));
      if (input.endDate) conditions.push(lte(searchEnginePerformance.date, input.endDate));
      if (input.type === "query") conditions.push(isNotNull(searchEnginePerformance.query) as ReturnType<typeof eq>);
      if (input.type === "page") conditions.push(isNotNull(searchEnginePerformance.pageUrl) as ReturnType<typeof eq>);

      return db
        .select()
        .from(searchEnginePerformance)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(searchEnginePerformance.clicks))
        .limit(input.limit);
    }),

  searchSummary: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { searchEnginePerformance } = await import("../../drizzle/schema");
      const { sql, and, gte, lte } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { google: null, bing: null };

      const conditions: ReturnType<typeof gte>[] = [];
      if (input.startDate) conditions.push(gte(searchEnginePerformance.date, input.startDate));
      if (input.endDate) conditions.push(lte(searchEnginePerformance.date, input.endDate));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          engine: searchEnginePerformance.engine,
          totalClicks: sql<number>`SUM(${searchEnginePerformance.clicks})`,
          totalImpressions: sql<number>`SUM(${searchEnginePerformance.impressions})`,
          avgCtr: sql<number>`AVG(${searchEnginePerformance.ctr})`,
          avgPosition: sql<number>`AVG(${searchEnginePerformance.position})`,
        })
        .from(searchEnginePerformance)
        .where(where)
        .groupBy(searchEnginePerformance.engine);

      const result: Record<string, typeof rows[0] | null> = { google: null, bing: null };
      for (const row of rows) result[row.engine] = row;
      return result;
    }),
});
