/**
 * x-listener.ts — X/Twitter source module for the v4.0 Multi-Source Selector Window
 *
 * Uses X API v2 search/recent to find high-engagement tweets matching
 * configurable query terms, then writes them as selector_candidates.
 *
 * API tier required: Basic (search/recent endpoint)
 * Trending topics (woeid) requires Pro/Enterprise — not used here.
 *
 * White-label compatible: all config comes from per-license DB settings.
 */

import { TwitterApi } from "twitter-api-v2";
import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";
import { getLicenseSettingOrGlobal } from "../db";

/**
 * Fetch the user-configured X search queries from per-license DB settings.
 * Reads from "x_listening_keywords" (newline-separated list).
 * Returns an empty array if not configured.
 */
export async function getConfiguredXQueries(licenseId: number): Promise<string[]> {
  const value = await getLicenseSettingOrGlobal(licenseId, "x_listening_keywords");
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 10); // cap at 10 queries to stay within rate limits
}

/**
 * Fetch the user-configured X accounts to monitor from per-license DB settings.
 * Reads from "x_listening_accounts" (newline-separated list of @handles).
 * Returns an empty array if not configured.
 */
export async function getConfiguredXAccounts(licenseId: number): Promise<string[]> {
  const value = await getLicenseSettingOrGlobal(licenseId, "x_listening_accounts");
  if (!value?.trim()) return [];
  return value
    .split("\n")
    .map((a) => a.trim().replace(/^@/, ""))
    .filter((a) => a.length > 0)
    .slice(0, 10);
}

/**
 * Check whether the X listener is enabled for a specific license.
 */
export async function isXListenerEnabled(licenseId: number): Promise<boolean> {
  const value = await getLicenseSettingOrGlobal(licenseId, "x_listening_enabled");
  return value === "true";
}

/** Build an authenticated X client from env vars */
function getXClient(): TwitterApi | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) return null;
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });
}

/**
 * Fetch recent tweets matching configured query terms and write them as candidates.
 * Returns the number of new candidates inserted.
 */
export async function fetchXCandidates(licenseId: number, batchDate: string): Promise<number> {
  // Check if X listener is enabled for this license
  const enabled = await isXListenerEnabled(licenseId);
  if (!enabled) return 0;

  // Get keyword queries from per-license settings
  const queries = await getConfiguredXQueries(licenseId);

  // Get monitored accounts from per-license settings
  const accounts = await getConfiguredXAccounts(licenseId);

  // Build combined query list: keywords + account-specific searches
  const allQueries: string[] = [...queries];
  for (const account of accounts) {
    allQueries.push(`from:${account}`);
  }

  if (allQueries.length === 0) return 0;

  const client = getXClient();
  if (!client) {
    console.warn("[x-listener] X API credentials not configured — skipping");
    return 0;
  }

  let totalInserted = 0;

  for (const query of allQueries) {
    try {
      // Search recent tweets — filter out retweets, require English
      const searchQuery = `${query} -is:retweet lang:en`;
      const result = await client.v2.search(searchQuery, {
        max_results: 10,
        "tweet.fields": ["public_metrics", "created_at", "author_id"],
        expansions: ["author_id"],
        "user.fields": ["username", "name"],
      });

      const tweets = result.data?.data ?? [];
      if (tweets.length === 0) continue;

      // Sort by engagement (likes + retweets + replies)
      const sorted = tweets.sort((a, b) => {
        const engA =
          (a.public_metrics?.like_count ?? 0) +
          (a.public_metrics?.retweet_count ?? 0) +
          (a.public_metrics?.reply_count ?? 0);
        const engB =
          (b.public_metrics?.like_count ?? 0) +
          (b.public_metrics?.retweet_count ?? 0) +
          (b.public_metrics?.reply_count ?? 0);
        return engB - engA;
      });

      // Take top 5 per query
      const top5 = sorted.slice(0, 5);

      const entries: NewsEventInput[] = top5.map((tweet) => {
        const engagement =
          (tweet.public_metrics?.like_count ?? 0) +
          (tweet.public_metrics?.retweet_count ?? 0) +
          (tweet.public_metrics?.reply_count ?? 0);
        // Priority: 60–85 based on engagement (capped at 10k for scaling)
        const priority = Math.min(85, 60 + Math.floor((engagement / 10000) * 25));
        return {
          title: tweet.text.slice(0, 255),
          source: "x-listener",
          sourceUrl: `https://x.com/i/web/status/${tweet.id}`,
          sourceType: "x" as const,
          priority,
          metadata: {
            query,
            tweetId: tweet.id,
            likes: tweet.public_metrics?.like_count ?? 0,
            retweets: tweet.public_metrics?.retweet_count ?? 0,
            replies: tweet.public_metrics?.reply_count ?? 0,
          },
        };
      });

      const inserted = await writeRssCandidates(entries, batchDate);
      totalInserted += inserted;
    } catch (err: any) {
      console.error(`[x-listener] Error fetching query "${query}":`, err.message ?? err);
    }
  }

  return totalInserted;
}
