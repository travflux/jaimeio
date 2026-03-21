/**
 * Web Scraper — v4.0 Multi-Source Selector Window
 *
 * Scrapes configured websites using CSS selectors to extract article titles,
 * links, and summaries, then writes them as selector_candidates.
 *
 * No external API key required — uses fetch + cheerio for HTML parsing.
 * Ships with empty config — add scraper configs via admin UI.
 *
 * White-label compatible: all config comes from DB settings (JSON array).
 */

import * as cheerio from "cheerio";
import { getSetting } from "../db";
import { writeRssCandidates, type NewsEventInput } from "./rss-bridge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScraperConfig {
  /** Human-readable name for this scraper */
  name: string;
  /** Base URL to scrape */
  url: string;
  /** CSS selector for article container elements */
  itemSelector: string;
  /** CSS selector for title (relative to item) */
  titleSelector: string;
  /** CSS selector for link (relative to item); uses href attribute */
  linkSelector?: string;
  /** CSS selector for summary/description (relative to item) */
  summarySelector?: string;
  /** Priority for candidates from this source (1–100, default 55) */
  priority?: number;
  /** Whether this scraper is enabled */
  enabled?: boolean;
}

// ─── Config helpers ───────────────────────────────────────────────────────────

/**
 * Get configured scraper configs from DB.
 * Stored as JSON array in "web_scraper_configs" setting.
 */
export async function getConfiguredScrapers(): Promise<ScraperConfig[]> {
  const setting = await getSetting("web_scraper_configs");
  if (!setting?.value?.trim()) return [];
  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ScraperConfig =>
        typeof s === "object" &&
        s !== null &&
        typeof s.name === "string" &&
        typeof s.url === "string" &&
        typeof s.itemSelector === "string" &&
        typeof s.titleSelector === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Check whether the web scraper is enabled globally.
 */
export async function isWebScraperEnabled(): Promise<boolean> {
  const setting = await getSetting("web_scraper_enabled");
  return setting?.value !== "false";
}

// ─── Scraping logic ───────────────────────────────────────────────────────────

/**
 * Scrape a single URL using the provided config.
 * Returns parsed NewsEventInput objects.
 */
export async function scrapeUrl(
  config: ScraperConfig,
  baseUrl?: string
): Promise<NewsEventInput[]> {
  try {
    const res = await fetch(config.url, {
      headers: {
        "User-Agent":
          `Mozilla/5.0 (compatible; ${process.env.VITE_APP_TITLE || "ContentEngine"}/4.0)`,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[v4/Scraper] ${config.name} returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const items: NewsEventInput[] = [];
    const resolvedBase = baseUrl ?? new URL(config.url).origin;

    $(config.itemSelector).each((_, el) => {
      const titleEl = $(el).find(config.titleSelector);
      const title = titleEl.text().trim();
      if (!title || title.length < 5) return;

      let link: string | undefined;
      if (config.linkSelector) {
        const href = $(el).find(config.linkSelector).attr("href") ?? titleEl.closest("a").attr("href");
        if (href) {
          link = href.startsWith("http") ? href : `${resolvedBase}${href.startsWith("/") ? "" : "/"}${href}`;
        }
      } else {
        const href = titleEl.closest("a").attr("href") ?? $(el).find("a").first().attr("href");
        if (href) {
          link = href.startsWith("http") ? href : `${resolvedBase}${href.startsWith("/") ? "" : "/"}${href}`;
        }
      }

      let summary: string | undefined;
      if (config.summarySelector) {
        summary = $(el).find(config.summarySelector).text().trim().slice(0, 1000) || undefined;
      }

      items.push({
        title: title.slice(0, 500),
        summary,
        source: config.name,
        sourceUrl: link,
        priority: config.priority ?? 55,
        sourceType: "scraper" as const,
        metadata: { scraperName: config.name, scraperUrl: config.url },
      });
    });

    return items.slice(0, 20); // cap at 20 items per scraper run
  } catch (err) {
    console.warn(`[v4/Scraper] Error scraping "${config.name}":`, err);
    return [];
  }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

/**
 * Run all enabled web scrapers and write results to selector_candidates.
 * Returns the total number of new candidates inserted.
 */
export async function fetchScraperCandidates(batchDate: string): Promise<number> {
  const enabled = await isWebScraperEnabled();
  if (!enabled) return 0;

  const scrapers = await getConfiguredScrapers();
  const activeScrapers = scrapers.filter((s) => s.enabled !== false);
  if (activeScrapers.length === 0) return 0;

  let total = 0;
  for (const scraper of activeScrapers) {
    const entries = await scrapeUrl(scraper);
    if (entries.length > 0) {
      const inserted = await writeRssCandidates(entries, batchDate);
      total += inserted;
      console.log(
        `  [v4/Scraper] "${scraper.name}": ${entries.length} items scraped, ${inserted} new candidates`
      );
    }
    // Polite delay between scrapers
    await new Promise((r) => setTimeout(r, 1000));
  }
  return total;
}
