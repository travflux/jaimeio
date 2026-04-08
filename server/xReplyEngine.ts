/**
 * X Auto-Reply / Quote-Tweet Engine
 * Fetches recent articles → extracts keywords → searches X for trending tweets
 * → generates witty replies or quote tweets → posts them automatically
 *
 * Supports two modes:
 *   - "reply"       → in_reply_to_tweet_id (blocked by Twitter anti-spam for cold accounts)
 *   - "quote_tweet" → quote_tweet_id (not blocked, more visible, recommended)
 *
 * Author filtering:
 *   - minFollowers / maxFollowers: skip tweets from accounts outside this range
 *   - verifiedOnly: only engage with blue/business/government verified accounts
 */
import { TwitterApi, TwitterApiReadWrite } from "twitter-api-v2";
import { invokeLLMWithFallback as invokeLLM } from "./_core/llmRouter";
import * as db from "./db";
import { getXCredentials } from "./xTwitterService";

// ─── Types ──────────────────────────────────────────────────
interface TweetCandidate {
  tweetId: string;
  tweetText: string;
  tweetAuthor: string;
  tweetAuthorHandle: string;
  tweetLikes: number;
  tweetRetweets: number;
  tweetFollowers: number;
  tweetVerifiedType: string;
  keyword: string;
}

interface ReplyResult {
  success: boolean;
  repliesGenerated: number;
  repliesPosted: number;
  error?: string;
}

export interface XReplyEngineSettings {
  mode: "reply" | "quote_tweet";
  minFollowers: number;
  maxFollowers: number;
  verifiedOnly: boolean;
  maxEngagementsPerUser: number;
}

// ─── Keyword Extraction ──────────────────────────────────────
/**
 * Extract meaningful keywords from recent articles using LLM
 */
export async function extractKeywordsFromArticles(articles: { headline: string; subheadline?: string | null; body: string }[]): Promise<string[]> {
  if (articles.length === 0) return [];

  const headlines = articles
    .slice(0, 20) // Use top 20 most recent
    .map(a => `- ${a.headline}${a.subheadline ? `: ${a.subheadline}` : ""}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You extract trending news keywords from article headlines. Return ONLY a JSON array of 10-15 short keyword phrases (2-4 words each) that represent the most newsworthy topics. Focus on proper nouns, events, companies, and people. No explanations.",
        },
        {
          role: "user",
          content: `Extract trending keywords from these news headlines:\n\n${headlines}\n\nReturn a JSON array like: ["keyword one", "keyword two", ...]`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "keywords",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["keywords"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      const parsed = JSON.parse(content);
      return parsed.keywords || [];
    }
  } catch (e: any) {
    console.warn("[X Reply] Failed to extract keywords via LLM:", e.message);
  }

  // Fallback: extract from headlines directly
  return articles
    .slice(0, 10)
    .map(a => {
      // Take first 3-4 significant words from headline
      const words = a.headline.split(" ").filter(w => w.length > 3).slice(0, 3);
      return words.join(" ");
    })
    .filter(Boolean);
}

// ─── Tweet Search ────────────────────────────────────────────
/**
 * Search X for recent popular tweets matching keywords.
 * Includes author public_metrics and verified_type for filtering.
 */
export async function searchTweetsForKeyword(
  client: TwitterApiReadWrite,
  keyword: string,
  maxResults: number = 10,
  filterSettings?: Partial<XReplyEngineSettings>
): Promise<TweetCandidate[]> {
  const minFollowers = filterSettings?.minFollowers ?? 1000;
  const maxFollowers = filterSettings?.maxFollowers ?? 500000;
  const verifiedOnly = filterSettings?.verifiedOnly ?? false;

  try {
    // Search for recent tweets with engagement, excluding retweets and replies
    const query = `${keyword} -is:retweet -is:reply lang:en`;
    const result = await client.v2.search(query, {
      max_results: Math.min(maxResults, 100),
      "tweet.fields": ["public_metrics", "author_id", "created_at", "reply_settings"],
      "user.fields": ["username", "name", "public_metrics", "verified_type", "verified"],
      expansions: ["author_id"],
      sort_order: "relevancy",
    });

    const tweets = result.data?.data || [];
    const users = result.data?.includes?.users || [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return tweets
      .filter(t => {
        const metrics = t.public_metrics;
        // Only engage with tweets with some engagement (at least 5 likes or 2 retweets)
        if (!metrics || (metrics.like_count < 5 && metrics.retweet_count < 2)) return false;

        // Check reply settings — only filter for reply mode (quote tweets bypass this)
        const replySettings = (t as any).reply_settings;
        if (replySettings && replySettings !== "everyone") {
          console.log(`[X Reply] Skipping tweet ${t.id} - reply_settings: ${replySettings}`);
          return false;
        }

        // Author follower count filter
        const author = userMap.get(t.author_id || "");
        if (author) {
          const followers = author.public_metrics?.followers_count ?? 0;
          if (followers < minFollowers) {
            console.log(`[X Reply] Skipping tweet ${t.id} - author @${author.username} has ${followers} followers (min: ${minFollowers})`);
            return false;
          }
          if (followers > maxFollowers) {
            console.log(`[X Reply] Skipping tweet ${t.id} - author @${author.username} has ${followers} followers (max: ${maxFollowers})`);
            return false;
          }

          // Verified-only filter
          if (verifiedOnly) {
            const vType = (author as any).verified_type as string | undefined;
            const isVerified = vType && vType !== "none";
            if (!isVerified) {
              console.log(`[X Reply] Skipping tweet ${t.id} - author @${author.username} not verified (verified_type: ${vType ?? "none"})`);
              return false;
            }
          }
        }

        return true;
      })
      .map(t => {
        const author = userMap.get(t.author_id || "");
        const followers = author?.public_metrics?.followers_count ?? 0;
        const vType = (author as any)?.verified_type as string | undefined;
        return {
          tweetId: t.id,
          tweetText: t.text,
          tweetAuthor: author?.name || "Unknown",
          tweetAuthorHandle: author?.username || "unknown",
          tweetLikes: t.public_metrics?.like_count || 0,
          tweetRetweets: t.public_metrics?.retweet_count || 0,
          tweetFollowers: followers,
          tweetVerifiedType: vType || "none",
          keyword,
        };
      })
      .sort((a, b) => (b.tweetLikes + b.tweetRetweets * 2) - (a.tweetLikes + a.tweetRetweets * 2));
  } catch (e: any) {
    console.warn(`[X Reply] Search failed for "${keyword}": ${e.message}`);
    return [];
  }
}

// ─── Reply / Quote Generation ────────────────────────────────
/**
 * Generate a witty reply or quote tweet comment
 */
export async function generateReply(
  tweet: TweetCandidate,
  article: { headline: string; slug: string },
  siteUrl: string,
  mode: "reply" | "quote_tweet" = "quote_tweet"
): Promise<string | null> {
  const articleUrl = `${siteUrl}/article/${article.slug}?utm_source=x&utm_medium=social&utm_campaign=reply-engine`;
  const isQuote = mode === "quote_tweet";

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the social media voice of a news publication. Your ${isQuote ? "quote tweets" : "replies"} are:
- Witty, dry, and sharp — never mean-spirited
- Short (under 240 characters including the link)
- End with a link to a related article
- Written as if the publication is speaking, not a person
- Punchy and quotable — the kind of ${isQuote ? "quote tweet" : "reply"} people retweet

Format: [Sharp comment]. [Article URL]
The URL takes ~23 characters. Keep the comment under 215 characters.`,
        },
        {
          role: "user",
          content: `${isQuote ? "Quote tweet" : "Reply to tweet"} from @${tweet.tweetAuthorHandle}: "${tweet.tweetText}"

Write a sharp ${isQuote ? "quote tweet comment" : "reply"} that references this tweet and links to our related article:
"${article.headline}"
URL: ${articleUrl}

${isQuote ? "Quote tweet comment" : "Reply"} (under 240 chars total, must include the URL):`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    const reply = typeof rawContent === 'string' ? rawContent.trim() : null;
    if (!reply) return null;

    // Ensure URL is included
    if (!reply.includes(articleUrl)) {
      const truncated = reply.substring(0, 215).trimEnd();
      return `${truncated} ${articleUrl}`;
    }

    return reply.substring(0, 280); // Hard cap at 280 chars
  } catch (e: any) {
    console.warn("[X Reply] Failed to generate reply:", e.message);
    return null;
  }
}

/**
 * Generate a pure engagement reply — witty, NO article link.
 * Used ~50% of the time for more natural, conversational engagement.
 */
export async function generateEngagementReply(
  tweet: TweetCandidate,
  mode: "reply" | "quote_tweet" = "reply"
): Promise<string | null> {
  const isQuote = mode === "quote_tweet";
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the social media voice of a news publication. Your ${isQuote ? "quote tweets" : "replies"} are:
- Witty, dry, and sharp — never mean-spirited
- Short (under 200 characters)
- Written as if the publication is speaking, not a person
- Punchy, quotable, and conversational
- Do NOT include any links or URLs
- Feel like genuine human engagement, not promotion
- Can use humor, irony, wordplay, or sharp observations`,
        },
        {
          role: "user",
          content: `${isQuote ? "Quote tweet" : "Reply to tweet"} from @${tweet.tweetAuthorHandle}: "${tweet.tweetText}"

Write a short, witty ${isQuote ? "quote tweet comment" : "reply"} that engages with this tweet. NO links. Just be funny and conversational. Under 200 characters:`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    let reply = typeof rawContent === 'string' ? rawContent.trim() : null;
    if (!reply) return null;

    // Strip any URLs the LLM may have included despite instructions
    reply = reply.replace(/https?:\/\/\S+/g, '').trim();
    if (!reply) return null;

    return reply.substring(0, 280);
  } catch (e: any) {
    console.warn("[X Reply] Failed to generate engagement reply:", e.message);
    return null;
  }
}

// ─── Post Reply or Quote Tweet ───────────────────────────────
/**
 * Post a reply or quote tweet on X
 */
// Branded fallback image URL — used when an article has no featured image.
// Uploaded to CDN to ensure Twitter's crawler can always access it.
const REPLY_FALLBACK_IMAGE_URL = ""; // Set brand_og_image in Settings > Branding

export async function postReply(
  client: TwitterApiReadWrite,
  tweetId: string,
  replyText: string,
  mode: "reply" | "quote_tweet" = "quote_tweet",
  imageUrl?: string
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    // Upload image as media attachment.
    // We always attach an image directly (never rely on Twitter's URL card preview)
    // because OG tags are set client-side by React and Twitter's crawler can't execute JS.
    const effectiveImageUrl = imageUrl || REPLY_FALLBACK_IMAGE_URL;
    let mediaId: string | undefined;
    try {
      const imageResponse = await fetch(effectiveImageUrl);
      if (imageResponse.ok) {
        let imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get("content-type") || "image/png";
        let mimeType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" = "image/png";
        if (contentType.includes("jpeg") || contentType.includes("jpg")) mimeType = "image/jpeg";
        else if (contentType.includes("gif")) mimeType = "image/gif";
        else if (contentType.includes("webp")) mimeType = "image/webp";
        // Convert PNG to JPEG for better X compatibility
        if (mimeType === "image/png") {
          try {
            const sharp = await import("sharp");
            imageBuffer = Buffer.from(await sharp.default(imageBuffer).jpeg({ quality: 85, progressive: true }).toBuffer());
            mimeType = "image/jpeg";
          } catch { /* sharp not available, upload original PNG */ }
        }
        mediaId = await (client as any).v1.uploadMedia(imageBuffer, { mimeType });
      }
    } catch (mediaErr: any) {
      console.warn(`[X Reply] Failed to upload image: ${mediaErr.message}. Posting without image.`);
    }

    let result;
    if (mode === "quote_tweet") {
      // Quote tweet: embed the original tweet in our post
      const payload: any = { text: replyText, quote_tweet_id: tweetId };
      if (mediaId) payload.media = { media_ids: [mediaId] };
      console.log(`[X Reply] Sending quote_tweet payload: tweetId=${tweetId}, hasMedia=${!!mediaId}, text="${replyText.substring(0, 80)}..."`);
      result = await client.v2.tweet(payload);
    } else {
      // Direct reply: in_reply_to_tweet_id
      const payload: any = { text: replyText, reply: { in_reply_to_tweet_id: tweetId } };
      if (mediaId) payload.media = { media_ids: [mediaId] };
      console.log(`[X Reply] Sending reply payload: in_reply_to_tweet_id=${tweetId}, hasMedia=${!!mediaId}, text="${replyText.substring(0, 80)}..."`);
      result = await client.v2.tweet(payload);
    }
    return { success: true, tweetId: result.data.id };
  } catch (e: any) {
    // Extract the most useful error detail from Twitter API responses
    const twitterDetail = e?.data?.detail || e?.data?.reason || e?.data?.title || null;
    const msg = twitterDetail || e.message || "Unknown error";
    const statusCode = e?.code || e?.status || "?";
    console.error(`[X Reply] ${mode} failed [${statusCode}]: ${msg}`);
    if (twitterDetail) {
      console.error(`[X Reply] Twitter detail: ${twitterDetail}`);
    }
    return { success: false, error: msg };
  }
}

// ─── Load Engine Settings ────────────────────────────────────
export async function loadEngineSettings(): Promise<XReplyEngineSettings> {
  const [modeSetting, minFollowersSetting, maxFollowersSetting, verifiedOnlySetting, maxEngagementsPerUserSetting] = await Promise.all([
    db.getSetting("x_reply_mode"),
    db.getSetting("x_reply_min_followers"),
    db.getSetting("x_reply_max_followers"),
    db.getSetting("x_reply_verified_only"),
    db.getSetting("x_reply_max_engagements_per_user"),
  ]);
  return {
    mode: (modeSetting?.value === "reply" ? "reply" : "quote_tweet") as "reply" | "quote_tweet",
    minFollowers: parseInt(minFollowersSetting?.value || "1000", 10),
    maxFollowers: parseInt(maxFollowersSetting?.value || "500000", 10),
    verifiedOnly: verifiedOnlySetting?.value === "true",
    maxEngagementsPerUser: parseInt(maxEngagementsPerUserSetting?.value || "2", 10),
  };
}

// ─── Main Engine ─────────────────────────────────────────────
/**
 * Run one cycle of the auto-reply engine:
 * 1. Check if enabled and under daily limit
 * 2. Fetch recent articles and extract keywords
 * 3. Search X for matching tweets (with author filtering)
 * 4. Generate and post replies or quote tweets
 */
export async function runReplyEngine(licenseId?: number): Promise<ReplyResult> {
  // Check if enabled
  const enabledSetting = await db.getSetting("x_reply_enabled");
  if (enabledSetting?.value !== "true") {
    return { success: true, repliesGenerated: 0, repliesPosted: 0, error: "X reply engine disabled" };
  }

  // Check daily limit
  const dailyLimitSetting = await db.getSetting("x_reply_daily_limit");
  const dailyLimit = parseInt(dailyLimitSetting?.value || "10", 10);
  const postedToday = await db.countXRepliesToday();
  if (postedToday >= dailyLimit) {
    console.log(`[X Reply] Daily limit reached (${postedToday}/${dailyLimit}). Skipping.`);
    return { success: true, repliesGenerated: 0, repliesPosted: 0, error: `Daily limit reached (${postedToday}/${dailyLimit})` };
  }

  const remaining = dailyLimit - postedToday;

  // Per-license hourly rate limit (5 replies per hour per license)
  if (licenseId) {
    try {
      const hourlyCount = await db.countXRepliesInLastHour(licenseId);
      if (hourlyCount >= 5) {
        console.log(`[X Reply] Rate limit reached for license ${licenseId} — ${hourlyCount} replies in last hour. Skipping.`);
        return { success: true, repliesGenerated: 0, repliesPosted: 0, error: `Hourly rate limit reached (${hourlyCount}/5)` };
      }
    } catch (rateLimitErr: any) {
      console.warn(`[X Reply] Rate limit check failed (non-fatal): ${rateLimitErr.message}`);
    }
  }
  const batchSize = Math.min(remaining, 3); // Post max 3 per cycle to stay safe

  // Load engine settings (mode, follower filters, verified-only)
  const engineSettings = await loadEngineSettings();
  console.log(`[X Reply] Mode: ${engineSettings.mode}, Followers: ${engineSettings.minFollowers}-${engineSettings.maxFollowers}, VerifiedOnly: ${engineSettings.verifiedOnly}`);

  // Get X credentials
  const creds = await getXCredentials();
  if (!creds) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: "X credentials not configured" };
  }
  const client = new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessTokenSecret,
  });
  const rwClient = client.readWrite;

  // Get site URL
  const siteUrlSetting = await db.getSetting("site_url");
  const siteUrl = siteUrlSetting?.value || "https://example.com";

  // Fetch the most recent published articles — always fresh on every cycle, bypasses
  // feed randomization so replies are based on the latest news (ordered by publishedAt DESC).
  const recentArticles = await db.listRecentArticlesForEngine(30);
  if (recentArticles.length === 0) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: "No published articles found" };
  }
  console.log(`[X Reply] Fetched ${recentArticles.length} most recent articles (newest: "${recentArticles[0]?.headline?.substring(0, 60) || 'unknown'}")`);

  // Extract keywords
  console.log(`[X Reply] Extracting keywords from ${recentArticles.length} articles...`);
  const keywords = await extractKeywordsFromArticles(recentArticles);
  if (keywords.length === 0) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: "No keywords extracted" };
  }
  console.log(`[X Reply] Keywords: ${keywords.slice(0, 5).join(", ")}...`);

  let repliesGenerated = 0;
  let repliesPosted = 0;

  // Search tweets and generate replies
  for (const keyword of keywords.slice(0, 5)) {
    if (repliesPosted >= batchSize) break;

    const candidates = await searchTweetsForKeyword(rwClient, keyword, 20, engineSettings);
    console.log(`[X Reply] Found ${candidates.length} candidates for "${keyword}" (after filtering)`);

    for (const tweet of candidates.slice(0, 3)) {
      if (repliesPosted >= batchSize) break;

        // Skip if we've already successfully posted a reply to this tweet
      const existing = await db.getXReplyByTweetId(tweet.tweetId);
      if (existing && existing.status === "posted") {
        console.log(`[X Reply] Already replied to tweet ${tweet.tweetId}, skipping`);
        continue;
      }
      // If it previously failed, delete the old record so we can retry
      if (existing && existing.status === "failed") {
        await db.deleteXReply(existing.id);
        console.log(`[X Reply] Retrying previously failed reply to tweet ${tweet.tweetId}`);
      }
      // Per-user engagement cap: skip users we've already engaged too many times
      const userEngagementCount = await db.countRepliesByUserHandle(tweet.tweetAuthorHandle);
      if (userEngagementCount >= engineSettings.maxEngagementsPerUser) {
        console.log(`[X Reply] Skipping @${tweet.tweetAuthorHandle} — already engaged ${userEngagementCount}/${engineSettings.maxEngagementsPerUser} times`);
        continue;
      }
      // Per-user article deduplication: exclude articles already used with this user
      const articlesUsedWithUser = await db.getArticlesUsedWithUser(tweet.tweetAuthorHandle);
      const availableArticles = recentArticles.filter(a => a.slug && !articlesUsedWithUser.includes(a.slug));
      // Find the most relevant article for this keyword (from unused articles only)
      const matchingArticle = availableArticles.find(a =>
        a.headline.toLowerCase().includes(keyword.toLowerCase().split(" ")[0]) ||
        (a.subheadline || "").toLowerCase().includes(keyword.toLowerCase().split(" ")[0])
      ) || availableArticles[0]; // Fallback to most recent unused article
      if (!matchingArticle?.slug) {
        console.log(`[X Reply] Skipping @${tweet.tweetAuthorHandle} — no unused articles left for this user`);
        continue;
      }

      // Generate reply/quote tweet
      const replyContent = await generateReply(tweet, matchingArticle, siteUrl, engineSettings.mode);
      if (!replyContent) continue;

      // Save to queue
      const replyId = await db.insertXReply({
        tweetId: tweet.tweetId,
        tweetText: tweet.tweetText,
        tweetAuthor: tweet.tweetAuthor,
        tweetAuthorHandle: tweet.tweetAuthorHandle,
        tweetLikes: tweet.tweetLikes,
        tweetRetweets: tweet.tweetRetweets,
        tweetFollowers: tweet.tweetFollowers,
        tweetVerifiedType: tweet.tweetVerifiedType,
        keyword: tweet.keyword,
        articleId: matchingArticle.id,
        articleSlug: matchingArticle.slug,
        articleHeadline: matchingArticle.headline,
        replyContent,
        replyMode: engineSettings.mode,
        licenseId,
      });

      repliesGenerated++;

      // Post the reply or quote tweet
      // Pass the article's featured image directly so Twitter shows the correct image
      // (not a URL card from the homepage OG image)
      const modeLabel = engineSettings.mode === "quote_tweet" ? "quote tweet" : "reply";
      const articleImageUrl = matchingArticle.featuredImage || undefined;
      console.log(`[X Reply] Posting ${modeLabel} to @${tweet.tweetAuthorHandle} (${tweet.tweetFollowers.toLocaleString()} followers): "${replyContent.substring(0, 60)}..."`);
      const result = await postReply(rwClient, tweet.tweetId, replyContent, engineSettings.mode, articleImageUrl);

      if (result.success && replyId) {
        await db.updateXReplyStatus(replyId, "posted", {
          postedTweetId: result.tweetId,
          postedAt: new Date(),
        });
        repliesPosted++;
        console.log(`[X Reply] ${modeLabel} posted successfully: ${result.tweetId}`);
      } else if (replyId) {
        await db.updateXReplyStatus(replyId, "failed", {
          errorMessage: result.error,
        });
        console.warn(`[X Reply] ${modeLabel} failed: ${result.error}`);
      }

      // Small delay between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[X Reply] Cycle complete. Generated: ${repliesGenerated}, Posted: ${repliesPosted}`);

  // Prune queue to configured limits
  try {
    const [maxFailed, maxPosted, maxPending] = await Promise.all([
      db.getSetting("x_reply_max_failed_queue"),
      db.getSetting("x_reply_max_posted_queue"),
      db.getSetting("x_reply_max_pending_queue"),
    ]);
    await Promise.all([
      db.pruneXRepliesByStatus("failed", parseInt(maxFailed?.value || "50", 10)),
      db.pruneXRepliesByStatus("posted", parseInt(maxPosted?.value || "100", 10)),
      db.pruneXRepliesByStatus("pending", parseInt(maxPending?.value || "50", 10)),
    ]);
  } catch (e) {
    console.warn("[X Reply] Queue pruning failed (non-fatal):", e);
  }

  return { success: true, repliesGenerated, repliesPosted };
}

// ─── Mentions Reply Engine ──────────────────────────────────
/**
 * Run one cycle of the mentions-based reply engine:
 * 1. Fetch recent brand mentions from Twitter Mentions Timeline
 * 2. Skip mentions already replied to (stored in DB)
 * 3. Generate a witty reply linking to a relevant article
 * 4. Post the reply (allowed on Free tier since we were mentioned)
 */
export async function runMentionsReplyEngine(licenseId?: number): Promise<ReplyResult> {
  // Check if enabled
  const enabledSetting = await db.getSetting("x_reply_enabled");
  if (enabledSetting?.value !== "true") {
    return { success: true, repliesGenerated: 0, repliesPosted: 0, error: "X reply engine disabled" };
  }

  // Check daily limit
  const dailyLimitSetting = await db.getSetting("x_reply_daily_limit");
  const dailyLimit = parseInt(dailyLimitSetting?.value || "10", 10);
  const postedToday = await db.countXRepliesToday();
  if (postedToday >= dailyLimit) {
    console.log(`[X Mentions] Daily limit reached (${postedToday}/${dailyLimit}). Skipping.`);
    return { success: true, repliesGenerated: 0, repliesPosted: 0, error: `Daily limit reached (${postedToday}/${dailyLimit})` };
  }

  const remaining = dailyLimit - postedToday;

  // Per-license hourly rate limit (5 replies per hour per license)
  if (licenseId) {
    try {
      const hourlyCount = await db.countXRepliesInLastHour(licenseId);
      if (hourlyCount >= 5) {
        console.log(`[X Reply] Rate limit reached for license ${licenseId} — ${hourlyCount} replies in last hour. Skipping.`);
        return { success: true, repliesGenerated: 0, repliesPosted: 0, error: `Hourly rate limit reached (${hourlyCount}/5)` };
      }
    } catch (rateLimitErr: any) {
      console.warn(`[X Reply] Rate limit check failed (non-fatal): ${rateLimitErr.message}`);
    }
  }
  const batchSize = Math.min(remaining, 5); // Up to 5 mention replies per cycle

  // Get X credentials
  const creds = await getXCredentials();
  if (!creds) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: "X credentials not configured" };
  }
  const client = new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessTokenSecret,
  });
  const rwClient = client.readWrite;

  // Get our own user ID
  let myUserId: string;
  try {
    const me = await rwClient.v2.me();
    myUserId = me.data.id;
  } catch (e: any) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: `Failed to get user ID: ${e.message}` };
  }

  // Get site URL
  const siteUrlSetting = await db.getSetting("site_url");
  const siteUrl = siteUrlSetting?.value || "https://example.com";

  // Fetch recent mentions (up to 20, newest first)
  let mentions: Array<{ id: string; text: string; author_id?: string; created_at?: string; in_reply_to_user_id?: string; conversation_id?: string; reply_settings?: string }> = [];
  let mentionAuthors: Map<string, { username: string; name: string; public_metrics?: { followers_count: number } }> = new Map();
  try {
    const result = await rwClient.v2.userMentionTimeline(myUserId, {
      max_results: 20,
      "tweet.fields": ["id", "text", "author_id", "created_at", "reply_settings", "in_reply_to_user_id", "conversation_id"],
      "user.fields": ["username", "name", "public_metrics"],
      expansions: ["author_id"],
    });
    mentions = result.data?.data || [];
    const users = result.data?.includes?.users || [];
    mentionAuthors = new Map(users.map((u: any) => [u.id, u]));
    console.log(`[X Mentions] Fetched ${mentions.length} recent mentions`);
  } catch (e: any) {
    const detail = e?.data?.detail || e.message;
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: `Failed to fetch mentions: ${detail}` };
  }

  if (mentions.length === 0) {
    console.log("[X Mentions] No recent mentions found");
    return { success: true, repliesGenerated: 0, repliesPosted: 0 };
  }

  // Fetch recent articles for context
  const recentArticles = await db.listRecentArticlesForEngine(30);
  if (recentArticles.length === 0) {
    return { success: false, repliesGenerated: 0, repliesPosted: 0, error: "No published articles found" };
  }

  let repliesGenerated = 0;
  let repliesPosted = 0;

  for (const mention of mentions) {
    if (repliesPosted >= batchSize) break;

    // Skip mid-thread mentions that are replies to someone other than the brand account.
    // These get buried in other people's threads and don't show as visible replies on our profile.
    // Only reply to:
    //   (a) Top-level tweets that mention us (no in_reply_to_user_id), OR
    //   (b) Tweets that are direct replies TO the brand account (in_reply_to_user_id === myUserId)
    const inReplyToUserId = (mention as any).in_reply_to_user_id;
    const conversationId = (mention as any).conversation_id;
    const isTopLevel = !inReplyToUserId;
    const isDirectReplyToUs = inReplyToUserId === myUserId;
    if (!isTopLevel && !isDirectReplyToUs) {
      console.log(`[X Mentions] Skipping mid-thread mention ${mention.id} (in_reply_to_user_id=${inReplyToUserId}, not directed at us)`);
      continue;
    }
    // Extra guard: if the mention is inside a conversation started by someone else
    // (conversation_id !== mention.id means this is a reply, not a root tweet),
    // and we are not the direct target of the reply, Twitter will 403 with:
    // "Reply to this conversation is not allowed because you have not been mentioned or
    //  otherwise engaged by the author of the post you are replying to."
    // This fires even when reply_settings === 'everyone'.
    if (conversationId && conversationId !== mention.id && !isDirectReplyToUs) {
      console.log(`[X Mentions] Skipping mention ${mention.id} — buried in conversation ${conversationId} started by someone else (would 403)`);
      continue;
    }
    // Skip tweets with restricted reply settings — Twitter 403s if we reply to a tweet
    // that only allows replies from mentioned users, followers, or subscribers.
    const replySettings = (mention as any).reply_settings;
    if (replySettings && replySettings !== 'everyone') {
      console.log(`[X Mentions] Skipping mention ${mention.id} — reply_settings=${replySettings} (restricted, would 403)`);
      continue;
    }

    // Skip if already replied to this mention
    const existing = await db.getXReplyByTweetId(mention.id);
    if (existing && existing.status === "posted") {
      console.log(`[X Mentions] Already replied to mention ${mention.id}, skipping`);
      continue;
    }
    if (existing && existing.status === "failed") {
      await db.deleteXReply(existing.id);
    }

    const author = mentionAuthors.get(mention.author_id || "");
    const authorHandle = author?.username || "unknown";
    const authorName = author?.name || "Unknown";
    const authorFollowers = author?.public_metrics?.followers_count ?? 0;

    // Build a TweetCandidate-like object for generateReply
    const tweetCandidate: TweetCandidate = {
      tweetId: mention.id,
      tweetText: mention.text,
      tweetAuthor: authorName,
      tweetAuthorHandle: authorHandle,
      tweetLikes: 0,
      tweetRetweets: 0,
      tweetFollowers: authorFollowers,
      tweetVerifiedType: "none",
      keyword: "mention",
    };

    // Link probability driven by x_reply_link_probability setting (0-100, default 50)
    const linkProbSetting = await db.getSetting("x_reply_link_probability");
    const linkProbability = parseInt(linkProbSetting?.value || "50", 10) / 100;
    const includeArticleLink = Math.random() < linkProbability;
    let replyContent: string | null = null;
    let article: (typeof recentArticles)[0] | null = null;

    if (includeArticleLink) {
      // Article-linked reply: pick an article and generate reply with link
      const articlesUsedWithUser = await db.getArticlesUsedWithUser(authorHandle);
      const availableArticles = recentArticles.filter(a => a.slug && !articlesUsedWithUser.includes(a.slug));
      const candidateArticles = availableArticles.length > 0 ? availableArticles : recentArticles;
      article = candidateArticles[0] || null;
      if (!article?.slug) continue;
      replyContent = await generateReply(tweetCandidate, article, siteUrl, "reply");
      console.log(`[X Mentions] Mode: article-linked reply to @${authorHandle}`);
    } else {
      // Pure engagement reply: witty comment, no link
      replyContent = await generateEngagementReply(tweetCandidate, "reply");
      console.log(`[X Mentions] Mode: pure engagement reply to @${authorHandle}`);
    }
    if (!replyContent) continue;

    // Save to queue
    const replyId = await db.insertXReply({
      tweetId: mention.id,
      tweetText: mention.text,
      tweetAuthor: authorName,
      tweetAuthorHandle: authorHandle,
      tweetLikes: 0,
      tweetRetweets: 0,
      tweetFollowers: authorFollowers,
      tweetVerifiedType: "none",
      keyword: "mention",
      articleId: article?.id ?? undefined,
      articleSlug: article?.slug ?? undefined,
      articleHeadline: article?.headline ?? undefined,
      replyContent,
      replyMode: "reply",
      licenseId,
    });

    repliesGenerated++;

    // Post the reply — allowed because we were mentioned
    console.log(`[X Mentions] Replying to @${authorHandle}: "${replyContent.substring(0, 60)}..."`);
    const articleImageUrl = (includeArticleLink && article?.featuredImage) ? article.featuredImage : undefined;
    const result = await postReply(rwClient, mention.id, replyContent, "reply", articleImageUrl);

    if (result.success && replyId) {
      await db.updateXReplyStatus(replyId, "posted", {
        postedTweetId: result.tweetId,
        postedAt: new Date(),
      });
      repliesPosted++;
      console.log(`[X Mentions] Reply posted successfully: ${result.tweetId}`);
    } else if (replyId) {
      await db.updateXReplyStatus(replyId, "failed", {
        errorMessage: result.error,
      });
      console.warn(`[X Mentions] Reply failed: ${result.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`[X Mentions] Cycle complete. Generated: ${repliesGenerated}, Posted: ${repliesPosted}`);

  // Prune queue to configured limits
  try {
    const [maxFailed, maxPosted, maxPending] = await Promise.all([
      db.getSetting("x_reply_max_failed_queue"),
      db.getSetting("x_reply_max_posted_queue"),
      db.getSetting("x_reply_max_pending_queue"),
    ]);
    await Promise.all([
      db.pruneXRepliesByStatus("failed", parseInt(maxFailed?.value || "50", 10)),
      db.pruneXRepliesByStatus("posted", parseInt(maxPosted?.value || "100", 10)),
      db.pruneXRepliesByStatus("pending", parseInt(maxPending?.value || "50", 10)),
    ]);
  } catch (e) {
    console.warn("[X Mentions] Queue pruning failed (non-fatal):", e);
  }

  return { success: true, repliesGenerated, repliesPosted };
}

// ─── Scheduler ───────────────────────────────────────────────
let _replySchedulerTimer: NodeJS.Timeout | null = null;

/**
 * Initialize the auto-reply scheduler.
 * Reads interval from settings and runs on that schedule.
 */
export async function initReplyScheduler(): Promise<void> {
  // Clear any existing timer
  if (_replySchedulerTimer) {
    clearInterval(_replySchedulerTimer);
    _replySchedulerTimer = null;
  }

  // Prefer x_reply_auto_interval_hours (hours-based setting); fall back to x_reply_interval_minutes for legacy
  const autoHoursSetting = await db.getSetting("x_reply_auto_interval_hours");
  const intervalSetting = await db.getSetting("x_reply_interval_minutes");
  let intervalMinutes: number;
  if (autoHoursSetting?.value) {
    intervalMinutes = parseInt(autoHoursSetting.value, 10) * 60;
  } else {
    intervalMinutes = parseInt(intervalSetting?.value || "240", 10); // default 4 hours
  }
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[X Reply] Scheduler initialized. Running every ${intervalMinutes} minutes (${intervalMinutes / 60}h).`);

  // Helper: run the correct engine based on x_reply_source setting
  async function runCorrectEngine() {
    const sourceSetting = await db.getSetting("x_reply_source");
    const source = sourceSetting?.value === "mentions" ? "mentions" : "keyword_search";
    if (source === "mentions") {
      return runMentionsReplyEngine();
    } else {
      return runReplyEngine();
    }
  }

  // Run once after a short delay on startup
  setTimeout(async () => {
    try {
      const result = await runCorrectEngine();
      if (result.repliesPosted > 0) {
        console.log(`[X Reply] Startup cycle: posted ${result.repliesPosted} replies`);
      }
    } catch (e: any) {
      console.warn("[X Reply] Startup cycle error:", e.message);
    }
  }, 30000); // 30 second delay on startup

  // Then run on interval
  _replySchedulerTimer = setInterval(async () => {
    try {
      // Re-read interval in case it changed
      const newAutoHours = await db.getSetting("x_reply_auto_interval_hours");
      const newIntervalSetting = await db.getSetting("x_reply_interval_minutes");
      const newIntervalMinutes = newAutoHours?.value
        ? parseInt(newAutoHours.value, 10) * 60
        : parseInt(newIntervalSetting?.value || "240", 10);
      if (newIntervalMinutes !== intervalMinutes) {
        // Restart scheduler with new interval
        console.log(`[X Reply] Interval changed to ${newIntervalMinutes} min (${newIntervalMinutes / 60}h), restarting scheduler`);
        initReplyScheduler();
        return;
      }
      await runCorrectEngine();
    } catch (e: any) {
      console.warn("[X Reply] Scheduler error:", e.message);
    }
  }, intervalMs);
}
