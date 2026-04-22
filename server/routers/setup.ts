/**
 * Setup / Onboarding Router
 * Powers the 8-screen Setup Wizard for white-label deployments.
 * All checklist state is stored in setup_checklist table (white-label compatible).
 */
import { router, protectedProcedure, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

// ─── Checklist seed data ─────────────────────────────────────────────────────

const CHECKLIST_SEED = [
  // Section: brand
  { key: "brand_name_set", label: "Set your publication name", description: "Configure your brand name in Settings → Branding", section: "brand", sortOrder: 1, isRequired: true },
  { key: "brand_tagline_set", label: "Set your tagline", description: "Configure your tagline in Settings → Branding", section: "brand", sortOrder: 2, isRequired: true },
  { key: "brand_categories_set", label: "Configure content categories", description: "Set up your content categories in Admin → Categories", section: "brand", sortOrder: 3, isRequired: true },
  { key: "brand_voice_set", label: "Configure AI voice & tone", description: "Set your editorial voice in Settings → Generation", section: "brand", sortOrder: 4, isRequired: true },
  // Section: content
  { key: "content_first_article", label: "Publish your first article", description: "Generate or write your first article", section: "content", sortOrder: 10, isRequired: true },
  { key: "content_generation_on", label: "Enable auto-generation", description: "Turn on automatic article generation in Settings → Generation", section: "content", sortOrder: 11, isRequired: false },
  { key: "content_schedule_set", label: "Set publishing schedule", description: "Configure your daily article cadence in Settings → Schedule", section: "content", sortOrder: 12, isRequired: false },
  // Section: seo
  { key: "seo_domain_set", label: "Configure your domain", description: "Set SITE_URL environment variable to your custom domain", section: "seo", sortOrder: 20, isRequired: true },
  { key: "seo_gsc_connected", label: "Connect Google Search Console", description: "Add GSC credentials in Admin → Attribution → Integrations", section: "seo", sortOrder: 21, isRequired: false },
  { key: "seo_bing_connected", label: "Connect Bing Webmaster Tools", description: "Add Bing API key in Admin → Attribution → Integrations", section: "seo", sortOrder: 22, isRequired: false },
  { key: "seo_sitemap_submitted", label: "Submit sitemap to Google", description: "Submit /content-sitemap.xml and /news-sitemap.xml in GSC", section: "seo", sortOrder: 23, isRequired: false },
  // Section: social
  { key: "social_x_connected", label: "Connect X (Twitter)", description: "Add X API credentials in Settings → Social Media", section: "social", sortOrder: 30, isRequired: false },
  { key: "social_reddit_configured", label: "Configure Reddit subreddits", description: "Map categories to subreddits in Admin → Social Distribution → Reddit Map", section: "social", sortOrder: 31, isRequired: false },
  { key: "social_distribution_on", label: "Enable social distribution", description: "Turn on auto-distribution in Admin → Social Distribution → Settings", section: "social", sortOrder: 32, isRequired: false },
  // Section: newsletter
  { key: "newsletter_resend_connected", label: "Connect Resend (email)", description: "Add RESEND_API_KEY in Settings → Secrets", section: "newsletter", sortOrder: 40, isRequired: false },
  { key: "newsletter_first_subscriber", label: "Get your first subscriber", description: "Share your newsletter signup link", section: "newsletter", sortOrder: 41, isRequired: false },
  // Section: revenue
  { key: "revenue_amazon_configured", label: "Configure Amazon affiliate", description: "Add Amazon Associates tag in Settings → Amazon Ads", section: "revenue", sortOrder: 50, isRequired: false },
  { key: "revenue_merch_configured", label: "Connect Printify (merch)", description: "Add Printify API key in Settings → Merch Store", section: "revenue", sortOrder: 51, isRequired: false },
];

// ─── Router ──────────────────────────────────────────────────────────────────

export const setupRouter = router({
  /** Get all checklist items (seeding if needed) */
  getChecklist: protectedProcedure.query(() => db.getSetupChecklist()),

  /** Mark a checklist item complete */
  completeItem: protectedProcedure
    .input(z.object({ key: z.string(), completedBy: z.string().optional() }))
    .mutation(({ input, ctx }) =>
      db.completeSetupItem(input.key, (ctx as any).user?.name ?? "admin")
    ),

  /** Mark a checklist item incomplete */
  uncompleteItem: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(({ input }) => db.uncompleteSetupItem(input.key)),

  /** Get setup completion summary */
  getSummary: protectedProcedure.query(() => db.getSetupSummary()),

  /** Save wizard step data (legacy) */
  saveWizardStep: protectedProcedure
    .input(z.object({
      step: z.enum(["brand", "voice", "categories", "social", "seo", "review"]),
      data: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input.data)) {
        await db.setSetting(`wizard_${input.step}_${key}`, value, "wizard");
      }
      return { success: true };
    }),

  /** Get wizard step data (legacy) */
  getWizardData: protectedProcedure
    .input(z.object({ step: z.enum(["brand", "voice", "categories", "social", "seo", "review"]) }))
    .query(async () => {
      const siteName = await db.getSetting("site_name") ?? "";
      const tagline = await db.getSetting("site_tagline") ?? "";
      const voiceInstructions = await db.getSetting("voice_instructions") ?? "";
      return { siteName, tagline, voiceInstructions };
    }),

  /** Check if setup has been completed */
  isSetupComplete: publicProcedure.query(() => db.isSetupComplete()),

  /** Dismiss setup banner */
  dismissBanner: protectedProcedure.mutation(async () => {
    await db.setSetting("setup_banner_dismissed", new Date().toISOString(), "system");
    return { success: true };
  }),

  /** Seed checklist if empty (called on first visit) */
  seedChecklist: protectedProcedure.mutation(() => db.seedSetupChecklistIfEmpty(CHECKLIST_SEED)),

  // ─── New 8-Screen Wizard Procedures ─────────────────────────────────────────

  /** Return which env vars are set (true/false only — never expose values) */
  getEnvStatus: adminProcedure.query(() => ({
    SITE_URL: !!process.env.SITE_URL,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    SITE_URL_VALUE: process.env.SITE_URL ?? "",
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    INDEXNOW_KEY: !!process.env.INDEXNOW_KEY,
    INDEXNOW_KEY_VALUE: process.env.INDEXNOW_KEY ?? "",
    GSC_CLIENT_ID: !!process.env.GSC_CLIENT_ID,
    GSC_CLIENT_SECRET: !!process.env.GSC_CLIENT_SECRET,
    GSC_REFRESH_TOKEN: !!process.env.GSC_REFRESH_TOKEN,
    GSC_SITE_IDENTIFIER: process.env.GSC_SITE_IDENTIFIER ?? "",
    BING_WEBMASTER_API_KEY: !!process.env.BING_WEBMASTER_API_KEY,
    X_API_KEY: !!process.env.X_API_KEY,
    X_API_SECRET: !!process.env.X_API_SECRET,
    X_ACCESS_TOKEN: !!process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: !!process.env.X_ACCESS_TOKEN_SECRET,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
  })),

  /** Get all wizard data in one call: settings map + platform credentials map + rss feed count */
  getAllWizardData: adminProcedure.query(async () => {
    const allSettings = await db.getAllSettings();
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) settingsMap[s.key] = s.value ?? "";

    // Load all platform credentials
    const platforms = ["x", "reddit", "facebook", "instagram", "bluesky", "threads", "linkedin", "resend", "twilio", "stripe", "printify"];
    const credMap: Record<string, { apiKey?: string | null; apiSecret?: string | null; extra?: string | null; isActive?: boolean | null; isValid?: boolean | null } | null> = {};
    for (const p of platforms) {
      credMap[p] = await db.getPlatformCredential(p);
    }

    // RSS feed count for Screen 9 progress calculation
    const rssFeeds = await db.getAllRssFeedWeights();
    const rssFeedCount = rssFeeds.filter(f => f.enabled !== false).length;

    return { settings: settingsMap, credentials: credMap, rssFeedCount };
  }),

  /** Save wizard settings in bulk — writes to workflow_settings table */
  saveWizardSettings: adminProcedure
    .input(z.object({ settings: z.record(z.string(), z.string()), category: z.string().optional() }))
    .mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input.settings)) {
        await db.setSetting(key, value, input.category ?? "wizard");
      }
      return { success: true };
    }),

  /** Save platform credentials and toggle state */
  savePlatformCredentials: adminProcedure
    .input(z.object({
      platform: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      extra: z.record(z.string(), z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { platform, extra, ...rest } = input;
      const extraStr = extra ? JSON.stringify(extra) : undefined;
      await db.upsertPlatformCredential(platform, { ...rest, extra: extraStr });
      return { success: true };
    }),

  /** Mark onboarding complete and optionally trigger first workflow run */
  completeLaunch: adminProcedure.mutation(async () => {
    await db.setSetting("_onboarding_completed", new Date().toISOString(), "system");
    await db.setSetting("setup_banner_dismissed", new Date().toISOString(), "system");
    // v4.7.1: Set setup_complete=true to unlock the production loop and batch workflow
    await db.setSetting("setup_complete", "true", "system");
    console.log("[Setup] setup_complete=true — production loop and batch workflow now enabled.");
    return { success: true };
  }),

  /** Test AI connection — sends a simple prompt to verify the LLM is reachable */
  testAIConnection: adminProcedure
    .input(z.object({ model: z.string().optional() }))
    .mutation(async () => {
      try {
        const { invokeLLMWithFallback: invokeLLM } = await import("../_core/llmRouter");
        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a news headline writer." },
            { role: "user", content: "Write one short news headline about technology. Just the headline, nothing else." },
          ],
        });
        const headline = (result as any)?.choices?.[0]?.message?.content ?? "";
        return { success: true, headline };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "AI connection failed. Check your API key and URL." };
      }
    }),

  /** Test Resend connection — sends a real test email */
  testResendConnection: adminProcedure
    .input(z.object({ toEmail: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        const { testResendConnection } = await import("../newsletterDigest");
        return await testResendConnection(input.toEmail);
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "Resend test failed." };
      }
    }),

  /** Test Twilio connection — sends a real test SMS */
  testTwilioConnection: adminProcedure
    .input(z.object({ toPhone: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { testTwilioConnection } = await import("../smsAdapter");
        return await testTwilioConnection(input.toPhone);
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "Twilio test failed." };
      }
    }),

  /** Test Printify connection */
  testPrintifyConnection: adminProcedure
    .input(z.object({ apiToken: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const res = await fetch("https://api.printify.com/v1/shops.json", {
          headers: { Authorization: `Bearer ${input.apiToken}` },
        });
        if (!res.ok) return { success: false, error: `Printify returned ${res.status}. Check your API token.` };
        const data = await res.json() as Array<{ title?: string }>;
        const shopName = data?.[0]?.title ?? "your shop";
        return { success: true, shopName };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "Printify connection failed." };
      }
    }),

  /** Test Stripe connection */
  testStripeConnection: adminProcedure
    .input(z.object({ secretKey: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${input.secretKey}` },
        });
        if (!res.ok) return { success: false, error: `Stripe returned ${res.status}. Check your secret key.` };
        return { success: true };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "Stripe connection failed." };
      }
    }),

  /** Test GSC connection */
  testGSCConnection: adminProcedure.mutation(async () => {
    try {
      const gscClientId = process.env.GSC_CLIENT_ID;
      const gscClientSecret = process.env.GSC_CLIENT_SECRET;
      const gscRefreshToken = process.env.GSC_REFRESH_TOKEN;
      const gscSiteIdentifier = process.env.GSC_SITE_IDENTIFIER;
      if (!gscClientId || !gscClientSecret || !gscRefreshToken) {
        return { success: false, error: "GSC credentials not configured. Set GSC_CLIENT_ID, GSC_CLIENT_SECRET, and GSC_REFRESH_TOKEN." };
      }
      // Get access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: gscClientId,
          client_secret: gscClientSecret,
          refresh_token: gscRefreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!tokenRes.ok) return { success: false, error: "Failed to get GSC access token. Check your credentials." };
      const tokenData = await tokenRes.json() as { access_token?: string };
      if (!tokenData.access_token) return { success: false, error: "GSC returned no access token." };
      // Verify site access
      const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!sitesRes.ok) return { success: false, error: `GSC API returned ${sitesRes.status}.` };
      const sitesData = await sitesRes.json() as { siteEntry?: Array<{ siteUrl?: string }> };
      const sites = sitesData.siteEntry ?? [];
      const siteUrl = gscSiteIdentifier ?? sites[0]?.siteUrl ?? "unknown";
      return { success: true, siteUrl };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "GSC connection failed." };
    }
  }),

  /** Test Bing Webmaster connection */
  testBingConnection: adminProcedure.mutation(async () => {
    try {
      const apiKey = process.env.BING_WEBMASTER_API_KEY;
      if (!apiKey) return { success: false, error: "BING_WEBMASTER_API_KEY not set." };
      const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${apiKey}`);
      if (!res.ok) return { success: false, error: `Bing returned ${res.status}. Check your API key.` };
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Bing connection failed." };
    }
  }),

  /** Test image generation */
  testImageGeneration: adminProcedure.mutation(async () => {
    try {
      const { generateImage } = await import("../_core/imageGeneration");
      const { url } = await generateImage({ prompt: "A cartoon newspaper editor looking surprised, simple illustration" });
      return { success: true, url };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : "Image generation failed." };
    }
  }),

  /** Get the effective system prompt the AI will actually use (saved override or assembled default) */
  getEffectivePrompt: adminProcedure.query(async () => {
    // Step 1: Check for saved override first
    const override = await db.getSetting("article_llm_system_prompt");
    if (override?.value) {
      return { prompt: override.value, source: "saved" as const };
    }

    // Step 2: No override — assemble from current settings
    const { buildSystemPrompt } = await import("../workflow");
    const { WRITING_STYLES } = await import("../../shared/writingStyles");

    const targetWords = parseInt((await db.getSetting("target_article_length"))?.value ?? "200", 10);
    const base = buildSystemPrompt(targetWords);

    const writingStylePrompt = (await db.getSetting("writing_style_prompt"))?.value ?? "";
    const styleName = (await db.getSetting("ai_writing_style"))?.value ?? "onion";
    const additionalInstructions = (await db.getSetting("ai_custom_prompt"))?.value ?? "";

    let style: string;
    if (writingStylePrompt) {
      style = writingStylePrompt;
    } else {
      const preset = WRITING_STYLES.find(s => s.id === styleName);
      style = preset?.prompt ?? "Write in a professional editorial style.";
    }

    let assembled = `${base}\n\n${style}`;
    if (additionalInstructions) {
      assembled += `\n\nAdditional instructions: ${additionalInstructions}`;
    }

    return { prompt: assembled, source: "default" as const };
  }),

  /** Get all RSS feeds (enabled + disabled) from the rss_feed_weights table */
  getRssFeeds: adminProcedure.query(async () => {
    return db.getAllRssFeedWeights();
  }),

  /** Add a new RSS feed URL */
  addRssFeed: adminProcedure
    .input(z.object({ feedUrl: z.string().url(), weight: z.number().min(1).max(100).optional() }))
    .mutation(async ({ input }) => {
      await db.addRssFeedWeight(input.feedUrl, input.weight ?? 50);
      return { success: true };
    }),

  /** Remove an RSS feed URL */
  removeRssFeed: adminProcedure
    .input(z.object({ feedUrl: z.string() }))
    .mutation(async ({ input }) => {
      await db.removeRssFeedWeight(input.feedUrl);
      return { success: true };
    }),

  /** Toggle an RSS feed enabled/disabled */
  toggleRssFeed: adminProcedure
    .input(z.object({ feedUrl: z.string(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.toggleRssFeedEnabled(input.feedUrl, input.enabled);
      return { success: true };
    }),

  /** Update RSS feed weight (1-100) */
  updateRssFeedWeight: adminProcedure
    .input(z.object({ feedUrl: z.string(), weight: z.number().min(1).max(100) }))
    .mutation(async ({ input }) => {
      await db.updateRssFeedWeight(input.feedUrl, input.weight);
      return { success: true };
    }),
});
