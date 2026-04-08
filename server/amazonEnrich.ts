/**
 * Amazon affiliate enrichment — extracts keywords, searches PA API, saves products to article.
 * Silently skips when Amazon is disabled or PA API credentials are not configured.
 */
import { getDb, getLicenseSetting } from "./db";
import { articles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateAmazonKeywords } from "./amazonKeywords";
import { searchAmazonProducts, type AmazonProduct } from "./amazonPaApi";

export async function amazonEnrichArticle(
  articleId: number, licenseId: number, headline: string, category: string, body: string
): Promise<void> {
  try {
    const enabled = (await getLicenseSetting(licenseId, "amazon_enabled"))?.value;
    if (enabled !== "true") return;

    const accessKey = process.env.PA_ACCESS_KEY;
    const secretKey = process.env.PA_SECRET_KEY;
    const partnerTag = (await getLicenseSetting(licenseId, "amazon_associate_tag"))?.value ?? process.env.PA_PARTNER_TAG;
    if (!accessKey || !secretKey || !partnerTag) {
      console.log(`[Amazon] PA API credentials not configured — skipping enrichment for article ${articleId}`);
      return;
    }

    const creds = { accessKey, secretKey, partnerTag, host: process.env.PA_HOST ?? "webservices.amazon.com", region: "us-east-1" };
    const productsPerArticle = parseInt((await getLicenseSetting(licenseId, "amazon_products_per_article"))?.value ?? "3");
    const minRating = parseFloat((await getLicenseSetting(licenseId, "amazon_min_rating"))?.value ?? "4.0");
    const maxPrice = parseFloat((await getLicenseSetting(licenseId, "amazon_max_price"))?.value ?? "200");

    const keywords = generateAmazonKeywords(headline, category || "general");
    if (keywords.length === 0) return;

    const allProducts: AmazonProduct[] = [];
    for (const kw of keywords.slice(0, 3)) {
      if (allProducts.length >= productsPerArticle) break;
      const results = await searchAmazonProducts(kw, creds, minRating, maxPrice);
      for (const p of results) {
        if (!allProducts.find(x => x.asin === p.asin)) { allProducts.push(p); if (allProducts.length >= productsPerArticle) break; }
      }
    }
    if (allProducts.length === 0) return;

    const db = await getDb();
    if (!db) return;
    await db.update(articles).set({ amazonProducts: JSON.stringify(allProducts.slice(0, productsPerArticle)) } as any).where(eq(articles.id, articleId));
    console.log(`[Amazon] Enriched article ${articleId} with ${allProducts.length} products`);
  } catch (err) {
    console.error(`[Amazon] Enrichment failed for article ${articleId}:`, err);
  }
}
