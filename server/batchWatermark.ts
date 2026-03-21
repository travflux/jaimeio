import * as db from "./db";
import { watermarkImageFromUrl, getWatermarkSettings } from "./watermark";
import { storagePut } from "./storage";

/**
 * Batch watermark existing article images
 * Downloads each image, applies watermark, uploads back to S3, and updates database
 */
export async function batchWatermarkArticles(options: {
  limit?: number;
  dryRun?: boolean;
  forceReprocess?: boolean; // Re-watermark even if already watermarked
  onProgress?: (current: number, total: number, articleId: number) => void;
}) {
  const { limit = 20, dryRun = false, forceReprocess = false, onProgress } = options; // Default to 20 images per batch

  // Get watermark settings
  const watermarkSettings = await getWatermarkSettings();

  console.log("[Batch Watermark] Starting batch watermark process...");
  console.log("[Batch Watermark] Settings:", watermarkSettings);

  // Query database directly to get all articles with images, bypassing blocked source filtering
  const { getDb } = await import("./db");
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("DB not available");

  const { articles } = await import("../drizzle/schema");
  const { isNotNull, notLike, and } = await import("drizzle-orm");
  
  // Get articles with images
  // If forceReprocess is true, include already-watermarked images
  // Otherwise, skip images with "watermarked/" in their URL
  const articlesWithImages = await dbInstance
    .select()
    .from(articles)
    .where(
      forceReprocess
        ? isNotNull(articles.featuredImage)
        : and(
            isNotNull(articles.featuredImage),
            notLike(articles.featuredImage, "%watermarked/%")
          )
    )
    .limit(limit);
  
  const total = articlesWithImages.length;

  console.log(`[Batch Watermark] Found ${total} articles with images`);

  if (dryRun) {
    console.log("[Batch Watermark] DRY RUN - No changes will be made");
    return { total, processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ articleId: number; error: string }> = [];

  for (const article of articlesWithImages) {
    processed++;
    
    try {
      if (onProgress) {
        onProgress(processed, total, article.id);
      }

      console.log(`[Batch Watermark] Processing article ${article.id} (${processed}/${total}): ${article.headline}`);

      if (!article.featuredImage) {
        console.log(`[Batch Watermark] Skipping article ${article.id} - no featured image`);
        continue;
      }

      // Download image, add watermark, upload back
      const watermarkedBuffer = await watermarkImageFromUrl(
        article.featuredImage,
        watermarkSettings
      );

      // Upload watermarked image to S3
      const timestamp = Date.now();
      const { url } = await storagePut(
        `watermarked/${article.id}-${timestamp}.jpg`,
        watermarkedBuffer,
        "image/jpeg"
      );

      // Update article with new watermarked image URL
      await db.updateArticle(article.id, {
        featuredImage: url,
      });

      succeeded++;
      console.log(`[Batch Watermark] ✓ Successfully watermarked article ${article.id}`);
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ articleId: article.id, error: errorMsg });
      console.error(`[Batch Watermark] ✗ Failed to watermark article ${article.id}:`, errorMsg);
    }
  }

  console.log("[Batch Watermark] Batch process complete");
  console.log(`[Batch Watermark] Total: ${total}, Succeeded: ${succeeded}, Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("[Batch Watermark] Errors:");
    errors.forEach(e => console.log(`  Article ${e.articleId}: ${e.error}`));
  }

  return { total, processed, succeeded, failed, errors };
}

/**
 * Get batch watermark progress/status
 */
export async function getBatchWatermarkStatus() {
  const { getDb } = await import("./db");
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("DB not available");

  // Query database directly to get all articles, bypassing blocked source filtering
  const { articles } = await import("../drizzle/schema");
  const { isNotNull, notLike, and } = await import("drizzle-orm");
  
  const allArticles = await dbInstance.select().from(articles);
  const articlesWithImages = await dbInstance.select().from(articles).where(
    and(
      isNotNull(articles.featuredImage),
      notLike(articles.featuredImage, "%watermarked/%")
    )
  );

  return {
    totalArticles: allArticles.length,
    articlesWithImages: articlesWithImages.length,
  };
}
