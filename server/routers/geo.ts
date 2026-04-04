/**
 * GEO Router — tRPC endpoints for GEO management
 * Fixed: licenseId filtering, background job pattern, per-tenant state
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure, tenantOrAdminProcedure } from "../_core/trpc";
import { processArticleGeo, processArticlesGeo } from "../geo/geoService";
import * as db from "../db";
import { articles } from "../../drizzle/schema";
import { eq, isNull, isNotNull, sql, and, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Per-tenant backfill state
const geoBackfillState = new Map<number, {
  isRunning: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}>();

async function runGeoBackfill(licenseId: number) {
  console.log("[GEO Backfill] Starting for licenseId:", licenseId);
  const database = await db.getDb();
  if (!database) { console.log("[GEO Backfill] DB unavailable"); return; }

  const missing = await database
    .select({ id: articles.id, headline: articles.headline })
    .from(articles)
    .where(and(
      eq(articles.licenseId, licenseId),
      or(isNull(articles.geoSummary), eq(articles.geoSummary, "")),
    ))
    ;

  console.log("[GEO Backfill] Articles without GEO:", missing.length);
  if (missing.length === 0) {
    geoBackfillState.set(licenseId, { isRunning: false, total: 0, processed: 0, succeeded: 0, failed: 0 });
    return;
  }

  geoBackfillState.set(licenseId, { isRunning: true, total: missing.length, processed: 0, succeeded: 0, failed: 0 });

  // Load settings
  const settings: Record<string, string> = {};
  const keys = ["brand_site_name", "brand_site_url", "brand_logo_url", "geo_faq_count", "geo_key_takeaway_label"];
  for (const key of keys) {
    const ls = await db.getLicenseSetting(licenseId, key);
    if (ls?.value) settings[key] = ls.value;
    else { const gs = await db.getSetting(key); if (gs?.value) settings[key] = gs.value; }
  }
  settings.geo_enabled = "true";
  settings.geo_faq_enabled = "true";

  for (const article of missing) {
    const state = geoBackfillState.get(licenseId)!;
    try {
      console.log("[GEO Backfill] Processing article:", article.id, article.headline?.substring(0, 50));
      await processArticleGeo(article.id, settings);
      state.succeeded++;
      console.log("[GEO Backfill] Saved GEO data for article:", article.id);
    } catch (err: any) {
      state.failed++;
      console.log("[GEO Backfill] Failed article:", article.id, err.message?.substring(0, 80));
    }
    state.processed++;
    geoBackfillState.set(licenseId, state);

    // Rate limit: 30s between articles to avoid LLM rate limits
    if (state.processed < missing.length) {
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  const finalState = geoBackfillState.get(licenseId)!;
  finalState.isRunning = false;
  geoBackfillState.set(licenseId, finalState);
  console.log("[GEO Backfill] Complete. Processed:", finalState.processed, "Succeeded:", finalState.succeeded, "Failed:", finalState.failed);
}

export const geoRouter = router({
  getArticleGeo: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const article = await db.getArticleById(input.articleId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        geoSummary: article.geoSummary,
        geoFaq: article.geoFaq ? JSON.parse(article.geoFaq) : null,
        geoSchema: article.geoSchema,
        geoSpeakable: article.geoSpeakable,
        geoScore: article.geoScore,
        geoGeneratedAt: article.geoGeneratedAt,
      };
    }),

  generateForArticle: tenantOrAdminProcedure
    .input(z.object({ articleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const settings: Record<string, string> = {};
      const keys = ["brand_site_name", "brand_site_url", "brand_logo_url", "geo_faq_count", "geo_key_takeaway_label"];
      for (const key of keys) {
        if (ctx.licenseId) {
          const ls = await db.getLicenseSetting(ctx.licenseId, key);
          if (ls?.value) { settings[key] = ls.value; continue; }
        }
        const s = await db.getSetting(key);
        if (s?.value) settings[key] = s.value;
      }
      settings.geo_enabled = "true";
      settings.geo_faq_enabled = "true";
      const result = await processArticleGeo(input.articleId, settings);
      console.log("[GEO Single] Returning:", JSON.stringify({ success: result.success, hasGeoSummary: !!result.geoSummary, hasFaq: !!result.geoFaq, summaryLen: result.geoSummary?.length }));
      return result;
    }),

  generateBulk: tenantOrAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .mutation(async ({ ctx }) => {
      const licenseId = ctx.licenseId;
      if (!licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });

      const existing = geoBackfillState.get(licenseId);
      if (existing?.isRunning) {
        return { started: false, message: "Already running" };
      }

      // Start background job — do NOT await
      runGeoBackfill(licenseId).catch(err =>
        console.error("[GEO Backfill] Unhandled error:", err)
      );

      return { started: true, message: "GEO backfill started" };
    }),

  backfillStatus: tenantOrAdminProcedure.query(({ ctx }) => {
    const licenseId = ctx.licenseId;
    if (!licenseId) return { isRunning: false, total: 0, processed: 0, succeeded: 0, failed: 0 };
    return geoBackfillState.get(licenseId) ?? { isRunning: false, total: 0, processed: 0, succeeded: 0, failed: 0 };
  }),

  stats: tenantOrAdminProcedure.query(async ({ ctx }) => {
    const database = await db.getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const licenseId = ctx.licenseId;
    const licFilter = licenseId ? and(eq(articles.licenseId, licenseId)) : undefined;

    const [total] = await database.select({ count: sql<number>`count(*)` }).from(articles).where(licFilter);
    const [withGeo] = await database.select({ count: sql<number>`count(*)` }).from(articles).where(
      licFilter ? and(licFilter, isNotNull(articles.geoSummary)) : isNotNull(articles.geoSummary)
    );
    const [avgScore] = await database.select({ avg: sql<number>`COALESCE(AVG(geo_score), 0)` }).from(articles).where(
      licFilter ? and(licFilter, isNotNull(articles.geoScore)) : isNotNull(articles.geoScore)
    );

    return {
      totalArticles: Number(total.count),
      articlesWithGeo: Number(withGeo.count),
      averageScore: Math.round(Number(avgScore.avg)),
      coverage: Number(total.count) > 0 ? Math.round((Number(withGeo.count) / Number(total.count)) * 100) : 0,
    };
  }),
});
