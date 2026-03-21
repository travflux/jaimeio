/**
 * Standalone X Tweet Engine
 *
 * Generates punchy, standalone jokes and observations from recent
 * article headlines — no article links, pure brand voice building.
 *
 * Design goals:
 * - 5–10 standalone tweets generated per batch
 * - Each tweet is ≤ 280 chars, no URLs, no hashtag spam
 * - Inspired by recent published headlines but stands alone as comedy
 * - Manual approval queue (or auto-approve if setting enabled)
 * - Posted via the same xTwitterService as article posts
 * - Separate daily limit from article posts
 */

import * as db from "./db";
import { xStandaloneTweets, articles } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { postTweet } from "./xTwitterService";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "./db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StandaloneTweetResult {
  generated: number;
  autoApproved: number;
  errors: string[];
}

export interface PostStandaloneTweetResult {
  posted: number;
  skipped: number;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowMs(): number {
  return Date.now();
}

/**
 * Get recent published article headlines for inspiration (last 48h, up to 20)
 */
async function getRecentHeadlines(): Promise<string[]> {
  const database = await getDb();
  if (!database) return [];
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await database
    .select({ headline: articles.headline })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        gte(articles.publishedAt, cutoff)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(20);
  return rows.map((r) => r.headline);
}

/**
 * Count standalone tweets posted today
 */
export async function countStandaloneTweetsToday(): Promise<number> {
  const database = await getDb();
  if (!database) return 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await database
    .select({ count: sql<number>`count(*)` })
    .from(xStandaloneTweets)
    .where(
      and(
        eq(xStandaloneTweets.status, "posted"),
        gte(xStandaloneTweets.postedAt, startOfDay)
      )
    );
  return Number(rows[0]?.count ?? 0);
}

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate a batch of standalone tweets from recent headlines.
 * Each tweet is a punchy standalone observation — no links, no hashtag spam.
 */
export async function generateStandaloneTweets(
  count: number = 5
): Promise<StandaloneTweetResult> {
  const result: StandaloneTweetResult = {
    generated: 0,
    autoApproved: 0,
    errors: [],
  };

  const headlines = await getRecentHeadlines();
  if (headlines.length === 0) {
    result.errors.push("No recent published articles found to draw inspiration from.");
    return result;
  }

  const autoApproveSetting = await db.getSetting("standalone_tweet_auto_approve");
  const autoApprove = autoApproveSetting?.value === "true";

  const headlineList = headlines
    .slice(0, 10)
    .map((h, i) => `${i + 1}. ${h}`)
    .join("\n");

  const prompt = `You are the voice of a sharp news outlet. Your job is to write ${count} standalone tweets.

RULES:
- Each tweet must be ≤ 275 characters (leave room for safety)
- NO URLs or links of any kind
- NO more than 1 hashtag per tweet (and only if it genuinely adds wit)
- NO meta-commentary about being a news outlet
- Write as if you are a brilliant, deadpan observer of the news
- Vary the style: some dry observations, some mock-outrage, some absurdist takes
- Each tweet should work as a standalone observation — someone should engage without knowing the original headline
- Do NOT simply restate the headline — transform it into something more interesting

INSPIRATION (recent headlines — do not quote directly, use as creative fuel):
${headlineList}

Return ONLY a JSON array of ${count} tweet strings. No other text. Example format:
["Tweet one here.", "Tweet two here.", "Tweet three here."]`;

  let tweets: string[] = [];
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system" as const,
          content:
            "You are a witty comedy writer for a news outlet. Return only valid JSON arrays of tweet strings.",
        },
        { role: "user" as const, content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "standalone_tweets",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tweets: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["tweets"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const raw = typeof rawContent === "string" ? rawContent : null;
    if (!raw) throw new Error("Empty LLM response");
    const parsed = JSON.parse(raw);
    tweets = parsed.tweets ?? [];
  } catch (err) {
    result.errors.push(`LLM generation failed: ${String(err)}`);
    return result;
  }

  const now = new Date();
  for (const tweet of tweets) {
    const content = tweet.trim();
    if (!content || content.length > 280) continue;

    try {
      const database = await getDb();
      if (!database) throw new Error("DB not available");
      await database.insert(xStandaloneTweets).values({
        content,
        inspiredByHeadlines: JSON.stringify(headlines.slice(0, 10)),
        status: autoApprove ? "approved" : "pending",
        createdAt: now,
        updatedAt: now,
      });
      result.generated++;
      if (autoApprove) result.autoApproved++;
    } catch (err) {
      result.errors.push(`Failed to save tweet: ${String(err)}`);
    }
  }

  return result;
}

// ─── Posting ──────────────────────────────────────────────────────────────────

/**
 * Post the next approved standalone tweet that hasn't been posted yet.
 * Respects the daily limit setting.
 */
export async function postNextStandaloneTweet(): Promise<PostStandaloneTweetResult> {
  const result: PostStandaloneTweetResult = {
    posted: 0,
    skipped: 0,
    errors: [],
  };

  // Check daily limit
  const dailyLimitSetting = await db.getSetting("standalone_tweet_daily_limit");
  const dailyLimit = parseInt(dailyLimitSetting?.value ?? "5", 10);
  const postedToday = await countStandaloneTweetsToday();
  if (postedToday >= dailyLimit) {
    result.skipped++;
    return result;
  }

  // Get next approved tweet
  const database = await getDb();
  if (!database) { result.skipped++; return result; }

  const [next] = await database
    .select()
    .from(xStandaloneTweets)
    .where(eq(xStandaloneTweets.status, "approved"))
    .orderBy(xStandaloneTweets.createdAt)
    .limit(1);

  if (!next) {
    result.skipped++;
    return result;
  }

  // Mark as posting
  const now = new Date();
  await database
    .update(xStandaloneTweets)
    .set({ status: "posting", updatedAt: now })
    .where(eq(xStandaloneTweets.id, next.id));

  // Post to X
  const postResult = await postTweet(next.content);

  if (postResult.success && postResult.tweetId) {
    await database
      .update(xStandaloneTweets)
      .set({
        status: "posted",
        tweetId: postResult.tweetId,
        tweetUrl: postResult.tweetUrl ?? null,
        postedAt: now,
        updatedAt: now,
        errorMessage: null,
      })
      .where(eq(xStandaloneTweets.id, next.id));
    result.posted++;
  } else {
    await database
      .update(xStandaloneTweets)
      .set({
        status: "failed",
        errorMessage: postResult.error ?? "Unknown error",
        updatedAt: now,
      })
      .where(eq(xStandaloneTweets.id, next.id));
    result.errors.push(postResult.error ?? "Unknown error");
  }

  return result;
}

// ─── Queue Queries ────────────────────────────────────────────────────────────

export async function listStandaloneTweets(
  status?: "pending" | "approved" | "posted" | "rejected" | "failed"
) {
  const database = await getDb();
  if (!database) return [];
  const conditions = status ? [eq(xStandaloneTweets.status, status)] : [];
  return database
    .select()
    .from(xStandaloneTweets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(xStandaloneTweets.createdAt))
    .limit(100);
}

export async function approveStandaloneTweet(id: number) {
  const database = await getDb();
  if (!database) return;
  return database
    .update(xStandaloneTweets)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(xStandaloneTweets.id, id));
}

export async function rejectStandaloneTweet(id: number) {
  const database = await getDb();
  if (!database) return;
  return database
    .update(xStandaloneTweets)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(xStandaloneTweets.id, id));
}

export async function deleteStandaloneTweet(id: number) {
  const database = await getDb();
  if (!database) return;
  return database
    .delete(xStandaloneTweets)
    .where(eq(xStandaloneTweets.id, id));
}
