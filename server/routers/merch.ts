/**
 * Merch Store tRPC Router — CEO Architecture v2 (Mar 3, 2026)
 *
 * New Architecture: ZERO Printify API calls during customer shopping experience.
 * - getShopConfig: returns all settings + article data needed for instant render
 * - captureLead: email capture → redirect to Printify storefront
 * - startPipeline: fire-and-forget (admin/post-purchase use only)
 * - Daily auto-check: availability monitor (separate cron job)
 * - Manual sync: admin button in Settings → Merch Store
 *
 * Page load flow:
 * 1. ShopPage calls merch.getShopConfig (single DB query, no Printify)
 * 2. Client composites article image onto blank mockup using CSS overlay
 * 3. Buy Now always active — no waiting
 * 4. Email capture → captureLead → redirect to storefront URL (merch_printify_storefront_url setting)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { runMerchPipeline } from "../merch/pipeline";
import { recordConversionEvent, updateSessionConversionFlag } from "../attribution";

export const ALL_PRODUCT_TYPES = ["mug", "shirt", "poster", "case", "canvas", "tote", "hoodie", "mousepad", "candle", "cards"] as const;
export type ProductType = typeof ALL_PRODUCT_TYPES[number];

const PIPELINE_PRODUCT_TYPES = ["mug", "shirt", "poster", "case"] as const;
type PipelineProductType = typeof PIPELINE_PRODUCT_TYPES[number];

/** CDN URLs for blank mockup images (uploaded once, served forever) */
export const BLANK_MOCKUP_URLS: Record<ProductType, string> = {
  mug:      "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/mug-blank_750ed133.png",
  shirt:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/shirt-blank_96ea0f08.png",
  poster:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/poster-blank_d34d754d.png",
  case:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/case-blank_45ee451d.png",
  canvas:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/canvas-blank_b2f81ee8.png",
  tote:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/tote-blank_5cbad66c.png",
  hoodie:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/hoodie-blank_3717ba2f.png",
  mousepad: "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/mousepad-blank_6fba4e35.png",
  candle:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/candle-blank_a434bd7f.png",
  cards:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663360362586/4wsqNcW8uBjUqkvadz54Yt/cards-blank_b97c3122.png",
};

/** Default print area configs (x, y, scale) — overridden by DB settings if present */
const DEFAULT_PRINT_CONFIGS: Record<ProductType, { x: number; y: number; scale: number }> = {
  mug:      { x: 0.5, y: 0.5, scale: 0.393 },
  shirt:    { x: 0.5, y: 0.42, scale: 0.60 },  // chest print area
  poster:   { x: 0.5, y: 0.5, scale: 0.990 },
  case:     { x: 0.5, y: 0.55, scale: 0.719 },  // centered on case back
  canvas:   { x: 0.5, y: 0.5, scale: 0.750 },
  tote:     { x: 0.5, y: 0.5, scale: 1.023 },
  hoodie:   { x: 0.5, y: 0.5, scale: 1.035 },
  mousepad: { x: 0.5, y: 0.5, scale: 0.621 },
  candle:   { x: 0.5, y: 0.5, scale: 0.783 },
  cards:    { x: 0.5, y: 0.5, scale: 1.211 },
};

export const PRODUCT_META: Record<ProductType, { icon: string; label: string; desc: string }> = {
  mug:      { icon: "☕", label: "Mug",           desc: "11oz ceramic, dishwasher safe" },
  shirt:    { icon: "👕", label: "T-Shirt",        desc: "Unisex cotton tee" },
  poster:   { icon: "🖼",  label: "Framed Poster",  desc: "Museum-quality framed print" },
  case:     { icon: "📱", label: "Phone Case",     desc: "Tough case, iPhone & Android" },
  canvas:   { icon: "🎨", label: "Canvas Print",   desc: "Matte stretched canvas, 1.25\"" },
  tote:     { icon: "👜", label: "Tote Bag",        desc: "Cotton canvas, everyday carry" },
  hoodie:   { icon: "🧥", label: "Hoodie",          desc: "Unisex organic side-pocket hoodie" },
  mousepad: { icon: "🖱",  label: "Desk Mat",        desc: "Large format desk mat" },
  candle:   { icon: "🕯",  label: "Scented Candle",  desc: "Soy wax, 9oz & 12oz" },
  cards:    { icon: "🃏", label: "Playing Cards",   desc: "Custom poker card deck" },
};

export const merchRouter = router({
  /**
   * NEW: Returns all data needed to render the shop page instantly.
   * Single DB query — zero Printify API calls.
   * Returns: article data, all active product configs, print area configs, blank mockup URLs,
   *          cached pricing/variants if available, Printify product IDs for checkout.
   */
  getShopConfig: publicProcedure
    .input(z.object({ articleSlug: z.string() }))
    .query(async ({ input }) => {
      const article = await db.getArticleBySlug(input.articleSlug);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

      // Fetch all merch settings in one query
      const allSettings = await db.getSettingsByCategory("monetization");
      const s: Record<string, string> = {};
      for (const row of allSettings) s[row.key] = row.value ?? "";

      // Build per-product config from settings
      const products: Record<string, {
        type: ProductType;
        active: boolean;
        sidebarPosition: number;
        printifyProductId: string | null;
        printConfig: { x: number; y: number; scale: number };
        mockupUrl: string;
        meta: { icon: string; label: string; desc: string };
        // Cached pricing/variants from DB (populated if pipeline has run)
        sellPrice: number | null;
        variantData: { id: number; title: string; price: number }[];
      }> = {};

      for (const type of ALL_PRODUCT_TYPES) {
        const active = s[`merch_product_active_${type}`] !== "false"; // default true
        const sidebarPosition = parseInt(s[`merch_sidebar_position_${type}`] ?? "0", 10);
        const printifyProductId = s[`merch_product_id_${type}`] || null;
        const printConfigRaw = s[`merch_print_config_${type}`];
        let printConfig = DEFAULT_PRINT_CONFIGS[type];
        if (printConfigRaw) {
          try { printConfig = JSON.parse(printConfigRaw); } catch {}
        }
        // Read pricing/variants from global settings (populated by syncFromPrintify)
        const priceRaw = s[`merch_price_${type}`];
        const variantsRaw = s[`merch_variants_${type}`];
        let sellPrice: number | null = priceRaw ? parseFloat(priceRaw) : null;
        let variantData: { id: number; title: string; price: number }[] = [];
        if (variantsRaw) {
          try { variantData = JSON.parse(variantsRaw); } catch {}
        }
        // Fall back to pipeline cache if settings pricing not available
        if (!sellPrice) {
          const cached = await db.getMerchProduct(article.id, type);
          if (cached?.status === "ready") {
            sellPrice = Number(cached.sellPrice ?? 0) || null;
            variantData = (cached.variantData as { id: number; title: string; price: number }[]) ?? [];
          }
        }
        products[type] = {
          type,
          active,
          sidebarPosition,
          printifyProductId,
          printConfig,
          mockupUrl: s[`merch_mockup_url_${type}`] || BLANK_MOCKUP_URLS[type],
          meta: PRODUCT_META[type],
          sellPrice,
          variantData,
        };
      }

      return {
        articleId: article.id,
        articleHeadline: article.headline,
        articleImage: article.featuredImage ?? null,
        articleSlug: article.slug,
        enabled: s["merch_sidebar_enabled"] === "true",
        shopId: s["merch_printify_shop_id"] || null,
        products,
      };
    }),

  /**
   * Capture a merch lead (email + newsletter opt-in) before checkout.
   * Returns the Printify storefront checkout URL.
   * Storefront URL is read from merch_printify_storefront_url setting. Falls back to printify.com.
   */
  captureLead: publicProcedure
    .input(z.object({
      email: z.string().email(),
      articleId: z.number(),
      productType: z.string(),
      newsletterOptIn: z.boolean().default(true),
      variantId: z.number().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.createMerchLead({
        email: input.email,
        articleId: input.articleId,
        productType: input.productType,
        newsletterOptIn: input.newsletterOptIn,
        createdAt: new Date(),
      });

      if (input.newsletterOptIn) {
        try { await db.subscribeNewsletter(input.email); } catch {}
      }

      // Attribution: log merch_lead conversion event
      if (input.sessionId) {
        recordConversionEvent({ sessionId: input.sessionId, eventType: "merch_lead", articleId: input.articleId }).catch(() => {});
        updateSessionConversionFlag(input.sessionId, "merchLead").catch(() => {});
      }

      // Look up the Printify product ID from settings
      const productIdSetting = await db.getSetting(`merch_product_id_${input.productType}`);
      const shopSetting = await db.getSetting("merch_printify_shop_id");
      const shopId = shopSetting?.value;

      // Also check if we have a cached product from a pipeline run
      const cached = await db.getMerchProduct(input.articleId, input.productType);
      const printifyProductId = cached?.printifyProductId || productIdSetting?.value || null;

      // Build checkout URL: read storefront URL from settings, fall back to printify.com
      const storefrontSetting = await db.getSetting("merch_printify_storefront_url");
      const storefrontBase = storefrontSetting?.value || "https://printify.com";
      let checkoutUrl: string;
      if (printifyProductId && shopId) {
        checkoutUrl = `${storefrontBase}/products/${printifyProductId}`;
      } else if (shopId) {
        checkoutUrl = storefrontBase;
      } else {
        checkoutUrl = `https://printify.com`;
      }

      return {
        type: "physical" as const,
        checkoutUrl,
        message: "Redirecting to checkout…",
      };
    }),

  /** Check if merch sidebar is enabled (used by ArticlePage to conditionally render). */
  isEnabled: publicProcedure.query(async () => {
    const setting = await db.getSetting("merch_sidebar_enabled");
    return setting?.value === "true";
  }),

  /**
   * Fire-and-forget: start the background merch pipeline for an article.
   * Used by admin retries and post-purchase upscale flow.
   * Deduplicates: skips if a pending/ready product already exists.
   */
  startPipeline: publicProcedure
    .input(z.object({
      articleSlug: z.string(),
      productType: z.enum(PIPELINE_PRODUCT_TYPES),
    }))
    .mutation(async ({ input }) => {
      const article = await db.getArticleBySlug(input.articleSlug);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

      if (!article.featuredImage) {
        return { started: false, reason: "no_image" };
      }

      const existing = await db.getMerchProduct(article.id, input.productType);
      if (existing && (existing.status === "pending" || existing.status === "ready")) {
        return { started: false, reason: "already_exists", status: existing.status };
      }

      await db.upsertMerchProduct({
        articleId: article.id,
        productType: input.productType,
        status: "pending",
        sellPrice: "0.00",
        cachedAt: new Date(),
      });

      runMerchPipeline({
        articleId: article.id,
        productType: input.productType as PipelineProductType,
        imageUrl: article.featuredImage,
      }).catch((err) => {
        console.error(`[MerchRouter] Pipeline error for article ${article.id}:`, err);
      });

      return { started: true, reason: "pipeline_started" };
    }),

  /**
   * Admin: list all merch products with article info, status, and error details.
   */
  listProducts: publicProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(100),
      offset: z.number().int().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const rows = await db.listMerchProducts({
        limit: input?.limit ?? 100,
        offset: input?.offset ?? 0,
      });
      type Row = typeof rows[number];
      return rows.map((r: Row) => ({
        id: r.id,
        articleId: r.articleId,
        articleHeadline: r.articleHeadline ?? "(unknown)",
        articleSlug: r.articleSlug ?? "",
        productType: r.productType,
        status: r.status,
        errorMessage: r.errorMessage ?? null,
        printifyProductId: r.printifyProductId ?? null,
        basePrice: r.basePrice ? Number(r.basePrice) : null,
        sellPrice: r.sellPrice ? Number(r.sellPrice) : null,
        cachedAt: r.cachedAt,
        articleImage: r.articleImage ?? null,
      }));
    }),
  /**
   * Admin: retry a failed pipelinee for a given article + product type.
   */
  retryPipeline: publicProcedure
    .input(z.object({
      articleId: z.number().int(),
      productType: z.enum(PIPELINE_PRODUCT_TYPES),
    }))
    .mutation(async ({ input }) => {
      const article = await db.getArticleById(input.articleId);
      if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      if (!article.featuredImage) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Article has no featured image" });
      }

      await db.upsertMerchProduct({
        articleId: input.articleId,
        productType: input.productType,
        status: "pending",
        sellPrice: "0.00",
        cachedAt: new Date(),
      });

      runMerchPipeline({
        articleId: input.articleId,
        productType: input.productType as PipelineProductType,
        imageUrl: article.featuredImage,
      }).catch((err) => {
        console.error(`[MerchRouter] Retry pipeline error for article ${input.articleId}:`, err);
      });

      return { started: true };
    }),

  /**
   * Admin: check Printify availability for all active products.
   * Called by the daily cron job and the manual sync button.
   */
  checkAvailability: publicProcedure.mutation(async () => {
    const tokenSetting = await db.getSetting("merch_printify_api_token");
    const shopSetting = await db.getSetting("merch_printify_shop_id");
    const token = tokenSetting?.value;
    const shopId = shopSetting?.value;

    if (!token || !shopId) {
      return { success: false, error: "Printify credentials not configured" };
    }

    try {
      const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": `${process.env.VITE_APP_TITLE || "satire-engine"}/1.0` },
      });
      if (!res.ok) throw new Error(`Printify API ${res.status}`);
      const data = await res.json() as { data: { id: string }[] };
      const liveIds = new Set((data.data ?? []).map((p: { id: string }) => p.id));

      const results: { type: string; wasActive: boolean; nowActive: boolean }[] = [];
      for (const type of ALL_PRODUCT_TYPES) {
        const productIdSetting = await db.getSetting(`merch_product_id_${type}`);
        const activeSetting = await db.getSetting(`merch_product_active_${type}`);
        const productId = productIdSetting?.value;
        const wasActive = activeSetting?.value !== "false";

        if (!productId) continue; // not configured

        const existsInPrintify = liveIds.has(productId);
        if (wasActive && !existsInPrintify) {
          // Pause it
          await db.setSetting(`merch_product_active_${type}`, "false");
          results.push({ type, wasActive: true, nowActive: false });
        } else {
          results.push({ type, wasActive, nowActive: wasActive });
        }
      }

      // Log timestamp
      await db.setSetting("merch_last_availability_check", new Date().toISOString());

      return { success: true, checked: results.length, paused: results.filter(r => !r.nowActive && r.wasActive).length, results };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }),

  /**
   * Admin: manual sync — fetch all products from Printify and compare against local config.
   * Returns a comparison table for the admin UI.
   */
  syncFromPrintify: publicProcedure.mutation(async () => {
    const tokenSetting = await db.getSetting("merch_printify_api_token");
    const shopSetting = await db.getSetting("merch_printify_shop_id");
    const token = tokenSetting?.value;
    const shopId = shopSetting?.value;

    if (!token || !shopId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Printify credentials not configured. Set them in Admin → Settings → Merch Store." });
    }

    const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": `${process.env.VITE_APP_TITLE || "satire-engine"}/1.0` },
    });
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Printify API error ${res.status}` });

    const data = await res.json() as { data: { id: string; title: string; blueprint_id: number; print_provider_id: number; variants: { id: number; title: string; price: number }[] }[] };
    const liveProducts = data.data ?? [];

    // Build local config map
    const allSettings = await db.getSettingsByCategory("monetization");
    const s: Record<string, string> = {};
    for (const row of allSettings) s[row.key] = row.value ?? "";

    const rows = await Promise.all(liveProducts.map(async p => {
      // Find which local type this product maps to
      const matchedType = ALL_PRODUCT_TYPES.find(t => s[`merch_product_id_${t}`] === p.id) ?? null;
      const isActive = matchedType ? s[`merch_product_active_${matchedType}`] !== "false" : false;

      // Cache pricing and variants globally in settings (no pipeline needed for pricing)
      if (matchedType && p.variants && p.variants.length > 0) {
        type PrintifyVariant = { id: number; title: string; price: number; is_enabled?: boolean };
        const enabledVariants = (p.variants as PrintifyVariant[]).filter(v => v.is_enabled !== false);
        const cheapest = enabledVariants.reduce(
          (min: PrintifyVariant | null, v: PrintifyVariant) => (!min || v.price < min.price ? v : min),
          null
        );
        if (cheapest) {
          const priceDollars = (cheapest.price / 100).toFixed(2);
          const variantsForStore = enabledVariants.slice(0, 20).map(v => ({ id: v.id, title: v.title, price: +(v.price / 100).toFixed(2) }));
          await db.setSetting(`merch_price_${matchedType}`, priceDollars, "monetization");
          await db.setSetting(`merch_variants_${matchedType}`, JSON.stringify(variantsForStore), "monetization");
        }
      }

      return {
        printifyProductId: p.id,
        printifyTitle: p.title,
        blueprintId: p.blueprint_id,
        printProviderId: p.print_provider_id,
        variantCount: p.variants?.length ?? 0,
        localType: matchedType,
        isActive,
        isNew: !matchedType,
      };
    }));

    // Find locally configured products NOT in Printify
    const liveIds = new Set(liveProducts.map(p => p.id));
    const removed = ALL_PRODUCT_TYPES
      .filter(t => s[`merch_product_id_${t}`] && !liveIds.has(s[`merch_product_id_${t}`]))
      .map(t => ({ localType: t, printifyProductId: s[`merch_product_id_${t}`], status: "removed" as const }));

    // Log timestamp
    await db.setSetting("merch_last_manual_sync", new Date().toISOString());

    return { rows, removed, syncedAt: new Date().toISOString() };
  }),

  /**
   * Lightweight: returns sidebar product list sorted by position.
   * Used by MerchSidebar on article pages — single DB query, zero Printify calls.
   */
  getSidebarConfig: publicProcedure
    .query(async () => {
      const allSettings = await db.getSettingsByCategory("monetization");
      const s: Record<string, string> = {};
      for (const row of allSettings) s[row.key] = row.value ?? "";

      if (s["merch_sidebar_enabled"] !== "true") return { enabled: false, products: [] };

      const products = ALL_PRODUCT_TYPES
        .map(type => ({
          type,
          active: s[`merch_product_active_${type}`] !== "false",
          sidebarPosition: parseInt(s[`merch_sidebar_position_${type}`] ?? "0", 10),
          meta: PRODUCT_META[type],
        }))
        .filter(p => p.active && p.sidebarPosition > 0)
        .sort((a, b) => a.sidebarPosition - b.sidebarPosition)
        .slice(0, 5); // max 5 in sidebar

      return { enabled: true, products };
    }),

  /**
   * Admin: update product active/position settings.
   */
  updateProductSettings: publicProcedure
    .input(z.object({
      type: z.enum(ALL_PRODUCT_TYPES),
      active: z.boolean().optional(),
      sidebarPosition: z.number().int().min(0).max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.active !== undefined) {
        await db.setSetting(`merch_product_active_${input.type}`, input.active ? "true" : "false");
      }
      if (input.sidebarPosition !== undefined) {
        await db.setSetting(`merch_sidebar_position_${input.type}`, String(input.sidebarPosition));
      }
      return { updated: true };
    }),

  /**
   * Admin: remove a product from the local sync mapping.
   * Use this to discard erroneously listed products (e.g., test articles
   * that appeared in the Printify product list).
   * Clears the merch_product_id_* setting for the given Printify product ID.
   */
  removeFromSync: publicProcedure
    .input(z.object({
      printifyProductId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Find which local type key maps to this Printify product ID
      const allSettings = await db.getAllSettings();
      const settingsMap: Record<string, string> = {};
      for (const row of allSettings) settingsMap[row.key] = row.value ?? "";

      const matchingKey = Object.entries(settingsMap).find(
        ([key, val]) => key.startsWith('merch_product_id_') && val === input.printifyProductId
      )?.[0];

      if (matchingKey) {
        // Clear the mapping by setting the value to empty string
        await db.setSetting(matchingKey, '');
      }
      return { removed: !!matchingKey, key: matchingKey ?? null };
    }),

  /**
   * Admin: apply a reviewed sync result.
   * Accepts a list of proposed changes (each with an `apply` flag) and executes
   * only those the admin has approved:
   *   - deactivate: sets merch_product_active_{type} = 'false' and removes from sidebar
   *   - assignType: writes merch_product_id_{type} = printifyProductId and activates the type
   *   - removeFromSidebar: sets merch_sidebar_position_{type} = '0' and compacts remaining positions
   */
  applySync: publicProcedure
    .input(z.object({
      changes: z.array(z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("deactivate"),
          localType: z.enum(ALL_PRODUCT_TYPES),
          apply: z.boolean(),
        }),
        z.object({
          kind: z.literal("assignType"),
          printifyProductId: z.string().min(1),
          localType: z.enum(ALL_PRODUCT_TYPES),
          apply: z.boolean(),
        }),
        z.object({
          kind: z.literal("removeFromSidebar"),
          localType: z.enum(ALL_PRODUCT_TYPES),
          apply: z.boolean(),
        }),
      ])),
    }))
    .mutation(async ({ input }) => {
      const applied: string[] = [];
      const skipped: string[] = [];

      // Load current sidebar positions for compaction
      const allSettings = await db.getSettingsByCategory("monetization");
      const s: Record<string, string> = {};
      for (const row of allSettings) s[row.key] = row.value ?? "";

      // Track which types need sidebar removal
      const sidebarRemovals = new Set<string>();

      for (const change of input.changes) {
        const label = change.kind === "assignType"
          ? `${change.kind}:${change.localType}=${change.printifyProductId}`
          : `${change.kind}:${change.localType}`;

        if (!change.apply) {
          skipped.push(label);
          continue;
        }

        if (change.kind === "deactivate") {
          await db.setSetting(`merch_product_active_${change.localType}`, "false", "monetization");
          sidebarRemovals.add(change.localType);
          applied.push(label);
        } else if (change.kind === "assignType") {
          await db.setSetting(`merch_product_id_${change.localType}`, change.printifyProductId, "monetization");
          await db.setSetting(`merch_product_active_${change.localType}`, "true", "monetization");
          applied.push(label);
        } else if (change.kind === "removeFromSidebar") {
          sidebarRemovals.add(change.localType);
          applied.push(label);
        }
      }

      // Compact sidebar positions: zero out removed, re-number remaining
      if (sidebarRemovals.size > 0) {
        const remaining = ALL_PRODUCT_TYPES
          .map(t => ({ type: t, pos: parseInt(s[`merch_sidebar_position_${t}`] ?? "0", 10) }))
          .filter(x => x.pos > 0 && !sidebarRemovals.has(x.type))
          .sort((a, b) => a.pos - b.pos);
        for (const t of Array.from(sidebarRemovals)) {
          await db.setSetting(`merch_sidebar_position_${t}`, "0", "monetization");
        }
        for (let i = 0; i < remaining.length; i++) {
          await db.setSetting(`merch_sidebar_position_${remaining[i].type}`, String(i + 1), "monetization");
        }
      }

      return { applied, skipped, appliedCount: applied.length };
    }),
});
