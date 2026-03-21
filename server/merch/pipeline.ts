/**
 * Merch Pipeline — Background Product Creation
 *
 * Architecture: fire-and-forget on shop page load.
 * 1. Customer hits /shop/:slug → ShopPage renders instantly with 1024px article image
 * 2. Frontend calls merch.startPipeline → this module runs in the background
 * 3. Pipeline: upscale image via Replicate → upload to Printify → create product → save to DB
 * 4. Frontend polls merch.getProduct every 3s; Buy button activates when status = "ready"
 *
 * Fixes:
 * - Staggered start per product type (avoids simultaneous Replicate calls → 429)
 * - Rate-limit retry with exponential backoff on Replicate 429
 * - Variant cap at 50 (Printify max 100, we use 50 for safety — fixes shirt 400 error)
 * - Checkout URL uses printify.com/app/store (works without published storefront)
 * - Digital product type removed (no free content)
 */

import * as db from "../db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineOptions {
  articleId: number;
  productType: "mug" | "shirt" | "poster" | "case";
  imageUrl: string;
}

// Stagger delays so concurrent page loads don't all hit Replicate at once
const PRODUCT_DELAY_MS: Record<string, number> = {
  mug: 0,
  shirt: 10000,
  poster: 20000,
  case: 30000,
};

// ── Retry helper ──────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 10000
): Promise<T> {
  let lastErr: Error = new Error("Unknown error");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const isRateLimit =
        lastErr.message.includes("429") || lastErr.message.includes("throttled");
      if (!isRateLimit || attempt === maxAttempts) throw lastErr;
      const delay = baseDelayMs * attempt + Math.random() * 3000;
      console.log(
        `[MerchPipeline] Rate-limited (429), retrying in ${Math.round(delay / 1000)}s (attempt ${attempt}/${maxAttempts})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ── Step 1: Upscale via Replicate ─────────────────────────────────────────────

async function upscaleImage(imageUrl: string, replicateKey: string): Promise<string> {
  return withRetry(async () => {
    const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        input: { image: imageUrl, scale: 4, face_enhance: false },
      }),
    });

    if (!submitRes.ok) {
      const body = await submitRes.text().catch(() => "");
      throw new Error(`Replicate submit failed (${submitRes.status}): ${body}`);
    }

    const prediction = (await submitRes.json()) as { id: string };
    if (!prediction.id) throw new Error("No prediction ID from Replicate");

    // Poll until complete (max 3 minutes)
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { Authorization: `Token ${replicateKey}` } }
      );
      if (!pollRes.ok) continue;
      const result = (await pollRes.json()) as {
        status: string;
        output?: string | string[];
        error?: string;
      };
      if (result.status === "succeeded") {
        const output = Array.isArray(result.output) ? result.output[0] : result.output;
        if (!output) throw new Error("Replicate succeeded but returned no output URL");
        return output;
      }
      if (result.status === "failed" || result.status === "canceled") {
        throw new Error(`Replicate prediction ${result.status}: ${result.error || "unknown"}`);
      }
    }
    throw new Error("Replicate upscale timed out after 3 minutes");
  });
}

// ── Step 2: Upload image to Printify ─────────────────────────────────────────

async function uploadToPrintify(
  imageUrl: string,
  printifyToken: string,
  filename: string
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.printify.com/v1/uploads/images.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${printifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_name: filename, url: imageUrl }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Printify upload failed (${res.status}): ${err}`);
      }
      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new Error(`No image ID from Printify: ${JSON.stringify(data)}`);
      return data.id;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw new Error("Printify upload failed after 3 attempts");
}

// ── Step 3: Create Printify product ──────────────────────────────────────────

interface PrintifyProductResult {
  productId: string;
  checkoutUrl: string;
  mockupUrls: string[];
  basePrice: number; // cents
}

async function createPrintifyProduct(
  imageId: string,
  articleSlug: string,
  articleHeadline: string,
  productType: string,
  printifyToken: string,
  shopId: string,
  settings: Record<string, string>
): Promise<PrintifyProductResult> {
  const blueprintId = parseInt(settings[`merch_blueprint_${productType}`] || "0");
  const providerId = parseInt(settings[`merch_print_provider_${productType}`] || "0");
  const markupPercent = parseFloat(settings["merch_markup_percent"] || "40");

  if (!blueprintId || !providerId) {
    throw new Error(`No blueprint/provider configured for product type: ${productType}`);
  }

  // Fetch available variants from Printify catalog, capped at 50
  const variantsRes = await fetch(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
    { headers: { Authorization: `Bearer ${printifyToken}` } }
  );
  if (!variantsRes.ok) {
    throw new Error(`Failed to fetch variants for blueprint ${blueprintId}: ${variantsRes.status}`);
  }
  const variantsData = (await variantsRes.json()) as {
    variants: Array<{ id: number; cost?: number; is_available?: boolean }>;
  };

  // Filter to available variants only, cap at 50
  const availableVariants = (variantsData.variants || [])
    .filter((v) => v.is_available !== false)
    .slice(0, 50);

  if (availableVariants.length === 0) {
    throw new Error(`No available variants for blueprint ${blueprintId}`);
  }

  const variantIds = availableVariants.map((v) => v.id);
  const baseCost = availableVariants[0]?.cost ?? 1000; // cents

  // Calculate sell price with markup (charm pricing: .99 ending)
  const sellPriceCents = Math.round(baseCost * (1 + markupPercent / 100));
  const sellPriceDollars = Math.floor(sellPriceCents / 100) + 0.99;

  // Parse print config
  let printConfig = { x: 0.5, y: 0.5, scale: 0.5, angle: 0 };
  const configRaw = settings[`merch_print_config_${productType}`];
  if (configRaw) {
    try { printConfig = { ...printConfig, ...JSON.parse(configRaw) }; } catch {}
  }

  const productBody = {
    title: `${articleHeadline.substring(0, 60)} — ${process.env.VITE_APP_TITLE || "Satire"}`,

    description: `Inspired by the article: "${articleHeadline}". Visit ${process.env.SITE_URL || "our site"} for more.`,

    blueprint_id: blueprintId,
    print_provider_id: providerId,
    variants: variantIds.map((id) => ({
      id,
      price: Math.round(sellPriceDollars * 100),
      is_enabled: true,
    })),
    print_areas: [
      {
        variant_ids: variantIds,
        placeholders: [
          {
            position: "front",
            images: [
              {
                id: imageId,
                x: printConfig.x,
                y: printConfig.y,
                scale: printConfig.scale,
                angle: printConfig.angle ?? 0,
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://api.printify.com/v1/shops/${shopId}/products.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${printifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productBody),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Printify product creation failed (${res.status}): ${err}`);
  }

  const product = (await res.json()) as {
    id: string;
    images?: Array<{ src: string }>;
  };

  if (!product.id) throw new Error(`No product ID from Printify: ${JSON.stringify(product)}`);

  const mockupUrls = (product.images || [])
    .filter((img) => img.src)
    .map((img) => img.src)
    .slice(0, 4);

  // Checkout URL: printify.com/app/store works without a published storefront
  const checkoutUrl = `https://printify.com/app/store/products/${product.id}/order`;

  return { productId: product.id, checkoutUrl, mockupUrls, basePrice: baseCost };
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

/**
 * Fire-and-forget: call this without await from the tRPC procedure.
 * Updates the DB when complete (status: ready) or on failure (status: failed).
 */
export async function runMerchPipeline(options: PipelineOptions): Promise<void> {
  const { articleId, productType, imageUrl } = options;

  // Stagger start to avoid simultaneous Replicate calls
  const delay = PRODUCT_DELAY_MS[productType] ?? 0;
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }

  try {
    const settingKeys = [
      "image_provider_replicate_api_key",
      "merch_printify_api_token",
      "merch_printify_shop_id",
      "merch_markup_percent",
      `merch_blueprint_${productType}`,
      `merch_print_provider_${productType}`,
      `merch_product_id_${productType}`,
      `merch_print_config_${productType}`,
    ];

    const settingsArr = await Promise.all(settingKeys.map((k) => db.getSetting(k)));
    const settings: Record<string, string> = {};
    settingKeys.forEach((k, i) => {
      if (settingsArr[i]?.value) settings[k] = settingsArr[i]!.value;
    });

    const replicateKey = settings["image_provider_replicate_api_key"];
    const printifyToken = settings["merch_printify_api_token"];
    const shopId = settings["merch_printify_shop_id"];

    if (!replicateKey) throw new Error("No Replicate API key configured");
    if (!printifyToken) throw new Error("No Printify API token configured");
    if (!shopId) throw new Error("No Printify shop ID configured");

    // Step 1: Upscale
    console.log(`[MerchPipeline] Upscaling for article ${articleId} (${productType})`);
    const upscaledUrl = await upscaleImage(imageUrl, replicateKey);
    console.log(`[MerchPipeline] Upscale done: ${upscaledUrl.substring(0, 60)}...`);
    await db.updateMerchProductStatus(articleId, productType, "pending", undefined, upscaledUrl);

    // Step 2: Upload to Printify
    const article = await db.getArticleById(articleId);
    const filename = `merch-${article?.slug || articleId}-${productType}-${Date.now()}.jpg`;
    console.log(`[MerchPipeline] Uploading to Printify...`);
    const printifyImageId = await uploadToPrintify(upscaledUrl, printifyToken, filename);
    console.log(`[MerchPipeline] Printify upload done: ${printifyImageId}`);

    // Step 3: Create product
    console.log(`[MerchPipeline] Creating Printify product...`);
    const result = await createPrintifyProduct(
      printifyImageId,
      article?.slug || String(articleId),
      article?.headline || `${process.env.VITE_APP_TITLE || ""} Article`,
      productType,
      printifyToken,
      shopId,
      settings
    );
    console.log(`[MerchPipeline] Product created: ${result.productId}`);

    // Step 4: Save to DB as ready
    const markupPercent = parseFloat(settings["merch_markup_percent"] || "40");
    const basePriceDollars = result.basePrice / 100;
    const sellPriceDollars = Math.floor(basePriceDollars * (1 + markupPercent / 100)) + 0.99;

    await db.updateMerchProductReady(articleId, productType, {
      printifyProductId: result.productId,
      printifyShopId: shopId,
      blueprintId: parseInt(settings[`merch_blueprint_${productType}`] || "0"),
      mockupUrls: result.mockupUrls,
      basePrice: basePriceDollars.toFixed(2),
      sellPrice: sellPriceDollars.toFixed(2),
      upscaledImageUrl: upscaledUrl,
    });

    console.log(`[MerchPipeline] Complete: article ${articleId} (${productType}) → ${result.productId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MerchPipeline] Failed: article ${articleId} (${productType}): ${msg}`);
    await db.updateMerchProductStatus(articleId, productType, "failed", msg);
  }
}
