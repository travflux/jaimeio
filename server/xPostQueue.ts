/**
 * X/Twitter Post Queue - Drip Publishing Scheduler
 *
 * Manages a queue of social posts and publishes them to X/Twitter
 * at configurable intervals. Replaces FeedHive integration.
 *
 * DUPLICATE-POST PREVENTION (three complementary guards):
 *
 * 1. In-process mutex (`isProcessing` flag):
 *    Prevents re-entrant calls from the recurring timer AND the manual
 *    "Post Now" button firing simultaneously within the same Node process.
 *
 * 2. Atomic DB claim (`claimSocialPostForPosting`):
 *    Transitions status 'scheduled' → 'posting' in a single
 *    UPDATE … WHERE status='scheduled' statement. Only the caller that
 *    receives affectedRows === 1 proceeds to post; any concurrent caller
 *    (including across a server restart) gets 0 and bails out immediately.
 *
 * 3. Persistent postsToday + lastPostTime (DB-backed):
 *    postsToday and lastPostTime survive server restarts. On startup,
 *    the queue loads today's count from DB and skips the immediate-fire
 *    if a post was sent within the current interval window. This prevents
 *    burst posting when the server restarts multiple times in quick succession.
 *
 * Together these eliminate the race condition where two workers read the
 * same "scheduled" row and both post it, and prevent burst posting on restart.
 */
import { postTweet, getXCredentials } from "./xTwitterService";
import * as db from "./db";

interface QueueState {
  isRunning: boolean;
  intervalMinutes: number;
  timer: ReturnType<typeof setTimeout> | null;
  lastPostTime: Date | null;
  postsToday: number;
  dailyLimit: number;
  /** In-process mutex — prevents re-entrant processNextPost() calls */
  isProcessing: boolean;
}

const queueState: QueueState = {
  isRunning: false,
  intervalMinutes: 15,
  timer: null,
  lastPostTime: null,
  postsToday: 0,
  dailyLimit: 48,
  isProcessing: false,
};

// ── DB-backed state persistence ──────────────────────────────────────────────

async function persistQueueState(isRunning: boolean): Promise<void> {
  try {
    await db.setSetting("_x_queue_is_running", isRunning ? "true" : "false");
  } catch (e) {
    console.warn("[X Queue] Could not persist queue state:", e);
  }
}

async function loadQueueState(): Promise<boolean> {
  try {
    const setting = await db.getSetting("_x_queue_is_running");
    return setting?.value === "true";
  } catch (e) {
    return false;
  }
}

/**
 * Persist postsToday and lastPostTime to DB so they survive restarts.
 * Uses today's UTC date as a key so the counter auto-resets on a new day.
 */
async function persistDailyStats(): Promise<void> {
  try {
    const todayKey = new Date().toISOString().substring(0, 10); // "2026-03-02"
    await db.setSetting("_x_posts_today_date", todayKey);
    await db.setSetting("_x_posts_today", String(queueState.postsToday));
    if (queueState.lastPostTime) {
      await db.setSetting("_x_last_post_time", queueState.lastPostTime.toISOString());
    }
  } catch (e) {
    console.warn("[X Queue] Could not persist daily stats:", e);
  }
}

/**
 * Load postsToday and lastPostTime from DB.
 * Resets postsToday to 0 if the stored date is not today.
 */
async function loadDailyStats(): Promise<void> {
  try {
    const todayKey = new Date().toISOString().substring(0, 10);
    const storedDate = await db.getSetting("_x_posts_today_date");
    const storedCount = await db.getSetting("_x_posts_today");
    const storedLastPost = await db.getSetting("_x_last_post_time");

    if (storedDate?.value === todayKey && storedCount?.value) {
      queueState.postsToday = parseInt(storedCount.value, 10) || 0;
      console.log(`[X Queue] Loaded postsToday from DB: ${queueState.postsToday} (date: ${todayKey})`);
    } else {
      queueState.postsToday = 0;
      console.log(`[X Queue] New day or no stored count — postsToday reset to 0`);
    }

    if (storedLastPost?.value) {
      queueState.lastPostTime = new Date(storedLastPost.value);
      console.log(`[X Queue] Loaded lastPostTime from DB: ${queueState.lastPostTime.toISOString()}`);
    }
  } catch (e) {
    console.warn("[X Queue] Could not load daily stats:", e);
  }
}

// ── Queue status ─────────────────────────────────────────────────────────────

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    isRunning: queueState.isRunning,
    intervalMinutes: queueState.intervalMinutes,
    lastPostTime: queueState.lastPostTime,
    postsToday: queueState.postsToday,
    dailyLimit: queueState.dailyLimit,
    hasCredentials: !!getXCredentials(),
  };
}

// ── Core posting logic ───────────────────────────────────────────────────────

/**
 * Process the next post in the queue.
 *
 * Protected by three duplicate-post guards:
 *   1. In-process mutex (isProcessing flag)
 *   2. Atomic DB claim (claimSocialPostForPosting)
 *   3. DB-backed postsToday daily limit (survives restarts)
 */
async function processNextPost(): Promise<{
  posted: boolean;
  postId?: number;
  tweetId?: string;
  error?: string;
}> {
  // ── Guard 1: In-process mutex ──────────────────────────────────────────
  if (queueState.isProcessing) {
    console.log("[X Queue] Already processing a post — skipping concurrent call.");
    return { posted: false, error: "Already processing" };
  }
  queueState.isProcessing = true;

  try {
    // Check daily limit (DB-backed, survives restarts)
    if (queueState.postsToday >= queueState.dailyLimit) {
      console.log(`[X Queue] Daily limit reached (${queueState.postsToday}/${queueState.dailyLimit}). Pausing until tomorrow.`);
      return { posted: false, error: "Daily limit reached" };
    }

    // Get next queued post (status = "scheduled" for X/Twitter)
    const pendingPosts = await db.listSocialPosts({ status: "scheduled" });

    // Filter to twitter posts only
    const twitterPosts = pendingPosts.filter(p => p.platform === "twitter");

    if (twitterPosts.length === 0) {
      console.log("[X Queue] No posts in queue.");
      return { posted: false, error: "No posts in queue" };
    }

    // Get the newest scheduled post (first item in DESC-ordered array)
    const nextPost = twitterPosts[0];

    // ── Guard 2: Atomic DB claim ───────────────────────────────────────────
    // Transition status 'scheduled' → 'posting' in a single UPDATE.
    // If another worker already claimed this row, affectedRows === 0 and we bail.
    const claimed = await db.claimSocialPostForPosting(nextPost.id);
    if (!claimed) {
      console.log(`[X Queue] Post #${nextPost.id} was already claimed by another worker — skipping.`);
      return { posted: false, error: "Post already claimed" };
    }

    console.log(`[X Queue] Claimed post #${nextPost.id} for posting.`);

    // ── Image strategy ─────────────────────────────────────────────────────
    // We ALWAYS upload the image directly as a Twitter media attachment (media_ids).
    // We NEVER rely on Twitter's URL card preview because:
    //   1. OG tags are set client-side by React — Twitter's crawler can't execute JS.
    //   2. Twitter's crawler fetches the homepage OG image (generic website screenshot).
    // Rule: use the article's featuredImage when available; otherwise use the branded
    // fallback image. This ensures every post shows the correct image.
    const FALLBACK_IMAGE_URL = "/og-image.jpg";
    let imageUrl: string | undefined;
    try {
      const article = await db.getArticleById(nextPost.articleId);
      console.log(`[X Queue] Article ${nextPost.articleId} featuredImage: ${article?.featuredImage || 'none'}`);

      const includeImageSetting = await db.getSetting("x_include_image");
      const includeImages = includeImageSetting?.value !== "false";
      console.log(`[X Queue] x_include_image setting: ${includeImageSetting?.value || 'not set'} (will include: ${includeImages})`);

      if (includeImages) {
        if (article?.featuredImage) {
          imageUrl = article.featuredImage;
          console.log(`[X Queue] Will post with article featured image: ${imageUrl}`);
        } else {
          imageUrl = FALLBACK_IMAGE_URL;
          console.log(`[X Queue] No featured image — using branded fallback image`);
        }
      } else {
        console.log(`[X Queue] Images disabled by x_include_image setting`);
      }
    } catch (e: any) {
      console.warn(`[X Queue] Error getting article image: ${e.message}`);
      imageUrl = FALLBACK_IMAGE_URL;
      console.log(`[X Queue] Error fetching article — using branded fallback image`);
    }

    // Post to X/Twitter
    console.log(`[X Queue] Posting social post #${nextPost.id}: "${nextPost.content.substring(0, 50)}..."`);
    const result = await postTweet(nextPost.content, imageUrl);

    if (result.success) {
      await db.updateSocialPostStatus(nextPost.id, "posted");
      queueState.lastPostTime = new Date();
      queueState.postsToday++;

      // Persist updated stats to DB immediately so restarts see the correct count
      await persistDailyStats();

      console.log(`[X Queue] Successfully posted tweet ${result.tweetId}. Posts today: ${queueState.postsToday}/${queueState.dailyLimit}`);

      return {
        posted: true,
        postId: nextPost.id,
        tweetId: result.tweetId,
      };
    } else {
      // Mark as failed so it doesn't block the queue
      await db.updateSocialPostStatus(nextPost.id, "failed");
      console.error(`[X Queue] Failed to post: ${result.error}`);

      return {
        posted: false,
        postId: nextPost.id,
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error(`[X Queue] Error processing queue:`, error.message);
    return { posted: false, error: error.message };
  } finally {
    // Always release the in-process mutex
    queueState.isProcessing = false;
  }
}

// ── Queue lifecycle ──────────────────────────────────────────────────────────

/**
 * Schedule the next queue processing
 */
function scheduleNext() {
  if (!queueState.isRunning) return;

  queueState.timer = setTimeout(async () => {
    await processNextPost();
    scheduleNext(); // Schedule next iteration
  }, queueState.intervalMinutes * 60 * 1000);
}

/**
 * Start the drip queue.
 *
 * Fix 3: Rate-limit immediate post on start.
 * If a post was sent within the current interval window, skip the immediate
 * fire and wait for the next scheduled slot. This prevents burst posting when
 * the server restarts multiple times in quick succession.
 */
export async function startQueue(intervalMinutes?: number): Promise<void> {
  if (queueState.isRunning) {
    console.log("[X Queue] Queue already running.");
    return;
  }

  // Load settings from DB
  const intervalSetting = await db.getSetting("x_post_interval_minutes");
  const dailyLimitSetting = await db.getSetting("x_daily_post_limit");

  queueState.intervalMinutes = intervalMinutes || parseInt(intervalSetting?.value || "15", 10);
  queueState.dailyLimit = parseInt(dailyLimitSetting?.value || "48", 10);
  queueState.isRunning = true;

  await persistQueueState(true);

  console.log(`[X Queue] Started. Posting every ${queueState.intervalMinutes} minutes. Daily limit: ${queueState.dailyLimit}`);

  // ── Fix 3: Rate-limit immediate post on start ──────────────────────────
  // Check if a post was sent within the current interval window.
  // If so, skip the immediate fire and schedule the next post at the
  // appropriate time (remaining time in the current interval).
  const now = Date.now();
  const intervalMs = queueState.intervalMinutes * 60 * 1000;

  if (queueState.lastPostTime) {
    const msSinceLastPost = now - queueState.lastPostTime.getTime();
    if (msSinceLastPost < intervalMs) {
      const msUntilNext = intervalMs - msSinceLastPost;
      const minsUntilNext = Math.ceil(msUntilNext / 60000);
      console.log(`[X Queue] Last post was ${Math.floor(msSinceLastPost / 60000)}m ago — skipping immediate fire. Next post in ~${minsUntilNext}m.`);
      // Schedule the next post at the correct remaining time
      queueState.timer = setTimeout(async () => {
        await processNextPost();
        scheduleNext();
      }, msUntilNext);
      return;
    }
  }

  // No recent post — fire immediately as normal
  await processNextPost();

  // Then schedule recurring
  scheduleNext();
}

/**
 * Stop the drip queue
 */
export async function stopQueue(): Promise<void> {
  queueState.isRunning = false;
  if (queueState.timer) {
    clearTimeout(queueState.timer);
    queueState.timer = null;
  }
  await persistQueueState(false);
  console.log("[X Queue] Stopped.");
}

/**
 * Update queue interval
 */
export async function updateInterval(minutes: number): Promise<void> {
  queueState.intervalMinutes = minutes;

  // Save to DB
  await db.setSetting("x_post_interval_minutes", String(minutes));

  // Restart timer if running
  if (queueState.isRunning) {
    if (queueState.timer) {
      clearTimeout(queueState.timer);
    }
    scheduleNext();
  }

  console.log(`[X Queue] Interval updated to ${minutes} minutes.`);
}

/**
 * Manually trigger posting the next item in queue.
 * Protected by the same in-process mutex as the scheduled timer.
 */
export async function postNext(): Promise<{
  posted: boolean;
  postId?: number;
  tweetId?: string;
  error?: string;
}> {
  return processNextPost();
}

/**
 * Queue articles for X posting.
 * Takes published articles that have social posts generated and schedules them.
 * Prevents duplicate posts by checking if article already has a posted tweet.
 */
export async function queueArticlesForX(articleIds: number[]): Promise<number> {
  let queued = 0;
  let skipped = 0;

  for (const articleId of articleIds) {
    // Get existing social posts for this article
    const posts = await db.listSocialPosts({ articleId });
    const twitterPosts = posts.filter(p => p.platform === "twitter");

    // Check if article already has a posted or in-flight tweet (prevent duplicates)
    const alreadyPostedOrClaimed = twitterPosts.some(
      p => p.status === "posted" || p.status === "posting"
    );
    if (alreadyPostedOrClaimed) {
      console.log(`[X Queue] Skipping article ${articleId} - already posted/in-flight on X`);
      skipped++;
      continue;
    }

    // Check if article already has a scheduled tweet (prevent double-queuing)
    const alreadyScheduled = twitterPosts.some(p => p.status === "scheduled");
    if (alreadyScheduled) {
      console.log(`[X Queue] Skipping article ${articleId} - already scheduled`);
      skipped++;
      continue;
    }

    // Schedule the first draft twitter post; cancel any remaining drafts for this article
    let scheduled = false;
    for (const post of twitterPosts) {
      if (post.status === "draft") {
        if (!scheduled) {
          await db.updateSocialPostStatus(post.id, "scheduled");
          queued++;
          scheduled = true;
        } else {
          // Cancel leftover duplicate drafts
          await db.updateSocialPostStatus(post.id, "cancelled");
          console.log(`[X Queue] Cancelled duplicate draft post #${post.id} for article ${articleId}`);
        }
      }
    }
  }

  console.log(`[X Queue] Queued ${queued} posts from ${articleIds.length} articles (${skipped} skipped - already posted/scheduled/in-flight).`);
  return queued;
}

/**
 * Reset daily counter (should be called at midnight)
 */
export function resetDailyCounter(): void {
  queueState.postsToday = 0;
  queueState.lastPostTime = null;
  persistDailyStats().catch(() => {});
  console.log("[X Queue] Daily counter reset.");
}

/**
 * Initialize queue on server startup.
 * Also releases any posts stuck in 'posting' state from a previous crash.
 *
 * Fix 1: Load postsToday and lastPostTime from DB before starting.
 * Fix 3: startQueue() will skip immediate fire if last post was recent.
 */
export async function initializeQueue(): Promise<void> {
  try {
    // Recover any posts stuck in 'posting' from a previous server crash
    await db.releaseStuckPostingPosts();

    // Fix 1: Load persisted daily stats before starting
    await loadDailyStats();

    const wasRunning = await loadQueueState();
    const autoStartSetting = await db.getSetting("x_queue_auto_start");

    if (wasRunning || autoStartSetting?.value === "true") {
      console.log("[X Queue] Restoring queue from previous state...");
      await startQueue();
    }
  } catch (e) {
    console.log("[X Queue] Not auto-starting (settings not available yet).");
  }
}
