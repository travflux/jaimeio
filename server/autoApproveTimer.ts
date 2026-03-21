/**
 * Auto-Approve Timer
 * Scans pending articles older than N hours and approves them automatically.
 * Runs every 30 minutes. Controlled by:
 *   - auto_approve_enabled (boolean, default false)
 *   - auto_approve_after_hours (number, default 4)
 *   - auto_publish_approved (boolean) — if true, approved articles are also published immediately
 *
 * Publish gate: articles without a featured image (and no mascot fallback) are
 * approved but NOT auto-published. They stay in "approved" until an image is added.
 */

import * as db from "./db";
import { queueArticlesForX } from "./xPostQueue";
import { generateSocialPosts } from "./workflow";
import { notifyArticlePublished } from "./indexnow";
import { checkPublishGate } from "./publishGate";

let _timer: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export async function runAutoApproveCheck(): Promise<{ checked: number; approved: number; published: number }> {
  const enabledSetting = await db.getSetting("auto_approve_enabled");
  if (enabledSetting?.value !== "true") {
    return { checked: 0, approved: 0, published: 0 };
  }

  const hoursSetting = await db.getSetting("auto_approve_after_hours");
  const hours = parseFloat(hoursSetting?.value || "4");

  const pendingArticles = await db.getPendingArticlesOlderThan(hours);
  if (pendingArticles.length === 0) {
    return { checked: 0, approved: 0, published: 0 };
  }

  console.log(`[AutoApprove] Found ${pendingArticles.length} pending article(s) older than ${hours}h — approving...`);

  let approved = 0;
  let published = 0;

  const autoPublishSetting = await db.getSetting("auto_publish_approved");
  const autoPublish = autoPublishSetting?.value === "true";
  const autoCreateSetting = await db.getSetting("auto_create_social_posts");
  const autoCreate = autoCreateSetting?.value === "true";
  const autoQueueSetting = await db.getSetting("x_auto_queue_on_publish");
  const autoQueue = autoQueueSetting?.value === "true";
  const siteUrlSetting = await db.getSetting("site_url");
  const siteBaseUrl = siteUrlSetting?.value || "https://example.com";
  const socialPlatformsStr = await db.getSetting("social_platforms");
  const socialPlatforms = (socialPlatformsStr?.value || "twitter").split(",").map((p: string) => p.trim()).filter(Boolean);

  for (const article of pendingArticles) {
    try {
      await db.updateArticleStatus(article.id, "approved");
      approved++;
      console.log(`[AutoApprove] Approved article ${article.id}: "${article.headline?.slice(0, 60)}"`);

      if (autoPublish) {
        // Publish gate: only auto-publish if the article has an image
        const gate = await checkPublishGate(article.id, article.featuredImage);
        if (!gate.allowed) {
          console.log(`[AutoApprove] Skipped auto-publish for article ${article.id}: ${gate.reason}`);
        } else {
          await db.updateArticleStatus(article.id, "published");
          await db.updateArticle(article.id, { publishedAt: new Date() });
          published++;
          console.log(`[AutoApprove] Auto-published article ${article.id}`);
          // Notify IndexNow — fire-and-forget
          notifyArticlePublished(article.slug).catch(() => {});

          // Create social posts if enabled
          if (autoCreate) {
            try {
              const existingPosts = await db.listSocialPosts({ articleId: article.id });
              if (existingPosts.length === 0) {
                const posts = await generateSocialPosts(
                  [{ id: article.id, headline: article.headline, subheadline: article.subheadline || undefined, slug: article.slug, featuredImage: article.featuredImage || undefined }],
                  socialPlatforms,
                  siteBaseUrl
                );
                if (posts.length > 0) {
                  await db.bulkCreateSocialPosts(posts.map((p: any) => ({
                    articleId: p.articleId, platform: p.platform, content: p.content, status: p.status,
                  })));
                  console.log(`[AutoApprove] Created ${posts.length} social posts for article ${article.id}`);
                }
              }
              // Queue X post
              if (autoQueue) {
                const queued = await queueArticlesForX([article.id]);
                if (queued > 0) console.log(`[AutoApprove] Queued ${queued} X posts for article ${article.id}`);
              }
            } catch (socialErr) {
              console.error(`[AutoApprove] Social post error for article ${article.id}:`, socialErr);
            }
          }
        } // end else (gate.allowed)
      }
    } catch (err) {
      console.error(`[AutoApprove] Failed to process article ${article.id}:`, err);
    }
  }

  console.log(`[AutoApprove] Cycle complete. Approved: ${approved}, Published: ${published}`);
  return { checked: pendingArticles.length, approved, published };
}

export function initAutoApproveTimer(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  console.log(`[AutoApprove] Timer initialized. Checking every 30 minutes.`);
  // Run once after a short delay on startup
  setTimeout(async () => {
    try {
      await runAutoApproveCheck();
    } catch (e: any) {
      console.warn("[AutoApprove] Startup check error:", e.message);
    }
  }, 60000); // 1 minute delay on startup

  _timer = setInterval(async () => {
    try {
      await runAutoApproveCheck();
    } catch (e: any) {
      console.warn("[AutoApprove] Timer error:", e.message);
    }
  }, CHECK_INTERVAL_MS);
}

export function stopAutoApproveTimer(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log("[AutoApprove] Timer stopped.");
  }
}
