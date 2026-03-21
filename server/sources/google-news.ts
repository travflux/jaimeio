/**
 * Google News Source Module — v4.0 Multi-Source Selector Window
 *
 * Generates dynamic Google News RSS URLs from user-configured topic keywords
 * and fetches them into selector_candidates.
 *
 * White-label compatible: topics are stored in DB settings, not hardcoded.
 */

import { getSetting } from "../db";
import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";

const GOOGLE_NEWS_SEARCH_BASE = "https://news.google.com/rss/search";

/**
 * Build a Google News RSS search URL for a given topic keyword.
 */
export function buildGoogleNewsTopicUrl(topic: string, lang = "en-US", country = "US"): string {
  const q = encodeURIComponent(topic.trim());
  return `${GOOGLE_NEWS_SEARCH_BASE}?q=${q}&hl=${lang}&gl=${country}&ceid=${country}:${lang.split("-")[0]}`;
}

/**
 * Fetch the user-configured topic keywords from DB.
 * Stored as a newline-separated list in the "google_news_topics" setting.
 * Returns an empty array if not configured.
 */
export async function getConfiguredTopics(): Promise<string[]> {
  const setting = await getSetting("google_news_topics");
  if (!setting?.value?.trim()) return [];
  return setting.value
    .split("\n")
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .slice(0, 20); // cap at 20 topics to avoid excessive API calls
}

/**
 * Fetch a single RSS feed URL and return parsed entries.
 * Uses the built-in fetch API (Node 18+).
 */
async function fetchRssFeed(url: string, sourceName: string): Promise<NewsEventInput[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `Mozilla/5.0 (compatible; ${process.env.VITE_APP_TITLE || "ContentEngine"}/4.0)` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Simple XML parser for RSS <item> elements
    const items: NewsEventInput[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      const description = extractTag(block, "description");
      const pubDate = extractTag(block, "pubDate");
      if (!title) continue;
      items.push({
        title: stripCdata(title).slice(0, 500),
        summary: description ? stripCdata(description).slice(0, 1000) : undefined,
        source: sourceName,
        sourceUrl: link ? stripCdata(link).trim() : undefined,
        publishedDate: pubDate ? stripCdata(pubDate) : undefined,
        priority: 60, // topic feeds get slightly higher priority than default RSS
      });
    }
    return items;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1] : null;
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/**
 * Fetch all configured topic feeds and write them to selector_candidates.
 * Returns the total number of new candidates inserted.
 */
export async function fetchGoogleNewsTopics(batchDate: string): Promise<number> {
  const enabled = await getSetting("google_news_topics_enabled");
  if (enabled?.value === "false") return 0;

  const topics = await getConfiguredTopics();
  if (topics.length === 0) return 0;

  let total = 0;
  for (const topic of topics) {
    const url = buildGoogleNewsTopicUrl(topic);
    const entries = await fetchRssFeed(url, `Google News: ${topic}`);
    if (entries.length > 0) {
      const inserted = await writeRssCandidates(entries, batchDate);
      total += inserted;
      console.log(`  [v4/GoogleNews] "${topic}": ${entries.length} fetched, ${inserted} new candidates`);
    }
  }
  return total;
}
