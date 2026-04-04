/**
 * Social Distribution Router
 * tRPC procedures for the Admin Social Distribution dashboard.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, tenantOrAdminProcedure, router } from "../_core/trpc";
import * as db from "../db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const distributionRouter = router({
  // ─── Queue ──────────────────────────────────────────────────────────────────
  queue: adminProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(({ input, ctx }) => db.getDistributionQueue({ ...(input ?? {}), licenseId: ctx.licenseId || undefined })),

  queueStats: adminProcedure.query(({ ctx }) => db.getDistributionQueueStats(ctx.licenseId || undefined)),

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

  testBlotato: adminProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      const { testBlotatoConnection } = await import("../blotato");
      return testBlotatoConnection(input.apiKey);
    }),

  getBlotatoStatus: tenantOrAdminProcedure.query(async ({ ctx }) => {
    let keyValue: string | null = null;
    if (ctx.licenseId) {
      const ls = await db.getLicenseSetting(ctx.licenseId, "blotato_api_key");
      keyValue = ls?.value || null;
    }
    if (!keyValue) {
      const gs = await db.getSetting("blotato_api_key");
      keyValue = gs?.value || null;
    }
    return {
      configured: !!keyValue,
      maskedKey: keyValue ? keyValue.substring(0, 8) + "..." : null,
    };
  }),

  // Tenant-aware Blotato connection test (reads API key from license_settings)
  testBlotatoConnection: tenantOrAdminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.licenseId) return { success: false, error: "No license context" };
    const ls = await db.getLicenseSetting(ctx.licenseId, "blotato_api_key");
    const apiKey = ls?.value || null;
    if (!apiKey) return { success: false, error: "No Blotato API key configured" };
    const { testBlotatoConnection } = await import("../blotato");
    return testBlotatoConnection(apiKey);
  }),

  // List stored Blotato accounts for a tenant (reads from license_settings, no API call)
  getBlotatoAccounts: tenantOrAdminProcedure.query(async ({ ctx }) => {
    if (!ctx.licenseId) return { accounts: [], hasApiKey: false, isConfigured: false };
    const accounts = await db.getBlotatoAccountsFromSettings(ctx.licenseId);
    const ls = await db.getLicenseSetting(ctx.licenseId, "blotato_api_key");
    return {
      accounts,
      hasApiKey: !!(ls?.value),
      isConfigured: accounts.length > 0,
    };
  }),

  // Sync Blotato accounts from API and store in license_settings
  syncBlotatoAccounts: tenantOrAdminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
    const ls = await db.getLicenseSetting(ctx.licenseId, "blotato_api_key");
    const apiKey = ls?.value || null;
    if (!apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "No Blotato API key configured" });

    const { getBlotatoAccounts, getBlotatoSubaccounts } = await import("../blotato");
    const accounts = await getBlotatoAccounts(apiKey);

    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        let pageId: string | undefined;
        if (account.platform === "facebook" || account.platform === "linkedin") {
          try {
            const subaccounts = await getBlotatoSubaccounts(apiKey, account.id);
            if (subaccounts.length > 0) pageId = subaccounts[0].id;
          } catch { /* no subaccounts */ }
        }
        return {
          id: account.id,
          platform: account.platform,
          username: account.username || account.fullname,
          ...(pageId && { pageId }),
        };
      })
    );

    await db.storeBlotatoAccounts(ctx.licenseId, enrichedAccounts);
    return { success: true, accounts: enrichedAccounts, count: enrichedAccounts.length };
  }),

  // Save Blotato API key and auto-sync accounts
  saveBlotatoApiKey: tenantOrAdminProcedure
    .input(z.object({ apiKey: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { licenseSettings } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const [existing] = await database.select().from(licenseSettings)
        .where(and(eq(licenseSettings.licenseId, ctx.licenseId), eq(licenseSettings.key, "blotato_api_key")))
        .limit(1);
      if (existing) {
        await database.update(licenseSettings).set({ value: input.apiKey }).where(eq(licenseSettings.id, existing.id));
      } else {
        await database.insert(licenseSettings).values({ licenseId: ctx.licenseId, key: "blotato_api_key", value: input.apiKey, type: "string" });
      }
      // Auto-sync accounts
      import("../blotato").then(({ syncBlotatoAccountsForLicense }) => {
        syncBlotatoAccountsForLicense(ctx.licenseId!).catch(e => console.error("[Blotato] Auto-sync failed:", e));
      });
      return { success: true };
    }),

  // Get stored schedule slots
  getScheduleSlots: tenantOrAdminProcedure.query(async ({ ctx }) => {
    if (!ctx.licenseId) return [];
    return db.getScheduleSlots(ctx.licenseId);
  }),

  // Save schedule slots and sync to Blotato
  saveScheduleSlots: tenantOrAdminProcedure
    .input(z.object({
      slots: z.array(z.object({
        platform: z.string(),
        day: z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]),
        hour: z.number().min(0).max(23),
        minute: z.number().min(0).max(59),
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
      await db.saveScheduleSlots(ctx.licenseId, input.slots);
      // Sync to Blotato in background
      import("../blotato").then(({ syncSlotsToBlotato }) => {
        syncSlotsToBlotato(ctx.licenseId!, input.slots).catch(e => console.error("[Blotato] Slot sync failed:", e));
      });
      return { success: true, count: input.slots.length };
    }),

  // Manually trigger slot sync to Blotato
  syncSlotsToBlotato: tenantOrAdminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.licenseId) throw new TRPCError({ code: "BAD_REQUEST", message: "No license context" });
    const slots = await db.getScheduleSlots(ctx.licenseId);
    if (slots.length === 0) return { success: false, error: "No slots configured" };
    const { syncSlotsToBlotato } = await import("../blotato");
    await syncSlotsToBlotato(ctx.licenseId, slots);
    return { success: true };
  }),

});
