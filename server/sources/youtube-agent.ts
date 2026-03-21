/**
 * YouTube Agent — v4.0 Multi-Source Selector Window
 *
 * Fetches recent videos from configured YouTube channels and/or search queries
 * using the YouTube Data API v3, then writes them as selector_candidates.
 *
 * Requires YOUTUBE_API_KEY environment variable.
 * Ships inactive until the key is provided — returns 0 gracefully.
 *
 * White-label compatible: all config comes from DB settings.
 */

import { getSetting } from "../db";
import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 10;

// ─── Config helpers ───────────────────────────────────────────────────────────

/**
 * Get configured YouTube channel IDs from DB.
 * Stored as newline-separated list in "youtube_channels" setting.
 */
export async function getConfiguredYouTubeChannels(): Promise<string[]> {
  const setting = await getSetting("youtube_channels");
  if (!setting?.value?.trim()) return [];
  return setting.value
    .split("\n")
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 10);
}

/**
 * Get configured YouTube search queries from DB.
 * Stored as newline-separated list in "youtube_search_queries" setting.
 */
export async function getConfiguredYouTubeQueries(): Promise<string[]> {
  const setting = await getSetting("youtube_search_queries");
  if (!setting?.value?.trim()) return [];
  return setting.value
    .split("\n")
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
    .slice(0, 5);
}

/**
 * Check whether the YouTube listener is enabled.
 */
export async function isYouTubeEnabled(): Promise<boolean> {
  const setting = await getSetting("youtube_enabled");
  return setting?.value !== "false";
}

// ─── API helpers ──────────────────────────────────────────────────────────────

interface YTSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
}

/**
 * Search YouTube for recent videos matching a query or channel.
 */
async function searchYouTube(
  params: Record<string, string>,
  apiKey: string
): Promise<NewsEventInput[]> {
  try {
    const query = new URLSearchParams({
      ...params,
      key: apiKey,
      part: "snippet",
      type: "video",
      maxResults: String(MAX_RESULTS),
      order: "date",
      relevanceLanguage: "en",
    });

    const res = await fetch(`${YT_BASE}/search?${query.toString()}`, {
      headers: { "User-Agent": `${process.env.VITE_APP_TITLE || "ContentEngine"}/4.0` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[v4/YouTube] API returned ${res.status}: ${errText.slice(0, 200)}`);
      return [];
    }

    const json = await res.json() as { items?: YTSearchItem[] };
    if (!json.items?.length) return [];

    return json.items
      .filter((item) => item.id.videoId)
      .map((item) => ({
        title: item.snippet.title.slice(0, 500),
        summary: item.snippet.description
          ? item.snippet.description.slice(0, 1000)
          : undefined,
        source: `YouTube: ${item.snippet.channelTitle}`,
        sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        publishedDate: item.snippet.publishedAt,
        priority: 65, // YouTube videos get medium-high priority
        sourceType: "youtube" as const,
        metadata: {
          videoId: item.id.videoId,
          channelTitle: item.snippet.channelTitle,
        },
      }));
  } catch (err) {
    console.warn("[v4/YouTube] Fetch error:", err);
    return [];
  }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Fetch YouTube videos from configured channels and search queries,
 * write them to selector_candidates.
 * Returns the total number of new candidates inserted.
 */
export async function fetchYouTubeCandidates(batchDate: string): Promise<number> {
  const enabled = await isYouTubeEnabled();
  if (!enabled) return 0;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    // Silently skip — YouTube is optional until key is provided
    return 0;
  }

  const channels = await getConfiguredYouTubeChannels();
  const queries = await getConfiguredYouTubeQueries();

  if (channels.length === 0 && queries.length === 0) return 0;

  let total = 0;

  // Fetch from channels
  for (const channelId of channels) {
    const entries = await searchYouTube({ channelId }, apiKey);
    if (entries.length > 0) {
      const inserted = await writeRssCandidates(entries, batchDate);
      total += inserted;
      console.log(`  [v4/YouTube] Channel ${channelId}: ${entries.length} videos, ${inserted} new candidates`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Fetch from search queries
  for (const q of queries) {
    const entries = await searchYouTube({ q }, apiKey);
    if (entries.length > 0) {
      const inserted = await writeRssCandidates(entries, batchDate);
      total += inserted;
      console.log(`  [v4/YouTube] Query "${q}": ${entries.length} videos, ${inserted} new candidates`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  return total;
}
