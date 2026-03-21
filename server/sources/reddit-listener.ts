/**
 * reddit-listener.ts — Reddit source module for the v4.0 Multi-Source Selector Window
 *
 * Fetches hot posts from configured subreddits via Reddit's public JSON API
 * (no OAuth required for read-only access to public subreddits).
 *
 * White-label compatible: all config comes from DB settings.
 */

import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";
import { getSetting } from "../db";

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
  is_self: boolean;
}

/**
 * Fetch hot posts from configured subreddits and write them as candidates.
 * Returns the number of new candidates inserted.
 */
export async function fetchRedditCandidates(batchDate: string): Promise<number> {
  // Check if Reddit listener is enabled
  const enabledSetting = await getSetting("reddit_listener_enabled");
  console.log(`[reddit-listener] enabled setting: ${JSON.stringify(enabledSetting?.value)} (raw)`);
  if (enabledSetting?.value === "false") {
    console.log("[reddit-listener] disabled — skipping");
    return 0;
  }

  // Get subreddit list from settings
  const subredditSetting = await getSetting("reddit_listener_subreddits");
  const rawSubreddits = subredditSetting?.value || "";
  console.log(`[reddit-listener] subreddits raw: ${JSON.stringify(rawSubreddits)}`);
  const subreddits = rawSubreddits
    .split("\n")
    .map((s) => s.trim().replace(/^r\//, ""))
    .filter(Boolean);
  console.log(`[reddit-listener] parsed subreddits: ${JSON.stringify(subreddits)}`);
  if (subreddits.length === 0) {
    console.log("[reddit-listener] no subreddits configured — skipping");
    return 0;
  }

  let totalInserted = 0;

  for (const subreddit of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "hambry-content-engine/4.0 (content aggregation bot)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(`[reddit-listener] r/${subreddit} returned ${response.status} — skipping`);
        continue;
      }

      const json = await response.json() as { data: { children: Array<{ data: RedditPost }> } };
      const posts: RedditPost[] = json.data?.children?.map((c) => c.data) ?? [];

      if (posts.length === 0) continue;

      // Filter out stickied/mod posts and very low-score posts
      const filtered = posts.filter((p) => p.score > 10);

      // Take top 10 by score
      const top10 = filtered.sort((a, b) => b.score - a.score).slice(0, 10);

      const entries: NewsEventInput[] = top10.map((post) => {
        // Priority: 55–80 based on score (capped at 50k)
        const priority = Math.min(80, 55 + Math.floor((post.score / 50000) * 25));
        const postUrl = `https://www.reddit.com${post.permalink}`;
        return {
          title: post.title.slice(0, 1000),
          summary: post.selftext ? post.selftext.slice(0, 500) : undefined,
          source: `r/${post.subreddit}`,
          sourceUrl: postUrl,
          sourceType: "reddit" as const,
          priority,
          publishedDate: new Date(post.created_utc * 1000).toISOString(),
          metadata: {
            subreddit: post.subreddit,
            redditId: post.id,
            score: post.score,
            numComments: post.num_comments,
            isSelf: post.is_self,
            externalUrl: post.is_self ? null : post.url,
          },
        };
      });

      const inserted = await writeRssCandidates(entries, batchDate);
      console.log(`[reddit-listener] r/${subreddit}: ${posts.length} posts fetched, ${filtered.length} passed filter, ${entries.length} prepared, ${inserted} inserted`);
      totalInserted += inserted;
    } catch (err: any) {
      console.error(`[reddit-listener] Error fetching r/${subreddit}:`, err.message ?? err);
    }
  }

  console.log(`[reddit-listener] Total inserted: ${totalInserted}`);
  return totalInserted;
}
