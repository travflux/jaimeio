/**
 * Social Distribution Router
 * tRPC procedures for the Admin Social Distribution dashboard.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const distributionRouter = router({
  // ─── Queue ──────────────────────────────────────────────────────────────────
  queue: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(({ input }) => db.getDistributionQueue(input ?? {})),

  queueStats: adminProcedure.query(() => db.getDistributionQueueStats()),

  processQueue: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const { processQueue } = await import("../socialDistribution");
      return processQueue({ limit: input?.limit ?? 10 });
    }),

  enqueueArticle: adminProcedure
    .input(z.object({ articleId: z.number(), platforms: z.array(z.string()).optional() }))
    .mutation(async ({ input }) => {
      const article = await db.getArticleById(input.articleId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      const cats = await db.listCategories();
      const categorySlug = article.categoryId ? (cats.find(c => c.id === article.categoryId)?.slug ?? null) : null;
      const { enqueueArticle } = await import("../socialDistribution");
      const count = await enqueueArticle(
        { id: article.id, slug: article.slug, headline: article.headline, subheadline: article.subheadline, categorySlug, featuredImage: article.featuredImage, publishedAt: article.publishedAt },
        { platforms: input.platforms, triggeredBy: "manual" }
      );
      return { queued: count };
    }),

  // ─── Performance Analytics ───────────────────────────────────────────────────
  performance: adminProcedure.query(() => db.getDistributionPerformance()),

  // ─── Platform Credentials ────────────────────────────────────────────────────
  getPlatformCredential: adminProcedure
    .input(z.object({ platform: z.string() }))
    .query(({ input }) => db.getPlatformCredential(input.platform)),

  upsertPlatformCredential: adminProcedure
    .input(z.object({
      platform: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      extra: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { platform, ...data } = input;
      return db.upsertPlatformCredential(platform, data);
    }),

  // Test Connection — makes a real API call to verify credentials
  testPlatformConnection: adminProcedure
    .input(z.object({
      platform: z.string(),
      credentials: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }): Promise<{ success: boolean; username?: string; error?: string }> => {
      const { platform, credentials = {} } = input;
      try {
        switch (platform) {
          case "bluesky": {
            const { identifier, password } = credentials;
            if (!identifier || !password) return { success: false, error: "Handle and App Password are required." };
            const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ identifier, password }),
            });
            if (!res.ok) {
              const body = await res.json() as { message?: string };
              return { success: false, error: body.message ?? `Bluesky returned ${res.status}. Check your handle and app password.` };
            }
            const data = await res.json() as { handle?: string };
            return { success: true, username: data.handle };
          }
          case "facebook": {
            const { pageId, pageAccessToken } = credentials;
            if (!pageId || !pageAccessToken) return { success: false, error: "Page ID and Page Access Token are required." };
            const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name&access_token=${pageAccessToken}`);
            if (!res.ok) {
              const body = await res.json() as { error?: { message?: string } };
              return { success: false, error: body.error?.message ?? `Facebook returned ${res.status}. Check your Page ID and Access Token.` };
            }
            const data = await res.json() as { name?: string };
            return { success: true, username: data.name };
          }
          case "instagram": {
            const { igUserId, pageAccessToken } = credentials;
            if (!igUserId || !pageAccessToken) return { success: false, error: "IG User ID and Page Access Token are required." };
            const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=username&access_token=${pageAccessToken}`);
            if (!res.ok) {
              const body = await res.json() as { error?: { message?: string } };
              return { success: false, error: body.error?.message ?? `Instagram API returned ${res.status}. Check your IG User ID and Access Token.` };
            }
            const data = await res.json() as { username?: string };
            return { success: true, username: data.username };
          }
          case "threads": {
            const { testThreadsConnection } = await import("../socialDistribution");
            return testThreadsConnection(credentials);
          }
          case "linkedin": {
            const { testLinkedInConnection } = await import("../socialDistribution");
            return testLinkedInConnection(credentials);
          }
          case "x": {
            const { verifyCredentials } = await import("../xTwitterService");
            // If the wizard passed credentials explicitly, use them directly;
            // otherwise fall back to DB/env via getXCredentials inside verifyCredentials.
            const result = await verifyCredentials(Object.keys(credentials).length > 0 ? credentials : undefined);
            return { success: result.valid, username: result.username, error: result.error };
          }
          default:
            return { success: false, error: `Test not available for platform: ${platform}` };
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, error: msg };
      }
    }),

  // ─── Reddit Subreddit Map ────────────────────────────────────────────────────
  getSubredditMap: adminProcedure.query(() => db.getRedditSubredditMap()),

  upsertSubreddit: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      subreddit: z.string().min(1),
      categorySlug: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      weight: z.number().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(({ input }) => db.upsertRedditSubreddit(input)),

  deleteSubreddit: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteRedditSubreddit(input.id)),

  // ─── Distribution Settings ───────────────────────────────────────────────────
  getSettings: adminProcedure.query(async () => {
    const platforms = ["x", "reddit", "facebook", "instagram", "bluesky", "threads", "linkedin"];
    const settings: Record<string, string | null> = {};
    for (const p of platforms) {
      const s = await db.getSetting(`dist_enabled_${p}`);
      settings[`dist_enabled_${p}`] = s?.value ?? null;
      const l = await db.getSetting(`dist_daily_limit_${p}`);
      settings[`dist_daily_limit_${p}`] = l?.value ?? null;
      const a = await db.getSetting(`dist_auto_approve_${p}`);
      settings[`dist_auto_approve_${p}`] = a?.value ?? null;
    }
    const replyEngine = await db.getSetting("x_reply_engine_enabled");
    settings["x_reply_engine_enabled"] = replyEngine?.value ?? null;
    return settings;
  }),

  // ─── X Env Status ─────────────────────────────────────────────────────────────
  // Returns whether X credentials are configured via server environment variables.
  // Used by the wizard to show "Configured (from server environment)" on the X card
  // when platform_credentials table is empty but env vars are set.
  getXEnvStatus: adminProcedure.query(() => {
    const configured = !!(process.env.X_API_KEY && process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET);
    return { configured };
  }),

  saveSettings: adminProcedure
    .input(z.record(z.string(), z.string()))
    .mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input)) {
        await db.setSetting(key, value, 'distribution');
      }
      return { saved: Object.keys(input).length };
    }),
});
