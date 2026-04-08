/**
 * youtube-listener.ts — YouTube source module for the v4.0 Multi-Source Selector Window
 *
 * Fetches recent videos from configured YouTube channels and keyword searches
 * via the YouTube Data API v3, then writes them as selector_candidates.
 *
 * Requires: YOUTUBE_API_KEY environment variable (YouTube Data API v3 key).
 *
 * White-label compatible: all config comes from per-license DB settings.
 */

import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";
import { getLicenseSettingOrGlobal } from "../db";

interface YouTubeSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
  error?: { message: string };
}

/**
 * Extract a YouTube channel ID (UCxxxx format) from user input.
 * Accepts raw channel IDs, channel URLs, or returns empty string if unparseable.
 */
function extractChannelId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Direct channel ID (starts with UC, 24 chars)
  if (trimmed.startsWith("UC") && trimmed.length === 24) return trimmed;
  // Channel URL: youtube.com/channel/UCxxxx
  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (channelMatch) return channelMatch[1];
  // Handle URLs or @handles that we can't resolve without an extra API call
  if (trimmed.includes("@") || trimmed.includes("youtube.com")) {
    console.warn("[YouTube] Cannot extract channel ID from URL — use UCxxxx format:", trimmed);
    return "";
  }
  return trimmed;
}

/**
 * Fetch YouTube videos from configured channels and keywords, write as candidates.
 * Returns the number of new candidates inserted.
 */
export async function fetchYouTubeCandidates(licenseId: number, batchDate: string): Promise<number> {
  // Check if YouTube listener is enabled for this license
  const enabledSetting = await getLicenseSettingOrGlobal(licenseId, "youtube_listening_enabled");
  if (!enabledSetting || enabledSetting !== "true") {
    console.log("[YouTube] Not enabled for license", licenseId, "— skipping");
    return 0;
  }

  // Read channel list
  const channelSetting = await getLicenseSettingOrGlobal(licenseId, "youtube_listening_channels");
  const rawChannels = channelSetting || "";
  const channels = rawChannels
    .split("\n")
    .map((c) => extractChannelId(c))
    .filter(Boolean);

  // Read keyword list
  const keywordSetting = await getLicenseSettingOrGlobal(licenseId, "youtube_listening_keywords");
  const rawKeywords = keywordSetting || "";
  const keywords = rawKeywords
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);

  if (channels.length === 0 && keywords.length === 0) {
    console.log("[YouTube] No channels or keywords configured — skipping");
    return 0;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log("[YouTube] YOUTUBE_API_KEY not configured — skipping");
    return 0;
  }

  let totalInserted = 0;

  // Fetch videos from each configured channel
  for (const channelId of channels) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&type=video&order=date&maxResults=5&key=${apiKey}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(`[YouTube] Channel ${channelId} returned ${response.status} — skipping`);
        continue;
      }

      const json = (await response.json()) as YouTubeSearchResponse;
      if (json.error) {
        console.warn(`[YouTube] API error for channel ${channelId}:`, json.error.message);
        continue;
      }

      const items = json.items ?? [];
      const entries: NewsEventInput[] = items
        .filter((item) => item.id.videoId)
        .map((item) => ({
          title: item.snippet.title.slice(0, 255),
          summary: item.snippet.description ? item.snippet.description.slice(0, 500) : undefined,
          source: `youtube/${item.snippet.channelTitle}`,
          sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          sourceType: "youtube" as const,
          priority: 50,
          publishedDate: item.snippet.publishedAt,
          metadata: {
            channelId,
            channelTitle: item.snippet.channelTitle,
            videoId: item.id.videoId,
            fetchType: "channel",
          },
        }));

      const inserted = await writeRssCandidates(entries, batchDate);
      console.log(`[YouTube] Channel ${channelId}: ${items.length} videos fetched, ${inserted} inserted`);
      totalInserted += inserted;
    } catch (err: any) {
      console.error(`[YouTube] Error fetching channel ${channelId}:`, err.message ?? err);
    }
  }

  // Fetch videos for each configured keyword
  for (const keyword of keywords) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=relevance&maxResults=5&key=${apiKey}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.warn(`[YouTube] Keyword "${keyword}" returned ${response.status} — skipping`);
        continue;
      }

      const json = (await response.json()) as YouTubeSearchResponse;
      if (json.error) {
        console.warn(`[YouTube] API error for keyword "${keyword}":`, json.error.message);
        continue;
      }

      const items = json.items ?? [];
      const entries: NewsEventInput[] = items
        .filter((item) => item.id.videoId)
        .map((item) => ({
          title: item.snippet.title.slice(0, 255),
          summary: item.snippet.description ? item.snippet.description.slice(0, 500) : undefined,
          source: `youtube/search`,
          sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          sourceType: "youtube" as const,
          priority: 50,
          publishedDate: item.snippet.publishedAt,
          metadata: {
            keyword,
            channelTitle: item.snippet.channelTitle,
            videoId: item.id.videoId,
            fetchType: "keyword",
          },
        }));

      const inserted = await writeRssCandidates(entries, batchDate);
      console.log(`[YouTube] Keyword "${keyword}": ${items.length} videos fetched, ${inserted} inserted`);
      totalInserted += inserted;
    } catch (err: any) {
      console.error(`[YouTube] Error fetching keyword "${keyword}":`, err.message ?? err);
    }
  }

  console.log(`[YouTube] Fetched ${totalInserted} candidates for license ${licenseId}`);
  return totalInserted;
}
