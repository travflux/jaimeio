/**
 * Workflow Engine — TypeScript replacement for the Python bridge script.
 *
 * Runs entirely inside the Node.js server process, so it works in both
 * the sandbox and the deployed environment (no Python required).
 *
 * Pipeline steps:
 *   1. Fetch settings from the Control Panel (database)
 *   2. Gather news events from RSS feeds
 *   3. Generate articles using the built-in LLM helper
 *   4. Import articles into the database
 *   5. Generate social media posts and import them
 */

import RSSParser from "rss-parser";
import slugify from "slugify";
import * as db from "./db";
import { invokeLLMWithFallback as invokeLLM } from "./_core/llmRouter";
import { generateVideo } from "./_core/videoGeneration";
import { extractVideoThumbnail } from "./_core/videoThumbnail";
import { generateImage } from "./_core/imageGeneration";
import { shouldAutoRebalance, calculateOptimalWeights, applyRebalance } from "./categoryBalance";
import { buildImagePrompt } from "./imagePromptBuilder";
import { processArticlesGeo } from "./geo/geoService";
import { findRealImage, generateBrandedCard, logImageLicense } from "./sources/real-image-sourcing";
import { findImageWithCrawler, type CrawlerConfig } from "./sources/googleImageCrawler";
import { WRITING_STYLES, getRandomStyleFromCategory } from "../shared/writingStyles";
import {
  writeRssCandidates,
  getPendingCandidates,
  markCandidatesSelected,
  markCandidatesRejected,
  linkCandidateToArticle,
  expireOldCandidates,
  type CandidateSourceType,
} from "./sources/rss-bridge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NewsEvent {
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedDate: string;
  feedSourceId?: number | null;
  candidateId?: number | null;  // v4.0: FK to selector_candidates.id
  sourceType?: CandidateSourceType;   // v4.0: rss | google_news | x | reddit | youtube | scraper | manual
  score?: number | null;              // v4.5: composite quality score from candidate-scoring
}

interface GeneratedArticle {
  headline: string;
  subheadline: string;
  body: string;
}

interface WorkflowResult {
  status: "success" | "warning" | "error";
  message: string;
  eventsGathered?: number;
  articlesGenerated?: number;
  articlesImported?: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_RSS_FEEDS = [
  // Tier 1: High-reliability wire services
  { name: "Reuters - World", url: "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best" },
  { name: "AP News", url: "https://rsshub.app/apnews/topics/apf-topnews" },
  { name: "BBC News - World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC News - Top Stories", url: "http://feeds.bbci.co.uk/news/rss.xml" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
  { name: "The Guardian - World", url: "https://www.theguardian.com/world/rss" },
  { name: "The Guardian - US", url: "https://www.theguardian.com/us-news/rss" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "CNN Top Stories", url: "http://rss.cnn.com/rss/edition.rss" },
  { name: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/news" },
  { name: "CBS News", url: "https://www.cbsnews.com/latest/rss/main" },
  { name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories" },
  // Tier 2: Google News (broad coverage, high volume)
  { name: "Google News - Top Stories", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - World", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - US", url: "https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRGxqTjNjd0VnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Technology", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Business", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Science", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNR1N3Y1dZU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Health", url: "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Sports", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNR1p1ZEdvU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News - Entertainment", url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en" },
  // Tier 3: Specialty feeds for category depth
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Politico", url: "https://www.politico.com/rss/politics08.xml" },
  { name: "The Hill", url: "https://thehill.com/news/feed/" },
  { name: "Business Insider", url: "https://feeds.businessinsider.com/custom/all" },
  { name: "Fortune", url: "https://fortune.com/feed/" },
  { name: "ESPN", url: "https://www.espn.com/espn/rss/news" },
  { name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml" },
  { name: "Mental Floss", url: "https://www.mentalfloss.com/rss" },
  { name: "Smithsonian Magazine", url: "https://www.smithsonianmag.com/rss/latest_articles/" },
];

// CATEGORY_KEYWORDS hardcoded map deleted — keywords are DB-only (configurable per deployment).
// Each category row has a `keywords` column (comma-separated). guessCategory() reads from DB only.
// White-label clients set their own keywords via the Setup Wizard. No deployment-specific slugs baked in.

// STYLE_PROMPTS removed — now uses WRITING_STYLES from shared/writingStyles.ts (all 30+ styles)

// ─── Setting Helpers ────────────────────────────────────────────────────────

async function getSettingValue(key: string, defaultVal: string): Promise<string> {
  const s = await db.getSetting(key);
  return s?.value ?? defaultVal;
}

async function getSettingInt(key: string, defaultVal: number): Promise<number> {
  const s = await db.getSetting(key);
  if (s?.value) {
    const n = parseInt(s.value, 10);
    if (!isNaN(n)) return n;
  }
  return defaultVal;
}

async function getSettingBool(key: string, defaultVal: boolean): Promise<boolean> {
  const s = await db.getSetting(key);
  if (s?.value) return ["true", "1", "yes"].includes(s.value.toLowerCase());
  return defaultVal;
}

async function getSettingJson<T>(key: string, defaultVal: T): Promise<T> {
  const s = await db.getSetting(key);
  if (s?.value) {
    try { return JSON.parse(s.value) as T; } catch { /* ignore */ }
  }
  return defaultVal;
}

// ─── RSS Gathering ──────────────────────────────────────────────────────────

async function fetchRSSFeeds(feeds: { name: string; url: string; weight?: number; feedId?: number }[]): Promise<NewsEvent[]> {
  const parser = new RSSParser({ timeout: 30000 });
  const allEntries: NewsEvent[] = [];

  for (const feed of feeds) {
    try {
      console.log(`  [Gather] Fetching: ${feed.name}...`);
      const parsed = await parser.parseURL(feed.url);
      const weight = feed.weight ?? 50;
      const articlesPerFeed = Math.max(1, Math.ceil((weight / 50) * 15));
      const entries = (parsed.items || []).slice(0, articlesPerFeed);

      for (const item of entries) {
        const title = (item.title || "").trim();
        if (!title) continue;

        let summary = (item.contentSnippet || item.content || "").trim();
        // Strip HTML tags
        summary = summary.replace(/<[^>]+>/g, "").slice(0, 500);

        allEntries.push({
          title,
          summary,
          source: feed.name,
          sourceUrl: item.link || "",
          publishedDate: item.isoDate || new Date().toISOString(),
          feedSourceId: feed.feedId ?? null,
        });
      }
      console.log(`    Got ${entries.length} entries`);
      
      // Update feed health: successful fetch (track counters)
      await db.updateFeedHealth(feed.url, { errorCount: 0, lastError: null, isSuccess: true, candidatesGenerated: entries.length });
    } catch (err: any) {
      const errorMsg = err.message?.slice(0, 100) || "Unknown error";
      console.log(`    Error fetching ${feed.name}: ${errorMsg}`);
      
      // Update feed health: increment error count, auto-disable at 3+ failures
      const currentHealth = await db.getFeedHealth(feed.url);
      const newErrorCount = (currentHealth?.errorCount ?? 0) + 1;
      await db.updateFeedHealth(feed.url, { errorCount: newErrorCount, lastError: errorMsg, isSuccess: false });
    }
  }

  return allEntries;
}

function deduplicateEntries(entries: NewsEvent[]): NewsEvent[] {
  const seen: Map<string, Set<string>> = new Map();
  const unique: NewsEvent[] = [];

  for (const entry of entries) {
    const normalized = entry.title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const words = new Set(normalized.split(/\s+/).filter(Boolean));

    let isDuplicate = false;
    const seenEntries = Array.from(seen.values());
    for (const existingWords of seenEntries) {
      if (words.size === 0 || existingWords.size === 0) continue;
      const wordsArr = Array.from(words);
      const existingArr = Array.from(existingWords);
      const intersectionCount = wordsArr.filter(w => existingWords.has(w)).length;
      const unionCount = new Set(wordsArr.concat(existingArr)).size;
      const similarity = intersectionCount / unionCount;
      if (similarity > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(normalized, words);
      unique.push(entry);
    }
  }

  return unique;
}

// ─── Fix 5: Topic Clustering ────────────────────────────────────────────────
/**
 * Groups entries by topic using simple keyword overlap, then takes the top
 * representative entry from each cluster. Returns at most `windowSize` entries
 * so the AI selector gets a diverse, non-redundant pool.
 */
function clusterAndDeduplicate(entries: NewsEvent[], windowSize: number): NewsEvent[] {
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "is", "are", "was", "were", "be", "been", "has", "have", "had", "will", "would", "could", "should", "may", "might", "can", "do", "does", "did", "not", "no", "from", "by", "as", "it", "its", "this", "that", "these", "those", "he", "she", "they", "we", "you", "i", "his", "her", "their", "our", "your", "my"]);
  const getKeywords = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => w.length > 3 && !stopWords.has(w));
  };
  const clusters: NewsEvent[][] = [];
  for (const entry of entries) {
    const kw = new Set(getKeywords(entry.title));
    let placed = false;
    for (const cluster of clusters) {
      const repKw = new Set(getKeywords(cluster[0].title));
      const intersection = Array.from(kw).filter(w => repKw.has(w)).length;
      const union = new Set([...Array.from(kw), ...Array.from(repKw)]).size;
      if (union > 0 && intersection / union >= 0.35) {
        cluster.push(entry);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([entry]);
  }
  // Take the first (most recent/highest-weight) entry from each cluster
  const deduplicated = clusters.map(c => c[0]);
  // Shuffle slightly to avoid always picking the same cluster order
  return deduplicated.sort(() => Math.random() - 0.5).slice(0, windowSize);
}

async function selectTopEvents(
  entries: NewsEvent[],
  count: number,
  windowSize: number = 200,
  recentCoveredTopics: string[] = [],
  categoryQuotasEnabled: boolean = false
): Promise<NewsEvent[]> {
  // v4.0: Build source type distribution summary for diversity guidance
  const sourceTypeCounts: Record<string, number> = {};
  for (const e of entries.slice(0, windowSize)) {
    const st = e.sourceType ?? "rss";
    sourceTypeCounts[st] = (sourceTypeCounts[st] ?? 0) + 1;
  }
  const sourceTypeSummary = Object.entries(sourceTypeCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const entriesText = entries.slice(0, windowSize).map((e, i) => {
    const srcTag = e.sourceType && e.sourceType !== "rss" ? e.sourceType.toUpperCase() : "RSS";
    let line = `${i + 1}. [${srcTag}/${e.source}] ${e.title}`;
    if (e.summary) line += `\n   Summary: ${e.summary.slice(0, 200)}`;
    return line;
  }).join("\n\n");

  // Build category balance guidance for the AI
  let categoryGuidance = "";
  try {
    const gapAnalysis = await db.getCategoryGapAnalysis();
    if (gapAnalysis.length > 0) {
      const underRepresented = gapAnalysis.filter(c => c.status === 'under').map(c => c.categoryName);
      const overRepresented = gapAnalysis.filter(c => c.status === 'over').map(c => c.categoryName);
      if (underRepresented.length > 0 || overRepresented.length > 0) {
        categoryGuidance = `\n\nIMPORTANT — Category balance guidance:\n`;
        if (underRepresented.length > 0) {
          categoryGuidance += `We NEED MORE articles in these categories: ${underRepresented.join(", ")}. Strongly prefer events that could fit these topics.\n`;
        }
        if (overRepresented.length > 0) {
          categoryGuidance += `We have PLENTY of articles in these categories: ${overRepresented.join(", ")}. Deprioritize events in these topics unless they are exceptionally newsworthy.\n`;
        }
      }
    }
  } catch {
    // Category balance guidance is optional — proceed without it
  }

  // Fix 6: Cross-batch memory — tell AI which topics were recently covered
  let crossBatchGuidance = "";
  if (recentCoveredTopics.length > 0) {
    const sample = recentCoveredTopics.slice(0, 30).join("; ");
    crossBatchGuidance = `\n\nCROSS-BATCH MEMORY — Topics we already covered recently (AVOID repeating these):\n${sample}\nDo not select events that are substantially similar to these recent topics.`;
  }

  // Fix 7: Category quotas — inject hard distribution targets
  let quotaGuidance = "";
  if (categoryQuotasEnabled) {
    quotaGuidance = `\n\nCATEGORY QUOTAS — Distribute your ${count} selections approximately as follows:\n- Politics: ${Math.round(count * 0.30)} articles (30%)\n- Technology: ${Math.round(count * 0.15)} articles (15%)\n- Business: ${Math.round(count * 0.10)} articles (10%)\n- Culture: ${Math.round(count * 0.10)} articles (10%)\n- Science & Health: ${Math.round(count * 0.10)} articles (10%)\n- Sports: ${Math.round(count * 0.05)} articles (5%)\n- World: ${Math.round(count * 0.10)} articles (10%)\n- Opinion: ${Math.round(count * 0.05)} articles (5%)\n- Local: ${Math.round(count * 0.05)} articles (5%)\nThese are hard targets — do not let any single category exceed its quota by more than 2 articles.`;
  }
  // v4.0: Source diversity soft constraint
  const sourceDiversityGuidance = Object.keys(sourceTypeCounts).length > 1
    ? `\n\nSOURCE DIVERSITY — The candidate pool contains items from multiple source types (${sourceTypeSummary}). Prefer a mix of source types in your final selection — do not draw all picks from a single source type. Each source type (RSS, GOOGLE_NEWS, X, REDDIT, YOUTUBE, SCRAPER, MANUAL) brings a different signal about what is trending. Aim for at least 2-3 different source types if available.`
    : "";

  // Allow white-label clients to override the event selector prompt via DB setting
  const selectorPromptSetting = await db.getSetting("event_selector_prompt");
  const defaultSelectorPrompt = `You are an editor selecting the most relevant and interesting news events to cover today.
Your job is to select the ${count} most compelling news events from today's headlines.
Choose events that:
1. Have strong potential for engaging content
2. Cover a diverse range of topics (politics, tech, business, culture, science, etc.)
3. Are genuinely newsworthy and current
4. Would resonate with a broad audience
5. Lend themselves to interesting commentary or analysis
${categoryGuidance}${crossBatchGuidance}${quotaGuidance}${sourceDiversityGuidance}
Here are today's news headlines (format: [SOURCE_TYPE/Feed] Headline):
${entriesText}
Return ONLY a JSON array of the numbers (1-indexed) of your top ${count} selections, in order of relevance and interest.
Example: [3, 7, 12, 1, 15, 22, 8, 45, 33, 11, 5, 28, 19, 42, 37, 2, 14, 25, 31, 9]
Return ONLY the JSON array, nothing else.`;
  let prompt = selectorPromptSetting?.value
    ? selectorPromptSetting.value
        .replace("{{COUNT}}", String(count))
        .replace("{COUNT}", String(count))
        .replace("{{HEADLINES}}", entriesText)
        .replace("{HEADLINES}", entriesText)
        .replace("{{CATEGORY_GUIDANCE}}", categoryGuidance)
        .replace("{CATEGORY_GUIDANCE}", categoryGuidance)
    : defaultSelectorPrompt;

  // Inject tenant-specific topic exclusions if available
  // Reads from any entry's licenseId (all entries in a batch share the same license)
  const batchLicenseId = entries[0]?.licenseId;
  if (batchLicenseId) {
    const avoidTopics = (await db.getLicenseSetting(batchLicenseId, "avoid_topics"))?.value;
    if (avoidTopics) prompt += `\n\nDo not select any topic related to:\n${avoidTopics}`;
    const selectorInstructions = (await db.getLicenseSetting(batchLicenseId, "event_selector_prompt"))?.value;
    if (selectorInstructions) prompt += `\n\nADDITIONAL SELECTION INSTRUCTIONS:\n${selectorInstructions}`;
  }

  try {
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    const content = (typeof rawContent === "string" ? rawContent.trim() : "") || "[]";
    const indices: number[] = JSON.parse(content);
    const selected: NewsEvent[] = [];
    const selectedIndices = new Set<number>();
    for (const idx of indices) {
      if (idx >= 1 && idx <= entries.length && selected.length < count) {
        selected.push(entries[idx - 1]);
        selectedIndices.add(idx - 1);
      }
    }
    const result = selected.length > 0 ? selected : entries.slice(0, count);

    // v4.0: Mark candidates as selected/rejected in the DB
    try {
      const selectedIds = result
        .map(e => e.candidateId)
        .filter((id): id is number => typeof id === 'number');
      const rejectedIds = entries
        .filter((e, i) => !selectedIndices.has(i) && typeof e.candidateId === 'number')
        .map(e => e.candidateId as number);
      if (selectedIds.length > 0) await markCandidatesSelected(selectedIds);
      if (rejectedIds.length > 0) await markCandidatesRejected(rejectedIds);
    } catch { /* non-critical — don't fail the pipeline */ }

    return result;
  } catch (err: any) {
    console.log(`  [Gather] AI selection failed (${err.message}), using first ${count} entries`);
    return entries.slice(0, count);
  }
}

// ─── Article Generation ─────────────────────────────────────────────────────

export function buildSystemPrompt(targetWords: number): string {
  return `You are a brilliant news writer. Your writing style combines:

1. **Authoritative delivery**: Write in the serious, authoritative tone of a legitimate news outlet.
2. **Engaging narrative**: Take the news event and present it in a compelling, readable way.
3. **Clear structure**: Organize information logically from most to least important.
4. **Vivid detail**: Include specific details that bring the story to life.
5. **Balanced perspective**: Present multiple viewpoints where relevant.
6. **Specificity**: Include precise details — exact figures, names, and context.

IMPORTANT RULES:
- Write in standard news article format (inverted pyramid).
- Articles should be approximately ${targetWords} words.
- The headline should be punchy and memorable.
- NEVER include real people saying things they didn't say. Instead, create obviously fictional characters when quotes are needed.`;
}

// ─── HTML Stripping Helper ──────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

// ─── Per-Tenant System Prompt Builder ──────────────────────────────────────
export async function buildTenantSystemPrompt(licenseId: number): Promise<string> {
  const { getLicenseSetting } = await import("./db");
  const get = async (key: string, fallback: string) => (await getLicenseSetting(licenseId, key))?.value || fallback;

  const siteName = await get("brand_site_name", "this publication");
  const tagline = await get("brand_tagline", "");
  const genre = await get("brand_genre", "general");
  const tone = await get("writing_tone", "") || await get("writing_style", "professional");
  const targetWords = await get("target_article_length", await get("target_word_count", "800"));
  const readingLevel = await get("reading_level", "intermediate");
  const headlineStyle = await get("headline_style", "statement");
  const includeStats = await get("include_statistics", "true");
  const includeQuotes = await get("include_quotes", "true");
  const includeCta = await get("include_cta", "true");
  const includeSubs = await get("include_subheadings", "true");
  const custom = await get("article_llm_system_prompt", "");

  const toneMap: Record<string, string> = {
    professional: "authoritative, credible, and professional",
    conversational: "conversational, approachable, and engaging",
    analytical: "analytical, data-driven, and evidence-based",
    inspirational: "inspirational, motivating, and empowering",
    educational: "educational, clear, and explanatory",
    bold: "bold, opinionated, and direct",
    luxury: "sophisticated, premium, and refined",
    satirical: "witty, satirical, and sharp",
    investigative: "investigative, critical, and thorough",
    friendly: "friendly, casual, and warm",
  };
  const toneDesc = toneMap[tone] || tone;

  const rlMap: Record<string, string> = {
    beginner: "Write for a general audience. Use simple, clear language. Explain all technical terms.",
    intermediate: "Write for an informed reader. Balance accessibility with depth.",
    expert: "Write for industry professionals. Use technical terminology freely.",
  };

  const hsMap: Record<string, string> = {
    statement: "Write headlines as declarative statements.",
    question: "Write headlines as engaging questions.",
    "how-to": "Write headlines in How-To format.",
    listicle: "Write headlines as numbered lists.",
    news: "Write headlines in journalistic news style.",
  };

  const structure = [
    includeSubs !== "false" ? "Use H2 section subheadings." : "Write as flowing prose.",
    includeStats !== "false" ? "Include statistics and data points where relevant." : "",
    includeQuotes !== "false" ? "Include attributed expert quotes where relevant." : "",
    includeCta !== "false" ? "End with a brief call-to-action for readers." : "",
  ].filter(Boolean).join(" ");

  let prompt = `You are an expert writer for ${siteName}${tagline ? " — " + tagline : ""}.

PUBLICATION: ${siteName} is a ${genre} publication.

TONE: Write in a ${toneDesc} voice. Every sentence must feel native to ${siteName}.

READING LEVEL: ${rlMap[readingLevel] || rlMap.intermediate}

HEADLINES: ${hsMap[headlineStyle] || hsMap.statement} Headlines must be completely original — never copy the source headline.

STRUCTURE: ${structure}

LENGTH: Write approximately ${targetWords} words.

ORIGINALITY (CRITICAL):
- The source topic is INSPIRATION ONLY — do not reproduce source content
- Write a completely original article from ${siteName}'s unique perspective
- Add analysis, context, and angles the source did not cover
- NEVER copy sentences or phrases from the source
- The reader should feel they are getting ${siteName}'s original take`;

  // TIER 1 — Voice identity
  const brandVoicePersona = await get("brand_voice_persona", "");
  if (brandVoicePersona) prompt += `\n\nWRITER PERSONA:\n${brandVoicePersona}`;
  const targetAudience = await get("target_audience_description", "");
  if (targetAudience) prompt += `\n\nTARGET AUDIENCE:\n${targetAudience}`;
  const contentPillars = await get("content_pillars", "");
  if (contentPillars) prompt += `\n\nEDITORIAL PILLARS (filter every story through these lenses):\n${contentPillars}`;
  const brandVocab = await get("brand_vocabulary", "");
  if (brandVocab) prompt += `\n\nSIGNATURE LANGUAGE (use these words and avoid the listed ones):\n${brandVocab}`;
  const stance = await get("editorial_stance", "");
  if (stance) prompt += `\n\nEDITORIAL STANCE: Approach every topic as a ${stance}.`;
  const opening = await get("opening_style", "");
  if (opening) prompt += `\n\nARTICLE OPENING STYLE: Always begin articles with a ${opening}.`;

  // TIER 3 — Topic rules
  const avoid = await get("avoid_topics", "");
  if (avoid) prompt += `\n\nTOPICS TO NEVER COVER:\n${avoid}`;
  const avoidBrands = await get("avoid_brands", "");
  if (avoidBrands) prompt += `\n\nBRANDS AND NAMES TO NEVER MENTION:\n${avoidBrands}`;
  const angle = await get("always_angle", "");
  if (angle) prompt += `\n\nSTANDING EDITORIAL ANGLE (apply to every article):\n${angle}`;
  const geoFocus = await get("geographic_focus", "");
  if (geoFocus && geoFocus !== "Global") prompt += `\n\nGEOGRAPHIC FRAMING: Frame all stories through the lens of ${geoFocus}.`;
  const hedging = await get("hedging_level", "");
  if (hedging) {
    const hi: Record<string, string> = { definitive: "State all facts definitively and confidently.", hedged: "Use hedging language: reportedly, according to, sources say.", cautious: "Use cautious language: alleged, claimed, unconfirmed reports suggest." };
    if (hi[hedging]) prompt += `\n\nFACTUAL CERTAINTY: ${hi[hedging]}`;
  }
  const seasonal = await get("seasonal_context", "");
  if (seasonal) prompt += `\n\nCURRENT SEASONAL CONTEXT:\n${seasonal}`;

  if (custom) prompt += `\n\nEDITOR INSTRUCTIONS:\n${custom}`;
  return prompt;
}

// ─── User Prompt Builder ──────────────────────────────────────────────────
function buildArticleUserPrompt(
  candidate: { title: string; summary?: string | null; source?: string | null },
  targetWords: string
): string {
  const cleanSummary = candidate.summary ? stripHtml(candidate.summary) : "";
  const hasSummary = cleanSummary.length > 50 && !cleanSummary.startsWith("http");
  return `Write an original article about:

TOPIC: ${candidate.title}
${hasSummary ? "CONTEXT: " + cleanSummary.slice(0, 500) : ""}
${candidate.source ? "SOURCE: " + candidate.source + " (topic reference only)" : ""}

Write a completely original article from this publication's perspective.
The headline MUST be different from the topic above.

Return ONLY valid JSON:
{"headline":"original headline","subheadline":"one sentence deck","body":"full article with \\n\\n paragraph breaks","category":"best fitting category name"}`;
}

export async function generateSatiricalArticle(event: NewsEvent, stylePrompt: string, targetWords: number, templateSettings?: any, structureOpts?: { readingLevel?: string; headlineStyle?: string; includeSubheadings?: boolean; includeStatistics?: boolean; includeQuotes?: boolean; includeCta?: boolean }): Promise<GeneratedArticle> {
  // Apply template overrides if provided
  if (templateSettings?.targetWordCount) targetWords = templateSettings.targetWordCount;
  if (templateSettings?.tone) stylePrompt = `Write in a ${templateSettings.tone} tone. ${stylePrompt}`;
  if (templateSettings?.userMessage) stylePrompt = templateSettings.userMessage;

  // Template-specific format and rhythm
  let templatePromptSuffix = "";
  const formatType = templateSettings?.articleFormatType || templateSettings?.article_format_type;
  if (formatType) templatePromptSuffix += `\n\nARTICLE FORMAT: Write this article as a ${formatType}. Structure the content accordingly.`;
  const rhythm = templateSettings?.sentenceRhythm || templateSettings?.sentence_rhythm;
  if (rhythm) {
    const ri: Record<string, string> = { "short-punchy": "Use short, punchy sentences averaging fewer than 15 words.", "long-flowing": "Use long, flowing sentences averaging more than 25 words.", "varied": "Vary sentence length — mix short punchy with longer flowing.", "fragment-led": "Use sentence fragments deliberately for impact.", "academic": "Use formal academic sentence structure throughout." };
    if (ri[rhythm]) templatePromptSuffix += `\n\nSENTENCE RHYTHM: ${ri[rhythm]}`;
  }

  // Build prompts — per-tenant if licenseId available, otherwise legacy
  let systemPrompt: string;
  let userMessage: string;
  if ((event as any).licenseId) {
    systemPrompt = await buildTenantSystemPrompt((event as any).licenseId);
    userMessage = buildArticleUserPrompt({ title: event.title, summary: event.summary, source: event.source }, String(targetWords));
  } else {
    systemPrompt = `${buildSystemPrompt(targetWords, structureOpts)}\n\n${stylePrompt}`;
    userMessage = buildArticleUserPrompt({ title: event.title, summary: event.summary, source: event.source }, String(targetWords));
  }
  if (templatePromptSuffix) systemPrompt += templatePromptSuffix;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  let content = (typeof rawContent === "string" ? rawContent.trim() : "") || "{}";

  // Strip markdown code blocks
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    let parsed = JSON.parse(content) as any;
    
    // Check if the entire parsed result is a string containing JSON (double-encoded)
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
        console.log("    Warning: Detected double-encoded JSON, unwrapping");
      } catch {
        // Not double-encoded, continue
      }
    }
    
    // Validate that body is plain text, not nested JSON
    if (parsed.body && typeof parsed.body === 'string') {
      // Check if body contains JSON (starts with { and ends with })
      const trimmedBody = parsed.body.trim();
      if (trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) {
        try {
          // Try to parse the body as JSON
          const nestedJson = JSON.parse(trimmedBody);
          if (nestedJson.body && typeof nestedJson.body === 'string') {
            // Extract the actual body from nested JSON
            console.log("    Warning: Detected nested JSON in body, extracting actual content");
            return {
              headline: nestedJson.headline || parsed.headline,
              subheadline: nestedJson.subheadline || parsed.subheadline,
              body: nestedJson.body,
            };
          }
        } catch {
          // Not valid JSON, treat as plain text
        }
      }
    }
    
    return parsed as GeneratedArticle;
  } catch (error) {
    console.log("    Warning: JSON parse failed, using fallback", error);
    // Try to extract body text from malformed JSON string
    let fallbackBody = "Our AI writers are working on a better version of this story. Please check back soon.";
    try {
      // Attempt to extract body field from malformed JSON
      const bodyMatch = content.match(/"body"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      if (bodyMatch && bodyMatch[1]) {
        // Unescape the matched content
        fallbackBody = bodyMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } catch {
      // If extraction fails, use default message
    }
    const genreSetting = await db.getSetting("brand_genre");
    const genre = genreSetting?.value || "Analysis";
    const genreLabel = genre.charAt(0).toUpperCase() + genre.slice(1);
    return {
      headline: event.title.slice(0, 80),
      subheadline: "",
      body: fallbackBody.length > 100 ? fallbackBody : "This article is being prepared. Please check back shortly.",
    };
  }
}

// ─── Manual Generation from Topic ──────────────────────────────────────────

export async function generateArticleFromTopic(opts: {
  licenseId: number;
  topic: string;
  categoryId?: number;
  toneOverride?: string;
  wordCountOverride?: number;
  additionalInstructions?: string;
}): Promise<{ id: number; headline: string; slug: string }> {
  const { getLicenseSetting, getLicenseSettingOrGlobal, createArticle, listCategories } = await import("./db");
  const lid = opts.licenseId;

  // Read per-tenant settings
  const writingTone = opts.toneOverride
    || (await getLicenseSetting(lid, "writing_tone"))?.value
    || (await getLicenseSetting(lid, "writing_style"))?.value
    || "Write in a professional editorial style.";
  const targetWords = opts.wordCountOverride
    || parseInt((await getLicenseSetting(lid, "target_article_length"))?.value || "800");
  const genre = (await getLicenseSetting(lid, "brand_genre"))?.value || "general";
  const readingLevel = (await getLicenseSetting(lid, "reading_level"))?.value || "intermediate";
  const headlineStyle = (await getLicenseSetting(lid, "headline_style"))?.value || "statement";
  const customInstructions = (await getLicenseSetting(lid, "article_llm_system_prompt"))?.value || "";

  const genrePrompt = genre !== "general" ? "Write for a " + genre + " publication. " : "";
  const fullStyle = genrePrompt + writingTone + (opts.additionalInstructions ? "\n\n" + opts.additionalInstructions : "") + (customInstructions ? "\n\n" + customInstructions : "");

  const event = { title: opts.topic, summary: opts.topic, source: "Manual", sourceUrl: "", publishedDate: new Date().toISOString(), feedSourceId: null, licenseId: lid } as any;

  const article = await generateSatiricalArticle(event, fullStyle, targetWords, undefined, {
    readingLevel, headlineStyle,
    includeSubheadings: true, includeStatistics: true,
    includeQuotes: true, includeCta: false,
  });

  const slugify = (await import("slugify")).default;
  const slug = slugify(article.headline || "untitled", { lower: true, strict: true }).slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);

  let body = article.body || "";
  if (!body.trim().startsWith("<")) {
    body = body.split("\n\n").filter((p: string) => p.trim()).map((p: string) => "<p>" + p.trim() + "</p>").join("");
  }

  // Guess category if not provided
  let categoryId = opts.categoryId || null;
  if (!categoryId) {
    const categories = await listCategories(lid);
    const catMap: Record<string, number> = {};
    for (const cat of categories) catMap[cat.slug] = cat.id;
    const guessedSlug = guessCategory(article.headline || "", (article.subheadline || "") + " " + opts.topic, categories);
    if (guessedSlug && catMap[guessedSlug]) categoryId = catMap[guessedSlug];
  }

  const manualPlainText = (body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const manualWordCount = manualPlainText.split(' ').filter((w: string) => w.length > 0).length;
  const manualReadingTime = Math.max(1, Math.ceil(manualWordCount / 200));

  const articleId = await createArticle({
    headline: article.headline || "Untitled",
    subheadline: article.subheadline || "",
    body,
    slug,
    status: "pending",
    categoryId,
    licenseId: lid,
    sourceEvent: "Manual: " + opts.topic.substring(0, 100),
    wordCount: manualWordCount,
    readingTimeMinutes: manualReadingTime,
    generationModel: "manual-generation",
    generationStyle: writingTone.substring(0, 100),
  } as any);

  // Background SEO generation with logging
  (async () => {
    try {
      await generateAndSaveSEO(articleId, lid);
      await db.logGenerationStep({ articleId, licenseId: lid, step: "seo", status: "success" });
      await db.updateArticleEnrichmentStatus(articleId, "seoStatus", "generated");
    } catch (err: any) {
      console.error("[SEO] Background generation failed for article " + articleId + ":", err);
      await db.logGenerationStep({ articleId, licenseId: lid, step: "seo", status: "failed", errorMessage: err?.message });
      await db.updateArticleEnrichmentStatus(articleId, "seoStatus", "failed");
    }
  })();

  // Background image generation with logging
  const autoImages = (await getLicenseSetting(lid, "auto_generate_images"))?.value;
  const imageProvider = (await getLicenseSettingOrGlobal(lid, "image_provider"))?.value ?? (await db.getLicenseSettingOrGlobal(lid, "image_provider"));
  if (autoImages === "false" || !imageProvider || imageProvider === "none") {
    await db.logGenerationStep({ articleId, licenseId: lid, step: "image", status: "skipped", errorMessage: autoImages === "false" ? "Auto-generate disabled" : "No image provider configured" });
    await db.updateArticleEnrichmentStatus(articleId, "imageStatus", "skipped");
  } else {
    (async () => {
      try {
        const { buildImagePrompt } = await import("./imagePromptBuilder");
        const { generateImage } = await import("./_core/imageGeneration");
        const prompt = await buildImagePrompt(article.headline || opts.topic, article.subheadline, { licenseId: lid });
        const result = await generateImage({ prompt, licenseId: lid });
        if (result?.url) {
          const { updateArticle } = await import("./db");
          await updateArticle(articleId, { featuredImage: result.url } as any);
        }
        await db.logGenerationStep({ articleId, licenseId: lid, step: "image", status: "success" });
        await db.updateArticleEnrichmentStatus(articleId, "imageStatus", "generated");
      } catch (e: any) {
        console.error("[ManualGen] Image failed:", e);
        await db.logGenerationStep({ articleId, licenseId: lid, step: "image", status: "failed", errorMessage: e?.message });
        await db.updateArticleEnrichmentStatus(articleId, "imageStatus", "failed");
      }
    })();
  }

  return { id: articleId, headline: article.headline || Untitled, slug };
}

// ─── SEO Generation ─────────────────────────────────────────────────────────

export async function generateAndSaveSEO(articleId: number, licenseId: number | null | undefined): Promise<void> {
  const { getArticleById, updateArticle, getLicenseSetting } = await import("./db");

  try {
    console.log(`[SEO] Starting generation for article ${articleId} (licenseId=${licenseId})`);
    const article = await getArticleById(articleId);
    if (!article) {
      console.error(`[SEO] Article ${articleId} not found`);
      return;
    }

    const siteName = licenseId
      ? (await getLicenseSetting(licenseId, "brand_site_name"))?.value || "our publication"
      : "our publication";

    const plainBody = (article.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an SEO specialist for ${siteName}. Generate optimized SEO metadata for the given article. Return valid JSON with exactly these fields: {"focusKeyword": "...", "seoTitle": "...", "seoDescription": "...", "altText": "..."}. seoTitle should be max 60 chars, compelling for search. seoDescription should be max 155 chars, summarizing the article for search results. focusKeyword should be 2-4 words representing the main topic. altText should be a descriptive alt text for the article featured image, max 125 chars.`,
        },
        {
          role: "user",
          content: `Headline: ${article.headline}\nSubheadline: ${article.subheadline || ""}\n\nArticle excerpt:\n${plainBody}`,
        },
      ],
    });

    const llmContent = result.choices?.[0]?.message?.content;
    console.log(`[SEO] LLM response received for article ${articleId}, content type: ${typeof llmContent}, length: ${typeof llmContent === "string" ? llmContent.length : 0}`);
    if (!llmContent) {
      console.error(`[SEO] No LLM response for article ${articleId}`);
      return;
    }

    let seoData: { focusKeyword: string; seoTitle: string; seoDescription: string; altText: string } = {
      focusKeyword: "",
      seoTitle: "",
      seoDescription: "",
      altText: "",
    };

    try {
      const raw = typeof llmContent === "string" ? llmContent : "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      seoData = {
        focusKeyword: (parsed.focusKeyword || "").slice(0, 100),
        seoTitle: (parsed.seoTitle || "").slice(0, 255),
        seoDescription: (parsed.seoDescription || "").slice(0, 500),
        altText: (parsed.altText || "").slice(0, 255),
      };
    } catch {
      console.error(`[SEO] Failed to parse LLM JSON for article ${articleId}`);
      return;
    }

    // Validate SEO checklist and compute score
    const kwLower = (seoData.focusKeyword || "").toLowerCase();
    const headlineLower = (article.headline || "").toLowerCase();
    const bodyLower = plainBody.toLowerCase();
    const titleLower = (seoData.seoTitle || "").toLowerCase();
    const descLower = (seoData.seoDescription || "").toLowerCase();
    const seoChecks = [
      kwLower.length > 0,
      kwLower.length > 0 && titleLower.includes(kwLower),
      kwLower.length > 0 && descLower.includes(kwLower),
      kwLower.length > 0 && headlineLower.includes(kwLower),
      kwLower.length > 0 && bodyLower.includes(kwLower),
    ];
    const seoScore = Math.round((seoChecks.filter(Boolean).length / 5) * 100);

    await updateArticle(articleId, { ...seoData, seoScore } as any);
    console.log(`[SEO] Generated SEO for article ${articleId}: "${seoData.seoTitle}" (score: ${seoScore}/100)`);
  } catch (err: any) {
    console.error(`[SEO] generateAndSaveSEO failed for article ${articleId}:`, err?.message || err);
    throw err;
  }
}


// ─── Category Guessing ──────────────────────────────────────────────────────

function guessCategory(
  title: string,
  summary: string,
  dbCategories?: Array<{ slug: string; keywords?: string | null }>
): string {
  const text = `${title} ${summary}`.toLowerCase();
  const scores: Record<string, number> = {};
  // Build keyword map from DB only — no hardcoded fallback (white-label compatible)
  const keywordMap: Record<string, string[]> = {};
  if (dbCategories && dbCategories.length > 0) {
    for (const cat of dbCategories) {
      if (cat.keywords && cat.keywords.trim()) {
        keywordMap[cat.slug] = cat.keywords
          .split(",")
          .map(k => k.trim().toLowerCase())
          .filter(Boolean);
      }
    }
  }
  for (const [catSlug, keywords] of Object.entries(keywordMap)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > 0) scores[catSlug] = score;
  }

  if (Object.keys(scores).length > 0) {
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }
  // No keyword match found — return empty string (article gets categoryId=null)
  // This is better than defaulting to the first category which causes mis-categorization
  return "";
}

// ─── Social Media Posts ─────────────────────────────────────────────────────

export async function generateSocialPosts(
  articles: Array<{ id: number; headline: string; subheadline?: string; slug: string; featuredImage?: string | null; videoUrl?: string | null }>,
  platforms: string[],
  siteBaseUrl: string
): Promise<Array<{ articleId: number; platform: string; content: string; status: string; videoUrl?: string | null }>> {
  const platformInstructions: Record<string, string> = {
    twitter: '"twitter": Tweet (max 260 chars total including link and hashtags). Punchy, witty, 1-2 hashtags. MUST end with article link.',
    facebook: '"facebook": Facebook post (max 260 chars total including link and hashtags). Conversational, 1-2 hashtags. MUST end with article link.',
    linkedin: '"linkedin": LinkedIn post (max 260 chars total including link and hashtags). Professional, engaging. 1-2 hashtags. MUST end with article link.',
    instagram: '"instagram": Instagram caption (max 260 chars total including link and hashtags). Fun, 2-3 hashtags. MUST end with article link.',
    threads: '"threads": Threads post (max 260 chars total including link and hashtags). Casual, witty. 1-2 hashtags. MUST end with article link.',
  };

  const promptParts = platforms.filter(p => p in platformInstructions).map(p => platformInstructions[p]);
  const platformsJsonKeys = platforms.map(p => `"${p}"`).join(", ");

  const allPosts: Array<{ articleId: number; platform: string; content: string; status: string; videoUrl?: string | null }> = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const articleUrl = `${siteBaseUrl}/article/${article.slug}?utm_source=x&utm_medium=social&utm_campaign=article-link`;
    console.log(`  [Social] [${i + 1}/${articles.length}] Generating for: ${article.headline.slice(0, 50)}...`);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You create engaging social media posts for a news publication.
Each post should be witty, attention-grabbing, and drive clicks to the full article.

STRICT RULE: Every post on EVERY platform MUST be 260 characters or fewer (including the article link and hashtags).
Every post MUST end with the article link.

Article link: ${articleUrl}

Return a JSON object with these keys: ${platformsJsonKeys}
${promptParts.map(p => "- " + p).join("\n")}

Return ONLY the JSON object.`,
          },
          {
            role: "user",
            content: `Create social media posts for:\nHEADLINE: ${article.headline}\nSUBHEADLINE: ${article.subheadline || ""}`,
          },
        ],
      });

      const rawSocialContent = response.choices?.[0]?.message?.content;
      let content = (typeof rawSocialContent === "string" ? rawSocialContent.trim() : "") || "{}";
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const posts = JSON.parse(content);
      for (const platform of platforms) {
        if (posts[platform]) {
          let postContent = posts[platform];
          
          // Enforce 260 character limit for all platforms
          if (postContent.length > 260) {
            // Extract the article link (should be at the end)
            const linkMatch = postContent.match(/(https?:\/\/[^\s]+)$/);
            const link = linkMatch ? linkMatch[1] : articleUrl;
            
            // Calculate available space for text (260 - link length - 1 space)
            const maxTextLength = 260 - link.length - 1;
            
            // Truncate the text portion and re-append the link
            const textPortion = postContent.replace(/(https?:\/\/[^\s]+)$/, "").trim();
            postContent = textPortion.slice(0, maxTextLength).trim() + " " + link;
          }
          
          allPosts.push({
            articleId: article.id,
            platform,
            content: postContent,
            status: "draft",
            videoUrl: article.videoUrl || null,
          });
        }
      }
    } catch (err: any) {
      console.log(`    Error generating social posts: ${err.message?.slice(0, 100)}`);
    }
  }

  return allPosts;
}

// ─── Full Pipeline ──────────────────────────────────────────────────────────

export async function runFullPipeline(batchDate?: string, licenseId?: number): Promise<WorkflowResult> {
  const { getTodayForTenant } = await import("./db");
  const date = batchDate || await getTodayForTenant(licenseId);
  if (!licenseId) throw new Error("licenseId is required for runFullPipeline");
  const tenantId = licenseId;
  console.log(`  License ID: ${tenantId}`);

  console.log(`\n${"#".repeat(60)}`);
  console.log(`  ${process.env.VITE_APP_TITLE || 'SATIRE ENGINE'} DAILY WORKFLOW (TypeScript)`);
  console.log(`  Date: ${date}`);
  console.log(`${"#".repeat(60)}`);

  // ── Check if workflow is enabled ──
  const enabled = await getSettingBool("workflow_enabled", true);
  if (!enabled) {
    console.log("  WORKFLOW IS DISABLED in Control Panel. Exiting.");
    return { status: "warning", message: "Workflow is disabled in settings" };
  }

  // ── Load settings ──
  const targetCount = await getSettingInt("articles_per_batch", 20);
  const llmModel = await getSettingValue("llm_model", "gemini-2.5-flash");
  const styleName = await getSettingValue("ai_writing_style", "onion");
  
  // Check for custom writing style prompt first (primary override)
  const writingStylePrompt = await getSettingValue("writing_style_prompt", "");
  // Then check for additional instructions (appended to style)
  const additionalInstructions = await getSettingValue("ai_custom_prompt", "");
  
  // Build the style prompt:
  // 1. If custom writing style is set, use it
  // 2. Otherwise use the selected preset style
  // 3. Append additional instructions if provided
  let stylePrompt: string;
  if (writingStylePrompt) {
    stylePrompt = writingStylePrompt;
  } else {
    // Handle random-{categoryId} style selection
    if (styleName.startsWith("random-")) {
      const categoryId = styleName.replace("random-", "");
      const randomStyle = getRandomStyleFromCategory(categoryId);
      const fallbackStyle = WRITING_STYLES.find(s => s.id === "onion");
      stylePrompt = randomStyle?.prompt || fallbackStyle?.prompt || "Write in a professional editorial style.";
    } else {
      const selectedStyle = WRITING_STYLES.find(s => s.id === styleName);
      const fallbackStyle = WRITING_STYLES.find(s => s.id === "onion");
      stylePrompt = selectedStyle?.prompt || fallbackStyle?.prompt || "Write in a professional editorial style.";
    }
  }
  
  // Append additional instructions if provided
  if (additionalInstructions) {
    stylePrompt = `${stylePrompt}\n\nAdditional instructions: ${additionalInstructions}`;
  }
  const targetWords = await getSettingInt("target_article_length", 200);
  const defaultStatus = await getSettingValue("default_status", "pending");
  const maxPublish = await getSettingInt("max_publish_per_day", 50);
  const autoGenImages = await getSettingBool("auto_generate_images", false);
  const realImageEnabled = await getSettingBool("real_image_sourcing_enabled", false);
  const realImageFallback = await getSettingValue("real_image_fallback", "llm");
  const autoGenVideos = await getSettingBool("auto_generate_videos", false);
  const videoDuration = await getSettingInt("video_duration", 5);
  const videoAspectRatio = await getSettingValue("video_aspect_ratio", "16:9");
  const videoStylePrompt = await getSettingValue("video_style_prompt", "Professional news broadcast style, high production quality, cinematic lighting");
  const autoSocial = await getSettingBool("auto_create_social_posts", true);
  const socialPlatformsStr = await getSettingValue("social_platforms", "twitter,facebook,linkedin");
  const socialPlatforms = socialPlatformsStr.split(",").map(p => p.trim()).filter(Boolean);
  // Fix 1: Configurable selector window (default 200)
  const selectorWindowSize = await getSettingInt("selector_window_size", 200);
  // Fix 2: Headline dedup toggle
  const headlineDedupeEnabled = await getSettingBool("headline_dedup_enabled", true);
  // Fix 5: Topic clustering toggle
  const topicClusterEnabled = await getSettingBool("topic_cluster_enabled", true);
  // Fix 6: Cross-batch topic memory toggle
  const crossBatchMemoryEnabled = await getSettingBool("cross_batch_memory_enabled", true);
  const crossBatchMemoryDays = await getSettingInt("cross_batch_memory_days", 2);
  // Fix 7: Category quotas toggle
  const categoryQuotasEnabled = await getSettingBool("category_quotas_enabled", false);
  // Single source of truth — rss_feed_weights table only. No legacy fallback.
  let feeds: { name: string; url: string; weight?: number; feedId?: number }[] = [];
  const feedWeightRows = await db.getRssFeedWeights(tenantId);
  if (feedWeightRows.length > 0) {
    feeds = feedWeightRows.map(w => ({
      name: w.feedUrl.split("/")[2] || w.feedUrl,
      url: w.feedUrl,
      weight: w.weight,
      feedId: w.id,
    }));
    console.log(`  Using ${feeds.length} RSS feeds from rss_feed_weights for license ${tenantId}`);
  } else {
    console.warn(`[Workflow] No RSS feed weights configured for license ${tenantId}. Using default feeds.`);
    feeds = DEFAULT_RSS_FEEDS;
  }

  console.log(`  Articles per batch: ${targetCount}`);
  console.log(`  AI writing style:   ${styleName}`);
  console.log(`  Target word count:  ${targetWords}`);
  console.log(`  Default status:     ${defaultStatus}`);
  console.log(`  Auto-gen images:    ${autoGenImages}`);
  console.log(`  Auto-gen videos:    ${autoGenVideos}`);
  if (autoGenVideos) console.log(`    - Duration: ${videoDuration}s, Aspect: ${videoAspectRatio}`);
  console.log(`  Social platforms:   ${socialPlatforms.join(", ")}`);

  // ── Step 1: Gather News ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP 1: GATHERING NEWS — ${date}`);
  console.log(`${"=".repeat(60)}`);

  // Create or update batch
  let batchId: number | null = null;
  try {
    const batchResult = await db.createOrGetBatch(date, targetCount);
    batchId = batchResult?.id ?? null;
    if (batchId) {
      await db.updateBatchStatus(batchId, "gathering");
      console.log(`  Batch ID: ${batchId}`);
    }
  } catch (err: any) {
    console.log(`  Warning: Could not create batch: ${err.message}`);
  }

  //  // Randomize feed order if enabled (article-order shuffle, not feed-source shuffle)
  const randomizeFeeds = await getSettingBool("randomize_feed_sources", false);
  if (randomizeFeeds) {
    feeds = feeds.sort(() => Math.random() - 0.5);
    console.log(`  Randomized feed order`);
  }
  const rawEntries = await fetchRSSFeeds(feeds);
  console.log(`  Total raw entries: ${rawEntries.length}`);

  // v4.0: Write RSS entries to selector_candidates table (persistent multi-source pool)
  try {
    const inserted = await writeRssCandidates(rawEntries, date);
    console.log(`  [v4] Wrote ${inserted} new candidates to selector_candidates`);
  } catch (err: any) {
    console.log(`  [v4] Warning: Could not write to selector_candidates: ${err.message}`);
  }

  // v4.0 Phase 2: Fetch user-configured Google News topic feeds
  try {
    const { fetchGoogleNewsTopics } = await import("./sources/google-news");
    const gnInserted = await fetchGoogleNewsTopics(date);
    if (gnInserted > 0) console.log(`  [v4/GoogleNews] ${gnInserted} new topic candidates added`);
  } catch (err: any) {
    console.log(`  [v4/GoogleNews] Warning: ${err.message}`);
  }

  // v4.0 Phase 3: Fetch X/Twitter search candidates
  try {
    const { fetchXCandidates } = await import("./sources/x-listener");
    const xInserted = await fetchXCandidates(licenseId!, date);
    if (xInserted > 0) console.log(`  [v4/X] ${xInserted} new X candidates added`);
  } catch (err: any) {
    console.log(`  [v4/X] Warning: ${err.message}`);
  }

  // v4.0 Phase 3: Fetch Reddit hot post candidates
  try {
    const { fetchRedditCandidates } = await import("./sources/reddit-listener");
    const rInserted = await fetchRedditCandidates(licenseId!, date);
    if (rInserted > 0) console.log(`  [v4/Reddit] ${rInserted} new Reddit candidates added`);
  } catch (err: any) {
    console.log(`  [v4/Reddit] Warning: ${err.message}`);
  }


  // v4.0 Phase 3: Fetch YouTube video candidates
  try {
    const { fetchYouTubeCandidates } = await import("./sources/youtube-listener");
    const ytInserted = await fetchYouTubeCandidates(licenseId!, date);
    if (ytInserted > 0) console.log(`  [v4/YouTube] ${ytInserted} new YouTube candidates added`);
  } catch (err: any) {
    console.log(`  [v4/YouTube] Warning: ${err.message}`);
  }
  // v4.0: Expire stale candidates from previous batches
  try {
    const expired = await expireOldCandidates();
    if (expired > 0) console.log(`  [v4] Expired ${expired} stale candidates`);
  } catch { /* non-critical */ }

  // v4.0: Read the selector pool from DB (includes all source types once Phase 2+ are built)
  // Falls back to in-memory rawEntries if DB read fails
  let poolEntries: NewsEvent[];
  try {
    const dbCandidates = await getPendingCandidates(selectorWindowSize * 3);
    if (dbCandidates.length > 0) {
      poolEntries = dbCandidates.map(c => ({
        title: c.title,
        summary: c.summary || "",
        source: c.source,
        sourceUrl: c.sourceUrl || "",
        publishedDate: c.publishedDate || new Date().toISOString(),
        feedSourceId: c.feedSourceId ?? null,
        candidateId: c.id,
        sourceType: (c.sourceType as CandidateSourceType) ?? undefined,
        score: c.score ?? null,  // v4.5: pass score for logging/analytics
      }));
      console.log(`  [v4] Selector pool: ${poolEntries.length} candidates from DB`);
    } else {
      poolEntries = rawEntries;
      console.log(`  [v4] Selector pool: ${poolEntries.length} entries (DB empty, using in-memory)`);
    }
  } catch (err: any) {
    poolEntries = rawEntries;
    console.log(`  [v4] Selector pool fallback to in-memory: ${err.message}`);
  }

  // Filter out previously used sources (7-day lookback — 30 days was too aggressive)
  const usedSourceUrls = await db.getUsedSourceUrls(7); // Check last 7 days
  console.log(`  Previously used sources (last 7 days): ${usedSourceUrls.size}`);
  
  let newEntries = poolEntries.filter(entry => !usedSourceUrls.has(entry.sourceUrl));
  console.log(`  New entries (not previously used): ${newEntries.length}`);
  let uniqueEntries = deduplicateEntries(newEntries);
  console.log(`  Unique entries after dedup: ${uniqueEntries.length}`);

  // Minimum-events guard: if filtering left us with fewer than 1.5× target, relax and use full pool
  const minRequired = Math.ceil(targetCount * 1.5);
  if (uniqueEntries.length < minRequired) {
    console.log(`  [Guard] Only ${uniqueEntries.length} unique entries (need ${minRequired}). Relaxing source filter and using full pool...`);
    const allUnique = deduplicateEntries(rawEntries);
    if (allUnique.length > uniqueEntries.length) {
      uniqueEntries = allUnique;
      console.log(`  [Guard] Expanded to ${uniqueEntries.length} entries from full pool`);
    }
  }

  // Fix 2: Headline dedup — filter entries whose title closely matches a recently published headline
  if (headlineDedupeEnabled) {
    try {
      const recentHeadlines = await db.getRecentHeadlines(3);
      if (recentHeadlines.length > 0) {
        const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
        const recentNorm = new Set(recentHeadlines.map(normalise));
        const before = uniqueEntries.length;
        uniqueEntries = uniqueEntries.filter(e => {
          const norm = normalise(e.title);
          // Exact match or 80%+ word overlap
          if (recentNorm.has(norm)) return false;
          const words = norm.split(" ");
          const recentNormArr = Array.from(recentNorm);
          for (const rh of recentNormArr) {
            const rhWords = new Set(rh.split(" "));
            const overlap = words.filter(w => rhWords.has(w)).length;
            if (overlap / Math.max(words.length, rhWords.size) >= 0.8) return false;
          }
          return true;
        });
        console.log(`  Headline dedup removed ${before - uniqueEntries.length} entries (${uniqueEntries.length} remain)`);
      }
    } catch (err: any) {
      console.log(`  Headline dedup skipped: ${err.message}`);
    }
  }

  // Fix 5: Topic clustering — group entries by topic and take top N per cluster
  if (topicClusterEnabled && uniqueEntries.length > targetCount * 2) {
    uniqueEntries = clusterAndDeduplicate(uniqueEntries, selectorWindowSize);
    console.log(`  After topic clustering: ${uniqueEntries.length} entries`);
  }

  // Fix 6: Cross-batch topic memory — inject recently covered topics into selector
  let recentCoveredTopics: string[] = [];
  if (crossBatchMemoryEnabled) {
    try {
      recentCoveredTopics = await db.getRecentCoveredTopics(crossBatchMemoryDays);
      console.log(`  Cross-batch memory: ${recentCoveredTopics.length} topics covered in last ${crossBatchMemoryDays} days`);
    } catch (err: any) {
      console.log(`  Cross-batch memory skipped: ${err.message}`);
    }
  }

  let selectedEvents: NewsEvent[];
  if (uniqueEntries.length > targetCount) {
    console.log(`  Selecting top ${targetCount} candidates via AI (window: ${selectorWindowSize})...`);
    selectedEvents = await selectTopEvents(
      uniqueEntries,
      targetCount,
      selectorWindowSize,
      recentCoveredTopics,
      categoryQuotasEnabled
    );
  } else {
    selectedEvents = uniqueEntries.slice(0, targetCount);
  }

  // Fix 6: Store covered topics for cross-batch memory
  if (crossBatchMemoryEnabled && selectedEvents.length > 0) {
    try {
      const topics = selectedEvents.map(e => e.title.split(" ").slice(0, 5).join(" ").toLowerCase());
      await db.storeCoveredTopics(topics, date);
      await db.pruneOldCoveredTopics(7);
    } catch (err: any) {
      console.log(`  Could not store covered topics: ${err.message}`);
    }
  }
  console.log(`  Selected: ${selectedEvents.length} events`);

  if (selectedEvents.length === 0) {
    console.log("  No news events gathered. Stopping.");
    return { status: "warning", message: "No news events gathered from RSS feeds", eventsGathered: 0 };
  }

  if (batchId) {
    await db.updateBatchStatus(batchId, "generating", selectedEvents.length);
  }

  // ── Step 2: Generate Articles ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP 2: GENERATING SATIRICAL ARTICLES — ${date}`);
  console.log(`${"=".repeat(60)}`);

  // Get category map
  const categories = await db.listCategories(tenantId);
  const catMap: Record<string, number> = {};
  for (const cat of categories) {
    catMap[cat.slug] = cat.id;
  }

  const generatedArticles: Array<{
    headline: string;
    subheadline: string;
    body: string;
    slug: string;
    categoryId: number | null;
    sourceEvent: string;
    sourceUrl: string;
    feedSourceId: number | null;
    candidateId: number | null;  // v4.0
  }> = [];

  for (let i = 0; i < selectedEvents.length; i++) {
    const event = selectedEvents[i];
    console.log(`  [${i + 1}/${selectedEvents.length}] Generating: ${event.title.slice(0, 60)}...`);

    try {
      const article = await generateSatiricalArticle(event, stylePrompt, targetWords);
      const headline = article.headline || "Untitled Satire";
      const slug = slugify(headline, { lower: true, strict: true }).slice(0, 80) + `-${Math.random().toString(36).slice(2, 7)}`;

      // Format body as HTML paragraphs
      let body = article.body || "";
      if (!body.trim().startsWith("<")) {
        const paragraphs = body.split("\n\n").filter(p => p.trim());
        body = paragraphs.map(p => `<p>${p.trim()}</p>`).join("");
      }

      const catSlug = guessCategory(headline, (article.subheadline || "") + " " + event.title, categories);
      const categoryId = catMap[catSlug] ?? null;

      generatedArticles.push({
        headline,
        subheadline: article.subheadline || "",
        body,
        slug,
        categoryId,
        sourceEvent: event.title,
        sourceUrl: event.sourceUrl,
        licenseId: tenantId,
        feedSourceId: event.feedSourceId ?? null,
        candidateId: event.candidateId ?? null,  // v4.0
      });

      console.log(`    ✓ "${headline.slice(0, 60)}..."`);
      // Rate limit protection: wait between article generations
      if (i < selectedEvents.length - 1) {
        console.log("    Waiting 30s before next article (rate limit protection)...");
        await new Promise(r => setTimeout(r, 30000));
      }
    } catch (err: any) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("rate_limit");
      console.log(`    ✗ Error: ${err.message?.slice(0, 100)}`);
      if (isRateLimit && i < selectedEvents.length - 1) {
        console.log("    Rate limit hit. Waiting 65s before retry...");
        await new Promise(r => setTimeout(r, 65000));
      } else if (i < selectedEvents.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  if (generatedArticles.length === 0) {
    console.log("  No articles generated. Stopping.");
    return { status: "warning", message: "No articles generated", eventsGathered: selectedEvents.length, articlesGenerated: 0 };
  }

  // ── Step 2.5: Template-scheduled article generation ──
  try {
    const templateDb = await db.getDb();
    if (templateDb) {
      const { sql: tSql, and: tAnd, eq: tEq, desc: tDesc } = await import("drizzle-orm");
      const [scheduledTemplates] = await templateDb.execute(
        tSql`SELECT * FROM article_templates WHERE (license_id = ${tenantId} OR licenseId = ${tenantId}) AND is_active = 1 AND schedule_frequency IN ('daily','weekly','biweekly','monthly')`
      );
      const today = new Date();
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();
      let templateArticlesGenerated = 0;

      if ((scheduledTemplates as any[]).length > 0) {
        console.log(`\nSTEP 2.5: TEMPLATE-SCHEDULED GENERATION — ${date}`);
        console.log(`  Found ${(scheduledTemplates as any[]).length} scheduled templates`);

        for (const template of scheduledTemplates as any[]) {
          let isDueToday = false;
          if (template.schedule_frequency === "daily") isDueToday = true;
          else if (template.schedule_frequency === "weekly" || template.schedule_frequency === "biweekly") isDueToday = template.schedule_day_of_week === dayOfWeek;
          else if (template.schedule_frequency === "monthly") isDueToday = dayOfMonth === 1;
          if (!isDueToday) continue;

          // Check if already generated today
          const [existing] = await templateDb.execute(
            tSql`SELECT COUNT(*) as c FROM articles WHERE template_id = ${template.id} AND (license_id = ${tenantId} OR licenseId = ${tenantId}) AND DATE(createdAt) = CURDATE()`
          );
          if ((existing as any[])[0]?.c > 0) {
            console.log(`  [Template] "${template.name}" already generated today — skipping`);
            continue;
          }

          // Get best candidate
          const [candidates] = await templateDb.execute(
            tSql`SELECT id, title, summary, source_url FROM selector_candidates WHERE (license_id = ${tenantId} OR license_id IS NULL) AND status = 'pending' ORDER BY score DESC LIMIT 1`
          );
          const candidate = (candidates as any[])[0];
          if (!candidate) {
            console.log(`  [Template] "${template.name}" — no candidates available`);
            continue;
          }

          try {
            const { applyTemplateSettings } = await import("./templateSettings");
            const templateSettings = await applyTemplateSettings(template.id);
            const tWords = templateSettings.targetWordCount || targetWords;
            const tStyle = templateSettings.userMessage || stylePrompt;
            const newsEvent = { title: candidate.title, summary: candidate.summary || "", sourceUrl: candidate.source_url || "" };
            const generated = await generateSatiricalArticle(newsEvent as any, tStyle, tWords, templateSettings);

            const slugify = (await import("slugify")).default;
            const slug = slugify(generated.headline || "untitled", { lower: true, strict: true }).slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
            let body = generated.body || "";
            if (!body.trim().startsWith("<")) body = body.split("\n\n").filter((p: string) => p.trim()).map((p: string) => "<p>" + p.trim() + "</p>").join("");

            generatedArticles.push({
              headline: generated.headline || "Untitled",
              subheadline: generated.subheadline || "",
              body,
              slug,
              categoryId: template.category_id || template.categoryId || null,
              sourceEvent: candidate.title,
              sourceUrl: candidate.source_url || "",
              feedSourceId: null,
              candidateId: candidate.id,
              licenseId: tenantId,
              templateId: template.id,
            } as any);

            await templateDb.execute(tSql`UPDATE selector_candidates SET status = 'selected' WHERE id = ${candidate.id}`);
            templateArticlesGenerated++;
            console.log(`  [Template] ✓ Generated "${(generated.headline || "").substring(0, 50)}" from template "${template.name}"`);

            // Rate limit delay
            await new Promise(r => setTimeout(r, 30000));
          } catch (err: any) {
            console.log(`  [Template] ✗ "${template.name}": ${err.message?.substring(0, 80)}`);
          }
        }
        console.log(`  [Template] Step 2.5 complete: ${templateArticlesGenerated} template articles generated`);
      }
    }
  } catch (e: any) {
    console.log(`  [Template] Step 2.5 error (non-fatal): ${e.message?.substring(0, 80)}`);
  }

  // ── Step 3: Import to Database ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP 3: IMPORTING TO DATABASE — ${date}`);
  console.log(`${"=".repeat(60)}`);

  const articlesToImport = generatedArticles.slice(0, maxPublish);
  if (generatedArticles.length > maxPublish) {
    console.log(`  Throttled: importing ${maxPublish} of ${generatedArticles.length} articles`);
  }

  const importedIds: number[] = [];
  for (const article of articlesToImport) {
    try {
      const plainText = (article.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const wordCount = plainText.split(" ").filter((w: string) => w.length > 0).length;
      const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
      const id = await db.createArticleFromWorkflow({
        headline: article.headline,
        subheadline: article.subheadline,
        body: article.body,
        slug: article.slug,
        status: defaultStatus,
        categoryId: article.categoryId,
        batchDate: date,
        sourceEvent: article.sourceEvent,
        sourceUrl: article.sourceUrl,
        feedSourceId: article.feedSourceId,
        wordCount,
        readingTimeMinutes,
        generationModel: llmModel || "auto",
        generationStyle: styleName || "standard",
        licenseId: licenseId!,
      });
      if (id) {
        importedIds.push(id);
        // v4.0: Link the candidate to the article it produced
        if (article.candidateId) {
          linkCandidateToArticle(article.candidateId, id).catch(() => { /* non-critical */ });
        }
        // Background SEO generation with logging
        generateAndSaveSEO(id, tenantId).then(() => {
          db.logGenerationStep({ articleId: id, licenseId: tenantId, step: "seo", status: "success" });
          db.updateArticleEnrichmentStatus(id, "seoStatus", "generated");
        }).catch(err => {
          console.error("[SEO] Background generation failed for article " + id + ":", err);
          db.logGenerationStep({ articleId: id, licenseId: tenantId, step: "seo", status: "failed", errorMessage: err?.message });
          db.updateArticleEnrichmentStatus(id, "seoStatus", "failed");
        });
        // Amazon affiliate enrichment (fire and forget)
        import("./amazonEnrich").then(m => m.amazonEnrichArticle(id, tenantId, article.headline, article.categorySlug || "", article.body)).catch(() => {});
      }
    } catch (err: any) {
      // Skip duplicates silently
      if (err.message?.includes("Duplicate") || err.message?.includes("duplicate")) {
        console.log(`    Skipped duplicate: ${article.slug.slice(0, 50)}`);
      } else {
        console.log(`    Import error: ${err.message?.slice(0, 100)}`);
      }
    }
  }

  console.log(`  Imported ${importedIds.length} articles to database`);

  // ── Step 2.5: Category Balance — increment counter and check auto-rebalance ──
  if (importedIds.length > 0) {
    try {
      const newCount = await db.incrementArticleRebalanceCounter(importedIds.length);
      console.log(`  [Category Balance] Article counter: ${newCount} since last rebalance`);

      const rebalanceCheck = await shouldAutoRebalance();
      if (rebalanceCheck.should) {
        console.log(`  [Category Balance] Auto-rebalance triggered: ${rebalanceCheck.reason}`);
        const recommendation = await calculateOptimalWeights();
        if (recommendation.improvement > 0) {
          const result = await applyRebalance(recommendation, 'auto');
          console.log(`  [Category Balance] Auto-rebalance applied (log #${result.logId}). Gap: ${recommendation.currentGap}% → ${recommendation.projectedGap}% (${recommendation.improvement}% improvement)`);
        } else {
          console.log(`  [Category Balance] Auto-rebalance skipped — no improvement projected`);
        }
      } else {
        console.log(`  [Category Balance] No rebalance needed: ${rebalanceCheck.reason}`);
      }
    } catch (err: any) {
      console.log(`  [Category Balance] Error during rebalance check: ${err.message?.slice(0, 100)}`);
    }
  }

  // Count articles by status for batch tallying
  if (batchId && importedIds.length > 0) {
    const importedArticles = await Promise.all(importedIds.map(id => db.getArticleById(id)));
    const statusCounts = {
      approved: importedArticles.filter(a => a?.status === "approved").length,
      published: importedArticles.filter(a => a?.status === "published").length,
      rejected: importedArticles.filter(a => a?.status === "rejected").length,
    };
    
    await db.updateWorkflowBatch(batchId, {
      status: "pending_approval",
      articlesGenerated: importedIds.length,
      articlesApproved: statusCounts.approved,
      articlesPublished: statusCounts.published,
      articlesRejected: statusCounts.rejected,
    });
    
    console.log(`  Batch tallies: ${statusCounts.approved} approved, ${statusCounts.published} published, ${statusCounts.rejected} rejected`);
  }

  // ── Step 3.5: Generate Media (if enabled) ──
  if ((autoGenImages || autoGenVideos) && importedIds.length > 0) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`STEP 3.5: MEDIA GENERATION — ${date}`);
    console.log(`${"=".repeat(60)}`);
     if (autoGenImages) {
      console.log("  Auto-generate images is enabled. Generating images for imported articles...");
      if (realImageEnabled) {
        console.log("  [RealImage] Real image sourcing is ON — will attempt real photos before LLM fallback");
      }
      let imagesGenerated = 0;
      let imagesFailed = 0;
      for (let i = 0; i < importedIds.length; i++) {
        const articleId = importedIds[i];
        try {
          const article = await db.getArticleById(articleId);
          if (!article || article.featuredImage) continue; // skip if already has image
          console.log(`  [${i + 1}/${importedIds.length}] Generating image for: ${article.headline.slice(0, 50)}...`);

          // ── Real Image Sourcing (if enabled) ──────────────────────────────
          if (realImageEnabled) {
            try {
              // Get article tags for relevance scoring
              const { getArticleTags } = await import("./tagging");
              const tagObjs = await getArticleTags(articleId);
              const tags = tagObjs.map((t: any) => t.name);

              // ── Google CSE Crawler (v4.9.7) — runs before Flickr/Wikimedia/etc. ──
              const crawlerEnabled = await getSettingBool("image_crawler_enabled", false);
              if (crawlerEnabled) {
                const crawlerConfig: CrawlerConfig = {
                  apiKey: await getSettingValue("google_cse_api_key", ""),
                  cx: await getSettingValue("google_cse_cx", ""),
                  validationEnabled: await getSettingBool("image_validation_enabled", true),
                  libraryReuseEnabled: await getSettingBool("image_library_reuse_enabled", true),
                  maxReuseCount: await getSettingInt("image_max_reuse_count", 3),
                  relevanceThreshold: 0.5,
                };
                if (crawlerConfig.apiKey && crawlerConfig.cx) {
                  try {
                    const crawlerResult = await findImageWithCrawler(
                      article.headline,
                      article.body ?? "",
                      tags,
                      crawlerConfig
                    );
                    if (crawlerResult) {
                      await db.updateArticle(articleId, {
                        featuredImage: crawlerResult.url,
                        imageAttribution: crawlerResult.attribution,
                      });
                      await logImageLicense(articleId, {
                        found: true,
                        source: crawlerResult.fromLibrary ? "image_library" : "google_cse",
                        cdnUrl: crawlerResult.url,
                        attribution: crawlerResult.attribution,
                        sourceUrl: crawlerResult.sourceUrl,
                        relevanceScore: 1,
                      });
                      imagesGenerated++;
                      console.log(`    ✓ Google CSE image sourced (${crawlerResult.fromLibrary ? "library" : crawlerResult.sourceDomain}): ${crawlerResult.attribution}`);
                      continue; // skip all other image methods
                    }
                  } catch (crawlerErr: any) {
                    console.log(`    ↓ Google CSE crawler error: ${crawlerErr.message?.slice(0, 80)} — falling through to Flickr/Wikimedia`);
                  }
                } else {
                  console.log(`    ↓ Google CSE: API key or CX not configured — skipping`);
                }
              }

              const realResult = await findRealImage({
                id: articleId,
                headline: article.headline,
                tags,
              });

              if (realResult.found && realResult.cdnUrl) {
                await db.updateArticle(articleId, {
                  featuredImage: realResult.cdnUrl,
                  imageAttribution: realResult.attribution,
                });
                await logImageLicense(articleId, {
                  ...realResult,
                  source: realResult.source!,
                  sourceUrl: realResult.cdnUrl,
                });
                imagesGenerated++;
                console.log(`    ✓ Real image sourced (${realResult.source}, score=${realResult.relevanceScore}): ${realResult.attribution}`);
                continue; // skip LLM image for this article
              } else {
                console.log(`    ↓ No real image found — falling back to: ${realImageFallback}`);
              }
            } catch (realErr: any) {
              console.log(`    ↓ Real image sourcing error: ${realErr.message?.slice(0, 80)} — falling back to: ${realImageFallback}`);
            }

            // Fallback: branded card
            if (realImageFallback === "branded_card") {
              try {
                const brandColor = await getSettingValue("brand_color_primary", "#1A1A1A");
                const siteName = await getSettingValue("brand_site_name", "");
                const tagline = await getSettingValue("brand_tagline", "");
                const accentColor = await getSettingValue("brand_color_secondary", "#C41E3A");
                const cardUrl = await generateBrandedCard(article.headline, { brandColor, siteName, tagline, accentColor });
                if (cardUrl) {
                  await db.updateArticle(articleId, { featuredImage: cardUrl });
                  imagesGenerated++;
                  console.log(`    ✓ Branded card generated as fallback`);
                  continue;
                }
              } catch (cardErr: any) {
                console.log(`    ↓ Branded card failed: ${cardErr.message?.slice(0, 80)} — falling back to LLM`);
              }
            }
            // Fallback: sponsor card (use article sponsor image as the article image)
            if (realImageFallback === "sponsor_card") {
              try {
                const sponsorImageUrl = await getSettingValue("article_sponsor_image_url", "");
                if (sponsorImageUrl) {
                  await db.updateArticle(articleId, { featuredImage: sponsorImageUrl });
                  imagesGenerated++;
                  console.log(`    ✓ Sponsor card image used as fallback`);
                  continue;
                } else {
                  console.log(`    ↓ Sponsor card fallback: no article_sponsor_image_url set — falling back to LLM`);
                }
              } catch (sponsorErr: any) {
                console.log(`    ↓ Sponsor card fallback failed: ${sponsorErr.message?.slice(0, 80)} — falling back to LLM`);
              }
            }
          }
          // ── LLM Image (default path, or fallback when real image fails) ──
          const finalPrompt = await buildImagePrompt(article.headline, article.subheadline, { licenseId: tenantId });
          const result = await generateImage({ prompt: finalPrompt, licenseId: tenantId });
          if (result?.url) {
            await db.updateArticle(articleId, { featuredImage: result.url });
            await db.updateArticleEnrichmentStatus(articleId, 'imageStatus', 'generated');
            await db.logGenerationStep({ articleId, licenseId: tenantId, step: "image", status: "success" });
            imagesGenerated++;
            console.log(`    ✓ LLM image generated and saved`);
          } else {
            await db.updateArticleEnrichmentStatus(articleId, 'imageStatus', 'failed').catch(() => {});
            await db.logGenerationStep({ articleId, licenseId: tenantId, step: "image", status: "failed", errorMessage: "No URL returned" }).catch(() => {});
            imagesFailed++;
            console.log(`    ✗ Image generation returned no URL`);
          }
        } catch (err: any) {
          await db.updateArticleEnrichmentStatus(articleId, 'imageStatus', 'failed').catch(() => {});
          await db.logGenerationStep({ articleId, licenseId: tenantId, step: "image", status: "failed", errorMessage: err?.message?.slice(0, 500) }).catch(() => {});
          imagesFailed++;
          console.log(`    ✗ Image generation failed: ${err.message?.slice(0, 80)}`);
        }
      }
      console.log(`  Image generation complete: ${imagesGenerated} generated, ${imagesFailed} failed`);
    }
    
    if (autoGenVideos) {
      console.log("  Auto-generate videos is enabled. Generating videos for imported articles...");
      let videosGenerated = 0;
      let videosFailed = 0;
      
      for (let i = 0; i < importedIds.length; i++) {
        const articleId = importedIds[i];
        try {
          const article = await db.getArticleById(articleId);
          if (!article) continue;
          
          console.log(`  [${i + 1}/${importedIds.length}] Generating video for: ${article.headline.slice(0, 50)}...`);
          
          const videoPrompt = videoStylePrompt + ". News headline: " + article.headline + (article.subheadline ? ". Subheadline: " + article.subheadline : "");
          
          const result = await generateVideo({
            prompt: videoPrompt,
            duration: videoDuration,
            aspectRatio: videoAspectRatio as "16:9" | "9:16" | "1:1",
          });
          
          if (result.url) {
            // Extract thumbnail if article doesn't have a featured image
            let updateData: any = { videoUrl: result.url };
            if (!article.featuredImage) {
              const thumbnailResult = await extractVideoThumbnail({ videoUrl: result.url, timestamp: 2 });
              if (thumbnailResult.url) {
                updateData.featuredImage = thumbnailResult.url;
                console.log(`    ✓ Thumbnail extracted: ${thumbnailResult.url}`);
              }
            }
            
            await db.updateArticle(articleId, updateData);
            console.log(`    ✓ Video generated and saved: ${result.url}`);
            videosGenerated++;
          }
        } catch (err: any) {
          console.log(`    ✗ Video generation failed: ${err.message?.slice(0, 80)}`);
          videosFailed++;
        }
      }
      
      console.log(`  Video generation complete: ${videosGenerated} generated, ${videosFailed} failed`);
    }
  }

  // ── Step 3.7: Auto-Tagging (if enabled) ──
  if (importedIds.length > 0) {
    try {
      const autoTagEnabled = await db.getSetting('auto_tag_enabled');
      if (autoTagEnabled?.value === 'true') {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`STEP 3.7: AUTO-TAGGING — ${date}`);
        console.log(`${'='.repeat(60)}`);
        const { autoTagArticle } = await import('./tagging');
        let taggedCount = 0;
        for (const articleId of importedIds) {
          try {
            const article = await db.getArticleById(articleId);
            if (!article) continue;
            const tagNames = await autoTagArticle(articleId, article.headline, article.subheadline, article.body);
            if (tagNames.length > 0) {
              taggedCount++;
              console.log(`  Tagged: ${article.headline.slice(0, 50)} → [${tagNames.slice(0, 3).join(', ')}${tagNames.length > 3 ? '...' : ''}]`);
            }
            // Small delay to avoid LLM rate limits
            await new Promise(r => setTimeout(r, 150));
          } catch (tagErr: any) {
            console.log(`  [AutoTag] Skipped article ${articleId}: ${tagErr.message?.slice(0, 60)}`);
          }
        }
        console.log(`  Auto-tagging complete: ${taggedCount}/${importedIds.length} articles tagged`);
      }
    } catch (tagStepErr: any) {
      console.log(`  [AutoTag] Step error (non-fatal): ${tagStepErr.message?.slice(0, 80)}`);
    }
  }


  // ── Step 3.8: GEO Optimization (if enabled) ──
  const geoEnabled = await getSettingValue("geo_enabled", "false");
  if (geoEnabled === "true" && importedIds.length > 0) {
    console.log(`\nSTEP 3.8: GEO OPTIMIZATION — ${date}`);
    try {
      const geoSettings = {
        brand_site_name: await getSettingValue("brand_site_name", ""),
        brand_site_url: await getSettingValue("brand_site_url", ""),
        brand_logo_url: await getSettingValue("brand_logo_url", ""),
        geo_enabled: "true",
        geo_faq_enabled: await getSettingValue("geo_faq_enabled", "true"),
        geo_faq_count: await getSettingValue("geo_faq_count", "4"),
        geo_key_takeaway_label: await getSettingValue("geo_key_takeaway_label", "Key Takeaway"),
      };
      const geoResult = await processArticlesGeo(importedIds, geoSettings);
      console.log(`  [GEO] Processed ${geoResult.processed}/${importedIds.length} articles, avg score: ${geoResult.avgScore}/100${geoResult.errors > 0 ? `, errors: ${geoResult.errors}` : ""}`);
      // Log GEO success for each article
      for (const aid of importedIds) {
        await db.logGenerationStep({ articleId: aid, licenseId: tenantId, step: "geo", status: "success" });
        await db.updateArticleEnrichmentStatus(aid, "geoStatus", "generated");
      }
    } catch (err: any) {
      console.log(`  [GEO] Step error (non-fatal): ${err.message?.slice(0, 100)}`);
      for (const aid of importedIds) {
        await db.logGenerationStep({ articleId: aid, licenseId: tenantId, step: "geo", status: "failed", errorMessage: err?.message?.slice(0, 500) });
        await db.updateArticleEnrichmentStatus(aid, "geoStatus", "failed");
      }
    }
  }

  // ── Step 4: Social Media Posts (if enabled) ──
  if (autoSocial && importedIds.length > 0) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`STEP 4: SOCIAL MEDIA POSTS — ${date}`);
    console.log(`${"=".repeat(60)}`);

    // Get the imported articles with their data
    const importedArticles = [];
    for (const id of importedIds) {
      const article = await db.getArticleById(id);
      if (article) {
        importedArticles.push(article);
      }
    }

    if (importedArticles.length > 0) {
      // Filter out articles that already have social posts (prevents duplicates if step runs twice)
      const articlesNeedingPosts = [];
      for (const article of importedArticles) {
        const existing = await db.listSocialPosts({ articleId: article.id });
        if (existing.length === 0) {
          articlesNeedingPosts.push(article);
        } else {
          console.log(`  [Social] Skipping article ${article.id} — social posts already exist`);
        }
      }

      if (articlesNeedingPosts.length === 0) {
        console.log(`  All articles already have social posts, skipping generation`);
      } else {
      // Determine site base URL from settings or env
      const siteUrlSetting = await db.getSetting("site_url");
      const siteBaseUrl = siteUrlSetting?.value || process.env.VITE_APP_URL || process.env.APP_URL || "https://example.com";
      const posts = await generateSocialPosts(
        articlesNeedingPosts.map(a => ({
          id: a.id,
          headline: a.headline,
          subheadline: a.subheadline || undefined,
          slug: a.slug,
          featuredImage: a.featuredImage,
          videoUrl: a.videoUrl,
        })),
        socialPlatforms,
        siteBaseUrl
      );

      if (posts.length > 0) {
        console.log(`  Generated ${posts.length} social posts`);
        // Import social posts to database
        try {
          await db.bulkCreateSocialPosts(posts.map(p => ({
            articleId: p.articleId,
            platform: p.platform as "twitter" | "facebook" | "linkedin" | "instagram" | "threads",
            content: p.content,
            videoUrl: p.videoUrl,
            status: p.status as "draft" | "scheduled" | "posted" | "failed",
          })));
          console.log(`  Imported social posts to database`);
        } catch (err: any) {
          console.log(`  Social post import error: ${err.message?.slice(0, 100)}`);
        }
      }
      } // end articlesNeedingPosts else block
    }
  }

  if (batchId) {
    await db.updateBatchStatus(batchId, "completed");
  }

  // ── Summary ──
  console.log(`\n${"#".repeat(60)}`);
  console.log(`  PIPELINE COMPLETE!`);
  console.log(`  ${selectedEvents.length} news events gathered`);
  console.log(`  ${generatedArticles.length} articles generated`);
  console.log(`  ${importedIds.length} articles imported to database`);
  console.log(`${"#".repeat(60)}`);

  return {
    status: "success",
    message: `Pipeline complete: ${selectedEvents.length} events → ${generatedArticles.length} articles → ${importedIds.length} imported`,
    eventsGathered: selectedEvents.length,
    articlesGenerated: generatedArticles.length,
    articlesImported: importedIds.length,
  };
}

// ─── Recategorize Uncategorized Articles ────────────────────────────────────
/**
 * Re-runs guessCategory on all articles that have no categoryId assigned.
 * Uses DB keywords if present. Returns count of updated articles.
 */
export async function guessAndAssignCategories(): Promise<{ updated: number; skipped: number }> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("DB not available");

  const categories = await db.listCategories();
  if (categories.length === 0) return { updated: 0, skipped: 0 };

  const catMap: Record<string, number> = {};
  for (const c of categories) catMap[c.slug] = c.id;

  // Get all articles with no category
  const { articles: articlesTable } = await import('../drizzle/schema');
  const { isNull } = await import('drizzle-orm');
  const uncategorized = await dbConn
    .select({ id: articlesTable.id, headline: articlesTable.headline, subheadline: articlesTable.subheadline })
    .from(articlesTable)
    .where(isNull(articlesTable.categoryId));

  let updated = 0;
  let skipped = 0;

  for (const article of uncategorized) {
    const catSlug = guessCategory(
      article.headline,
      article.subheadline ?? "",
      categories
    );
    const categoryId = catMap[catSlug] ?? null;
    if (categoryId) {
      await db.updateArticle(article.id, { categoryId });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`[recategorize] Updated: ${updated}, Skipped: ${skipped}`);
  return { updated, skipped };
}
