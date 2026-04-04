/**
 * Unified Social Distribution Engine
 *
 * NOTE (Sprint 3.7): Native platform posting (sendToX, sendToFacebook, etc.) is
 * deprecated. All social distribution now goes through Blotato API via
 * server/blotato.ts → queueArticleToBlotato(). The processQueue() function and
 * sendTo* helpers are retained for backwards compatibility with any existing
 * "pending" rows but should not be used for new posts.
 *
 * Orchestrates article distribution across X, Reddit, Facebook, Instagram,
 * Bluesky, Threads, and LinkedIn. White-label compatible: all platform
 * credentials are read from the platform_credentials table, not hardcoded.
 *
 * Architecture:
 *   enqueueArticle()       → creates distribution_queue rows for each enabled platform
 *   processQueue()         → picks up pending rows, calls the right adapter, marks sent/failed
 *   collectFeedback()      → every 6 hours, fetches engagement metrics for recent posts
 *   Rate Governor          → enforces per-platform daily/hourly limits
 *   Decision Layer         → determines which platforms + subreddits get each article
 */

import { getDb, getSetting } from "./db";
import { distributionQueue, redditSubredditMap, platformCredentials } from "../drizzle/schema";
import { eq, and, gte, lte, inArray, sql, isNull, isNotNull } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleForDistribution {
  id: number;
  slug: string;
  headline: string;
  subheadline?: string | null;
  categorySlug?: string | null;
  featuredImage?: string | null;
  publishedAt?: Date | null;
}

export interface DistributionResult {
  platform: string;
  subreddit?: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

// ─── Hard-coded Rate Governor limits (cannot be overridden by clients) ────────

const HARD_DAILY_LIMITS: Record<string, number> = {
  x: 48,
  reddit: 10,
  facebook: 5,
  instagram: 3,
  threads: 10,
  bluesky: 15,
  linkedin: 3,
  sms: 2,
};

async function getDailyLimit(platform: string): Promise<number> {
  return HARD_DAILY_LIMITS[platform] ?? 10;
}

async function getTodayCount(platform: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(distributionQueue)
    .where(
      and(
        eq(distributionQueue.platform, platform),
        inArray(distributionQueue.status, ["sent"]),
        gte(distributionQueue.sentAt, startOfDay)
      )
    );
  return Number(row?.count ?? 0);
}

async function isWithinDailyLimit(platform: string): Promise<boolean> {
  const [limit, count] = await Promise.all([getDailyLimit(platform), getTodayCount(platform)]);
  return count < limit;
}

// ─── Platform credential resolver ────────────────────────────────────────────

async function getCredential(platform: string): Promise<Record<string, string> | null> {
  const db = await getDb();
  if (!db) return null;
  const [cred] = await db
    .select()
    .from(platformCredentials)
    .where(and(eq(platformCredentials.platform, platform), eq(platformCredentials.isActive, true)))
    .limit(1);
  if (!cred) return null;
  const result: Record<string, string> = {};
  if (cred.apiKey) result.apiKey = cred.apiKey;
  if (cred.apiSecret) result.apiSecret = cred.apiSecret;
  if (cred.extra) {
    try { Object.assign(result, JSON.parse(cred.extra)); } catch { /* ignore */ }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// ─── Decision Layer ───────────────────────────────────────────────────────────

async function getEnabledPlatforms(): Promise<string[]> {
  const platforms = ["x", "reddit", "facebook", "instagram", "bluesky", "threads", "linkedin"];
  const enabled: string[] = [];
  for (const p of platforms) {
    const setting = await getSetting(`dist_enabled_${p}`);
    if (setting?.value === "true") enabled.push(p);
  }
  // X: env creds are a fallback only when dist_enabled_x is not explicitly set to "false".
  // If the user has explicitly disabled X (dist_enabled_x = "false"), respect that even
  // when env creds exist. Only auto-enable when the key is absent (first-run backwards compat).
  if (!enabled.includes("x")) {
    const xSetting = await getSetting("dist_enabled_x");
    const explicitlyDisabled = xSetting?.value === "false";
    const hasXCreds = process.env.X_API_KEY && process.env.X_ACCESS_TOKEN;
    if (hasXCreds && !explicitlyDisabled) enabled.push("x");
  }
  return enabled;
}

async function getSubredditsForArticle(categorySlug: string | null | undefined): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(redditSubredditMap)
    .where(eq(redditSubredditMap.isActive, true));
  const matching = rows.filter(r => !r.categorySlug || r.categorySlug === categorySlug);
  if (matching.length === 0) {
    const setting = await getSetting("reddit_subreddit");
    return setting?.value ? [setting.value] : [];
  }
  const weighted: string[] = [];
  for (const r of matching) {
    for (let i = 0; i < (r.weight || 1); i++) weighted.push(r.subreddit);
  }
  weighted.sort(() => Math.random() - 0.5);
  return Array.from(new Set(weighted)).slice(0, 2);
}

// ─── Queue builder ────────────────────────────────────────────────────────────

export async function enqueueArticle(
  article: ArticleForDistribution,
  opts?: { platforms?: string[]; triggeredBy?: "auto" | "manual" }
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const triggeredBy = opts?.triggeredBy ?? "auto";
  const platforms = opts?.platforms ?? (await getEnabledPlatforms());
  const rows: typeof distributionQueue.$inferInsert[] = [];

  for (const platform of platforms) {
    if (!(await isWithinDailyLimit(platform))) {
      console.log(`[Distribution] Daily limit reached for ${platform} — skipping article ${article.id}`);
      continue;
    }
    if (platform === "reddit") {
      const subreddits = await getSubredditsForArticle(article.categorySlug);
      for (const subreddit of subreddits) {
        rows.push({ articleId: article.id, platform, subreddit, status: "pending", triggeredBy });
      }
    } else {
      rows.push({ articleId: article.id, platform, status: "pending", triggeredBy });
    }
  }

  if (rows.length > 0) {
    await db.insert(distributionQueue).values(rows);
    console.log(`[Distribution] Queued article ${article.id} to ${rows.length} platform slots`);
  }
  return rows.length;
}

// ─── Platform adapters ────────────────────────────────────────────────────────

async function sendToX(article: ArticleForDistribution): Promise<DistributionResult> {
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=x&utm_medium=social`;
    const copy = article.subheadline
      ? `${article.headline}\n\n${article.subheadline}\n\n${url}`
      : `${article.headline}\n\n${url}`;
    const { postTweet } = await import("./xTwitterService");
    const result = await postTweet(copy.slice(0, 280), article.featuredImage ?? undefined);
    return { platform: "x", success: result.success, postId: result.tweetId, postUrl: result.tweetUrl, error: result.error };
  } catch (e: any) {
    return { platform: "x", success: false, error: e.message };
  }
}

async function sendToReddit(article: ArticleForDistribution, subreddit: string): Promise<DistributionResult> {
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=reddit&utm_medium=social`;
    const { postArticleToReddit } = await import("./reddit-article-poster");
    const result = await postArticleToReddit({ articleId: article.id, articleUrl: url, headline: article.headline });
    return { platform: "reddit", subreddit, success: result.success, postId: result.postId, postUrl: result.postUrl, error: result.error };
  } catch (e: any) {
    return { platform: "reddit", subreddit, success: false, error: e.message };
  }
}

async function sendToBluesky(article: ArticleForDistribution): Promise<DistributionResult> {
  try {
    const cred = await getCredential("bluesky");
    if (!cred?.identifier || !cred?.password) {
      return { platform: "bluesky", success: false, error: "Bluesky credentials not configured (identifier + password required)" };
    }
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=bluesky&utm_medium=social`;
    const text = `${article.headline}\n\n${url}`.slice(0, 300);

    const loginRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cred.identifier, password: cred.password }),
    });
    if (!loginRes.ok) throw new Error(`Bluesky login failed: ${loginRes.status}`);
    const session = await loginRes.json() as { accessJwt: string; did: string };

    const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessJwt}` },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString() },
      }),
    });
    if (!postRes.ok) throw new Error(`Bluesky post failed: ${postRes.status}`);
    const postData = await postRes.json() as { uri: string; cid: string };
    const postUrl = postData.uri?.replace("at://", "https://bsky.app/profile/").replace("/app.bsky.feed.post/", "/post/");
    return { platform: "bluesky", success: true, postId: postData.uri, postUrl };
  } catch (e: any) {
    return { platform: "bluesky", success: false, error: e.message };
  }
}

async function sendToFacebook(article: ArticleForDistribution): Promise<DistributionResult> {
  const cred = await getCredential("facebook");
  if (!cred?.pageAccessToken || !cred?.pageId) {
    return { platform: "facebook", success: false, error: "Facebook credentials not configured (pageAccessToken + pageId required)" };
  }
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=facebook&utm_medium=social`;
    const res = await fetch(`https://graph.facebook.com/v19.0/${cred.pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: article.headline, link: url, access_token: cred.pageAccessToken }),
    });
    if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
    const data = await res.json() as { id?: string };
    return { platform: "facebook", success: true, postId: data.id, postUrl: data.id ? `https://facebook.com/${data.id}` : undefined };
  } catch (e: any) {
    return { platform: "facebook", success: false, error: e.message };
  }
}

async function sendToInstagram(article: ArticleForDistribution): Promise<DistributionResult> {
  const cred = await getCredential("instagram");
  if (!cred?.pageAccessToken || !cred?.igUserId) {
    return { platform: "instagram", success: false, error: "Instagram credentials not configured (pageAccessToken + igUserId required)" };
  }
  if (!article.featuredImage) {
    return { platform: "instagram", success: false, error: "Instagram requires a featured image" };
  }
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=instagram&utm_medium=social`;
    const caption = `${article.headline}\n\nLink in bio: ${url}`.slice(0, 2200);

    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${cred.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: article.featuredImage, caption, access_token: cred.pageAccessToken }),
    });
    if (!containerRes.ok) throw new Error(`Instagram container error: ${containerRes.status}`);
    const container = await containerRes.json() as { id: string };

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${cred.igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: cred.pageAccessToken }),
    });
    if (!publishRes.ok) throw new Error(`Instagram publish error: ${publishRes.status}`);
    const published = await publishRes.json() as { id?: string };
    return { platform: "instagram", success: true, postId: published.id };
  } catch (e: any) {
    return { platform: "instagram", success: false, error: e.message };
  }
}

// ─── Threads Adapter ──────────────────────────────────────────────────────────
// Threads API: POST /{threads-user-id}/threads then /{threads-user-id}/threads_publish
// Uses same Meta token as Instagram/Facebook OAuth.
// Rate limit: 10 posts/day (enforced by Rate Governor above).

async function sendToThreads(article: ArticleForDistribution): Promise<DistributionResult> {
  const cred = await getCredential("threads");
  if (!cred?.accessToken || !cred?.threadsUserId) {
    return {
      platform: "threads",
      success: false,
      error: "Threads credentials not configured. You need a Threads User ID and Access Token from the Meta Developer Portal.",
    };
  }
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=threads&utm_medium=social`;
    const text = `${article.headline}\n\n${url}`.slice(0, 500);

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${cred.threadsUserId}/threads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT",
          text,
          access_token: cred.accessToken,
        }),
      }
    );
    if (!containerRes.ok) {
      const errBody = await containerRes.text();
      throw new Error(`Threads container creation failed (${containerRes.status}): ${errBody}`);
    }
    const container = await containerRes.json() as { id: string };

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${cred.threadsUserId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: cred.accessToken,
        }),
      }
    );
    if (!publishRes.ok) {
      const errBody = await publishRes.text();
      throw new Error(`Threads publish failed (${publishRes.status}): ${errBody}`);
    }
    const published = await publishRes.json() as { id?: string };
    const postUrl = published.id
      ? `https://www.threads.net/t/${published.id}`
      : undefined;
    return { platform: "threads", success: true, postId: published.id, postUrl };
  } catch (e: any) {
    return { platform: "threads", success: false, error: e.message };
  }
}

// ─── LinkedIn Adapter ─────────────────────────────────────────────────────────
// LinkedIn API v2: POST /ugcPosts
// Requires OAuth 2.0 access token with w_member_social or w_organization_social scope.
// Rate limit: 3 posts/day (enforced by Rate Governor above).

async function sendToLinkedIn(article: ArticleForDistribution): Promise<DistributionResult> {
  const cred = await getCredential("linkedin");
  if (!cred?.accessToken || !cred?.orgId) {
    return {
      platform: "linkedin",
      success: false,
      error: "LinkedIn credentials not configured. You need an Organization ID and OAuth Access Token from the LinkedIn Developer Portal.",
    };
  }
  try {
    const siteUrl = (await getSetting("brand_site_url"))?.value || process.env.SITE_URL || "";
    const url = `${siteUrl}/article/${article.slug}?utm_source=linkedin&utm_medium=social`;
    const commentary = `${article.headline}${article.subheadline ? `\n\n${article.subheadline}` : ""}`.slice(0, 700);

    const body = {
      author: `urn:li:organization:${cred.orgId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: commentary },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: url,
              title: { text: article.headline.slice(0, 200) },
              ...(article.subheadline ? { description: { text: article.subheadline.slice(0, 256) } } : {}),
            },
          ],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cred.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`LinkedIn API error (${res.status}): ${errBody}`);
    }
    const data = await res.json() as { id?: string };
    const postId = data.id;
    const postUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}/`
      : undefined;
    return { platform: "linkedin", success: true, postId, postUrl };
  } catch (e: any) {
    return { platform: "linkedin", success: false, error: e.message };
  }
}

// ─── Test Connection helpers (used by Admin Settings) ────────────────────────

export async function testThreadsConnection(cred: Record<string, string>): Promise<{ success: boolean; username?: string; error?: string }> {
  if (!cred.accessToken || !cred.threadsUserId) {
    return { success: false, error: "Access Token and Threads User ID are both required." };
  }
  try {
    const res = await fetch(
      `https://graph.threads.net/v1.0/${cred.threadsUserId}?fields=id,username&access_token=${cred.accessToken}`
    );
    if (!res.ok) {
      const body = await res.json() as { error?: { message?: string } };
      return { success: false, error: body.error?.message ?? `API returned ${res.status}` };
    }
    const data = await res.json() as { username?: string };
    return { success: true, username: data.username };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function testLinkedInConnection(cred: Record<string, string>): Promise<{ success: boolean; username?: string; error?: string }> {
  if (!cred.accessToken || !cred.orgId) {
    return { success: false, error: "Access Token and Organization ID are both required." };
  }
  try {
    const res = await fetch(
      `https://api.linkedin.com/v2/organizations/${cred.orgId}?projection=(id,localizedName)`,
      {
        headers: {
          Authorization: `Bearer ${cred.accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    if (!res.ok) {
      const body = await res.json() as { message?: string };
      return { success: false, error: body.message ?? `API returned ${res.status}` };
    }
    const data = await res.json() as { localizedName?: string };
    return { success: true, username: data.localizedName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Queue processor ──────────────────────────────────────────────────────────

export async function processQueue(opts?: { limit?: number }): Promise<DistributionResult[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 10;

  const pending = await db
    .select()
    .from(distributionQueue)
    .where(
      and(
        eq(distributionQueue.status, "pending"),
        lte(distributionQueue.retryCount, 3)
      )
    )
    .limit(limit);

  if (pending.length === 0) return [];
  const results: DistributionResult[] = [];

  for (const item of pending) {
    await db.update(distributionQueue)
      .set({ status: "sending", attemptedAt: new Date() })
      .where(eq(distributionQueue.id, item.id));

    // articleId is nullable for standalone posts (tweets without articles)
    if (!item.articleId) {
      await db.update(distributionQueue).set({ status: "skipped", errorMessage: "No article linked" }).where(eq(distributionQueue.id, item.id));
      continue;
    }
    const { getArticleById } = await import("./db");
    const article = await getArticleById(item.articleId);
    if (!article) {
      await db.update(distributionQueue).set({ status: "skipped", errorMessage: "Article not found" }).where(eq(distributionQueue.id, item.id));
      continue;
    }

    let categorySlug: string | null = null;
    if (article.categoryId) {
      const { listCategories } = await import("./db");
      const cats = await listCategories();
      categorySlug = cats.find(c => c.id === article.categoryId)?.slug ?? null;
    }

    const articleData: ArticleForDistribution = {
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      subheadline: article.subheadline,
      categorySlug,
      featuredImage: article.featuredImage,
      publishedAt: article.publishedAt,
    };

    let result: DistributionResult;
    switch (item.platform) {
      case "x":         result = await sendToX(articleData); break;
      case "reddit":    result = await sendToReddit(articleData, item.subreddit ?? ""); break;
      case "bluesky":   result = await sendToBluesky(articleData); break;
      case "facebook":  result = await sendToFacebook(articleData); break;
      case "instagram": result = await sendToInstagram(articleData); break;
      case "threads":   result = await sendToThreads(articleData); break;
      case "linkedin":  result = await sendToLinkedIn(articleData); break;
      default: result = { platform: item.platform, success: false, error: `Unknown platform: ${item.platform}` };
    }

    if (result.success) {
      await db.update(distributionQueue)
        .set({
          status: "sent",
          sentAt: new Date(),
          postUrl: result.postUrl ?? null,
          platformPostId: result.postId ?? null,
          errorMessage: null,
        })
        .where(eq(distributionQueue.id, item.id));
    } else {
      const newRetry = (item.retryCount ?? 0) + 1;
      const finalStatus = newRetry >= 3 ? "failed" : "pending";
      await db.update(distributionQueue)
        .set({ status: finalStatus, retryCount: newRetry, errorMessage: result.error ?? null })
        .where(eq(distributionQueue.id, item.id));
    }

    results.push(result);
  }

  return results;
}

// ─── Feedback Collector ───────────────────────────────────────────────────────
// Runs every 6 hours. For posts from the last 48 hours with status='sent',
// fetches engagement metrics from each platform and updates the queue row.

export async function collectFeedback(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const posts = await db
    .select()
    .from(distributionQueue)
    .where(
      and(
        eq(distributionQueue.status, "sent"),
        gte(distributionQueue.sentAt, cutoff),
        isNotNull(distributionQueue.platformPostId)
      )
    );

  console.log(`[FeedbackCollector] Checking engagement for ${posts.length} recent posts`);

  for (const post of posts) {
    if (!post.platformPostId) continue;
    try {
      let metrics: { likes: number; comments: number; shares: number; clicks: number } | null = null;
      let removed = false;

      switch (post.platform) {
        case "bluesky":
          metrics = await fetchBlueskeyEngagement(post.platformPostId);
          break;
        case "reddit":
          ({ metrics, removed } = await fetchRedditEngagement(post.platformPostId));
          break;
        case "facebook":
          metrics = await fetchFacebookEngagement(post.platformPostId);
          break;
        case "instagram":
          metrics = await fetchInstagramEngagement(post.platformPostId);
          break;
        // X engagement requires X Basic API ($100/mo) — skip for now, log placeholder
        case "x":
          metrics = null; // X free tier does not expose per-tweet metrics
          break;
        // Threads and LinkedIn engagement APIs are read-only with specific scopes
        case "threads":
          metrics = await fetchThreadsEngagement(post.platformPostId);
          break;
        case "linkedin":
          metrics = null; // LinkedIn analytics require special partner access
          break;
        default:
          break;
      }

      const updateData: Partial<typeof distributionQueue.$inferInsert> = {
        engagementCheckedAt: new Date(),
      };
      if (metrics) {
        updateData.engagementLikes = metrics.likes;
        updateData.engagementComments = metrics.comments;
        updateData.engagementShares = metrics.shares;
        updateData.engagementClicks = metrics.clicks;
      }
      if (removed) {
        updateData.removedAt = new Date();
        // Increment total_removals on the subreddit map row
        if (post.subreddit) {
          await db
            .update(redditSubredditMap)
            .set({ notes: sql`CONCAT(IFNULL(notes,''), ' [removal detected]')` })
            .where(eq(redditSubredditMap.subreddit, post.subreddit));
        }
      }

      await db.update(distributionQueue)
        .set(updateData)
        .where(eq(distributionQueue.id, post.id));
    } catch (e: any) {
      console.warn(`[FeedbackCollector] Failed to fetch engagement for post ${post.id} (${post.platform}): ${e.message}`);
    }
  }

  console.log("[FeedbackCollector] Done");
}

// ─── Per-platform engagement fetchers ────────────────────────────────────────

async function fetchBlueskeyEngagement(uri: string): Promise<{ likes: number; comments: number; shares: number; clicks: number } | null> {
  try {
    const cred = await getCredential("bluesky");
    if (!cred?.identifier || !cred?.password) return null;

    const loginRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cred.identifier, password: cred.password }),
    });
    if (!loginRes.ok) return null;
    const session = await loginRes.json() as { accessJwt: string };

    const postRes = await fetch(
      `https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}`,
      { headers: { Authorization: `Bearer ${session.accessJwt}` } }
    );
    if (!postRes.ok) return null;
    const data = await postRes.json() as { thread?: { post?: { likeCount?: number; replyCount?: number; repostCount?: number } } };
    const p = data.thread?.post;
    if (!p) return null;
    return { likes: p.likeCount ?? 0, comments: p.replyCount ?? 0, shares: p.repostCount ?? 0, clicks: 0 };
  } catch { return null; }
}

async function fetchRedditEngagement(postId: string): Promise<{ metrics: { likes: number; comments: number; shares: number; clicks: number } | null; removed: boolean }> {
  try {
    const res = await fetch(`https://www.reddit.com/by_id/${postId}.json`, {
      headers: { "User-Agent": `${process.env.VITE_APP_TITLE || "satire-engine"}/feedback-collector/1.0` },
    });
    if (!res.ok) return { metrics: null, removed: false };
    const data = await res.json() as { data?: { children?: Array<{ data?: { score?: number; num_comments?: number; removed?: boolean; author?: string } }> } };
    const post = data.data?.children?.[0]?.data;
    if (!post) return { metrics: null, removed: false };
    const removed = post.removed === true || post.author === "[deleted]";
    return {
      metrics: { likes: post.score ?? 0, comments: post.num_comments ?? 0, shares: 0, clicks: 0 },
      removed,
    };
  } catch { return { metrics: null, removed: false }; }
}

async function fetchFacebookEngagement(postId: string): Promise<{ likes: number; comments: number; shares: number; clicks: number } | null> {
  try {
    const cred = await getCredential("facebook");
    if (!cred?.pageAccessToken) return null;
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${cred.pageAccessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      reactions?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    };
    return {
      likes: data.reactions?.summary?.total_count ?? 0,
      comments: data.comments?.summary?.total_count ?? 0,
      shares: data.shares?.count ?? 0,
      clicks: 0,
    };
  } catch { return null; }
}

async function fetchInstagramEngagement(mediaId: string): Promise<{ likes: number; comments: number; shares: number; clicks: number } | null> {
  try {
    const cred = await getCredential("instagram");
    if (!cred?.pageAccessToken) return null;
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}?fields=like_count,comments_count&access_token=${cred.pageAccessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { like_count?: number; comments_count?: number };
    return { likes: data.like_count ?? 0, comments: data.comments_count ?? 0, shares: 0, clicks: 0 };
  } catch { return null; }
}

async function fetchThreadsEngagement(postId: string): Promise<{ likes: number; comments: number; shares: number; clicks: number } | null> {
  try {
    const cred = await getCredential("threads");
    if (!cred?.accessToken) return null;
    const res = await fetch(
      `https://graph.threads.net/v1.0/${postId}/insights?metric=likes,replies,reposts,quotes&access_token=${cred.accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ name: string; values?: Array<{ value: number }> }> };
    const get = (name: string) => data.data?.find(m => m.name === name)?.values?.[0]?.value ?? 0;
    return { likes: get("likes"), comments: get("replies"), shares: get("reposts") + get("quotes"), clicks: 0 };
  } catch { return null; }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let _distributionScheduled = false;

export function initDistributionScheduler() {
  if (_distributionScheduled) return;
  _distributionScheduled = true;

  // Process queue every 60 seconds
  const QUEUE_INTERVAL = 60 * 1000;
  setInterval(async () => {
    try {
      const results = await processQueue({ limit: 5 });
      if (results.length > 0) {
        const sent = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[Distribution] Queue processed: ${sent} sent, ${failed} failed`);
      }
    } catch (e: any) {
      console.error("[Distribution] Queue processing error:", e.message);
    }
  }, QUEUE_INTERVAL);

  // Feedback collector every 6 hours
  const FEEDBACK_INTERVAL = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await collectFeedback();
    } catch (e: any) {
      console.error("[FeedbackCollector] Error:", e.message);
    }
  }, FEEDBACK_INTERVAL);

  console.log("[Distribution] Social distribution scheduler initialized (queue: 60s, feedback: 6h)");
}
