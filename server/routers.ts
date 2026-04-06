import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, tenantOrAdminProcedure } from "./_core/trpc";
import { invokeLLMWithFallback as invokeLLM } from "./_core/llmRouter";
import { generateImage } from "./_core/imageGeneration";
import { generateVideo } from "./_core/videoGeneration";
import { bulkGenerateVideos } from "./bulk-video-generation";
import * as db from "./db";
import { generateSitemap, invalidateSitemapCache } from "./sitemap";
import * as xQueue from "./xPostQueue";
import { verifyCredentials as verifyXCredentials } from "./xTwitterService";
import { generateAmazonKeywords, getFallbackKeywords } from "./amazonKeywords";
import { validateArticle, validateArticleBody, validateArticleHeadline } from "./articleValidation";
import { buildImagePrompt } from "./imagePromptBuilder";
import { migrateJsonArticles, previewMigration } from "./articleMigration";
import { getAllDeploymentStatuses, updateDeployment as updateSingleDeployment, updateAllDeployments, getDeploymentsNeedingUpdate } from "./deploymentUpdates";
import { getCurrentVersion, getVersionHistory } from "./version-manager";
import { notifyArticlePublished } from "./indexnow";
import * as categoryBalance from "./categoryBalance";
import { merchRouter } from "./routers/merch";
import { attributionRouter } from "./routers/attribution";
import { distributionRouter } from "./routers/distribution";
import { smsRouter } from "./routers/sms";
import { setupRouter } from "./routers/setup";
import { domainsRouter } from "./routers/domains";
import { tenantAuthRouter } from "./routers/tenantAuth";
import { licenseManagementRouter } from "./routers/licenseManagement";
import { userManagementRouter } from "./routers/userManagement";
import { supportRouter } from "./routers/support";
import { resolveLicense } from "./auth/licenseAuth";
import { licenseSettingsRouter } from "./routers/licenseSettingsRouter";
import { geoRouter } from "./routers/geo";
import { colorSystemRouter } from "./routers/colorSystem";
import { pagesRouter } from "./routers/pages";
import { checkPublishGate } from "./publishGate";
import { getOverviewStats } from "./analytics/overviewService";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});
async function generateGeoSummary(headline: string, body: string): Promise<string> {
  const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are an SEO specialist. Generate 3-5 concise key takeaways from the article that would help AI search engines understand and cite this content. Return them as a bulleted list. No preamble." },
      { role: "user", content: `Headline: ${headline}\n\nArticle:\n${plainText}` },
    ],
  });
  const msg = result.choices?.[0]?.message?.content;
  return typeof msg === "string" ? msg : "";
}

async function generateGeoFaq(headline: string, body: string): Promise<string> {
  const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are an SEO specialist. Generate 3 FAQ question-and-answer pairs that readers might ask about this article. Format as JSON array: [{\"q\":\"...\",\"a\":\"...\"}]. No preamble, just valid JSON." },
      { role: "user", content: `Headline: ${headline}\n\nArticle:\n${plainText}` },
    ],
  });
  const msg = result.choices?.[0]?.message?.content;
  return typeof msg === "string" ? msg : "[]";
}



// ─── Image Backfill Job State (module-level singleton) ─────────────────────────
type BackfillLogEntry = { articleId: number; headline: string; status: "ok" | "failed"; error?: string; timestamp: string };
type BackfillState = {
  isRunning: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  log: BackfillLogEntry[];
  startedAt: string | null;
  finishedAt: string | null;
};
let imageBackfillState: BackfillState = { isRunning: false, total: 0, processed: 0, succeeded: 0, failed: 0, log: [], startedAt: null, finishedAt: null };
let imageBackfillCancelled = false;

async function runImageBackfillJob(articles: Array<{ id: number; headline: string; subheadline?: string | null }>) {
  imageBackfillCancelled = false;

  for (const article of articles) {
    if (imageBackfillCancelled) {
      console.log("[Backfill] Cancelled by user");
      break;
    }
    try {
      const finalPrompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: (article as any)?.licenseId || (articleBefore as any)?.licenseId });
      const result = await generateImage({ prompt: finalPrompt, licenseId: (articleBefore as any)?.licenseId });
      if (result?.url) {
        await db.updateArticle(article.id, { featuredImage: result.url, llmImagePrompt: finalPrompt });
        imageBackfillState.succeeded++;
        imageBackfillState.log.unshift({ articleId: article.id, headline: article.headline, status: "ok", timestamp: new Date().toISOString() });
        console.log(`[Backfill] ✓ Article ${article.id}`);
      }
    } catch (err) {
      imageBackfillState.failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      imageBackfillState.log.unshift({ articleId: article.id, headline: article.headline, status: "failed", error: errMsg, timestamp: new Date().toISOString() });
      console.error(`[Backfill] ✗ Article ${article.id}:`, errMsg);
    }
    imageBackfillState.processed++;
    // Keep log at most 200 entries
    if (imageBackfillState.log.length > 200) imageBackfillState.log = imageBackfillState.log.slice(0, 200);
  }
  imageBackfillState.isRunning = false;
  imageBackfillState.finishedAt = new Date().toISOString();
  console.log(`[Backfill] Done. Succeeded: ${imageBackfillState.succeeded}, Failed: ${imageBackfillState.failed}`);
}

export const appRouter = router({
  system: systemRouter,
  merch: merchRouter,
  attribution: attributionRouter,
  distribution: distributionRouter,
  sms: smsRouter,
  setup: setupRouter,
  domains: domainsRouter,
  tenantAuth: tenantAuthRouter,
  licenseManagement: licenseManagementRouter,
  userManagement: userManagementRouter,
  support: supportRouter,
  licenseSettings: licenseSettingsRouter,
  geo: geoRouter,
  colorSystem: colorSystemRouter,
  sourceFeeds: router({
    list: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      // Join rss_feed_weights for actual lastFetchTime (rss_feeds.last_fetched is stale)
      const [rows] = await dbConn.execute(sqlFn`SELECT w.id, w.feedUrl as url, w.enabled, w.lastFetchTime, w.errorCount, w.lastError FROM rss_feed_weights w WHERE w.license_id = ${lid} ORDER BY w.lastFetchTime DESC`);
      return (rows as any[]).map(r => ({ id: r.id, url: r.url, enabled: !!r.enabled, lastFetched: r.lastFetchTime, errorCount: r.errorCount || 0, lastError: r.lastError }));
    }),
    add: tenantOrAdminProcedure
      .input(z.object({ url: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        await dbConn.execute(sqlFn`INSERT INTO rss_feed_weights (feedUrl, weight, enabled) VALUES (${input.url}, 1.0, 1)`);
        await dbConn.execute(sqlFn`INSERT IGNORE INTO rss_feeds (license_id, url, name, is_active) VALUES (${ctx.licenseId || 7}, ${input.url}, ${input.url}, true)`);
        return { success: true };
      }),
    remove: tenantOrAdminProcedure
      .input(z.object({ feedId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        await dbConn.execute(sqlFn`DELETE FROM rss_feeds WHERE url = (SELECT feedUrl FROM rss_feed_weights WHERE id = ${input.feedId})`);
        await dbConn.execute(sqlFn`DELETE FROM rss_feed_weights WHERE id = ${input.feedId}`);
        return { success: true };
      }),
    toggle: tenantOrAdminProcedure
      .input(z.object({ feedId: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        await dbConn.execute(sqlFn`UPDATE rss_feed_weights SET enabled = ${input.enabled ? 1 : 0} WHERE id = ${input.feedId}`);
        await dbConn.execute(sqlFn`UPDATE rss_feeds SET is_active = ${input.enabled} WHERE id = ${input.feedId}`);
        return { success: true };
      }),
    fetchNow: tenantOrAdminProcedure
      .input(z.object({ feedId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        const [feeds] = await dbConn.execute(sqlFn`SELECT id, url FROM rss_feeds WHERE id = ${input.feedId} AND license_id = ${ctx.licenseId || 7} LIMIT 1`);
        const feed = (feeds as any[])[0];
        if (!feed) throw new TRPCError({ code: "NOT_FOUND" });
        console.log("[SourceFeeds] Fetching feed:", feed.url);
        // Update last_fetched
        await dbConn.execute(sqlFn`UPDATE rss_feeds SET last_fetched = NOW() WHERE id = ${input.feedId}`);
        return { success: true, newCandidates: 0, message: "Feed fetch triggered" };
      }),
  }),
  selectorCandidates: router({
    getCounts: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { pending: 0, selected: 0, rejected: 0, expired: 0, high: 0, medium: 0, low: 0, sources: [] };
      const { sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const [statusRows] = await dbConn.execute(sqlFn.raw("SELECT status, COUNT(*) as cnt FROM selector_candidates WHERE license_id = " + lid + " GROUP BY status"));
      const [potRows] = await dbConn.execute(sqlFn.raw("SELECT article_potential, COUNT(*) as cnt FROM selector_candidates WHERE license_id = " + lid + " AND status = 'pending' GROUP BY article_potential"));
      const [srcRows] = await dbConn.execute(sqlFn.raw("SELECT DISTINCT source_name FROM selector_candidates WHERE license_id = " + lid + " AND source_name IS NOT NULL LIMIT 50"));
      const sm = Object.fromEntries((statusRows as any[]).map(r => [r.status, Number(r.cnt)]));
      const pm = Object.fromEntries((potRows as any[]).map(r => [r.article_potential || "unknown", Number(r.cnt)]));
      return { pending: sm.pending || 0, selected: sm.selected || 0, rejected: sm.rejected || 0, expired: sm.expired || 0, high: pm.high || 0, medium: pm.medium || 0, low: pm.low || 0, sources: (srcRows as any[]).map(r => r.source_name).filter(Boolean) };
    }),
    list: tenantOrAdminProcedure
      .input(z.object({ status: z.string().optional(), potential: z.string().optional(), source: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { candidates: [], total: 0 };
        const { sql: sqlFn } = await import("drizzle-orm");
        const status = input?.status || "pending";
        const limit = input?.limit || 50;
        const lid = ctx.licenseId || 7;
        let where = "status = '" + status + "' AND license_id = " + lid;
        if (input?.potential) where += " AND article_potential = '" + input.potential + "'";
        if (input?.source) where += " AND source_name = '" + input.source.replace(/'/g, "''") + "'";
        const [rows] = await dbConn.execute(sqlFn.raw("SELECT id, title, summary, source_url, source_type, source_name, article_potential, status, created_at, score FROM selector_candidates WHERE " + where + " ORDER BY score DESC, created_at DESC LIMIT " + limit));
        const [countRows] = await dbConn.execute(sqlFn.raw("SELECT COUNT(*) as cnt FROM selector_candidates WHERE " + where));
        return { candidates: rows as any[], total: (countRows as any[])[0]?.cnt || 0 };
      }),
    ignore: tenantOrAdminProcedure
      .input(z.object({ candidateId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        await dbConn.execute(ctx.licenseId ? sqlFn`UPDATE selector_candidates SET status = 'rejected' WHERE id = ${input.candidateId} AND license_id = ${ctx.licenseId}` : sqlFn`UPDATE selector_candidates SET status = 'rejected' WHERE id = ${input.candidateId}`);
        return { success: true };
      }),
  }),
  templates: router({
    list: tenantOrAdminProcedure.input(z.object({ licenseId: z.number() })).query(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || input.licenseId;
      const [rows] = await dbConn.execute(sqlFn`SELECT * FROM article_templates WHERE license_id = ${lid} OR licenseId = ${lid} ORDER BY createdAt DESC`);
      return rows as any[];
    }),
    create: tenantOrAdminProcedure.input(z.object({
      licenseId: z.number(), name: z.string(), description: z.string().optional(), promptTemplate: z.string().optional(),
      headlineFormat: z.string().optional(), tone: z.string().optional(), targetWordCount: z.number().optional(),
      categoryId: z.number().optional(), imageStylePrompt: z.string().optional(), imageProvider: z.string().optional(),
      imageAspectRatio: z.string().optional(), seoTitleFormat: z.string().optional(), seoKeywordThemes: z.string().optional(),
      geoFaqTopics: z.string().optional(), geoKeyTakeawayCount: z.number().optional(), geoFaqCount: z.number().optional(),
      scheduleFrequency: z.string().optional(), scheduleDayOfWeek: z.number().optional(), scheduleHour: z.number().optional(),
      scheduleColor: z.string().optional(), isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      const [result] = await dbConn.execute(sqlFn`INSERT INTO article_templates (license_id, licenseId, name, description, promptTemplate, headline_format, tone, target_word_count, category_id, categoryId, image_style_prompt, image_provider, image_aspect_ratio, seo_title_format, seo_keyword_themes, geo_faq_topics, geo_key_takeaway_count, geo_faq_count, schedule_frequency, schedule_day_of_week, schedule_hour, schedule_color, is_active) VALUES (${input.licenseId}, ${input.licenseId}, ${input.name}, ${input.description || ""}, ${input.promptTemplate || ""}, ${input.headlineFormat || ""}, ${input.tone || "default"}, ${input.targetWordCount || 800}, ${input.categoryId || null}, ${input.categoryId || null}, ${input.imageStylePrompt || ""}, ${input.imageProvider || ""}, ${input.imageAspectRatio || "16:9"}, ${input.seoTitleFormat || ""}, ${input.seoKeywordThemes || ""}, ${input.geoFaqTopics || ""}, ${input.geoKeyTakeawayCount || 5}, ${input.geoFaqCount || 5}, ${input.scheduleFrequency || "manual"}, ${input.scheduleDayOfWeek ?? null}, ${input.scheduleHour || 9}, ${input.scheduleColor || "#6366f1"}, ${input.isActive !== false ? 1 : 0})`);
      return { success: true, id: (result as any).insertId };
    }),
    update: tenantOrAdminProcedure.input(z.object({
      id: z.number(), licenseId: z.number(), name: z.string().optional(), description: z.string().optional(),
      promptTemplate: z.string().optional(), headlineFormat: z.string().optional(), tone: z.string().optional(),
      targetWordCount: z.number().optional(), categoryId: z.number().optional(), imageStylePrompt: z.string().optional(),
      scheduleFrequency: z.string().optional(), scheduleDayOfWeek: z.number().optional(), scheduleHour: z.number().optional(),
      scheduleColor: z.string().optional(), isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      await dbConn.execute(sqlFn`UPDATE article_templates SET name = COALESCE(${input.name}, name), description = COALESCE(${input.description}, description), promptTemplate = COALESCE(${input.promptTemplate}, promptTemplate), headline_format = COALESCE(${input.headlineFormat}, headline_format), tone = COALESCE(${input.tone}, tone), target_word_count = COALESCE(${input.targetWordCount}, target_word_count), schedule_frequency = COALESCE(${input.scheduleFrequency}, schedule_frequency), schedule_color = COALESCE(${input.scheduleColor}, schedule_color), is_active = COALESCE(${input.isActive !== undefined ? (input.isActive ? 1 : 0) : null}, is_active) WHERE id = ${input.id} AND (license_id = ${input.licenseId} OR licenseId = ${input.licenseId})`);
      return { success: true };
    }),
    delete: tenantOrAdminProcedure.input(z.object({ id: z.number(), licenseId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      await dbConn.execute(sqlFn`DELETE FROM article_templates WHERE id = ${input.id} AND (license_id = ${input.licenseId} OR licenseId = ${input.licenseId})`);
      return { success: true };
    }),
    duplicate: tenantOrAdminProcedure.input(z.object({ id: z.number(), licenseId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      await dbConn.execute(sqlFn`INSERT INTO article_templates (license_id, licenseId, name, description, promptTemplate, headline_format, tone, target_word_count, category_id, categoryId, image_style_prompt, schedule_frequency, schedule_color, is_active) SELECT license_id, licenseId, CONCAT(name, " (Copy)"), description, promptTemplate, headline_format, tone, target_word_count, category_id, categoryId, image_style_prompt, schedule_frequency, schedule_color, is_active FROM article_templates WHERE id = ${input.id} AND (license_id = ${input.licenseId} OR licenseId = ${input.licenseId})`);
      return { success: true };
    }),
    skipSlot: tenantOrAdminProcedure.input(z.object({ templateId: z.number(), skipDate: z.string(), licenseId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql: sqlFn } = await import("drizzle-orm");
      await dbConn.execute(sqlFn`INSERT IGNORE INTO template_schedule_skips (template_id, license_id, skip_date) VALUES (${input.templateId}, ${input.licenseId}, ${input.skipDate})`);
      return { success: true };
    }),
    getSkippedSlots: tenantOrAdminProcedure.input(z.object({ licenseId: z.number(), month: z.number(), year: z.number() })).query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql: sqlFn } = await import("drizzle-orm");
      const [rows] = await dbConn.execute(sqlFn`SELECT template_id as templateId, skip_date as skipDate FROM template_schedule_skips WHERE license_id = ${input.licenseId} AND MONTH(skip_date) = ${input.month} AND YEAR(skip_date) = ${input.year}`);
      return (rows as any[]).map(r => ({ templateId: r.templateId, skipDate: r.skipDate }));
    }),
  }),
  apiAccess: router({
    get: tenantOrAdminProcedure.input(z.object({ licenseId: z.number() })).query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { apiKey: null, createdAt: null, lastUsed: null };
      const { licenseSettings: ls } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const [row] = await dbConn.select().from(ls)
        .where(andOp(eqOp(ls.licenseId, input.licenseId), eqOp(ls.key, "api_key")))
        .limit(1);
      if (!row?.value) return { apiKey: null, createdAt: null, lastUsed: null };
      return { apiKey: row.value.substring(0, 12) + "•".repeat(20), fullKey: row.value, createdAt: null, lastUsed: null };
    }),
    generate: tenantOrAdminProcedure.input(z.object({ licenseId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { licenseSettings: ls } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const crypto = await import("crypto");
      const key = crypto.randomBytes(32).toString("hex");
      const [existing] = await dbConn.select().from(ls)
        .where(andOp(eqOp(ls.licenseId, input.licenseId), eqOp(ls.key, "api_key"))).limit(1);
      if (existing) { await dbConn.update(ls).set({ value: key }).where(eqOp(ls.id, existing.id)); }
      else { await dbConn.insert(ls).values({ licenseId: input.licenseId, key: "api_key", value: key, type: "string" }); }
      return { success: true };
    }),
    regenerate: tenantOrAdminProcedure.input(z.object({ licenseId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { licenseSettings: ls } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const crypto = await import("crypto");
      const key = crypto.randomBytes(32).toString("hex");
      const [existing] = await dbConn.select().from(ls)
        .where(andOp(eqOp(ls.licenseId, input.licenseId), eqOp(ls.key, "api_key"))).limit(1);
      if (existing) { await dbConn.update(ls).set({ value: key }).where(eqOp(ls.id, existing.id)); }
      else { await dbConn.insert(ls).values({ licenseId: input.licenseId, key: "api_key", value: key, type: "string" }); }
      return { success: true };
    }),
  }),
  pages: pagesRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Categories ──────────────────────────────────────
  categories: router({
    list: publicProcedure.query(({ ctx }) => db.listCategories(ctx.licenseId || undefined)),
    getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => db.getCategoryBySlug(input.slug)),
    create: adminProcedure.input(z.object({ name: z.string(), slug: z.string(), description: z.string().optional(), color: z.string().optional() })).mutation(({ input }) => db.createCategory(input)),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), description: z.string().optional(), color: z.string().optional(), keywords: z.string().optional() })).mutation(({ input }) => { const { id, ...data } = input; return db.updateCategory(id, data); }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteCategory(input.id)),
    getBalance: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { categories: [], totalArticles: 0 };
      const { sql: sqlFn, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const { categories: catTable, articles: artTable } = await import("../drizzle/schema");
      const lid = ctx.licenseId || 7;
      const cats = await dbConn.select({ id: catTable.id, name: catTable.name, targetPercentage: catTable.targetPercentage }).from(catTable).where(eqOp(catTable.licenseId, lid));
      const counts = await dbConn.select({ categoryId: artTable.categoryId, count: sqlFn`COUNT(*)` as any }).from(artTable).where(andOp(eqOp(artTable.licenseId, lid), eqOp(artTable.status, "published"))).groupBy(artTable.categoryId);
      const countMap = new Map(counts.map((c: any) => [c.categoryId, Number(c.count)]));
      const total = counts.reduce((s: number, c: any) => s + Number(c.count), 0);
      return { categories: cats.map(cat => ({ ...cat, articleCount: countMap.get(cat.id) ?? 0, currentPercentage: total > 0 ? Math.round((countMap.get(cat.id) ?? 0) * 100 / total) : 0 })), totalArticles: total };
    }),
    saveTargets: tenantOrAdminProcedure.input(z.object({ targets: z.record(z.string(), z.number()) })).mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { categories: catTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      for (const [catId, pct] of Object.entries(input.targets)) {
        await dbConn.update(catTable).set({ targetPercentage: pct } as any).where(andOp(eqOp(catTable.id, parseInt(catId)), eqOp(catTable.licenseId, lid)));
      }
      return { success: true };
    }),
    recategorizeUncategorized: adminProcedure.mutation(async () => {
      // Re-run guessCategory on all articles with null categoryId or no category
      const { guessAndAssignCategories } = await import('./workflow');
      return guessAndAssignCategories();
    }),
  }),

  // ─── X Replies ─────────────────────────────────────
  xReplies: router({
    getPending: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { replies: [] };
      const { xReplies } = await import("../drizzle/schema");
      const { eq: eqOp, desc } = await import("drizzle-orm");
      const rows = await dbConn.select().from(xReplies).where(eqOp(xReplies.status, "pending")).orderBy(desc(xReplies.createdAt)).limit(20);
      return { replies: rows.map(r => ({ id: r.id, originalAuthor: r.tweetAuthorHandle || r.tweetAuthor, originalTweetText: r.tweetText, originalTweetUrl: null, originalTweetDate: r.createdAt, draftText: r.replyContent || "" })) };
    }),
    approve: tenantOrAdminProcedure.input(z.object({ replyId: z.number(), finalText: z.string().max(280) })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { xReplies } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      await dbConn.update(xReplies).set({ replyContent: input.finalText, status: "approved" }).where(eqOp(xReplies.id, input.replyId));
      console.log("[X Replies] Reply " + input.replyId + " approved");
      return { success: true };
    }),
    reject: tenantOrAdminProcedure.input(z.object({ replyId: z.number() })).mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { xReplies } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      await dbConn.update(xReplies).set({ status: "skipped" }).where(eqOp(xReplies.id, input.replyId));
      return { success: true };
    }),
  }),

  // ─── Sponsors ─────────────────────────────────────
  sponsors: router({
    getSchedule: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { slots: [] };
      try {
        const { sponsorSchedules } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const slots = await dbConn.select().from(sponsorSchedules).where(eqOp(sponsorSchedules.licenseId, ctx.licenseId || 7));
        return { slots };
      } catch { return { slots: [] }; }
    }),
    saveSchedule: tenantOrAdminProcedure.input(z.object({
      slots: z.array(z.object({ dayOfWeek: z.number(), sponsorName: z.string(), sponsorUrl: z.string(), sponsorTagline: z.string(), logoUrl: z.string(), isActive: z.boolean() }))
    })).mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sponsorSchedules } = await import("../drizzle/schema");
      const { eq: eqOp, sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      await dbConn.delete(sponsorSchedules).where(eqOp(sponsorSchedules.licenseId, lid));
      if (input.slots.length > 0) {
        await dbConn.insert(sponsorSchedules).values(input.slots.map(s => ({ licenseId: lid, dayOfWeek: s.dayOfWeek, sponsorName: s.sponsorName, sponsorUrl: s.sponsorUrl, sponsorTagline: s.sponsorTagline, logoUrl: s.logoUrl, isActive: s.isActive })));
      }
      return { success: true };
    }),
  }),

  // ─── Revenue ──────────────────────────────────────
  revenue: router({
    getOverview: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { publishedArticles: 0, totalViews: 0, subscribers: 0, socialPostsSent: 0, adsenseEnabled: false, sponsorEnabled: false, amazonEnabled: false };
      const { articles: artTable, distributionQueue: dq } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const [pubCount] = await dbConn.select({ count: sqlFn<number>`COUNT(*)` }).from(artTable).where(andOp(eqOp(artTable.licenseId, lid), eqOp(artTable.status, "published")));
      const [viewsResult] = await dbConn.select({ total: sqlFn<number>`COALESCE(SUM(views), 0)` }).from(artTable).where(andOp(eqOp(artTable.licenseId, lid), eqOp(artTable.status, "published")));
      const [subCount] = await dbConn.execute(sqlFn.raw("SELECT COUNT(*) as c FROM newsletter_subscribers WHERE license_id = " + lid));
      const [socialCount] = await dbConn.execute(sqlFn.raw("SELECT COUNT(*) as c FROM distribution_queue WHERE license_id = " + lid + " AND status = 'sent'"));
      const adsense = await db.getLicenseSetting(lid, "adsense_enabled");
      const sponsor = await db.getLicenseSetting(lid, "sponsor_enabled");
      const amazon = await db.getLicenseSetting(lid, "amazon_affiliate_tag");
      return { publishedArticles: Number(pubCount?.count || 0), totalViews: Number(viewsResult?.total || 0), subscribers: Number((subCount as any[])?.[0]?.c || 0), socialPostsSent: Number((socialCount as any[])?.[0]?.c || 0), adsenseEnabled: adsense?.value === "true", sponsorEnabled: sponsor?.value === "true", amazonEnabled: !!(amazon?.value) };
    }),
    getTopArticles: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { articles: [] };
      const { articles: artTable, categories: catTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, desc } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const top = await dbConn.select({ id: artTable.id, headline: artTable.headline, slug: artTable.slug, views: artTable.views, publishedAt: artTable.publishedAt, categoryId: artTable.categoryId }).from(artTable).where(andOp(eqOp(artTable.licenseId, lid), eqOp(artTable.status, "published"))).orderBy(desc(artTable.views)).limit(10);
      const withCats = await Promise.all(top.map(async a => {
        if (!a.categoryId) return { ...a, categoryName: null };
        const [cat] = await dbConn.select({ name: catTable.name }).from(catTable).where(eqOp(catTable.id, a.categoryId)).limit(1);
        return { ...a, categoryName: cat?.name || null };
      }));
      return { articles: withCats };
    }),
    getDistributionStats: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { stats: [] };
      const { sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const [rows] = await dbConn.execute(sqlFn.raw("SELECT platform, status, COUNT(*) as cnt FROM distribution_queue WHERE license_id = " + lid + " GROUP BY platform, status"));
      const map = new Map<string, { sent: number; failed: number }>();
      for (const r of (rows as any[])) {
        const ex = map.get(r.platform) || { sent: 0, failed: 0 };
        if (r.status === "sent") ex.sent += Number(r.cnt);
        if (r.status === "failed") ex.failed += Number(r.cnt);
        map.set(r.platform, ex);
      }
      return { stats: Array.from(map.entries()).map(([platform, counts]) => ({ platform, ...counts })) };
    }),
  }),

  // ─── Billing ──────────────────────────────────────
  billing: router({
    getStatus: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { plan: "professional", articlesUsedThisMonth: 0, articlesLimit: 500 };
      const { licenses, articles: artTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, gte, sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const [license] = await dbConn.select({ tier: licenses.tier }).from(licenses).where(eqOp(licenses.id, lid)).limit(1);
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const [countResult] = await dbConn.select({ count: sqlFn<number>`COUNT(*)` }).from(artTable).where(andOp(eqOp(artTable.licenseId, lid), gte(artTable.createdAt, startOfMonth)));
      const tier = license?.tier || "professional";
      const limits: Record<string, number> = { starter: 100, professional: 500, enterprise: 1000 };
      return { plan: tier, articlesUsedThisMonth: Number(countResult?.count || 0), articlesLimit: limits[tier] || 500 };
    }),
    changePlan: tenantOrAdminProcedure.input(z.object({ planKey: z.string(), stripeProductId: z.string() })).mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { licenses } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const validTiers = ["starter", "professional", "enterprise"];
      if (!validTiers.includes(input.planKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
      await dbConn.update(licenses).set({ tier: input.planKey as any }).where(eqOp(licenses.id, ctx.licenseId || 7));
      console.log("[Billing] licenseId " + (ctx.licenseId || 7) + " changed to " + input.planKey);
      return { success: true, plan: input.planKey };
    }),
  }),

  // ─── Articles ────────────────────────────────────────
  articles: router({
    list: publicProcedure.input(z.object({ status: z.string().optional(), categoryId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional(), cursor: z.number().optional(), search: z.string().optional(), dateRange: z.enum(['all', 'today', 'week', 'month', 'year']).optional(), noImage: z.boolean().optional(), missingGeo: z.boolean().optional(), missingImage: z.boolean().optional() }).optional()).query(async ({ input, ctx }) => {
      const params = input ?? {};
      const limit = params.limit ?? 20;
      const offset = params.cursor ? undefined : params.offset;
      const result = await db.listArticles({ ...params, limit: limit + 1, offset, licenseId: ctx.licenseId || undefined });
      const articles = result.articles.slice(0, limit);
      const hasMore = result.articles.length > limit;
      const nextCursor = hasMore ? articles[articles.length - 1]?.id : undefined;
      
      // Track search analytics if search query provided
      if (params.search && params.search.trim()) {
        await db.trackSearch({
          query: params.search.trim(),
          resultsCount: result.total,
          categoryFilter: params.categoryId,
          dateRangeFilter: params.dateRange,
          userId: ctx.user?.id,
          ipAddress: ctx.req.ip || ctx.req.socket.remoteAddress,
          userAgent: ctx.req.get('user-agent'),
        });
      }
      
      return { articles, total: result.total, hasMore, nextCursor };
    }),
    mostRead: publicProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(({ input, ctx }) => db.getMostReadArticles(input?.limit ?? 5, ctx.licenseId)),
    fromArchive: publicProcedure.input(z.object({ limit: z.number().optional(), minDaysOld: z.number().optional() }).optional()).query(async ({ input }) => {
      const limit = input?.limit ?? 5;
      const minDaysOld = input?.minDaysOld ?? 30;
      const cutoff = new Date(Date.now() - minDaysOld * 24 * 60 * 60 * 1000);
      const result = await db.listArticles({ status: 'published', limit: limit * 8 });
      const older = result.articles.filter(a => {
        const pub = a.publishedAt ? new Date(a.publishedAt) : null;
        return pub && pub < cutoff;
      });
      return older.sort(() => Math.random() - 0.5).slice(0, limit);
    }),
    trending: publicProcedure.input(z.object({ hoursAgo: z.number().optional(), limit: z.number().optional() }).optional()).query(async ({ input }) => {
      const hoursAgo = input?.hoursAgo ?? 24;
      const limit = input?.limit ?? 5;
      return db.getTrendingArticles(hoursAgo, limit);
    }),
    editorsPicks: publicProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { articles: articlesTable } = await import("../drizzle/schema");
      const { desc, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const conditions = [eqOp(articlesTable.isEditorsPick, true)];
      if (ctx.licenseId) conditions.push(eqOp(articlesTable.licenseId, ctx.licenseId));
      return dbConn.select().from(articlesTable)
        .where(andOp(...conditions))
        .orderBy(desc(articlesTable.publishedAt))
        .limit(input?.limit ?? 20);
    }),
    stats: publicProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { total: 0, published: 0, pending: 0, draft: 0, rejected: 0, approved: 0, thisMonth: 0, viewsTotal: 0, categoryBreakdown: [] };
      const { articles: at, categories: ct } = await import("../drizzle/schema");
      const { sql: sqlFn, count, eq: eqOp, sum, gte, and: andOp } = await import("drizzle-orm");
      const licFilter = ctx.licenseId ? sqlFn` WHERE license_id = ${ctx.licenseId}` : sqlFn``;
      const [totalRows] = await dbConn.execute(sqlFn`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as thisMonth,
        COALESCE(SUM(views), 0) as viewsTotal
        FROM articles${licFilter}`);
      const stats = (totalRows as any)[0] || {};
      const [catRows] = await dbConn.execute(ctx.licenseId ? sqlFn`SELECT c.name, COUNT(a.id) as count FROM articles a LEFT JOIN categories c ON a.categoryId = c.id WHERE a.license_id = ${ctx.licenseId} GROUP BY c.name ORDER BY count DESC LIMIT 10` : sqlFn`SELECT c.name, COUNT(a.id) as count FROM articles a LEFT JOIN categories c ON a.categoryId = c.id GROUP BY c.name ORDER BY count DESC LIMIT 10`);
      return {
        total: Number(stats.total || 0),
        published: Number(stats.published || 0),
        pending: Number(stats.pending || 0),
        draft: Number(stats.draft || 0),
        rejected: Number(stats.rejected || 0),
        approved: Number(stats.approved || 0),
        thisMonth: Number(stats.thisMonth || 0),
        viewsTotal: Number(stats.viewsTotal || 0),
        categoryBreakdown: (catRows as any[]).map(r => ({ name: r.name || "Uncategorized", count: Number(r.count) })),
      };
    }),
    updateImage: tenantOrAdminProcedure
      .input(z.object({ articleId: z.number(), imageUrl: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateArticle(input.articleId, { featuredImage: input.imageUrl });
        return { success: true };
      }),
    regenerateImage: tenantOrAdminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const article = await db.getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        const { buildImagePrompt } = await import("./imagePromptBuilder");
        const { generateImage } = await import("./_core/imageGeneration");
        const prompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: ctx.licenseId || article.licenseId || undefined });
        const result = await generateImage({ prompt, licenseId: ctx.licenseId || article.licenseId || undefined });
        if (result?.url) {
          await db.updateArticle(input.articleId, { featuredImage: result.url } as any);
          return { success: true, url: result.url };
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
      }),
    deleteImage: tenantOrAdminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateArticle(input.articleId, { featuredImage: null } as any);
        return { success: true };
      }),
    getCounts: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { all: 0, published: 0, pending: 0, approved: 0, draft: 0, rejected: 0 };
      const { articles: at } = await import("../drizzle/schema");
      const { eq: eqOp, sql: sqlFn } = await import("drizzle-orm");
      const lid = ctx.licenseId || 7;
      const [rows] = await dbConn.execute(sqlFn.raw("SELECT status, COUNT(*) as cnt FROM articles WHERE license_id = " + lid + " GROUP BY status"));
      const map = Object.fromEntries((rows as any[]).map(r => [r.status, Number(r.cnt)]));
      const total = Object.values(map).reduce((s: number, v) => s + (v as number), 0);
      return { all: total, published: map.published || 0, pending: map.pending || 0, approved: map.approved || 0, draft: map.draft || 0, rejected: map.rejected || 0 };
    }),
    permanentDelete: tenantOrAdminProcedure.input(z.object({ articleId: z.number() })).mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { articles: at } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");
      await dbConn.delete(at).where(andOp(eqOp(at.id, input.articleId), eqOp(at.licenseId, ctx.licenseId || 7)));
      return { success: true };
    }),
    toggleTag: protectedProcedure
      .input(z.object({ articleId: z.number(), tag: z.enum(["editors_pick", "trending", "featured", "sponsored", "breaking"]) }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { articles: at } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const [article] = await dbConn.select().from(at).where(eqOp(at.id, input.articleId)).limit(1);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        const fieldMap: Record<string, string> = { editors_pick: "isEditorsPick", trending: "isTrending", featured: "isFeatured", sponsored: "isSponsored", breaking: "isBreaking" };
        const field = fieldMap[input.tag] as keyof typeof article;
        const current = article[field] as boolean;
        await dbConn.update(at).set({ [field]: !current } as any).where(eqOp(at.id, input.articleId));
        return { articleId: input.articleId, tag: input.tag, value: !current };
      }),
    // Archive: list months that have published articles (for the archive browser)
    archiveMonths: publicProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql: sqlFn } = await import('drizzle-orm');
      const rows = await dbConn.execute(
        sqlFn`SELECT DATE_FORMAT(publishedAt, '%Y-%m') as ym, COUNT(*) as cnt
              FROM articles WHERE status = 'published' AND publishedAt IS NOT NULL
              GROUP BY ym ORDER BY ym DESC LIMIT 60`
      );
      return (rows as any[]).map((r: any) => ({ month: r.ym as string, count: Number(r.cnt) }));
    }),
    // Archive: list articles for a specific year-month (YYYY-MM)
    archiveByMonth: publicProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { articles: [], total: 0 };
        const { sql: sqlFn, and, eq, desc } = await import('drizzle-orm');
        const { articles: articlesTable } = await import('../drizzle/schema');
        const [year, mon] = input.month.split('-').map(Number);
        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 1);
        const limit = input.limit ?? 24;
        const offset = input.offset ?? 0;
        const [rows, countRows] = await Promise.all([
          dbConn.select({
            id: articlesTable.id,
            headline: articlesTable.headline,
            slug: articlesTable.slug,
            subheadline: articlesTable.subheadline,
            featuredImage: articlesTable.featuredImage,
            publishedAt: articlesTable.publishedAt,
            categoryId: articlesTable.categoryId,
            views: articlesTable.views,
          })
            .from(articlesTable)
            .where(and(
              eq(articlesTable.status, 'published'),
              sqlFn`${articlesTable.publishedAt} >= ${start}`,
              sqlFn`${articlesTable.publishedAt} < ${end}`,
            ))
            .orderBy(desc(articlesTable.publishedAt))
            .limit(limit)
            .offset(offset),
          dbConn.select({ count: sqlFn<number>`COUNT(*)` })
            .from(articlesTable)
            .where(and(
              eq(articlesTable.status, 'published'),
              sqlFn`${articlesTable.publishedAt} >= ${start}`,
              sqlFn`${articlesTable.publishedAt} < ${end}`,
            )),
        ]);
        return { articles: rows, total: Number(countRows[0]?.count ?? 0) };
      }),
    getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      const article = await db.getArticleBySlug(input.slug);
      if (article) {
        await db.incrementArticleViews(article.id);
        
        // Parse article body if it contains JSON (fix for legacy articles)
        if (article.body) {
          const trimmed = article.body.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.body && typeof parsed.body === 'string') {
                // Extract body field and convert escaped newlines to HTML paragraphs
                let extractedBody = parsed.body.replace(/\\n/g, '\n');
                const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
                article.body = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');
              }
            } catch (e) {
              console.error('[getBySlug] Failed to parse article body JSON:', e);
            }
          }
        }
      }
      return article;
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getArticleById(input.id)),
    validate: publicProcedure.input(z.object({ headline: z.string().optional(), body: z.string().optional(), featuredImage: z.string().optional() })).query(({ input }) => {
      return validateArticle(input);
    }),
    migrateJson: adminProcedure.mutation(async () => {
      return await migrateJsonArticles();
    }),
    previewMigration: adminProcedure.query(async () => {
      return await previewMigration();
    }),
    related: publicProcedure.input(z.object({ slug: z.string(), categoryId: z.number().nullable().optional(), limit: z.number().optional() })).query(({ input }) =>
      db.getRelatedArticles(input.slug, input.categoryId ?? null, input.limit ?? 4)
    ),
    amazonKeywords: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
      try {
        const article = await db.getArticleById(input.articleId);
        if (!article) {
          return { keywords: getFallbackKeywords() };
        }
        const cats = await db.listCategories();
        const category = article.categoryId ? cats.find(c => c.id === article.categoryId)?.name : undefined;
        const keywords = generateAmazonKeywords({
          title: article.headline,
          content: article.body || '',
          category,
        });
        return { keywords: keywords || getFallbackKeywords() };
      } catch (error) {
        console.error('Error generating Amazon keywords:', error);
        return { keywords: getFallbackKeywords() };
      }
    }),
    _adminStats: adminProcedure.query(() => db.getArticleStats()),
    videoStats: adminProcedure.query(async () => {
      const allArticles = await db.listArticles({ limit: 10000 });
      const articlesWithVideos = allArticles.articles.filter(a => a.videoUrl);
      const totalArticles = allArticles.articles.length;
      const videosGenerated = articlesWithVideos.length;
      const successRate = totalArticles > 0 ? Math.round((videosGenerated / totalArticles) * 100) : 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentArticlesWithVideos = articlesWithVideos.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);
      return {
        totalArticles,
        videosGenerated,
        successRate,
        recentVideosGenerated: recentArticlesWithVideos.length,
        articlesWithoutVideos: totalArticles - videosGenerated,
      };
    }),
    missingImages: adminProcedure.query(() => db.getArticlesMissingImages()),
    categoryStats: adminProcedure.query(async () => {
      const allArticles = await db.listArticles({ limit: 10000 });
      const categories = await db.listCategories();
      const totalArticles = allArticles.articles.length;
      
      const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, slug: c.slug }]));
      const categoryCounts = new Map<number, number>();
      
      allArticles.articles.forEach(article => {
        const catId = article.categoryId ?? 0;
        categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
      });
      
      const stats = Array.from(categoryCounts.entries())
        .map(([categoryId, count]) => {
          const cat = categoryMap.get(categoryId);
          return {
            categoryId,
            categoryName: cat?.name || 'Uncategorized',
            categorySlug: cat?.slug || 'uncategorized',
            count,
            percentage: totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0,
          };
        })
        .sort((a, b) => b.count - a.count);
      
      return stats;
    }),
    create: tenantOrAdminProcedure.input(z.object({
      headline: z.string(), subheadline: z.string().optional(), body: z.string(), slug: z.string(),
      status: z.enum(["draft", "pending", "approved", "published", "rejected"]).optional(),
      categoryId: z.number().optional(), featuredImage: z.string().optional(),
      batchDate: z.string().optional(), sourceEvent: z.string().optional(), sourceUrl: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createArticle({ ...input, authorId: ctx.user.id });
      return { id };
    }),
    bulkCreate: adminProcedure.input(z.object({
      articles: z.array(z.object({
        headline: z.string(), subheadline: z.string().optional(), body: z.string(), slug: z.string(),
        status: z.enum(["draft", "pending", "approved", "published", "rejected"]).optional(),
        categoryId: z.number().optional(), featuredImage: z.string().optional(),
        batchDate: z.string().optional(), sourceEvent: z.string().optional(), sourceUrl: z.string().optional(),
      })),
    })).mutation(async ({ input, ctx }) => {
      const dataList = input.articles.map(a => ({ ...a, authorId: ctx.user.id }));
      const ids = await db.bulkCreateArticles(dataList);
      return { ids, count: ids.length };
    }),
    update: tenantOrAdminProcedure.input(z.object({
      id: z.number(), headline: z.string().optional(), subheadline: z.string().optional(),
      body: z.string().optional(), slug: z.string().optional(),
      status: z.enum(["draft", "pending", "approved", "published", "rejected"]).optional(),
      categoryId: z.number().optional(), featuredImage: z.string().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updateArticle(id, data); }),
    updateStatus: tenantOrAdminProcedure.input(z.object({ id: z.number(), status: z.enum(["draft", "pending", "approved", "published", "rejected"]) })).mutation(async ({ input }) => {
      // Get the article's previous status before updating
      const articleBefore = await db.getArticleById(input.id);
      const previousStatus = articleBefore?.status;

      // Publish gate: block approved→published if no image is available
      if (input.status === "published") {
        const gate = await checkPublishGate(input.id, articleBefore?.featuredImage);
        if (!gate.allowed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: gate.reason ?? "Article cannot be published: no image available.",
          });
        }
      }

      await db.updateArticleStatus(input.id, input.status);

      // Update workflow batch counters when article status changes
      if (articleBefore?.batchDate && previousStatus !== input.status) {
        const batch = await db.getWorkflowBatchByDate(articleBefore.batchDate);
        if (batch) {
          const updates: Record<string, number> = {};
          // Decrement old status counter
          if (previousStatus === "approved" && batch.articlesApproved > 0) updates.articlesApproved = batch.articlesApproved - 1;
          if (previousStatus === "published" && batch.articlesPublished > 0) updates.articlesPublished = batch.articlesPublished - 1;
          if (previousStatus === "rejected" && batch.articlesRejected > 0) updates.articlesRejected = batch.articlesRejected - 1;
          // Increment new status counter
          if (input.status === "approved") updates.articlesApproved = (updates.articlesApproved ?? batch.articlesApproved) + 1;
          if (input.status === "published") updates.articlesPublished = (updates.articlesPublished ?? batch.articlesPublished) + 1;
          if (input.status === "rejected") updates.articlesRejected = (updates.articlesRejected ?? batch.articlesRejected) + 1;
          if (Object.keys(updates).length > 0) {
            await db.updateWorkflowBatch(batch.id, updates);
            console.log(`[BatchTally] Updated batch ${batch.batchDate}: ${JSON.stringify(updates)}`);
          }
        }
      }

      // Auto-generate featured image on approval if enabled
      if (input.status === "approved") {
        const autoGen = await db.getSetting("auto_generate_images");
        if (autoGen?.value === "true") {
          const article = await db.getArticleById(input.id);
          if (article && !article.featuredImage) {
            // Fire-and-forget: generate image in background
            (async () => {
              try {
                const finalPrompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: (article as any)?.licenseId || (articleBefore as any)?.licenseId });
                const result = await generateImage({ prompt: finalPrompt, licenseId: (article as any)?.licenseId });
                if (result?.url) {
                  await db.updateArticle(input.id, { featuredImage: result.url, llmImagePrompt: finalPrompt });
                  console.log(`[AutoMedia] Generated image for article ${input.id}`);
                }
              } catch (err) {
                console.error(`[AutoMedia] Failed to generate image for article ${input.id}:`, err);
              }
            })();
          }
        }
      }

      // Invalidate sitemap cache when an article is published so the next crawl gets fresh URLs
      if (input.status === "published") {
        invalidateSitemapCache();
        // Notify IndexNow (Bing/Yahoo/DDG/Yandex/ChatGPT) — fire-and-forget
        const publishedArticle = await db.getArticleById(input.id);
        if (publishedArticle?.slug) {
          notifyArticlePublished(publishedArticle.slug).catch(() => {});
        }
        // Queue to Blotato for social distribution — fire-and-forget
        if (publishedArticle?.licenseId) {
          (async () => {
            try {
              const { queueArticleToBlotato } = await import("./blotato");
              const siteUrlSetting = await db.getLicenseSetting(publishedArticle.licenseId!, "site_url");
              let siteUrl = siteUrlSetting?.value || "";
              if (!siteUrl) {
                const { getLicenseById } = await import("./auth/licenseAuth");
                const license = await getLicenseById(publishedArticle.licenseId!);
                siteUrl = license?.subdomain ? "https://" + license.subdomain + ".getjaime.io" : "";
              }
              if (siteUrl) {
                await queueArticleToBlotato(publishedArticle.licenseId!, publishedArticle, siteUrl);
              }
            } catch (e) { console.error("[Blotato] Auto-distribute failed:", e); }
          })();
        }
      }
      // Auto-generate featured image on publish if missing
      if (input.status === "published") {
        const article = await db.getArticleById(input.id);
        if (article && !article.featuredImage) {
          // Fire-and-forget: generate image in background
          (async () => {
            try {
              const finalPrompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: (article as any)?.licenseId || (articleBefore as any)?.licenseId });
              const result = await generateImage({ prompt: finalPrompt, licenseId: (article as any)?.licenseId });
              if (result?.url) {
                await db.updateArticle(input.id, { featuredImage: result.url, llmImagePrompt: finalPrompt });
                console.log(`[AutoMedia] Generated image for published article ${input.id}`);
              }
            } catch (err) {
              console.error(`[AutoMedia] Failed to generate image for published article ${input.id}:`, err);
            }
          })();
        }
      }

      // Auto-create social media posts on publish if enabled
      if (input.status === "published") {
        const autoCreate = await db.getSetting("auto_create_social_posts");
        if (autoCreate?.value === "true") {
          const article = await db.getArticleById(input.id);
          if (article) {
            // Fire-and-forget: create social posts in background
            (async () => {
              try {
                // Check if social posts already exist for this article
                const existingPosts = await db.listSocialPosts({ articleId: input.id });
                if (existingPosts.length === 0) {
                  // Import the generateSocialPosts function from workflow
                  const { generateSocialPosts } = await import("./workflow");
                  const socialPlatformsStr = await db.getSetting("social_platforms");
                  const socialPlatforms = (socialPlatformsStr?.value || "twitter,facebook,linkedin").split(",").map(p => p.trim()).filter(Boolean);
                  const siteUrlSetting = await db.getSetting("site_url");
                  const siteBaseUrl = siteUrlSetting?.value || "https://example.com";
                  
                  const posts = await generateSocialPosts(
                    [{
                      id: article.id,
                      headline: article.headline,
                      subheadline: article.subheadline || undefined,
                      slug: article.slug,
                      featuredImage: article.featuredImage || undefined,
                    }],
                    socialPlatforms,
                    siteBaseUrl
                  );

                  if (posts.length > 0) {
                    await db.bulkCreateSocialPosts(posts.map((p: any) => ({
                      articleId: p.articleId,
                      platform: p.platform as "twitter" | "facebook" | "linkedin" | "instagram" | "threads",
                      content: p.content,
                      status: p.status as "draft" | "scheduled" | "posted" | "failed",
                    })));
                    console.log(`[AutoSocial] Created ${posts.length} social posts for article ${input.id}`);

                    // Auto-queue X/Twitter posts if enabled
                    const autoQueue = await db.getSetting("x_auto_queue_on_publish");
                    if (autoQueue?.value === "true") {
                      const { queueArticlesForX } = await import("./xPostQueue");
                      const queued = await queueArticlesForX([input.id]);
                      if (queued > 0) {
                        console.log(`[AutoQueue] Queued ${queued} X posts for article ${input.id}`);
                      }
                    }

                    // FeedHive auto-post logic archived (Feb 21, 2026)
                    // See /archive/feedhive/auto-post-logic.ts for original code

                    // Auto-post to Reddit if enabled
                    const redditEnabled = await db.getSetting("reddit_enabled");
                    if (redditEnabled?.value === "true") {
                      try {
                        const { postArticleToReddit } = await import("./reddit-article-poster");
                        const siteUrlSetting = await db.getSetting("site_url");
                        const siteBaseUrl = siteUrlSetting?.value || "https://example.com";
                        const articleUrl = `${siteBaseUrl}/article/${article.slug}`;
                        
                        const result = await postArticleToReddit({
                          articleId: article.id,
                          articleUrl,
                          headline: article.headline
                        });
                        
                        if (result.success) {
                          console.log(`[AutoReddit] Posted article ${input.id} to Reddit: ${result.postUrl}`);
                        } else {
                          console.error(`[AutoReddit] Failed to post article ${input.id}:`, result.error);
                        }
                      } catch (err) {
                        console.error(`[AutoReddit] Error posting article ${input.id}:`, err);
                      }
                    }
                  }
                }
              } catch (err) {
                console.error(`[AutoSocial] Failed to create social posts for article ${input.id}:`, err);
              }
            })();
          }
        }
      }

      // Auto-publish on approval: if auto_publish_approved is enabled, immediately publish the article
      if (input.status === "approved") {
        const autoPublish = await db.getSetting("auto_publish_approved");
        if (autoPublish?.value === "true") {
          (async () => {
            try {
              // Publish gate: only auto-publish if the article has an image
              const approvedArticleForGate = await db.getArticleById(input.id);
              const gate = await checkPublishGate(input.id, approvedArticleForGate?.featuredImage);
              if (!gate.allowed) {
                console.log(`[AutoPublish] Skipped auto-publish for article ${input.id}: ${gate.reason}`);
                return;
              }
              await db.updateArticleStatus(input.id, "published");
              await db.updateArticle(input.id, { publishedAt: new Date() });
              console.log(`[AutoPublish] Auto-published article ${input.id} on approval`);
              // Queue to Blotato for social distribution
              if (approvedArticleForGate?.licenseId) {
                const { queueArticleToBlotato } = await import("./blotato");
                const siteUrlSetting2 = await db.getLicenseSetting(approvedArticleForGate.licenseId, "site_url");
                let siteUrl2 = siteUrlSetting2?.value || "";
                if (!siteUrl2) {
                  const { getLicenseById: getLic } = await import("./auth/licenseAuth");
                  const lic = await getLic(approvedArticleForGate.licenseId);
                  siteUrl2 = lic?.subdomain ? "https://" + lic.subdomain + ".getjaime.io" : "";
                }
                if (siteUrl2) queueArticleToBlotato(approvedArticleForGate.licenseId, approvedArticleForGate, siteUrl2).catch(e => console.error("[Blotato] Auto-distribute on approval failed:", e));
              }
              // Notify IndexNow on auto-publish
              const approvedArticle = await db.getArticleById(input.id);
              if (approvedArticle?.slug) {
                notifyArticlePublished(approvedArticle.slug).catch(() => {});
              }
              // Auto-create social posts for the newly published article
              const autoCreate = await db.getSetting("auto_create_social_posts");
              if (autoCreate?.value === "true") {
                const article = await db.getArticleById(input.id);
                if (article) {
                  const existingPosts = await db.listSocialPosts({ articleId: input.id });
                  if (existingPosts.length === 0) {
                    const { generateSocialPosts } = await import("./workflow");
                    const socialPlatformsStr = await db.getSetting("social_platforms");
                    const socialPlatforms = (socialPlatformsStr?.value || "twitter").split(",").map((p: string) => p.trim()).filter(Boolean);
                    const siteUrlSetting = await db.getSetting("site_url");
                    const siteBaseUrl = siteUrlSetting?.value || "https://example.com";
                    const posts = await generateSocialPosts(
                      [{ id: article.id, headline: article.headline, subheadline: article.subheadline || undefined, slug: article.slug, featuredImage: article.featuredImage || undefined }],
                      socialPlatforms, siteBaseUrl
                    );
                    if (posts.length > 0) {
                      await db.bulkCreateSocialPosts(posts.map((p: any) => ({ articleId: p.articleId, platform: p.platform, content: p.content, status: p.status })));
                      console.log(`[AutoPublish] Created ${posts.length} social posts for auto-published article ${input.id}`);
                    }
                  }
                  // Auto-queue X post
                  const autoQueue = await db.getSetting("x_auto_queue_on_publish");
                  if (autoQueue?.value === "true") {
                    const { queueArticlesForX } = await import("./xPostQueue");
                    const queued = await queueArticlesForX([input.id]);
                    if (queued > 0) console.log(`[AutoPublish] Queued ${queued} X posts for auto-published article ${input.id}`);
                  }
                }
              }
            } catch (err) {
              console.error(`[AutoPublish] Failed to auto-publish article ${input.id}:`, err);
            }
          })();
        }
      }

      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteArticle(input.id)),
    bulkDeleteRejected: adminProcedure.mutation(() => db.bulkDeleteRejectedArticles()),
    regenerateMissingImages: adminProcedure.mutation(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return { total: 0, succeeded: 0, failed: 0 };
      const { articles: artTable } = await import("../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");
      const needImages = await dbConn.select().from(artTable).where(and(eq(artTable.licenseId, 7), eq(artTable.status, "published"), isNull(artTable.featuredImage))).limit(25);
      console.log("[ImageRegen] Found " + needImages.length + " articles needing images");
      let succeeded = 0, failed = 0;
      for (const article of needImages) {
        try {
          const { buildImagePrompt } = await import("./imagePromptBuilder");
          const { generateImage } = await import("./_core/imageGeneration");
          const prompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: article.licenseId ?? 7 });
          const result = await generateImage({ prompt, licenseId: article.licenseId ?? 7 });
          if (result?.url) {
            await dbConn.update(artTable).set({ featuredImage: result.url }).where(eq(artTable.id, article.id));
            console.log("[ImageRegen] " + article.id + ": " + result.url.substring(0, 80));
            succeeded++;
          } else { failed++; }
          await new Promise(r => setTimeout(r, 3000));
        } catch (err: any) { console.error("[ImageRegen] Failed " + article.id + ":", err.message?.substring(0, 100)); failed++; }
      }
      return { total: needImages.length, succeeded, failed };
    }),
    bulkGenerateVideos: adminProcedure.input(z.object({ articleIds: z.array(z.number()).optional() }).optional()).mutation(({ input }) => bulkGenerateVideos(input?.articleIds)),
    backfillSeoDescriptions: adminProcedure.mutation(async () => {
      const { articles: allArticles } = await db.listArticles({ limit: 10000 });
      const missing = allArticles.filter((a: any) => !a.seoDescription);
      let succeeded = 0;
      for (const article of missing) {
        const sub = article.subheadline || "";
        const bodyText = (article.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        let desc = "";
        if (sub && sub.length >= 50 && sub.length <= 160) { desc = sub; }
        else { const firstSent = bodyText.split(/[.!?]/)[0]?.trim(); if (firstSent && firstSent.length >= 50 && firstSent.length <= 160) desc = firstSent + "."; else { const combined = sub ? article.headline + " — " + sub : article.headline; desc = combined.length > 160 ? combined.substring(0, 157) + "..." : combined; } }
        await db.updateArticle(article.id, { seoDescription: desc } as any);
        succeeded++;
      }
      return { total: missing.length, processed: succeeded, succeeded };
    }),
    regenerateVideo: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const article = await db.getArticleById(input.id);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      
      // Get video settings
      const videoStyleSetting = await db.getSetting("video_style_prompt");
      const videoStylePrompt = videoStyleSetting?.value || "Professional news broadcast style, high production quality, cinematic lighting";
      const videoDurationSetting = await db.getSetting("video_duration");
      const videoDuration = videoDurationSetting?.value ? parseInt(videoDurationSetting.value) : 5;
      const videoAspectRatioSetting = await db.getSetting("video_aspect_ratio");
      const videoAspectRatio = (videoAspectRatioSetting?.value || "16:9") as "16:9" | "9:16" | "1:1";
      
      const videoPrompt = videoStylePrompt + ". News headline: " + article.headline + (article.subheadline ? ". Subheadline: " + article.subheadline : "");
      const result = await generateVideo({
        prompt: videoPrompt,
        duration: videoDuration,
        aspectRatio: videoAspectRatio,
      });
      
      if (result.url) {
        await db.updateArticle(input.id, { videoUrl: result.url });
        return { success: true, videoUrl: result.url };
      }
      
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Video generation failed" });
    }),

    generateGeoForArticle: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const article = await db.getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        const [geoSummary, geoFaq] = await Promise.all([
          generateGeoSummary(article.headline, article.body),
          generateGeoFaq(article.headline, article.body),
        ]);
        await db.updateArticle(input.id, { geoSummary, geoFaq } as any);
        return { success: true, geoSummary, geoFaq };
      }),

    generateGeoForDraft: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const article = await db.getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        const [geoSummary, geoFaq] = await Promise.all([
          generateGeoSummary(article.headline, article.body),
          generateGeoFaq(article.headline, article.body),
        ]);
        await db.updateArticle(input.id, { geoSummary, geoFaq } as any);
        return { success: true, geoSummary, geoFaq };
      }),

    generateImageForDraft: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const article = await db.getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        const prompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: article.licenseId || undefined });
        const result = await generateImage({ prompt, licenseId: article.licenseId || undefined });
        if (result?.url) {
          await db.updateArticle(input.id, { featuredImage: result.url } as any);
          return { success: true, url: result.url };
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
      }),
  }),

  // ─── Enhanced Search ─────────────────────────────────
  search: router({
    enhanced: publicProcedure
      .input(z.object({
        query: z.string(),
        status: z.string().optional(),
        categoryId: z.number().optional(),
        tagSlug: z.string().optional(),
        dateRange: z.enum(['all', 'today', 'week', 'month', 'year']).optional(),
        sortBy: z.enum(['relevance', 'date', 'views']).optional(),
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().optional(),
        cursor: z.number().optional(),
        useFuzzy: z.boolean().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { enhancedSearch } = await import('./search');
        const result = await enhancedSearch(input);
        await db.trackSearch({
          query: input.query.trim(),
          resultsCount: result.total,
          categoryFilter: input.categoryId,
          dateRangeFilter: input.dateRange,
          userId: ctx.user?.id,
          ipAddress: ctx.req.ip || ctx.req.socket.remoteAddress,
          userAgent: ctx.req.get('user-agent'),
        });
        return result;
      }),

    autocomplete: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const { getAutocompleteSuggestions } = await import('./search');
        return getAutocompleteSuggestions(input.query, input.limit);
      }),

    didYouMean: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const { getDidYouMeanSuggestions } = await import('./search');
        return getDidYouMeanSuggestions(input.query, input.limit);
      }),

    trending: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getTrendingSearches } = await import('./search');
        return getTrendingSearches(input?.limit);
      }),

    popular: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getPopularSearches } = await import('./search');
        return getPopularSearches(input?.limit);
      }),
  }),



  // ─── Tags ─────────────────────────────────────────────
  tags: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), orderBy: z.enum(['count', 'name', 'recent']).optional() }).optional())
      .query(async ({ input }) => {
        const { listTags } = await import('./tagging');
        return listTags(input ?? {});
      }),

    cloud: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getTagCloud } = await import('./tagging');
        return getTagCloud(input?.limit ?? 30);
      }),

    trending: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getTrendingTags } = await import('./tagging');
        return getTrendingTags(input?.limit ?? 10);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const { getTagBySlug } = await import('./tagging');
        return getTagBySlug(input.slug);
      }),

    articlesByTag: publicProcedure
      .input(z.object({ slug: z.string(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        const { getArticlesByTag } = await import('./tagging');
        return getArticlesByTag(input.slug, { limit: input.limit, offset: input.offset });
      }),

    forArticle: publicProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        const { getArticleTags } = await import('./tagging');
        return getArticleTags(input.articleId);
      }),

    setForArticle: adminProcedure
      .input(z.object({ articleId: z.number(), tagNames: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        const { setArticleTags } = await import('./tagging');
        await setArticleTags(input.articleId, input.tagNames);
        return { success: true };
      }),

    autoTag: adminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        const article = await db.getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: 'NOT_FOUND' });
        const { autoTagArticle } = await import('./tagging');
        const tagNames = await autoTagArticle(input.articleId, article.headline, article.subheadline, article.body);
        return { tagNames };
      }),

    batchAutoTag: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .mutation(async ({ input }) => {
        const { batchAutoTagUntagged } = await import('./tagging');
        return batchAutoTagUntagged(input?.limit ?? 50);
      }),

    batchAutoTagAll: adminProcedure
      .mutation(async () => {
        const { batchAutoTagAll } = await import('./tagging');
        return batchAutoTagAll();
      }),

    recomputeCounts: adminProcedure
      .mutation(async () => {
        const { recomputeAllTagCounts } = await import('./tagging');
        await recomputeAllTagCounts();
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteTag } = await import('./tagging');
        await deleteTag(input.id);
        return { success: true };
      }),
  }),

  // ─── Newsletter ──────────────────────────────────────
  newsletter: router({
    subscribe: publicProcedure.input(z.object({ email: z.string().email() })).mutation(({ input, ctx }) => db.subscribeNewsletter(input.email, ctx.licenseId || undefined)),
    unsubscribe: publicProcedure.input(z.object({ email: z.string().email() })).mutation(({ input }) => db.unsubscribeNewsletter(input.email)),
    list: adminProcedure.query(({ ctx }) => db.listSubscribers(ctx.licenseId || undefined)),
    subscriberCount: publicProcedure.query(({ ctx }) => db.countNewsletterSubscribers("active", ctx.licenseId || undefined)),
    sendDigest: adminProcedure
      .input(z.object({ dryRun: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { sendWeeklyDigest } = await import("./newsletterDigest");
        return sendWeeklyDigest({ dryRun: input.dryRun, triggeredBy: "manual" });
      }),
    sendHistory: adminProcedure.query(() => db.getNewsletterSendHistory()),
    testConnection: adminProcedure
      .input(z.object({ toEmail: z.string().email() }))
      .mutation(async ({ input }) => {
        const { testResendConnection } = await import("./newsletterDigest");
        return testResendConnection(input.toEmail);
      }),
    sendTest: tenantOrAdminProcedure
      .input(z.object({ toEmail: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        const { sendEmail } = await import("./communications/emailService");
        const licId = ctx.licenseId || undefined;
        const result = await sendEmail(licId, input.toEmail, "[Test] Newsletter Test Email",
          `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #111827;">Newsletter Test Email</h2>
            <p style="color: #374151; font-size: 16px;">This is a test email from your JAIME.IO publication newsletter system.</p>
            <p style="color: #6b7280; font-size: 14px;">If you received this, your email configuration is working correctly.</p>
          </div>`
        );
        return { success: result.success, error: result.error };
      }),
    getTemplates: publicProcedure.query(() => {
      return [
        { name: "editorial", label: "Editorial", description: "Classic newspaper style with serif masthead" },
        { name: "modern", label: "Modern", description: "Card-based layout with gradient header" },
        { name: "magazine", label: "Magazine", description: "Image-heavy with bold typography" },
        { name: "minimal", label: "Minimal", description: "Text-only, ultra-clean layout" },
        { name: "bold", label: "Bold", description: "Dark background with bright accents" },
        { name: "corporate", label: "Corporate", description: "Professional B2B layout" },
      ];
    }),
    setTemplate: adminProcedure
      .input(z.object({ template: z.string() }))
      .mutation(async ({ input }) => {
        await db.upsertSetting({ key: "newsletter_template", value: input.template, category: "newsletter", type: "string" });
        return { success: true };
      }),
  }),
  // ─── Social Posts ────────────────────────────────────
  social: router({
    list: adminProcedure.input(z.object({ articleId: z.number().optional(), status: z.string().optional() }).optional()).query(({ input }) => db.listSocialPosts(input ?? {})),
    create: adminProcedure.input(z.object({
      articleId: z.number(), platform: z.enum(["twitter", "facebook", "linkedin", "instagram", "threads"]),
      content: z.string(), status: z.enum(["draft", "scheduled", "posted", "failed"]).optional(),
      scheduledAt: z.date().optional(),
    })).mutation(({ input }) => db.createSocialPost(input)),
    bulkCreate: adminProcedure.input(z.object({
      posts: z.array(z.object({
        articleId: z.number(), platform: z.enum(["twitter", "facebook", "linkedin", "instagram", "threads"]),
        content: z.string(), status: z.enum(["draft", "scheduled", "posted", "failed"]).optional(),
      })),
    })).mutation(({ input }) => db.bulkCreateSocialPosts(input.posts)),
    updateStatus: adminProcedure.input(z.object({ id: z.number(), status: z.enum(["draft", "scheduled", "posted", "failed"]) })).mutation(({ input }) => db.updateSocialPostStatus(input.id, input.status)),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteSocialPost(input.id)),
    testConnection: adminProcedure
      .input(z.object({ platform: z.enum(["x", "threads", "bluesky", "facebook", "instagram", "linkedin"]) }))
      .mutation(async ({ input }) => {
        const allSettingsArr = await db.getAllSettings();
        const allSettings: Record<string, string> = {};
        for (const row of allSettingsArr) { allSettings[row.key] = row.value; }
        const s = (key: string) => allSettings[key] ?? "";
        const crypto = require("crypto");

        function buildXOAuthHeader(method: string, url: string, params: Record<string, string>, consumerKey: string, consumerSecret: string, accessToken: string, accessTokenSecret: string): string {
          const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const oauthParams: Record<string, string> = {
            oauth_consumer_key: consumerKey,
            oauth_nonce: nonce,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: timestamp,
            oauth_token: accessToken,
            oauth_version: "1.0",
          };
          const allParams = { ...params, ...oauthParams };
          const sortedKeys = Object.keys(allParams).sort();
          const paramString = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join("&");
          const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
          const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;
          const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
          oauthParams.oauth_signature = signature;
          const headerParts = Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);
          return `OAuth ${headerParts.join(", ")}`;
        }

        try {
          if (input.platform === "x") {
            const apiKey = s("x_api_key"); const apiSecret = s("x_api_secret");
            const accessToken = s("x_access_token"); const accessTokenSecret = s("x_access_token_secret");
            if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return { success: false, message: "Missing X credentials." };
            const oauthHeader = buildXOAuthHeader("GET", "https://api.twitter.com/2/users/me", {}, apiKey, apiSecret, accessToken, accessTokenSecret);
            const res = await fetch("https://api.twitter.com/2/users/me", { headers: { Authorization: oauthHeader } });
            const body = await res.json() as any;
            if (res.ok && body?.data?.username) return { success: true, message: `Connected as @${body.data.username}` };
            return { success: false, message: body?.errors?.[0]?.message ?? body?.detail ?? `HTTP ${res.status}` };
          }
          if (input.platform === "bluesky") {
            const handle = s("bluesky_handle"); const appPassword = s("bluesky_app_password");
            if (!handle || !appPassword) return { success: false, message: "Missing Bluesky handle or app password." };
            const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: handle, password: appPassword }) });
            const body = await res.json() as any;
            if (res.ok && body?.handle) return { success: true, message: `Connected as ${body.handle}` };
            return { success: false, message: body?.message ?? `HTTP ${res.status}` };
          }
          if (input.platform === "threads") {
            const userId = s("threads_user_id"); const token = s("threads_access_token");
            if (!userId || !token) return { success: false, message: "Missing Threads User ID or Access Token." };
            const res = await fetch(`https://graph.threads.net/v1.0/${userId}?fields=id,username&access_token=${token}`);
            const body = await res.json() as any;
            if (res.ok && body?.username) return { success: true, message: `Connected as @${body.username}` };
            return { success: false, message: body?.error?.message ?? `HTTP ${res.status}` };
          }
          if (input.platform === "facebook") {
            const pageId = s("facebook_page_id"); const token = s("facebook_page_access_token");
            if (!pageId || !token) return { success: false, message: "Missing Facebook Page ID or Access Token." };
            const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=id,name&access_token=${token}`);
            const body = await res.json() as any;
            if (res.ok && body?.name) return { success: true, message: `Connected to page: ${body.name}` };
            return { success: false, message: body?.error?.message ?? `HTTP ${res.status}` };
          }
          if (input.platform === "instagram") {
            const accountId = s("instagram_account_id"); const token = s("instagram_access_token");
            if (!accountId || !token) return { success: false, message: "Missing Instagram Account ID or Access Token." };
            const res = await fetch(`https://graph.facebook.com/v19.0/${accountId}?fields=id,username&access_token=${token}`);
            const body = await res.json() as any;
            if (res.ok && body?.username) return { success: true, message: `Connected as @${body.username}` };
            return { success: false, message: body?.error?.message ?? `HTTP ${res.status}` };
          }
          if (input.platform === "linkedin") {
            const token = s("linkedin_access_token");
            if (!token) return { success: false, message: "Missing LinkedIn Access Token." };
            const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
            const body = await res.json() as any;
            if (res.ok && (body?.name || body?.sub)) return { success: true, message: `Connected as ${body.name ?? body.sub}` };
            return { success: false, message: body?.message ?? `HTTP ${res.status}` };
          }
          return { success: false, message: "Unknown platform" };
        } catch (e: any) {
          return { success: false, message: e.message ?? "Connection test failed" };
        }
      }),
  }),

  // ─── Workflow Batches ────────────────────────────────
  workflow: router({
    list: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(({ input, ctx }) => db.listWorkflowBatches(input?.limit, ctx.licenseId || undefined)),
    get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getWorkflowBatch(input.id)),
    getByDate: adminProcedure.input(z.object({ batchDate: z.string() })).query(({ input }) => db.getWorkflowBatchByDate(input.batchDate)),
    create: adminProcedure.input(z.object({
      batchDate: z.string(), status: z.enum(["gathering", "generating", "pending_approval", "approved", "publishing", "completed", "failed"]).optional(),
      totalEvents: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createWorkflowBatch(input);
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["gathering", "generating", "pending_approval", "approved", "publishing", "completed", "failed"]).optional(),
      totalEvents: z.number().optional(), articlesGenerated: z.number().optional(),
      articlesApproved: z.number().optional(), articlesPublished: z.number().optional(), articlesRejected: z.number().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updateWorkflowBatch(id, data); }),
    triggerNow: adminProcedure.mutation(async () => {
      const { triggerWorkflowNow } = await import("./scheduler");
      return triggerWorkflowNow();
    }),
    getAllSchedulerStatus: adminProcedure.query(async () => {
      const { getAllTenantSchedulerStatus } = await import("./scheduler");
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql: sqlFn } = await import("drizzle-orm");
      const [licenses] = await dbConn.execute(sqlFn`SELECT id, subdomain FROM licenses WHERE status = 'active'`);
      const schedulerStatus = getAllTenantSchedulerStatus();
      return (licenses as any[]).map(l => {
        const s = schedulerStatus.find(s => s.licenseId === l.id);
        return { licenseId: l.id, subdomain: l.subdomain, taskCount: s?.taskCount || 0, isRunning: s?.isRunning || false };
      });
    }),
    generateFromTopic: tenantOrAdminProcedure
      .input(z.object({
        topic: z.string().min(10).max(500),
        categoryId: z.number().optional(),
        tone: z.string().optional(),
        wordCount: z.number().optional(),
        additionalInstructions: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
        const { generateArticleFromTopic } = await import("./workflow");
        const result = await generateArticleFromTopic({
          licenseId: ctx.licenseId,
          topic: input.topic,
          categoryId: input.categoryId,
          toneOverride: input.tone,
          wordCountOverride: input.wordCount,
          additionalInstructions: input.additionalInstructions,
        });
        return { articleId: result.id, headline: result.headline };
      }),
    // Per-tenant production loop
    getProductionLoopStatus: tenantOrAdminProcedure.query(async ({ ctx }) => {
      if (!ctx.licenseId) return { isRunning: false, lastRunAt: null, lastRunArticles: 0, totalToday: 0 };
      const { getTenantProductionLoopStatus } = await import("./tenantProductionLoop");
      return getTenantProductionLoopStatus(ctx.licenseId);
    }),
    runProductionLoop: tenantOrAdminProcedure.mutation(async ({ ctx }) => {
      if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
      const { runTenantProductionLoopTick } = await import("./tenantProductionLoop");
      return runTenantProductionLoopTick(ctx.licenseId);
    }),
    generateFromCandidate: tenantOrAdminProcedure
      .input(z.object({ candidateId: z.number(), categoryId: z.number().optional(), tags: z.array(z.string()).optional(), imageUrl: z.string().optional(), templateId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { sql: sqlFn } = await import("drizzle-orm");
        const [candidates] = ctx.licenseId ? await dbConn.execute(sqlFn`SELECT id, title, summary, source_url FROM selector_candidates WHERE id = ${input.candidateId} AND license_id = ${ctx.licenseId} LIMIT 1`) : await dbConn.execute(sqlFn`SELECT id, title, summary, source_url FROM selector_candidates WHERE id = ${input.candidateId} LIMIT 1`);
        const candidate = (candidates as any[])[0];
        if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
        const { generateSatiricalArticle } = await import("./workflow");
        const event = { title: candidate.title, summary: candidate.summary || "", sourceUrl: candidate.source_url || "" };
        let writingStyle = (await db.getSetting("writing_style_prompt"))?.value || "Write in a professional editorial style.";
        let targetWords = parseInt((await db.getSetting("target_article_length"))?.value || "800");
        
        // Apply template settings if templateId provided
        let templateSettings: any = undefined;
        if (input.templateId) {
          const { applyTemplateSettings } = await import("./templateSettings");
          templateSettings = await applyTemplateSettings(input.templateId);
          if (templateSettings.targetWordCount) targetWords = templateSettings.targetWordCount;
          if (templateSettings.userMessage) writingStyle = templateSettings.userMessage;
          if (templateSettings.categoryId && !input.categoryId) input.categoryId = templateSettings.categoryId;
        }
        
        const article = await generateSatiricalArticle(event as any, writingStyle, targetWords, templateSettings);
        const slugify = (await import("slugify")).default;
        const slug = slugify(article.headline || "untitled", { lower: true, strict: true }).slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
        let body = article.body || "";
        if (!body.trim().startsWith("<")) body = body.split("\n\n").filter((p: string) => p.trim()).map((p: string) => "<p>" + p.trim() + "</p>").join("");
        const articleId = await db.createArticle({ headline: article.headline || "Untitled", subheadline: article.subheadline || "", body, slug, status: "pending", categoryId: input.categoryId, featuredImage: input.imageUrl || "", sourceEvent: candidate.title, sourceUrl: candidate.source_url, licenseId: 7, templateId: input.templateId || undefined } as any);
        await dbConn.execute(sqlFn`UPDATE selector_candidates SET status = 'selected', article_id = ${articleId} WHERE id = ${input.candidateId}`);
        return { success: true, articleId, slug };
      }),
  }),

  // ─── FeedHive Trigger URLs (Archived Feb 21, 2026) ──────────────────────
  // Replaced with direct X/Twitter posting queue system
  // See /archive/feedhive/ for original code
  // feedhive: router({
  //   getTriggerUrls: adminProcedure.query(() => db.getAllFeedHiveTriggerUrls()),
  // }),

  // ─── X/Twitter Direct Posting Queue ──────────────────────
  xQueue: router({
    status: adminProcedure.query(() => {
      return xQueue.getQueueStatus();
    }),
    start: adminProcedure.input(z.object({
      intervalMinutes: z.number().min(1).max(1440).optional(),
    }).optional()).mutation(async ({ input }) => {
      await xQueue.startQueue(input?.intervalMinutes);
      return xQueue.getQueueStatus();
    }),
    stop: adminProcedure.mutation(async () => {
      xQueue.stopQueue();
      return xQueue.getQueueStatus();
    }),
    updateInterval: adminProcedure.input(z.object({
      minutes: z.number().min(1).max(1440),
    })).mutation(async ({ input }) => {
      await xQueue.updateInterval(input.minutes);
      return xQueue.getQueueStatus();
    }),
    postNext: adminProcedure.mutation(async () => {
      return xQueue.postNext();
    }),
    queueArticles: adminProcedure.input(z.object({
      articleIds: z.array(z.number()),
    })).mutation(async ({ input }) => {
      const queued = await xQueue.queueArticlesForX(input.articleIds);
      return { queued };
    }),
    verifyCredentials: adminProcedure.query(async () => {
      return verifyXCredentials();
    }),
    // Queue all draft twitter posts for published articles
    queueAllDrafts: adminProcedure.mutation(async () => {
      const posts = await db.listSocialPosts({ status: "draft" });
      const twitterDrafts = posts.filter((p: any) => p.platform === "twitter");
      let queued = 0;
      for (const post of twitterDrafts) {
        await db.updateSocialPostStatus(post.id, "scheduled");
        queued++;
      }
      return { queued };
    }),
    // Move post back to draft (dequeue)
    dequeue: adminProcedure.input(z.object({
      postId: z.number(),
    })).mutation(async ({ input }) => {
      await db.updateSocialPostStatus(input.postId, "draft");
      return { success: true };
    }),
    // Automation pipeline status: combines all subsystems into one snapshot
    automationStatus: adminProcedure.query(async () => {
      const { getSchedulerStatus } = await import("./scheduler");
      const schedulerStatus = getSchedulerStatus();
      const queueStatus = xQueue.getQueueStatus();

      // X Reply engine settings
      const replyEnabled = await db.getSetting("x_reply_enabled");
      const replyIntervalHours = await db.getSetting("x_reply_auto_interval_hours");
      const replySource = await db.getSetting("x_reply_source");
      const replyDailyLimit = await db.getSetting("x_reply_daily_limit");

      // Auto-approve settings
      const autoApproveEnabled = await db.getSetting("auto_approve_enabled");
      const autoApproveHours = await db.getSetting("auto_approve_after_hours");
      const autoPublishEnabled = await db.getSetting("auto_publish_approved");

      // Queue counts
      const pendingReplies = await db.listXReplies({ status: "pending", limit: 1000 });
      const scheduledPosts = await db.listSocialPosts({ status: "scheduled" });
      const pendingArticles = await db.listArticles({ status: "pending", limit: 1000 });

      return {
        workflow: {
          isScheduled: schedulerStatus.isScheduled,
          isRunning: schedulerStatus.isRunning,
          nextRun: schedulerStatus.nextRun,
          lastRun: schedulerStatus.lastRun,
        },
        autoApprove: {
          enabled: autoApproveEnabled?.value === "true",
          afterHours: parseFloat(autoApproveHours?.value || "4"),
          autoPublish: autoPublishEnabled?.value === "true",
          pendingArticleCount: pendingArticles.total,
        },
        xPostQueue: {
          isRunning: queueStatus.isRunning,
          intervalMinutes: queueStatus.intervalMinutes,
          postsToday: queueStatus.postsToday,
          dailyLimit: queueStatus.dailyLimit,
          scheduledCount: scheduledPosts.filter((p: any) => p.platform === "twitter").length,
          lastPostTime: queueStatus.lastPostTime,
        },
        xReplyEngine: {
          enabled: replyEnabled?.value === "true",
          intervalHours: parseFloat(replyIntervalHours?.value || "4"),
          source: replySource?.value || "mentions",
          dailyLimit: parseInt(replyDailyLimit?.value || "22"),
          pendingRepliesCount: pendingReplies.length,
        },
      };
    }),
    // Retry all failed X/Twitter posts by resetting them back to 'scheduled'
    retryFailed: adminProcedure.mutation(async () => {
      const failedPosts = await db.listSocialPosts({ status: "failed" });
      const twitterFailed = failedPosts.filter((p: any) => p.platform === "twitter");
      let retried = 0;
      for (const post of twitterFailed) {
        await db.updateSocialPostStatus(post.id, "scheduled");
        retried++;
      }
      console.log(`[X Queue] Retried ${retried} failed posts`);
      return { retried };
    }),
  }),

  // ─── Workflow Settings ──────────────────────────────
  // ─── Public Branding (accessible without auth for frontend rendering) ──
  branding: router({
    get: publicProcedure
      .input(z.object({ hostname: z.string().optional() }).optional())
      .query(async ({ input }) => {
      const settings = await db.getSettingsByCategory("branding");
      const map: Record<string, string> = {};
      for (const s of settings) { map[s.key] = s.value; }
      // Also include site_url (stored in 'social' category) so the client can
      // derive www vs non-www canonical preference without a separate query.
      const siteUrlSetting = await db.getSetting("site_url");
      if (siteUrlSetting?.value) map["site_url"] = siteUrlSetting.value;
      // Include additional settings the frontend needs for theming & navigation
      for (const key of ["printify_enabled", "shop_external_url", "brand_heading_font", "brand_body_font", "brand_palette"]) {
        const s = await db.getSetting(key);
        if (s?.value) map[key] = s.value;
      }
      // If hostname provided, resolve license and merge tenant-specific settings
      const hostname = input?.hostname;
      if (hostname && hostname !== "app.getjaime.io" && hostname !== "localhost") {
        try {
          const license = await resolveLicense(hostname);
          if (license) {
            const dbConn = await import("./db").then(m => m.getDb()).then(d => d);
            const { licenseSettings: lsTable } = await import("../drizzle/schema");
            const { eq: eqOp } = await import("drizzle-orm");
            const licenseRows = await dbConn.select().from(lsTable).where(eqOp(lsTable.licenseId, license.id));
            const MERGE_KEYS = ["brand_heading_font", "brand_body_font", "brand_palette", "printify_enabled",
              "printify_api_token", "printify_shop_id", "shop_external_url", "brand_tagline",
              "brand_name", "brand_site_name", "brand_description", "brand_primary_color", "brand_secondary_color",
              "brand_logo_url", "brand_logo_light_url", "brand_logo_dark_url", "brand_favicon_url",
              "brand_contact_email", "brand_business_name", "brand_phone", "brand_address",
              "brand_template", "brand_disclaimer", "categories", "blotato_platforms", "brand_website_url",
              "social_x_url", "social_instagram_url", "social_linkedin_url", "social_facebook_url",
              "social_tiktok_url", "social_pinterest_url"];
            for (const row of licenseRows) {
              if (MERGE_KEYS.includes(row.key)) map[row.key] = row.value;
            }
            // Map wizard field names to branding field names
            if (map["brand_logo_light_url"]) {
              map["brand_logo_url"] = map["brand_logo_light_url"];
            }
            if (map["brand_name"] && !map["brand_site_name"]) {
              map["brand_site_name"] = map["brand_name"];
            }
            if (map["brand_primary_color"]) {
              map["brand_color_primary"] = map["brand_primary_color"];
            }
            if (map["brand_secondary_color"]) {
              map["brand_color_secondary"] = map["brand_secondary_color"];
            }
          }
        } catch { /* ignore — fall back to workflow_settings */ }
      }
      return map;
    }),
    regeneratePalette: tenantOrAdminProcedure
      .input(z.object({ licenseId: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { licenseSettings: lsTable } = await import("../drizzle/schema");
        const { eq: eqOp, and: andOp } = await import("drizzle-orm");
        
        // Read current colors
        const rows = await dbConn.select().from(lsTable).where(eqOp(lsTable.licenseId, input.licenseId));
        const settings: Record<string, string> = {};
        for (const r of rows) settings[r.key] = r.value;
        
        const primary = settings.brand_color_primary || settings.brand_primary_color || "#2DD4BF";
        const secondary = settings.brand_color_secondary || settings.brand_secondary_color || "#0F2D5E";
        
        // Generate palette
        const { generatePalette, generateCssVariables } = await import("./utils/colorSystem");
        const palette = generatePalette(primary, secondary);
        const paletteJson = JSON.stringify(palette);
        
        // Also add font variables to CSS
        const headingFont = settings.brand_heading_font || "Playfair Display";
        const bodyFont = settings.brand_body_font || "Inter";
        
        // Upsert brand_palette
        const [existing] = await dbConn.select().from(lsTable)
          .where(andOp(eqOp(lsTable.licenseId, input.licenseId), eqOp(lsTable.key, "brand_palette")))
          .limit(1);
        if (existing) {
          await dbConn.update(lsTable).set({ value: paletteJson }).where(eqOp(lsTable.id, existing.id));
        } else {
          await dbConn.insert(lsTable).values({ licenseId: input.licenseId, key: "brand_palette", value: paletteJson, type: "json" });
        }
        
        // Also sync brand_primary_color and brand_secondary_color keys
        for (const [key, val] of [["brand_primary_color", primary], ["brand_secondary_color", secondary]]) {
          const [ex] = await dbConn.select().from(lsTable)
            .where(andOp(eqOp(lsTable.licenseId, input.licenseId), eqOp(lsTable.key, key)))
            .limit(1);
          if (ex) { await dbConn.update(lsTable).set({ value: val }).where(eqOp(lsTable.id, ex.id)); }
          else { await dbConn.insert(lsTable).values({ licenseId: input.licenseId, key, value: val, type: "string" }); }
        }
        
        return { success: true, palette };
      }),
    clearBrandingCache: tenantOrAdminProcedure.mutation(({ ctx }) => {
      console.log("[Branding] Cache cleared for license", ctx.licenseId);
      return { cleared: true, licenseId: ctx.licenseId };
    }),
    /** Live X follower count — cached for 6 hours to avoid burning API quota */
    xFollowerCount: publicProcedure.query(async () => {
      const CACHE_KEY = "x_follower_count_cache";
      const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
      try {
        const cached = await db.getSetting(CACHE_KEY);
        if (cached?.value) {
          const parsed = JSON.parse(cached.value) as { count: number; fetchedAt: number };
          if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
            return { count: parsed.count, cached: true };
          }
        }
        const { TwitterApi } = await import("twitter-api-v2");
        const client = new TwitterApi({
          appKey: process.env.X_API_KEY || "",
          appSecret: process.env.X_API_SECRET || "",
          accessToken: process.env.X_ACCESS_TOKEN || "",
          accessSecret: process.env.X_ACCESS_TOKEN_SECRET || "",
        });
        const me = await client.v2.me({ "user.fields": ["public_metrics"] });
        const count = me.data.public_metrics?.followers_count ?? 0;
        await db.upsertSetting({ key: CACHE_KEY, value: JSON.stringify({ count, fetchedAt: Date.now() }), category: "cache", type: "json" });
        return { count, cached: false };
      } catch {
        return { count: null, cached: false };
      }
    }),
  }),

  homepage: router({
    get: publicProcedure.query(async () => {
      const settings = await db.getSettingsByCategory("homepage");
      const map: Record<string, string> = {};
      for (const s of settings) { map[s.key] = s.value; }
      return map;
    }),
  }),

  settings: router({
    // Public sponsor bar config — read by frontend without auth
    sponsorBar: publicProcedure.query(async () => {
      const [enabled, url, label, cta, bgColor, borderColor, labelColor, linkColor, imageUrl, activeFrom, activeUntil] = await Promise.all([
        db.getSetting('sponsor_bar_enabled'),
        db.getSetting('sponsor_bar_url'),
        db.getSetting('sponsor_bar_label'),
        db.getSetting('sponsor_bar_cta'),
        db.getSetting('sponsor_bar_bg_color'),
        db.getSetting('sponsor_bar_border_color'),
        db.getSetting('sponsor_bar_label_color'),
        db.getSetting('sponsor_bar_link_color'),
        db.getSetting('sponsor_bar_image_url'),
        db.getSetting('sponsor_bar_active_from'),
        db.getSetting('sponsor_bar_active_until'),
      ]);
      const isScheduleActive = db.sponsorIsActive(activeFrom?.value || '', activeUntil?.value || '');
      return {
        enabled: enabled?.value === 'true' && isScheduleActive,
        url: url?.value || '',
        label: label?.value || "Today's Sponsor",
        cta: cta?.value || 'Learn More',
        bgColor: bgColor?.value || '#F0F0F0',
        borderColor: borderColor?.value || '#D0D0D0',
        labelColor: labelColor?.value || '#525252',
        linkColor: linkColor?.value || '#9B1830',
        imageUrl: imageUrl?.value || '',
        activeFrom: activeFrom?.value || '',
        activeUntil: activeUntil?.value || '',
        scheduleActive: isScheduleActive,
      };
    }),
    articleSponsorBanner: publicProcedure.query(async () => {
      const [
        enabled, url, label, cta, description, imageUrl, bgColor, borderColor, headerBgColor, ctaBgColor, ctaTextColor,
        activeFrom, activeUntil,
        abEnabled, bLabel, bCta, bDescription, bImageUrl, bBgColor, bBorderColor, bHeaderBgColor, bCtaBgColor, bCtaTextColor,
      ] = await Promise.all([
        db.getSetting('article_sponsor_enabled'),
        db.getSetting('article_sponsor_url'),
        db.getSetting('article_sponsor_label'),
        db.getSetting('article_sponsor_cta'),
        db.getSetting('article_sponsor_description'),
        db.getSetting('article_sponsor_image_url'),
        db.getSetting('article_sponsor_bg_color'),
        db.getSetting('article_sponsor_border_color'),
        db.getSetting('article_sponsor_header_bg_color'),
        db.getSetting('article_sponsor_cta_bg_color'),
        db.getSetting('article_sponsor_cta_text_color'),
        db.getSetting('article_sponsor_active_from'),
        db.getSetting('article_sponsor_active_until'),
        db.getSetting('article_sponsor_ab_test_enabled'),
        db.getSetting('article_sponsor_b_label'),
        db.getSetting('article_sponsor_b_cta'),
        db.getSetting('article_sponsor_b_description'),
        db.getSetting('article_sponsor_b_image_url'),
        db.getSetting('article_sponsor_b_bg_color'),
        db.getSetting('article_sponsor_b_border_color'),
        db.getSetting('article_sponsor_b_header_bg_color'),
        db.getSetting('article_sponsor_b_cta_bg_color'),
        db.getSetting('article_sponsor_b_cta_text_color'),
      ]);
      const isScheduleActive = db.sponsorIsActive(activeFrom?.value || '', activeUntil?.value || '');
      return {
        enabled: enabled?.value === 'true' && isScheduleActive,
        url: url?.value || '',
        label: label?.value || 'Sponsored',
        cta: cta?.value || 'Learn More',
        description: description?.value || '',
        imageUrl: imageUrl?.value || '',
        bgColor: bgColor?.value || '#FFFFFF',
        borderColor: borderColor?.value || '#D0D0D0',
        headerBgColor: headerBgColor?.value || '#F0F0F0',
        ctaBgColor: ctaBgColor?.value || '#C41E3A',
        ctaTextColor: ctaTextColor?.value || '#FFFFFF',
        activeFrom: activeFrom?.value || '',
        activeUntil: activeUntil?.value || '',
        scheduleActive: isScheduleActive,
        abTestEnabled: abEnabled?.value === 'true',
        variantB: {
          label: bLabel?.value || 'Sponsored',
          cta: bCta?.value || 'Learn More',
          description: bDescription?.value || '',
          imageUrl: bImageUrl?.value || '',
          bgColor: bBgColor?.value || '#FFFFFF',
          borderColor: bBorderColor?.value || '#D0D0D0',
          headerBgColor: bHeaderBgColor?.value || '#F0F0F0',
          ctaBgColor: bCtaBgColor?.value || '#C41E3A',
          ctaTextColor: bCtaTextColor?.value || '#FFFFFF',
        },
      };
    }),
    // Sponsor attribution report
    sponsorAttribution: adminProcedure.input(z.object({
      days: z.number().optional(),
      limit: z.number().optional(),
    })).query(async ({ input }) => {
      const days = input.days ?? 30;
      const limit = input.limit ?? 50;
      const [rows, totals, variantCounts] = await Promise.all([
        db.getSponsorAttributionReport(days, limit, 'sponsor'),
        db.getSponsorAttributionTotals(days, 'sponsor'),
        db.countSponsorClicksByVariant(days),
      ]);
      return { rows, totals, variantCounts, days };
    }),
    list: adminProcedure.query(() => db.getAllSettings()),
    get: adminProcedure.input(z.object({ key: z.string() })).query(({ input }) => db.getSetting(input.key)),
    getByCategory: adminProcedure.input(z.object({ category: z.string() })).query(({ input }) => db.getSettingsByCategory(input.category)),
    update: adminProcedure.input(z.object({
      key: z.string(), value: z.string(),
      label: z.string().optional(), description: z.string().optional(),
      category: z.string().optional(), type: z.enum(["number", "string", "boolean", "json", "text"]).optional(),
    })).mutation(({ input }) => db.upsertSetting(input)),
    bulkUpdate: adminProcedure.input(z.object({
      settings: z.array(z.object({
        key: z.string(), value: z.string(),
        label: z.string().optional(), description: z.string().optional(),
        category: z.string().optional(), type: z.enum(["number", "string", "boolean", "json", "text"]).optional(),
      })),
    })).mutation(({ input }) => db.bulkUpsertSettings(input.settings)),
    delete: adminProcedure.input(z.object({ key: z.string() })).mutation(({ input }) => db.deleteSetting(input.key)),
    
    // Batch watermark existing images
    batchWatermark: adminProcedure.input(z.object({ 
      limit: z.number().optional(), 
      dryRun: z.boolean().optional(),
      forceReprocess: z.boolean().optional() // Re-watermark even if already watermarked
    })).mutation(async ({ input }) => {
      try {
        console.log("[tRPC] Starting batch watermark mutation with input:", input);
        const { batchWatermarkArticles } = await import("./batchWatermark");
        const result = await batchWatermarkArticles(input);
        console.log("[tRPC] Batch watermark completed:", result);
        return result;
      } catch (error) {
        console.error("[tRPC] Batch watermark error:", error);
        throw error;
      }
    }),
    
    // Get batch watermark status
    batchWatermarkStatus: adminProcedure.query(async () => {
      const { getBatchWatermarkStatus } = await import("./batchWatermark");
      return getBatchWatermarkStatus();
    }),
  }),

  // ─── AI Generation ──────────────────────────────────
  ai: router({
    generateArticle: adminProcedure.input(z.object({
      topic: z.string(),
      category: z.string().optional(), 
      styleId: z.string().optional(), 
      customStyle: z.string().optional(),
      targetLength: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { WRITING_STYLES, getRandomStyleFromCategory } = await import("../shared/writingStyles");
      let styleId = input.styleId || "onion";
      let style: string;
      
      // Check for custom writing style prompt in settings first (primary override)
      const customPromptSetting = await db.getSetting("writing_style_prompt");
      if (customPromptSetting?.value) {
        style = customPromptSetting.value;
      } else {
        // Handle randomization: if styleId is "random-{categoryId}", pick a random style from that category
        if (styleId.startsWith("random-")) {
          const categoryId = styleId.replace("random-", "");
          const randomStyle = getRandomStyleFromCategory(categoryId);
          if (randomStyle) {
            style = randomStyle.prompt;
          } else {
            // Fallback to onion if category not found
            const defaultStyle = WRITING_STYLES.find(s => s.id === "onion");
            style = defaultStyle?.prompt || "Write in a professional editorial style.";
          }
        } else {
          // Find the specific style by ID
          const selectedStyle = WRITING_STYLES.find(s => s.id === styleId);
          if (selectedStyle) {
            style = selectedStyle.prompt;
          } else if (input.customStyle) {
            // Use custom style if provided
            style = input.customStyle;
          } else {
            // Fallback to onion
            const defaultStyle = WRITING_STYLES.find(s => s.id === "onion");
            style = defaultStyle?.prompt || "Write in a professional editorial style.";
          }
        }
      }
      // Fetch target article length from settings if not provided
      let targetWords = input.targetLength;
      if (!targetWords) {
        try {
          const settings = await db.getAllSettings();
          const lengthSetting = settings.find(s => s.key === "target_article_length");
          targetWords = lengthSetting ? parseInt(lengthSetting.value) : 200;
        } catch { targetWords = 200; }
      }
      const lengthInstruction = `Target approximately ${targetWords} words for the article body.`;
      
      // Check for additional instructions to append
      const additionalInstructionsSetting = await db.getSetting("ai_custom_prompt");
      if (additionalInstructionsSetting?.value) {
        style = `${style}\n\nAdditional instructions: ${additionalInstructionsSetting.value}`;
      }
      // Use custom system prompt override if set; otherwise fall back to the built-in prefix
      const systemPromptOverrideSetting = await db.getSetting("article_llm_system_prompt");
      const builtInPrefix = `You are a brilliant news writer. ${style}\n${lengthInstruction}\n\nReturn a JSON object with: headline, subheadline, body (full HTML article with <p> tags), slug (url-friendly).`;
      const finalSystemPrompt = systemPromptOverrideSetting?.value
        ? systemPromptOverrideSetting.value
            .replace("{{STYLE}}", style)
            .replace("{{LENGTH_INSTRUCTION}}", lengthInstruction)
            .replace("{STYLE}", style)
            .replace("{LENGTH_INSTRUCTION}", lengthInstruction)
            .replace("{targetWords}", String(targetWords))
            .replace("{{targetWords}}", String(targetWords))
        : builtInPrefix;

      // Check for a user message override stored in the DB (white-label support)
      const userMsgSetting = await db.getSetting("article_llm_user_prompt");
      const defaultUserMsg = `Write a new article about: ${input.topic}`;
      const userMessage = userMsgSetting?.value
        ? userMsgSetting.value
            .replace("{{TOPIC}}", input.topic)
            .replace("{TOPIC}", input.topic)
            .replace("{{TARGET_WORDS}}", String(targetWords))
            .replace("{TARGET_WORDS}", String(targetWords))
            .replace("{{targetWords}}", String(targetWords))
            .replace("{targetWords}", String(targetWords))
        : defaultUserMsg;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article",
            strict: true,
            schema: {
              type: "object",
              properties: {
                headline: { type: "string" },
                subheadline: { type: "string" },
                body: { type: "string" },
                slug: { type: "string" },
              },
              required: ["headline", "subheadline", "body", "slug"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      return JSON.parse(content);
    }),

    // Dry-run article preview — uses current DB prompt overrides, never saves to DB
    previewArticle: adminProcedure.input(z.object({
      headline: z.string(),
      summary: z.string().optional(),
      source: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { WRITING_STYLES } = await import("../shared/writingStyles");

      // Resolve writing style
      const customPromptSetting = await db.getSetting("writing_style_prompt");
      let style: string;
      if (customPromptSetting?.value) {
        style = customPromptSetting.value;
      } else {
        const writingStyleSetting = await db.getSetting("ai_writing_style");
        const styleId = writingStyleSetting?.value || "onion";
        const selectedStyle = WRITING_STYLES.find(s => s.id === styleId);
        style = selectedStyle?.prompt || "Write in a professional editorial style.";
      }

      // Resolve target length
      const lengthSetting = await db.getSetting("target_article_length");
      const targetWords = lengthSetting ? parseInt(lengthSetting.value) : 200;
      const lengthInstruction = `Target approximately ${targetWords} words for the article body.`;

      // Append additional instructions
      const additionalSetting = await db.getSetting("ai_custom_prompt");
      if (additionalSetting?.value) {
        style = `${style}\n\nAdditional instructions: ${additionalSetting.value}`;
      }

      // Resolve system prompt
      const systemOverride = await db.getSetting("article_llm_system_prompt");
      const builtInPrefix = `You are a brilliant news writer. ${style}\n${lengthInstruction}\n\nReturn a JSON object with: headline, subheadline, body (full HTML article with <p> tags), slug (url-friendly).`;
      const finalSystemPrompt = systemOverride?.value
        ? systemOverride.value
            .replace("{{STYLE}}", style).replace("{STYLE}", style)
            .replace("{{LENGTH_INSTRUCTION}}", lengthInstruction).replace("{LENGTH_INSTRUCTION}", lengthInstruction)
            .replace("{{targetWords}}", String(targetWords)).replace("{targetWords}", String(targetWords))
        : builtInPrefix;

      // Resolve user message
      const userMsgOverride = await db.getSetting("article_llm_user_prompt");
      const defaultUserMsg = `Write a news article based on this real news event:\n\nHEADLINE: ${input.headline}\nSUMMARY: ${input.summary || input.headline}\nSOURCE: ${input.source || "Unknown"}`;
      const userMessage = userMsgOverride?.value
        ? userMsgOverride.value
            .replace("{{HEADLINE}}", input.headline).replace("{HEADLINE}", input.headline)
            .replace("{{SUMMARY}}", input.summary || input.headline).replace("{SUMMARY}", input.summary || input.headline)
            .replace("{{SOURCE}}", input.source || "Unknown").replace("{SOURCE}", input.source || "Unknown")
            .replace("{{TARGET_WORDS}}", String(targetWords)).replace("{TARGET_WORDS}", String(targetWords))
            .replace("{{targetWords}}", String(targetWords)).replace("{targetWords}", String(targetWords))
        : defaultUserMsg;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article_preview",
            strict: true,
            schema: {
              type: "object",
              properties: {
                headline: { type: "string" },
                subheadline: { type: "string" },
                body: { type: "string" },
                slug: { type: "string" },
              },
              required: ["headline", "subheadline", "body", "slug"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      const parsed = JSON.parse(content);
      // Return the result AND the resolved prompts so the UI can show what was sent
      return {
        ...parsed,
        _debug: {
          systemPrompt: finalSystemPrompt,
          userMessage,
          targetWords,
          styleUsed: style.slice(0, 120) + (style.length > 120 ? "..." : ""),
        },
      };
    }),

    generateImage: adminProcedure.input(z.object({ prompt: z.string() })).mutation(async ({ input }) => {
      const result = await generateImage({ prompt: input.prompt });
      return { url: result.url };
    }),

    generateVideo: adminProcedure.input(z.object({ prompt: z.string(), duration: z.number().optional(), aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional() })).mutation(async ({ input }) => {
      const result = await generateVideo({ 
        prompt: input.prompt,
        duration: input.duration || 5,
        aspectRatio: input.aspectRatio || "16:9",
      });
      return { url: result.url };
    }),

    // ─── Image Backfill Job (in-memory state for polling) ───────────────────
    backfillMissingImages: tenantOrAdminProcedure.mutation(async () => {
      if (imageBackfillState.isRunning) {
        return { started: false, message: "Backfill already in progress", ...imageBackfillState };
      }
      // Count articles missing images (all statuses, not just published)
      const { articles: allArticles } = await db.listArticles({ limit: 5000 });
      const missingImages = allArticles.filter(a => !a.featuredImage);
      if (missingImages.length === 0) {
        return { started: false, message: "No articles are missing images", total: 0, processed: 0, succeeded: 0, failed: 0, isRunning: false, log: [] };
      }
      // Reset state and kick off background job
      imageBackfillState = { isRunning: true, total: missingImages.length, processed: 0, succeeded: 0, failed: 0, log: [], startedAt: new Date().toISOString(), finishedAt: null };
      runImageBackfillJob(missingImages).catch(e => console.error("[Backfill] Job error:", e));
      return { started: true, message: `Started backfill for ${missingImages.length} articles`, ...imageBackfillState };
    }),

    backfillImagesStatus: tenantOrAdminProcedure.query(() => {
      return imageBackfillState;
    }),

    backfillImagesCancel: tenantOrAdminProcedure.mutation(() => {
      if (imageBackfillState.isRunning) {
        imageBackfillCancelled = true;
        return { cancelled: true };
      }
      return { cancelled: false };
    }),

    // Return the full composed system prompt that will be sent to the LLM,
    // plus the raw override value (if any) so the UI can show both.
    getArticlePromptPreview: adminProcedure.input(z.object({
      styleId: z.string().optional(),
      targetLength: z.number().optional(),
      // Live UI values — when provided, override the DB read so the preview
      // reflects unsaved edits without requiring the user to save first.
      writingStylePrompt: z.string().optional(),
      additionalInstructions: z.string().optional(),
    })).query(async ({ input }) => {
      const { WRITING_STYLES, getRandomStyleFromCategory } = await import("../shared/writingStyles");
      const styleId = input.styleId || "onion";
      // Prefer live UI value; fall back to DB
      const writingStylePromptValue = input.writingStylePrompt !== undefined
        ? input.writingStylePrompt
        : ((await db.getSetting("writing_style_prompt"))?.value ?? "");
      let style: string;
      if (writingStylePromptValue) {
        style = writingStylePromptValue;
      } else {
        const selectedStyle = WRITING_STYLES.find(s => s.id === styleId);
        style = selectedStyle?.prompt || "Write in a professional news style.";
      }
      const additionalInstructionsValue = input.additionalInstructions !== undefined
        ? input.additionalInstructions
        : ((await db.getSetting("ai_custom_prompt"))?.value ?? "");
      if (additionalInstructionsValue) {
        style = `${style}\n\nAdditional instructions: ${additionalInstructionsValue}`;
      }
      let targetWords = input.targetLength;
      if (!targetWords) {
        try {
          const settings = await db.getAllSettings();
          const lengthSetting = settings.find(s => s.key === "target_article_length");
          targetWords = lengthSetting ? parseInt(lengthSetting.value) : 200;
        } catch { targetWords = 200; }
      }
      const lengthInstruction = `Target approximately ${targetWords} words for the article body.`;
      const builtInPrompt = `You are a brilliant news writer. ${style}\n${lengthInstruction}\n\nReturn a JSON object with: headline, subheadline, body (full HTML article with <p> tags), slug (url-friendly)`;
      const overrideSetting = await db.getSetting("article_llm_system_prompt");
      const overrideValue = overrideSetting?.value || null;
      const resolvedPrompt = overrideValue
        ? overrideValue
            .replace("{{STYLE}}", style)
            .replace("{{LENGTH_INSTRUCTION}}", lengthInstruction)
            .replace("{STYLE}", style)
            .replace("{LENGTH_INSTRUCTION}", lengthInstruction)
            .replace("{targetWords}", String(targetWords))
            .replace("{{targetWords}}", String(targetWords))
        : builtInPrompt;
      return {
        builtInPrompt,
        overrideValue,
        resolvedPrompt,
        isOverridden: !!overrideValue,
      };
    }),

    saveArticleSystemPrompt: adminProcedure.input(z.object({
      prompt: z.string(), // empty string = clear the override
    })).mutation(async ({ input }) => {
      if (input.prompt.trim() === "") {
        await db.deleteSetting("article_llm_system_prompt");
        return { saved: true, cleared: true };
      }
      await db.upsertSetting({
        key: "article_llm_system_prompt",
        value: input.prompt.trim(),
        label: "Article LLM System Prompt Override",
        description: "Full system prompt sent to the LLM for article generation. Use {{STYLE}} and {{LENGTH_INSTRUCTION}} as placeholders. Leave empty to use the built-in default.",
        category: "generation",
        type: "text",
      });
      return { saved: true, cleared: false };
    }),

    // Generic prompt setting getter/setter for white-label configurable prompts
    getPromptSetting: adminProcedure.input(z.object({
      key: z.enum(["article_llm_user_prompt", "event_selector_prompt"]),
    })).query(async ({ input }) => {
      const setting = await db.getSetting(input.key);
      return { value: setting?.value ?? null };
    }),

    savePromptSetting: adminProcedure.input(z.object({
      key: z.enum(["article_llm_user_prompt", "event_selector_prompt"]),
      value: z.string(),
    })).mutation(async ({ input }) => {
      if (input.value.trim() === "") {
        await db.deleteSetting(input.key);
        return { saved: true, cleared: true, value: null };
      }
      const labels: Record<string, { label: string; description: string }> = {
        article_llm_user_prompt: {
          label: "Article LLM User Message Override",
          description: "The user message sent per article. Use {{HEADLINE}}, {{SUMMARY}}, {{SOURCE}}, {{TARGET_WORDS}} as placeholders. Leave empty to use the built-in default.",
        },
        event_selector_prompt: {
          label: "Event Selector Prompt Override",
          description: "Prompt used to select which RSS headlines to cover. Use {{COUNT}}, {{HEADLINES}}, {{CATEGORY_GUIDANCE}} as placeholders. Leave empty to use the built-in default.",
        },
      };
      const meta = labels[input.key];
      await db.upsertSetting({
        key: input.key,
        value: input.value.trim(),
        label: meta.label,
        description: meta.description,
        category: "generation",
        type: "text",
      });
      return { saved: true, cleared: false, value: input.value.trim() };
    }),

    generateSocialPosts: adminProcedure.input(z.object({
      headline: z.string(), subheadline: z.string().optional(), articleUrl: z.string().optional(), slug: z.string().optional(),
    })).mutation(async ({ input }) => {
      const articleLink = input.articleUrl || (input.slug ? `/article/${input.slug}` : "");
      const linkNote = articleLink ? `\n\nIMPORTANT: Each post MUST end with the article link: ${articleLink}\nThe link counts toward the character limit.` : "";
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You generate social media posts for news articles. Return JSON with keys: twitter, facebook, linkedin, instagram, threads. STRICT RULE: Every post on EVERY platform MUST be 260 characters or fewer (including the article link and hashtags). Keep posts punchy, witty, and attention-grabbing. Each post MUST include the article link at the end.${linkNote}` },
          { role: "user", content: `Generate social media posts for this article:\nHeadline: ${input.headline}\nSubheadline: ${input.subheadline || ""}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_posts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                twitter: { type: "string" },
                facebook: { type: "string" },
                linkedin: { type: "string" },
                instagram: { type: "string" },
                threads: { type: "string" },
              },
              required: ["twitter", "facebook", "linkedin", "instagram", "threads"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content as string | undefined;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      return JSON.parse(content);
    }),
  }),

  // ─── Licenses ────────────────────────────────────────
  licenses: router({
    list: adminProcedure.query(() => db.getAllLicenses()),
    
    generateKey: adminProcedure
      .input(z.object({
        clientName: z.string(),
        email: z.string().email(),
        domain: z.string(),
        tier: z.enum(["starter", "professional", "enterprise"]),
        validityMonths: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateLicenseKey } = await import("./licensing");
        const license = generateLicenseKey(
          input.clientName,
          input.email,
          input.domain,
          input.tier,
          input.validityMonths
        );
        
        // Save to database
        const id = await db.createLicense({
          licenseKey: license.key,
          clientName: input.clientName,
          email: input.email,
          domain: input.domain,
          tier: input.tier,
          issuedAt: license.issuedAt,
          expiresAt: license.expiresAt,
        });
        
        return { id, key: license.key, issuedAt: license.issuedAt, expiresAt: license.expiresAt };
      }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getLicenseById(input.id)),
    
    getByKey: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(({ input }) => db.getLicenseByKey(input.key)),
    
    create: adminProcedure
      .input(z.object({
        licenseKey: z.string(),
        clientName: z.string(),
        email: z.string().email(),
        domain: z.string(),
        tier: z.enum(["starter", "professional", "enterprise"]),
        status: z.enum(["active", "expired", "suspended", "cancelled"]).default("active"),
        issuedAt: z.date().optional(),
        expiresAt: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLicense(input);
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "expired", "suspended", "cancelled"]).optional(),
        expiresAt: z.date().optional(),
        lastValidated: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateLicense(id, data);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteLicense(input.id)),
  }),

  // ─── Client Deployments ──────────────────────────────
  deployments: router({
    list: adminProcedure.query(() => db.getAllDeployments()),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDeploymentById(input.id)),
    
    getByLicenseId: adminProcedure
      .input(z.object({ licenseId: z.number() }))
      .query(({ input }) => db.getDeploymentsByLicenseId(input.licenseId)),
    
    create: adminProcedure
      .input(z.object({
        licenseId: z.number(),
        engineVersion: z.string(),
        deploymentUrl: z.string().optional(),
        status: z.enum(["active", "inactive", "maintenance"]).default("active"),
        lastCheckIn: z.date().optional(),
        articlesGenerated: z.number().default(0),
        lastArticleDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDeployment(input);
        return { id };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "inactive", "maintenance"]).optional(),
        lastCheckIn: z.date().optional(),
        articlesGenerated: z.number().optional(),
        lastArticleDate: z.date().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateDeployment(id, data);
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteDeployment(input.id)),
    
    updateStatuses: adminProcedure.query(async () => {
      return await getAllDeploymentStatuses();
    }),
    
    updateSingle: adminProcedure
      .input(z.object({ deploymentId: z.number() }))
      .mutation(async ({ input }) => {
        return await updateSingleDeployment(input.deploymentId);
      }),
    
    updateAll: adminProcedure.mutation(async () => {
      return await updateAllDeployments();
    }),
    
    needingUpdate: adminProcedure.query(async () => {
      return await getDeploymentsNeedingUpdate();
    }),
    
    currentVersion: publicProcedure.query(() => {
      return getCurrentVersion();
    }),
    
    versionHistory: publicProcedure.query(() => {
      return getVersionHistory();
    }),
  }),

  // ─── Analytics ───────────────────────────────────────────
  analytics: router({
    popularSearches: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getPopularSearches(input?.limit ?? 20)),
    
    searchHistory: adminProcedure
      .input(z.object({ days: z.number().optional() }).optional())
      .query(({ input }) => db.getSearchAnalytics(input?.days ?? 30)),

    overview: adminProcedure.query(async () => {
      return getOverviewStats();
    }),
  }),







  // ─── Content Calendar ────────────────────────────────
  contentCalendar: router({
    getEntry: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => db.getContentCalendarEntry(input.date)),

    getRange: adminProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => db.getContentCalendarRange(input.startDate, input.endDate)),

    upsert: adminProcedure
      .input(z.object({
        date: z.string(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(({ input }) => {
        const { date, ...data } = input;
        return db.createOrUpdateContentCalendarEntry({ date, ...data });
      }),

    delete: adminProcedure
      .input(z.object({ date: z.string() }))
      .mutation(({ input }) => db.deleteContentCalendarEntry(input.date)),
  }),

  // ─── Admin Source Feed Management ────────────────────
  admin: router({
    getBlockedSources: adminProcedure.query(() => db.getAllBlockedSources()),
    
    getSourceAnalytics: adminProcedure.query(() => db.getSourceAnalytics()),
    
    blockSource: adminProcedure
      .input(z.object({
        sourceName: z.string(),
        sourceUrl: z.string().optional(),
        reason: z.string().optional(),
      }))
      .mutation(({ input }) => db.createBlockedSource(input)),
    
    unblockSource: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteBlockedSource(input.id)),
    
    getFeedSettings: adminProcedure.query(async () => {
      const randomizeOrder = await db.getSetting('feed_randomize_order');
      const shuffleSeed = await db.getSetting('feed_shuffle_seed');
      const randomizeFeedSources = await db.getSetting('randomize_feed_sources');
      const shuffleValue = shuffleSeed?.value || 'daily';
      return {
        randomizeOrder: randomizeOrder?.value === 'true',
        shuffleSeed: (shuffleValue === 'daily' || shuffleValue === 'random' || shuffleValue === 'fixed') ? shuffleValue : 'daily',
        randomizeFeedSources: randomizeFeedSources?.value === 'true',
      };
    }),
    
    updateFeedSettings: adminProcedure
      .input(z.object({
        randomizeOrder: z.boolean(),
        shuffleSeed: z.enum(['daily', 'random', 'fixed']),
        randomizeFeedSources: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.setSetting('feed_randomize_order', input.randomizeOrder.toString());
        await db.setSetting('feed_shuffle_seed', input.shuffleSeed);
        if (input.randomizeFeedSources !== undefined) {
          await db.setSetting('randomize_feed_sources', input.randomizeFeedSources.toString());
        }
        return { success: true };
      }),
    
    getAllRssFeedWeights: adminProcedure.query(() => db.getAllRssFeedWeights()),
    
    updateRssFeedWeight: adminProcedure
      .input(z.object({
        feedUrl: z.string(),
        weight: z.number().min(0).max(100),
      }))
      .mutation(() => {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Feed weights are now managed by Category Balance. Use the Category Balance page to adjust weights.' });
      }),
    
    toggleRssFeedEnabled: adminProcedure
      .input(z.object({
        feedUrl: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(({ input }) => db.toggleRssFeedEnabled(input.feedUrl, input.enabled)),
    
    checkAndReactivateDisabledFeeds: adminProcedure
      .mutation(async () => {
        const allFeeds = await db.getAllRssFeedWeights();
        const disabledFeeds = allFeeds.filter(f => !f.enabled);
        
        const results = {
          checked: disabledFeeds.length,
          reactivated: 0,
          stillFailing: 0,
          errors: [] as string[],
        };

        for (const feed of disabledFeeds) {
          try {
            const response = await fetch(feed.feedUrl, {
              method: 'HEAD',
              headers: { 'User-Agent': `Mozilla/5.0 (compatible; ${process.env.VITE_APP_TITLE || 'ContentEngine'}/1.0)` },
              signal: AbortSignal.timeout(10000),
            });
            
            if (response.ok) {
              await db.toggleRssFeedEnabled(feed.feedUrl, true);
              // Reset error count via db helper
              await db.resetFeedErrors(feed.feedUrl);
              results.reactivated++;
            } else {
              results.stillFailing++;
            }
          } catch (error: any) {
            results.stillFailing++;
            results.errors.push(`${feed.feedUrl}: ${error.message}`);
          }
        }

        return results;
      }),
    
    initializeFeedWeights: adminProcedure
      .mutation(async () => {
        await db.migrateRssFeedsToWeights();
        return { success: true };
      }),
    // Fix 9: Add/remove feeds directly in rss_feed_weights (single source of truth)
    addRssFeedWeight: adminProcedure
      .input(z.object({
        feedUrl: z.string().url(),
        weight: z.number().min(0).max(100).default(50),
      }))
      .mutation(async ({ input }) => {
        await db.addRssFeedWeight(input.feedUrl, input.weight);
        return { success: true };
      }),
    removeRssFeedWeight: adminProcedure
      .input(z.object({ feedUrl: z.string() }))
      .mutation(async ({ input }) => {
        await db.removeRssFeedWeight(input.feedUrl);
        return { success: true };
      }),
  }),

  // ─── Category Balance ──────────────────────────────
  categoryBalance: router({
    getSettings: adminProcedure.query(() => categoryBalance.getRebalanceSettings()),

    updateSettings: adminProcedure
      .input(z.object({
        triggerCount: z.number().min(10).max(500).optional(),
        fingerprintWindow: z.number().min(50).max(1000).optional(),
        minArticlesThreshold: z.number().min(5).max(100).optional(),
        cooldownHours: z.number().min(1).max(72).optional(),
        autoRebalanceEnabled: z.boolean().optional(),
        maxWeightChange: z.number().min(5).max(50).optional(),
        targetDistribution: z.record(z.string(), z.number()).optional(),
        weightLocks: z.record(z.string(), z.boolean()).optional(),
      }))
      .mutation(({ input }) => categoryBalance.updateRebalanceSettings(input)),

    getDistribution: adminProcedure.query(() => db.getCategoryDistribution()),

    getGapAnalysis: adminProcedure
      .input(z.object({ targetDistribution: z.record(z.string(), z.number()).optional() }).optional())
      .query(({ input }) => db.getCategoryGapAnalysis(input?.targetDistribution)),

    getFeedMatrix: adminProcedure
      .input(z.object({ fingerprintWindow: z.number().optional() }).optional())
      .query(({ input }) => db.getFeedCategoryMatrix(input?.fingerprintWindow)),

    getFeedPublishRate: adminProcedure.query(() => db.getFeedPublishRate()),

    getFingerprints: adminProcedure
      .input(z.object({ fingerprintWindow: z.number().optional(), minThreshold: z.number().optional() }).optional())
      .query(({ input }) => categoryBalance.buildFeedFingerprints(input?.fingerprintWindow, input?.minThreshold)),

    getRecommendation: adminProcedure.query(() => categoryBalance.calculateOptimalWeights()),

    applyRebalance: adminProcedure
      .input(z.object({ triggerType: z.enum(['manual', 'auto', 'initial']).optional() }))
      .mutation(async ({ input }) => {
        const recommendation = await categoryBalance.calculateOptimalWeights();
        return categoryBalance.applyRebalance(recommendation, input.triggerType || 'manual');
      }),

    getRebalanceLogs: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(({ input }) => db.getRebalanceLogs(input?.limit)),

    checkAutoRebalance: adminProcedure.query(() => categoryBalance.shouldAutoRebalance()),

    isCooldownActive: adminProcedure.query(() => categoryBalance.isCooldownActive()),

    toggleWeightLock: adminProcedure
      .input(z.object({ feedUrl: z.string(), locked: z.boolean() }))
      .mutation(async ({ input }) => {
        const settings = await categoryBalance.getRebalanceSettings();
        const locks = { ...settings.weightLocks };
        if (input.locked) {
          locks[input.feedUrl] = true;
        } else {
          delete locks[input.feedUrl];
        }
        await categoryBalance.updateRebalanceSettings({ weightLocks: locks });
        return { success: true };
      }),

     backfillFeedSourceIds: adminProcedure.mutation(() => db.backfillFeedSourceIds()),
  }),

  xReply: router({
    // Get reply queue with optional status filter
    list: adminProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional() }).optional())
      .query(({ input }) => db.listXReplies({ status: input?.status, limit: input?.limit })),

    // Get settings
    getSettings: adminProcedure.query(async () => {
      const [enabled, dailyLimit, intervalMinutes, mode, minFollowers, maxFollowers, verifiedOnly, source, maxEngagementsPerUser, maxFailedQueue, maxPostedQueue, maxPendingQueue] = await Promise.all([
        db.getSetting("x_reply_enabled"),
        db.getSetting("x_reply_daily_limit"),
        db.getSetting("x_reply_interval_minutes"),
        db.getSetting("x_reply_mode"),
        db.getSetting("x_reply_min_followers"),
        db.getSetting("x_reply_max_followers"),
        db.getSetting("x_reply_verified_only"),
        db.getSetting("x_reply_source"),
        db.getSetting("x_reply_max_engagements_per_user"),
        db.getSetting("x_reply_max_failed_queue"),
        db.getSetting("x_reply_max_posted_queue"),
        db.getSetting("x_reply_max_pending_queue"),
      ]);
      return {
        enabled: enabled?.value === "true",
        dailyLimit: parseInt(dailyLimit?.value || "10", 10),
        intervalMinutes: parseInt(intervalMinutes?.value || "120", 10),
        mode: (mode?.value === "reply" ? "reply" : "quote_tweet") as "reply" | "quote_tweet",
        minFollowers: parseInt(minFollowers?.value || "1000", 10),
        maxFollowers: parseInt(maxFollowers?.value || "500000", 10),
        verifiedOnly: verifiedOnly?.value === "true",
        source: (source?.value === "mentions" ? "mentions" : "keyword_search") as "keyword_search" | "mentions",
        maxEngagementsPerUser: parseInt(maxEngagementsPerUser?.value || "2", 10),
        maxFailedQueue: parseInt(maxFailedQueue?.value || "50", 10),
        maxPostedQueue: parseInt(maxPostedQueue?.value || "100", 10),
        maxPendingQueue: parseInt(maxPendingQueue?.value || "50", 10),
      };
    }),

    // Update settings
    updateSettings: adminProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        dailyLimit: z.number().min(1).max(100).optional(),
        intervalMinutes: z.number().min(1).max(1440).optional(),
        mode: z.enum(["reply", "quote_tweet"]).optional(),
        minFollowers: z.number().min(0).max(10000000).optional(),
        maxFollowers: z.number().min(0).max(100000000).optional(),
        verifiedOnly: z.boolean().optional(),
        source: z.enum(["keyword_search", "mentions"]).optional(),
        maxEngagementsPerUser: z.number().min(1).max(100).optional(),
        maxFailedQueue: z.number().min(1).max(500).optional(),
        maxPostedQueue: z.number().min(1).max(1000).optional(),
        maxPendingQueue: z.number().min(1).max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.enabled !== undefined) await db.setSetting("x_reply_enabled", input.enabled ? "true" : "false");
        if (input.dailyLimit !== undefined) await db.setSetting("x_reply_daily_limit", input.dailyLimit.toString());
        if (input.intervalMinutes !== undefined) await db.setSetting("x_reply_interval_minutes", input.intervalMinutes.toString());
        if (input.mode !== undefined) await db.setSetting("x_reply_mode", input.mode);
        if (input.minFollowers !== undefined) await db.setSetting("x_reply_min_followers", input.minFollowers.toString());
        if (input.maxFollowers !== undefined) await db.setSetting("x_reply_max_followers", input.maxFollowers.toString());
        if (input.verifiedOnly !== undefined) await db.setSetting("x_reply_verified_only", input.verifiedOnly ? "true" : "false");
        if (input.source !== undefined) await db.setSetting("x_reply_source", input.source);
        if (input.maxEngagementsPerUser !== undefined) await db.setSetting("x_reply_max_engagements_per_user", input.maxEngagementsPerUser.toString());
        if (input.maxFailedQueue !== undefined) await db.setSetting("x_reply_max_failed_queue", input.maxFailedQueue.toString());
        if (input.maxPostedQueue !== undefined) await db.setSetting("x_reply_max_posted_queue", input.maxPostedQueue.toString());
        if (input.maxPendingQueue !== undefined) await db.setSetting("x_reply_max_pending_queue", input.maxPendingQueue.toString());
        return { success: true };
      }),

    // Update reply status (approve/skip/retry)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "posted", "failed", "skipped"]),
      }))
      .mutation(({ input }) => db.updateXReplyStatus(input.id, input.status)),

    // Edit reply content
    updateContent: adminProcedure
      .input(z.object({ id: z.number(), replyContent: z.string().min(1).max(280) }))
      .mutation(({ input }) => db.updateXReplyContent(input.id, input.replyContent)),

    // Manually trigger a keyword-search reply cycle
    triggerCycle: adminProcedure.mutation(async () => {
      const sourceSetting = await db.getSetting("x_reply_source");
      const source = sourceSetting?.value === "mentions" ? "mentions" : "keyword_search";
      const { runReplyEngine, runMentionsReplyEngine } = await import("./xReplyEngine");
      return source === "mentions" ? runMentionsReplyEngine() : runReplyEngine();
    }),

    // Manually trigger a mentions-only reply cycle
    triggerMentionsCycle: adminProcedure.mutation(async () => {
      const { runMentionsReplyEngine } = await import("./xReplyEngine");
      return runMentionsReplyEngine();
    }),

    // Post the next pending/approved reply immediately (no search/generation — just post what's in queue)
    postNextReply: adminProcedure.mutation(async () => {
      const { postReply, loadEngineSettings } = await import("./xReplyEngine");
      const { getXCredentials } = await import("./xTwitterService");
      const { TwitterApi } = await import("twitter-api-v2");
      const creds = await getXCredentials();
      if (!creds) return { success: false, error: "X credentials not configured" };
      // Find oldest approved reply, fall back to oldest pending
      let pending = await db.listXReplies({ status: "approved", limit: 1 });
      if (!pending.length) pending = await db.listXReplies({ status: "pending", limit: 1 });
      if (!pending.length) return { success: false, error: "No pending or approved replies in queue" };
      const reply = pending[0];
      if (!reply.replyContent) return { success: false, error: "Reply has no content" };
      const engineSettings = await loadEngineSettings();
      const client = new TwitterApi({
        appKey: creds.apiKey,
        appSecret: creds.apiSecret,
        accessToken: creds.accessToken,
        accessSecret: creds.accessTokenSecret,
      });
      // Fetch article image for direct media upload
      let articleImageUrl: string | undefined;
      if (reply.articleId) {
        const article = await db.getArticleById(reply.articleId);
        articleImageUrl = article?.featuredImage || undefined;
      }
      // Use the mode stored with the reply (not the current global setting, which may have changed)
      const replyMode = (reply.replyMode as "reply" | "quote_tweet") || engineSettings.mode;
      console.log(`[X Reply] postNextReply: tweetId=${reply.tweetId}, mode=${replyMode}, content="${reply.replyContent?.substring(0, 60)}..."`); 
      const result = await postReply(client.readWrite, reply.tweetId, reply.replyContent, replyMode, articleImageUrl);
      if (result.success) {
        await db.updateXReplyStatus(reply.id, "posted", { postedTweetId: result.tweetId, postedAt: new Date() });
        return { success: true, tweetId: result.tweetId, replyId: reply.id };
      } else {
        await db.updateXReplyStatus(reply.id, "failed", { errorMessage: result.error });
        return { success: false, error: result.error };
      }
    }),

    // Get today's reply count
    getTodayCount: adminProcedure.query(() => db.countXRepliesToday()),

    // Purge all failed replies from the queue
    purgeFailedQueue: adminProcedure.mutation(async () => {
      const deleted = await db.purgeFailedXReplies();
      return { success: true, deleted };
    }),

    // Get link probability setting (0-100, default 50)
    getLinkProbability: adminProcedure.query(async () => {
      const setting = await db.getSetting("x_reply_link_probability");
      return { value: parseInt(setting?.value || "50", 10) };
    }),

    // Save link probability setting
    setLinkProbability: adminProcedure
      .input(z.object({ value: z.number().min(0).max(100) }))
      .mutation(async ({ input }) => {
        await db.setSetting("x_reply_link_probability", String(input.value));
        return { success: true };
      }),

    // Get auto-run interval in hours (default 4)
    getAutoIntervalHours: adminProcedure.query(async () => {
      const setting = await db.getSetting("x_reply_auto_interval_hours");
      return { value: parseInt(setting?.value || "4", 10) };
    }),

    // Save auto-run interval in hours and restart scheduler
    setAutoIntervalHours: adminProcedure
      .input(z.object({ value: z.number().min(1).max(24) }))
      .mutation(async ({ input }) => {
        await db.setSetting("x_reply_auto_interval_hours", String(input.value));
        // Convert hours to minutes and update the interval setting used by the scheduler
        await db.setSetting("x_reply_interval_minutes", String(input.value * 60));
        const { initReplyScheduler } = await import("./xReplyEngine");
        await initReplyScheduler();
        return { success: true };
      }),
  }),

  // ─── Standalone X Tweets ──────────────────────────────────────────────
  standaloneTweet: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "posted", "rejected", "failed"]).optional() }))
      .query(async ({ input }) => {
        const { listStandaloneTweets } = await import("./standaloneXTweetEngine");
        return listStandaloneTweets(input.status);
      }),

    generate: adminProcedure
      .input(z.object({ count: z.number().min(1).max(20).default(5) }))
      .mutation(async ({ input }) => {
        const { generateStandaloneTweets } = await import("./standaloneXTweetEngine");
        return generateStandaloneTweets(input.count);
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { approveStandaloneTweet } = await import("./standaloneXTweetEngine");
        await approveStandaloneTweet(input.id);
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { rejectStandaloneTweet } = await import("./standaloneXTweetEngine");
        await rejectStandaloneTweet(input.id);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteStandaloneTweet } = await import("./standaloneXTweetEngine");
        await deleteStandaloneTweet(input.id);
        return { success: true };
      }),

    postNext: adminProcedure.mutation(async () => {
      const { postNextStandaloneTweet } = await import("./standaloneXTweetEngine");
      return postNextStandaloneTweet();
    }),

    getSettings: adminProcedure.query(async () => {
      const [dailyLimit, autoApprove, enabled, scheduleTime, batchSize] = await Promise.all([
        db.getSetting("standalone_tweet_daily_limit"),
        db.getSetting("standalone_tweet_auto_approve"),
        db.getSetting("standalone_tweet_enabled"),
        db.getSetting("standalone_tweet_schedule_time"),
        db.getSetting("standalone_tweet_batch_size"),
      ]);
      return {
        dailyLimit: parseInt(dailyLimit?.value ?? "5", 10),
        autoApprove: autoApprove?.value === "true",
        enabled: enabled?.value !== "false",
        scheduleTime: scheduleTime?.value ?? "07:00",
        batchSize: parseInt(batchSize?.value ?? "8", 10),
      };
    }),

    saveSettings: adminProcedure
      .input(z.object({
        dailyLimit: z.number().min(1).max(50).optional(),
        autoApprove: z.boolean().optional(),
        enabled: z.boolean().optional(),
        scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        batchSize: z.number().min(1).max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.dailyLimit !== undefined)
          await db.setSetting("standalone_tweet_daily_limit", String(input.dailyLimit));
        if (input.autoApprove !== undefined)
          await db.setSetting("standalone_tweet_auto_approve", String(input.autoApprove));
        if (input.enabled !== undefined)
          await db.setSetting("standalone_tweet_enabled", String(input.enabled));
        if (input.scheduleTime !== undefined)
          await db.setSetting("standalone_tweet_schedule_time", input.scheduleTime);
        if (input.batchSize !== undefined)
          await db.setSetting("standalone_tweet_batch_size", String(input.batchSize));
        // Re-initialize the scheduler with new settings
        const { refreshStandaloneTweetScheduler } = await import("./standalone-tweet-scheduler");
        await refreshStandaloneTweetScheduler();
        return { success: true };
      }),

    countToday: adminProcedure.query(async () => {
      const { countStandaloneTweetsToday } = await import("./standaloneXTweetEngine");
      return { count: await countStandaloneTweetsToday() };
    }),
  }),

  // ─── CEO Directives ──────────────────────────────────
  // ─── v4.0 Multi-Source Selector Window ─────────────────────────────────
  sources: router({
    // Get candidate pool stats (pending/selected/rejected/expired counts)
    getCandidateStats: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { selectorCandidates } = await import("../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (!dbConn) return { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 };
      const rows = await dbConn
        .select({
          status: selectorCandidates.status,
          count: sql<number>`count(*)`
        })
        .from(selectorCandidates)
        .groupBy(selectorCandidates.status);
      const stats = { pending: 0, selected: 0, rejected: 0, expired: 0, total: 0 };
      for (const row of rows) {
        const key = row.status as keyof typeof stats;
        if (key in stats) stats[key] = Number(row.count);
        stats.total += Number(row.count);
      }
      return stats;
    }),

    // Get pending candidates list (for admin review)
    getPendingCandidates: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
      .query(async ({ input }) => {
        const { getPendingCandidates } = await import("./sources/rss-bridge");
        return getPendingCandidates(input?.limit ?? 100);
      }),

    // Get pending manual injection candidates
    getManualCandidates: adminProcedure.query(async () => {
      const { getPendingManualCandidates } = await import("./sources/manual-injection");
      return getPendingManualCandidates();
    }),

    // Inject manual candidates into the selector pool
    injectManual: adminProcedure
      .input(z.object({
        entries: z.array(z.object({
          title: z.string().min(1).max(1000),
          summary: z.string().max(2000).optional(),
          sourceUrl: z.string().url().optional(),
          priority: z.number().min(1).max(100).optional(),
        })).min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const { injectManualCandidates } = await import("./sources/manual-injection");
        const today = new Date().toISOString().split("T")[0];
        const inserted = await injectManualCandidates(input.entries, today);
        return { success: true, inserted };
      }),

    // Get Google News topic settings
    getGoogleNewsTopics: adminProcedure.query(async () => {
      const topicsSetting = await db.getSetting("google_news_topics");
      const enabledSetting = await db.getSetting("google_news_topics_enabled");
      return {
        topics: topicsSetting?.value || "",
        enabled: enabledSetting?.value !== "false",
      };
    }),

    // Save Google News topic settings
    saveGoogleNewsTopics: adminProcedure
      .input(z.object({
        topics: z.string().max(2000),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.setSetting("google_news_topics", input.topics);
        await db.setSetting("google_news_topics_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    // Manually trigger Google News topic fetch
    fetchGoogleNewsNow: adminProcedure.mutation(async () => {
      const { fetchGoogleNewsTopics } = await import("./sources/google-news");
      const today = new Date().toISOString().split("T")[0];
      const inserted = await fetchGoogleNewsTopics(today);
      return { success: true, inserted };
    }),

    // Get candidate expiry hours setting
    getExpiryHours: adminProcedure.query(async () => {
      const setting = await db.getSetting("candidate_expiry_hours");
      return { hours: parseInt(setting?.value || "48", 10) };
    }),

    // Save candidate expiry hours
    saveExpiryHours: adminProcedure
      .input(z.object({ hours: z.number().min(1).max(168) }))
      .mutation(async ({ input }) => {
        await db.setSetting("candidate_expiry_hours", String(input.hours));
        return { success: true };
      }),

    // Manually run the expiry cron
    expireNow: adminProcedure.mutation(async () => {
      const { expireOldCandidates } = await import("./sources/rss-bridge");
      const expired = await expireOldCandidates();
      return { success: true, expired };
    }),

    // ── X / Twitter Listener ─────────────────────────────────────────────────

    // Get X listener config
    getXListenerConfig: adminProcedure.query(async () => {
      const queriesSetting = await db.getSetting("x_listener_queries");
      const enabledSetting = await db.getSetting("x_listener_enabled");
      return {
        queries: queriesSetting?.value || "",
        enabled: enabledSetting?.value !== "false",
      };
    }),

    // Save X listener config
    saveXListenerConfig: adminProcedure
      .input(z.object({
        queries: z.string().max(2000),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.setSetting("x_listener_queries", input.queries);
        await db.setSetting("x_listener_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    // Manually trigger X fetch
    fetchXNow: adminProcedure.mutation(async () => {
      const { fetchXCandidates } = await import("./sources/x-listener");
      const today = new Date().toISOString().split("T")[0];
      const inserted = await fetchXCandidates(today);
      return { success: true, inserted };
    }),

    // ── Reddit Listener ───────────────────────────────────────────────────────

    // Get Reddit listener config
    getRedditConfig: adminProcedure.query(async () => {
      const subredditsSetting = await db.getSetting("reddit_listener_subreddits");
      const enabledSetting = await db.getSetting("reddit_listener_enabled");
      return {
        subreddits: subredditsSetting?.value || "",
        enabled: enabledSetting?.value !== "false",
      };
    }),

    // Save Reddit listener config
    saveRedditConfig: adminProcedure
      .input(z.object({
        subreddits: z.string().max(2000),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.setSetting("reddit_listener_subreddits", input.subreddits);
        await db.setSetting("reddit_listener_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    // Manually trigger Reddit fetch
    fetchRedditNow: adminProcedure.mutation(async () => {
      const { fetchRedditCandidates } = await import("./sources/reddit-listener");
      const today = new Date().toISOString().split("T")[0];
      const inserted = await fetchRedditCandidates(today);
      return { success: true, inserted };
    }),

    // ── YouTube Agent ─────────────────────────────────────────────────────────

    getYouTubeConfig: adminProcedure.query(async () => {
      const channelsSetting = await db.getSetting("youtube_channels");
      const queriesSetting = await db.getSetting("youtube_search_queries");
      const enabledSetting = await db.getSetting("youtube_enabled");
      const hasApiKey = !!process.env.YOUTUBE_API_KEY;
      return {
        channels: channelsSetting?.value || "",
        searchQueries: queriesSetting?.value || "",
        enabled: enabledSetting?.value !== "false",
        hasApiKey,
      };
    }),

    saveYouTubeConfig: adminProcedure
      .input(z.object({
        channels: z.string().max(2000),
        searchQueries: z.string().max(2000),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.setSetting("youtube_channels", input.channels);
        await db.setSetting("youtube_search_queries", input.searchQueries);
        await db.setSetting("youtube_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    fetchYouTubeNow: adminProcedure.mutation(async () => {
      const { fetchYouTubeCandidates } = await import("./sources/youtube-agent");
      const today = new Date().toISOString().split("T")[0];
      const inserted = await fetchYouTubeCandidates(today);
      return { success: true, inserted };
    }),

    // ── Web Scraper ────────────────────────────────────────────────────────────

    getWebScraperConfig: adminProcedure.query(async () => {
      const configSetting = await db.getSetting("web_scraper_configs");
      const enabledSetting = await db.getSetting("web_scraper_enabled");
      return {
        configs: configSetting?.value || "[]",
        enabled: enabledSetting?.value !== "false",
      };
    }),

    saveWebScraperConfig: adminProcedure
      .input(z.object({
        configs: z.string().max(10000),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        // Validate JSON before saving
        try { JSON.parse(input.configs); } catch { throw new Error("Invalid JSON in scraper configs"); }
        await db.setSetting("web_scraper_configs", input.configs);
        await db.setSetting("web_scraper_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    fetchWebScraperNow: adminProcedure.mutation(async () => {
      const { fetchScraperCandidates } = await import("./sources/web-scraper");
      const today = new Date().toISOString().split("T")[0];
      const inserted = await fetchScraperCandidates(today);
      return { success: true, inserted };
    }),

    // ── Candidate Review ─────────────────────────────────────────────────────

    getCandidateCounts: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { selectorCandidates } = await import("../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (!dbConn) return { byStatus: [], bySources: 0 };
      const byStatus = await dbConn
        .select({ status: selectorCandidates.status, count: sql<number>`count(*)` })
        .from(selectorCandidates)
        .groupBy(selectorCandidates.status);
      const [sourceCountResult] = await dbConn
        .select({ count: sql<number>`count(distinct ${selectorCandidates.sourceType})` })
        .from(selectorCandidates);
      return { byStatus, bySources: Number(sourceCountResult?.count ?? 0) };
    }),

        // List candidates with filtering for the review interface
    listCandidates: adminProcedure
      .input(z.object({
        status: z.enum(["pending", "selected", "rejected", "expired", "all"]).default("pending"),
        sourceType: z.string().optional(),
        source: z.string().optional(),
        potential: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { selectorCandidates } = await import("../drizzle/schema");
        const { eq, and, gt, desc, sql } = await import("drizzle-orm");
        const dbConn = await getDb();
        if (!dbConn) return { items: [], total: 0 };

        const status = input?.status ?? "pending";
        const sourceType = input?.sourceType;
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;

        const source = input?.source;
        const potential = input?.potential;
        const conditions = [];
        if (status !== "all") conditions.push(eq(selectorCandidates.status, status as any));
        if (sourceType) conditions.push(eq(selectorCandidates.sourceType, sourceType as any));
        if (source) conditions.push(eq(selectorCandidates.sourceType, source as any));
        if (potential) conditions.push(eq(selectorCandidates.articlePotential, potential as any));

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const [items, countResult] = await Promise.all([
          dbConn
            .select()
            .from(selectorCandidates)
            .where(where)
            // v4.5: Sort by score DESC (MySQL/TiDB: ISNULL puts NULLs last), then priority, then createdAt
            .orderBy(sql`ISNULL(${selectorCandidates.score})`, desc(selectorCandidates.score), desc(selectorCandidates.priority), desc(selectorCandidates.createdAt))
            .limit(limit)
            .offset(offset),
          dbConn
            .select({ count: sql<number>`count(*)` })
            .from(selectorCandidates)
            .where(where),
        ]);

        return { items, total: Number(countResult[0]?.count ?? 0) };
      }),

    // Manually approve a candidate (mark as selected)
    approveCandidate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { selectorCandidates } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn.update(selectorCandidates).set({ status: "selected" }).where(eq(selectorCandidates.id, input.id));
        return { success: true };
      }),

    // Manually reject a candidate
    rejectCandidate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { selectorCandidates } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn.update(selectorCandidates).set({ status: "rejected" }).where(eq(selectorCandidates.id, input.id));
        return { success: true };
      }),

    // Bulk approve/reject
    bulkUpdateCandidates: adminProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1).max(100),
        status: z.enum(["selected", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { selectorCandidates } = await import("../drizzle/schema");
        const { inArray } = await import("drizzle-orm");
        const dbConn = await getDb();
        if (!dbConn) throw new Error("DB unavailable");
        await dbConn.update(selectorCandidates).set({ status: input.status }).where(inArray(selectorCandidates.id, input.ids));
        return { success: true, updated: input.ids.length };
      }),

    // v4.5: Trigger scoring of unscored candidates
    triggerScoring: adminProcedure.mutation(async () => {
      const { scoreUnscoredCandidates } = await import('./candidate-scoring');
      const scored = await scoreUnscoredCandidates();
      return { success: true, scored };
    }),
    // v4.5: Trigger one production loop tick manually
    triggerProductionLoop: adminProcedure.mutation(async () => {
      const { runProductionLoopTick } = await import('./production-loop');
      const result = await runProductionLoopTick();
      return { success: true, ...result };
    }),
    // v4.5: Get production loop status
    getProductionLoopStatus: adminProcedure.query(async () => {
      const { getProductionLoopStatus } = await import('./production-loop');
      return getProductionLoopStatus();
    }),
    // Get stats broken down by source type
    getCandidateStatsBySource: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { selectorCandidates } = await import("../drizzle/schema");
      const { sql, eq } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (!dbConn) return [];
      const rows = await dbConn
        .select({
          sourceType: selectorCandidates.sourceType,
          status: selectorCandidates.status,
          count: sql<number>`count(*)`
        })
        .from(selectorCandidates)
        .groupBy(selectorCandidates.sourceType, selectorCandidates.status);
      return rows;
    }),
    getCandidatePoolHealth: adminProcedure.query(async () => {
      const { getDb } = await import("./db");
      const { selectorCandidates } = await import("../drizzle/schema");
      const { sql, eq, gte } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (!dbConn) return {
        tiers: { high: 0, medium: 0, low: 0, dead: 0, unscored: 0 },
        total: 0,
        history: [] as Array<{ hour: string; high: number; medium: number; low: number }>,
      };

      // Current tier breakdown for pending candidates
      const tierRows = await dbConn
        .select({
          potential: selectorCandidates.articlePotential,
          count: sql<number>`count(*)`
        })
        .from(selectorCandidates)
        .where(eq(selectorCandidates.status, 'pending'))
        .groupBy(selectorCandidates.articlePotential);

      const tiers = { high: 0, medium: 0, low: 0, dead: 0, unscored: 0 };
      let total = 0;
      for (const row of tierRows) {
        const n = Number(row.count);
        total += n;
        if (row.potential === 'high') tiers.high = n;
        else if (row.potential === 'medium') tiers.medium = n;
        else if (row.potential === 'low') tiers.low = n;
        else if (row.potential === 'dead') tiers.dead = n;
        else tiers.unscored += n;
      }

      // 24-hour hourly history: count candidates created per hour in last 24h
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const historyRows = await dbConn
        .select({
          hour: sql<string>`DATE_FORMAT(created_at, '%Y-%m-%d %H:00')`,
          potential: selectorCandidates.articlePotential,
          count: sql<number>`count(*)`
        })
        .from(selectorCandidates)
        .where(gte(selectorCandidates.createdAt, since24h))
        .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m-%d %H:00')`, selectorCandidates.articlePotential)
        .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m-%d %H:00')`);

      // Aggregate into hour buckets
      const hourMap = new Map<string, { high: number; medium: number; low: number }>();
      for (const row of historyRows) {
        const h = row.hour;
        if (!hourMap.has(h)) hourMap.set(h, { high: 0, medium: 0, low: 0 });
        const bucket = hourMap.get(h)!;
        const n = Number(row.count);
        if (row.potential === 'high') bucket.high += n;
        else if (row.potential === 'medium') bucket.medium += n;
        else if (row.potential === 'low') bucket.low += n;
      }
      const history = Array.from(hourMap.entries()).map(([hour, counts]) => ({ hour, ...counts }));

      return { tiers, total, history };
    }),
  }),

  ceoDirectives: router({
    list: adminProcedure.query(async () => {
      return db.listCeoDirectives();
    }),
    create: adminProcedure
      .input(z.object({
        directiveDate: z.string(),
        fromName: z.string().optional(),
        priority: z.enum(["Critical", "High", "Medium", "Low"]),
        subject: z.string().min(1),
        body: z.string().min(1),
        status: z.enum(["Pending", "In Progress", "Complete", "Cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCeoDirective(input);
        return { success: true };
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["Pending", "In Progress", "Complete", "Cancelled"]),
        completedDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateCeoDirectiveStatus(input.id, input.status, input.completedDate);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCeoDirective(input.id);
        return { success: true };
      }),
  }),

  imageLicenses: router({
    list: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        source: z.string().optional(),
        articleId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getImageLicenses(input);
      }),
  }),

  // ── Image QC (v4.9.7) ───────────────────────────────────────────────────────────────────
  imageQC: router({
    // Tab 1: Image Library
    libraryList: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        domain: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { items: [], total: 0 };
        const { imageLibrary: lib } = await import("../drizzle/schema");
        const { eq: eqOp, sql: sqlExpr, and: andOp } = await import("drizzle-orm");
        const conditions: any[] = [];
        if (input.domain) conditions.push(eqOp(lib.sourceDomain, input.domain));
        const where = conditions.length > 0 ? andOp(...conditions) : undefined;
        const items = await dbConn.select().from(lib)
          .where(where)
          .orderBy(sqlExpr`created_at DESC`)
          .limit(input.limit)
          .offset(input.offset);
        const countResult = await dbConn.select({ count: sqlExpr<number>`COUNT(*)` }).from(lib).where(where);
        return { items, total: Number(countResult[0]?.count ?? 0) };
      }),
    libraryDelete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };
        const { imageLibrary: lib } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await dbConn.delete(lib).where(eqOp(lib.id, input.id));
        return { success: true };
      }),

    // Tab 2: Domain Whitelist/Blacklist
    domainList: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
        status: z.enum(["whitelisted", "blacklisted", "unknown", "pending_review", "all"]).default("all"),
      }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { items: [], total: 0 };
        const { imageSourceDomains } = await import("../drizzle/schema");
        const { eq: eqOp, sql: sqlExpr } = await import("drizzle-orm");
        const where = input.status !== "all" ? eqOp(imageSourceDomains.status, input.status) : undefined;
        const items = await dbConn.select().from(imageSourceDomains)
          .where(where)
          .orderBy(sqlExpr`images_sourced DESC`)
          .limit(input.limit)
          .offset(input.offset);
        const countResult = await dbConn.select({ count: sqlExpr<number>`COUNT(*)` }).from(imageSourceDomains).where(where);
        return { items, total: Number(countResult[0]?.count ?? 0) };
      }),
    domainSetStatus: adminProcedure
      .input(z.object({
        domain: z.string().min(1),
        status: z.enum(["whitelisted", "blacklisted", "unknown", "pending_review"]),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };
        const { imageSourceDomains } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        const existing = await dbConn.select({ id: imageSourceDomains.id })
          .from(imageSourceDomains)
          .where(eqOp(imageSourceDomains.domain, input.domain))
          .limit(1);
        if (existing.length > 0) {
          await dbConn.update(imageSourceDomains)
            .set({ status: input.status })
            .where(eqOp(imageSourceDomains.domain, input.domain));
        } else {
          await dbConn.insert(imageSourceDomains).values({
            domain: input.domain,
            status: input.status,
            imagesSourced: 0,
            imagesRejected: 0,
          });
        }
        return { success: true };
      }),
    domainDelete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };
        const { imageSourceDomains } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await dbConn.delete(imageSourceDomains).where(eqOp(imageSourceDomains.id, input.id));
        return { success: true };
      }),

    // Tab 3: Stats
    stats: adminProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const { imageLibrary: lib, imageSourceDomains } = await import("../drizzle/schema");
        const { sql: sqlExpr } = await import("drizzle-orm");
        const libStatsResult = await dbConn.select({
          total: sqlExpr<number>`COUNT(*)`,
          totalUsed: sqlExpr<number>`SUM(times_used)`,
          avgRelevance: sqlExpr<number>`AVG(relevance_score)`,
          uniqueDomains: sqlExpr<number>`COUNT(DISTINCT source_domain)`,
        }).from(lib);
        const domainStatsResult = await dbConn.select({
          whitelisted: sqlExpr<number>`SUM(CASE WHEN status = 'whitelisted' THEN 1 ELSE 0 END)`,
          blacklisted: sqlExpr<number>`SUM(CASE WHEN status = 'blacklisted' THEN 1 ELSE 0 END)`,
          unknown: sqlExpr<number>`SUM(CASE WHEN status IN ('unknown', 'pending_review') THEN 1 ELSE 0 END)`,
          totalSourced: sqlExpr<number>`SUM(images_sourced)`,
          totalRejected: sqlExpr<number>`SUM(images_rejected)`,
        }).from(imageSourceDomains);
        return { library: libStatsResult[0] ?? null, domains: domainStatsResult[0] ?? null };
      }),
  }),
  // ─── Dashboard ──────────────────────────────────────
  dashboard: router({
    getSnapshot: tenantOrAdminProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { articles, distributionQueue, newsletterSubscribers } = await import("../drizzle/schema");
      const { eq, and, or, isNull, desc, gte, sql } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (!dbConn) return null;

      const licenseId = ctx.licenseId;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        articleCounts,
        missingImageCount,
        missingGeoCount,
        totalViews,
        topArticles,
        articlesThisMonth,
        articlesByDay,
        socialStats,
        subscriberCount,
        trendingArticles,
        editorPicksCount,
      ] = await Promise.all([
        dbConn.select({ status: articles.status, count: sql<number>`COUNT(*)` })
          .from(articles).where(eq(articles.licenseId, licenseId)).groupBy(articles.status),

        dbConn.select({ count: sql<number>`COUNT(*)` }).from(articles)
          .where(and(eq(articles.licenseId, licenseId), eq(articles.status, "published"),
            or(isNull(articles.featuredImage), eq(articles.featuredImage, "")))),

        dbConn.select({ count: sql<number>`COUNT(*)` }).from(articles)
          .where(and(eq(articles.licenseId, licenseId), eq(articles.status, "published"),
            or(isNull(articles.geoSummary), eq(articles.geoSummary, "")))),

        dbConn.select({ total: sql<number>`COALESCE(SUM(${articles.views}), 0)` }).from(articles)
          .where(and(eq(articles.licenseId, licenseId), eq(articles.status, "published"))),

        dbConn.select({ id: articles.id, headline: articles.headline, slug: articles.slug,
          views: articles.views, publishedAt: articles.publishedAt, featuredImage: articles.featuredImage })
          .from(articles).where(and(eq(articles.licenseId, licenseId), eq(articles.status, "published")))
          .orderBy(desc(articles.views)).limit(5),

        dbConn.select({ count: sql<number>`COUNT(*)` }).from(articles)
          .where(and(eq(articles.licenseId, licenseId), gte(articles.createdAt, startOfMonth))),

        dbConn.select({ date: sql<string>`DATE(created_at)`, count: sql<number>`COUNT(*)` })
          .from(articles).where(and(eq(articles.licenseId, licenseId), gte(articles.createdAt, thirtyDaysAgo)))
          .groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`),

        // distributionQueue has no licenseId column — join through articles to scope by license
        dbConn.select({ platform: distributionQueue.platform, status: distributionQueue.status,
          count: sql<number>`COUNT(*)` })
          .from(distributionQueue)
          .innerJoin(articles, eq(distributionQueue.articleId, articles.id))
          .where(and(eq(articles.licenseId, licenseId), gte(distributionQueue.createdAt, thirtyDaysAgo)))
          .groupBy(distributionQueue.platform, distributionQueue.status)
          .catch(() => []),

        // newsletterSubscribers has no licenseId — count all active subscribers globally
        dbConn.select({ count: sql<number>`COUNT(*)` }).from(newsletterSubscribers)
          .where(eq(newsletterSubscribers.status, "active"))
          .catch(() => [{ count: 0 }]),

        dbConn.select({ id: articles.id, headline: articles.headline, slug: articles.slug, views: articles.views })
          .from(articles).where(and(eq(articles.licenseId, licenseId), eq(articles.isTrending, true)))
          .orderBy(desc(articles.views)).limit(5),

        dbConn.select({ count: sql<number>`COUNT(*)` }).from(articles)
          .where(and(eq(articles.licenseId, licenseId), eq(articles.isEditorsPick, true))),
      ]);

      const statusMap: Record<string, number> = {};
      for (const r of articleCounts) statusMap[r.status] = Number(r.count);
      const totalArticles = articleCounts.reduce((sum, r) => sum + Number(r.count), 0);

      const socialMap: Record<string, { sent: number; failed: number; pending: number }> = {};
      for (const row of (socialStats as any[])) {
        if (!socialMap[row.platform]) socialMap[row.platform] = { sent: 0, failed: 0, pending: 0 };
        if (row.status === "sent" || row.status === "posted") socialMap[row.platform].sent += Number(row.count);
        else if (row.status === "failed") socialMap[row.platform].failed += Number(row.count);
        else socialMap[row.platform].pending += Number(row.count);
      }

      return {
        articles: {
          total: totalArticles,
          published: statusMap.published ?? 0,
          pending: statusMap.pending ?? 0,
          approved: statusMap.approved ?? 0,
          draft: statusMap.draft ?? 0,
          rejected: statusMap.rejected ?? 0,
          thisMonth: Number(articlesThisMonth[0]?.count ?? 0),
          missingImage: Number(missingImageCount[0]?.count ?? 0),
          missingGeo: Number(missingGeoCount[0]?.count ?? 0),
          editorsPicks: Number(editorPicksCount[0]?.count ?? 0),
          byDay: articlesByDay,
        },
        views: { total: Number(totalViews[0]?.total ?? 0) },
        topArticles,
        trendingArticles,
        social: socialMap,
        newsletter: { subscribers: Number(subscriberCount[0]?.count ?? 0) },
      };
    }),
  }),

});

export type AppRouter = typeof appRouter;
