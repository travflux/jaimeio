/**
 * Candidate Scoring — v4.5.1
 *
 * Scores selector_candidates on 5 factors (recency, editorial potential,
 * uniqueness, source authority, engagement signal) and classifies article potential.
 * Called synchronously on ingestion via writeRssCandidates().
 *
 * "Editorial potential" is genre-aware: reads brand_genre from DB settings.
 *   - genre = "satire": scores for satirical potential (absurdity, irony, hypocrisy)
 *   - genre = anything else: scores for editorial potential (relevance, depth, audience interest)
 *
 * White-label compatible: all thresholds and genre are configurable via DB settings.
 */

import { eq, desc } from "drizzle-orm";
import { getDb, getSetting } from "./db";
import { selectorCandidates } from "../drizzle/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  recency: number;
  editorialPotential: number;  // genre-aware: satire potential or editorial relevance
  uniqueness: number;
  sourceAuthority: number;
  engagementSignal: number;
  composite: number;
}

export interface ScoringResult {
  score: number;
  articlePotential: "high" | "medium" | "low" | "dead";
  scoreBreakdown: ScoreBreakdown;
  expiresAt: Date;
  shouldReject: boolean; // true if uniqueness < 0.3 (duplicate)
  rejectReason?: string;
}

export interface CandidateInput {
  id: number;
  title: string;
  summary?: string | null;
  publishedDate?: string | null;
  sourceType: string;
  categoryId?: number | null;
  metadata?: string | null; // JSON string with engagement data
}

// ─── Factor: Recency ─────────────────────────────────────────────────────────

/**
 * Score based on time since the SOURCE EVENT (publishedDate), not ingestion time.
 * < 2 hours = 1.0, 2-6 hours = 0.8, 6-12 hours = 0.6, 12-24 hours = 0.3, > 24 hours = 0.1
 */
export function scoreRecency(publishedDate?: string | null): number {
  if (!publishedDate) return 0.5; // neutral if no date

  let eventTime: Date;
  try {
    eventTime = new Date(publishedDate);
    if (isNaN(eventTime.getTime())) return 0.5;
  } catch {
    return 0.5;
  }

  const ageHours = (Date.now() - eventTime.getTime()) / (1000 * 60 * 60);

  if (ageHours < 2) return 1.0;
  if (ageHours < 6) return 0.8;
  if (ageHours < 12) return 0.6;
  if (ageHours < 24) return 0.3;
  return 0.1;
}

// ─── Factor: Editorial Potential (Genre-Aware) ──────────────────────────────────

/**
 * Genre-aware editorial potential scoring.
 *
 * For satire genre: scores how well the headline lends itself to satirical treatment
 * (absurdity, irony, hypocrisy, power imbalance, contradiction).
 *
 * For all other genres: scores editorial relevance via category keyword matching
 * (relevance, depth, audience interest).
 *
 * Also incorporates category keyword matching as a base signal for all genres.
 * keyword score > 2 = 1.0, score 1-2 = 0.6, no match = 0.2
 */
export function scoreEditorialPotential(
  title: string,
  summary: string | null | undefined,
  dbCategories: Array<{ slug: string; keywords?: string | null }>,
  brandGenre = "satire"
): number {
  const text = `${title} ${summary || ""}`.toLowerCase();
  // Base signal: category keyword matching (works for all genres)
  let categoryScore = 0.2;
  if (dbCategories && dbCategories.length > 0) {
    let bestMatch = 0;
    for (const cat of dbCategories) {
      if (!cat.keywords) continue;
      const keywords = cat.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      const matches = keywords.filter((kw) => text.includes(kw)).length;
      if (matches > bestMatch) bestMatch = matches;
    }
    if (bestMatch > 2) categoryScore = 1.0;
    else if (bestMatch >= 1) categoryScore = 0.6;
    else categoryScore = 0.2;
  }
  if (brandGenre === "satire") {
    // Satire genre: boost for signals of absurdity, irony, hypocrisy, contradiction
    const satiricalSignals = [
      "despite", "while also", "at the same time", "ironically", "paradox",
      "contradicts", "reversal", "flip-flop", "u-turn", "backtrack",
      "ceo", "senator", "congressman", "president", "official", "spokesperson",
      "announces", "declares", "vows", "promises", "pledges",
      "record", "historic", "unprecedented", "first ever", "new high", "new low",
      "study finds", "experts say", "scientists", "research shows",
      "scandal", "controversy", "backlash", "outrage", "apologizes", "resigns",
      "investigation", "probe", "lawsuit", "fine", "ban",
    ];
    const satiricalMatches = satiricalSignals.filter((s) => text.includes(s)).length;
    const satiricalBoost = Math.min(1.0, 0.3 + satiricalMatches * 0.07);
    return Math.min(1.0, categoryScore * 0.6 + satiricalBoost * 0.4);
  } else {
    // Non-satire genre: editorial relevance (category match + depth signals)
    const depthSignals = [
      "analysis", "report", "study", "data", "research", "survey",
      "trend", "growth", "decline", "market", "industry", "sector",
      "how to", "guide", "tips", "strategy", "best practices",
      "interview", "exclusive", "investigation",
    ];
    const depthMatches = depthSignals.filter((s) => text.includes(s)).length;
    const depthBoost = Math.min(1.0, 0.3 + depthMatches * 0.07);
    return Math.min(1.0, categoryScore * 0.7 + depthBoost * 0.3);
  }
}

// ─── Factor: Uniqueness ───────────────────────────────────────────────────────

/**
 * Compare title against recent published headlines using word overlap.
 * Overlap > 50% = 0.0 (duplicate), 30-50% = 0.3, 10-30% = 0.7, < 10% = 1.0
 */
export function scoreUniqueness(
  title: string,
  recentHeadlines: string[]
): { score: number; isDuplicate: boolean } {
  if (recentHeadlines.length === 0) return { score: 1.0, isDuplicate: false };

  const titleWords = new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3) // ignore short words
  );

  if (titleWords.size === 0) return { score: 0.5, isDuplicate: false };

  let maxOverlap = 0;

  for (const headline of recentHeadlines) {
    const headlineWords = new Set(
      headline
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    if (headlineWords.size === 0) continue;

    const intersection = Array.from(titleWords).filter((w) => headlineWords.has(w)).length;
    const overlap = intersection / Math.min(titleWords.size, headlineWords.size);
    if (overlap > maxOverlap) maxOverlap = overlap;
  }

  if (maxOverlap > 0.5) return { score: 0.0, isDuplicate: true };
  if (maxOverlap > 0.3) return { score: 0.3, isDuplicate: false };
  if (maxOverlap > 0.1) return { score: 0.7, isDuplicate: false };
  return { score: 1.0, isDuplicate: false };
}

// ─── Factor: Source Authority ─────────────────────────────────────────────────

/**
 * Score based on source type authority.
 * google_news = 0.9, manual = 1.0, rss = 0.8 (top-tier) or 0.5 (other),
 * reddit = 0.6, x = 0.5, scraper = 0.5, youtube = 0.6, event_calendar = 0.7
 */
export function scoreSourceAuthority(
  sourceType: string,
  sourceName?: string | null
): number {
  switch (sourceType) {
    case "manual":
      return 1.0;
    case "google_news":
      return 0.9;
    case "event_calendar":
      return 0.7;
    case "reddit":
      return 0.6;
    case "youtube":
      return 0.6;
    case "rss": {
      // Top-tier RSS feeds get 0.8; others get 0.5
      const topTierPatterns = [
        "reuters", "ap ", "associated press", "bbc", "nyt", "new york times",
        "washington post", "guardian", "npr", "politico", "bloomberg",
        "wall street journal", "wsj", "cnn", "abc news", "nbc news",
        "the hill", "axios", "techcrunch", "wired", "ars technica",
      ];
      const name = (sourceName || "").toLowerCase();
      const isTopTier = topTierPatterns.some((p) => name.includes(p));
      return isTopTier ? 0.8 : 0.5;
    }
    case "x":
      return 0.5;
    case "scraper":
      return 0.5;
    default:
      return 0.5;
  }
}

// ─── Factor: Engagement Signal ────────────────────────────────────────────────

/**
 * Score based on engagement data (Reddit upvotes, X likes).
 * > 500 = 1.0, > 100 = 0.7, > 20 = 0.4, no data = 0.5 (neutral)
 */
export function scoreEngagement(metadata?: string | null): number {
  if (!metadata) return 0.5;

  try {
    const data = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    const upvotes = data.upvotes ?? data.score ?? data.likes ?? data.retweets ?? 0;
    if (typeof upvotes !== "number") return 0.5;
    if (upvotes > 500) return 1.0;
    if (upvotes > 100) return 0.7;
    if (upvotes > 20) return 0.4;
    return 0.3;
  } catch {
    return 0.5;
  }
}

// ─── Expiry Calculation ───────────────────────────────────────────────────────

/**
 * Calculate expiry based on candidate nature:
 * Breaking news (recency > 0.8) → 6 hours
 * Trending (recency 0.4-0.8) → 18 hours
 * Evergreen (recency < 0.4 but high uniqueness) → 72 hours
 */
export async function calculateExpiry(
  recencyScore: number,
  uniquenessScore: number
): Promise<Date> {
  // Read configurable expiry hours from DB settings
  const [breakingHoursSetting, trendingHoursSetting, evergreenHoursSetting] =
    await Promise.all([
      getSetting("expiry_breaking_hours"),
      getSetting("expiry_trending_hours"),
      getSetting("expiry_evergreen_hours"),
    ]);

  const breakingHours = parseInt(breakingHoursSetting?.value ?? "6", 10);
  const trendingHours = parseInt(trendingHoursSetting?.value ?? "18", 10);
  const evergreenHours = parseInt(evergreenHoursSetting?.value ?? "72", 10);

  let hours: number;
  if (recencyScore > 0.8) {
    hours = breakingHours;
  } else if (recencyScore >= 0.4) {
    hours = trendingHours;
  } else {
    // Evergreen: low recency but potentially high uniqueness
    hours = evergreenHours;
  }

  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ─── Article Potential Classification ────────────────────────────────────────

export function classifyPotential(
  score: number,
  highThreshold = 0.70,
  mediumThreshold = 0.40,
  lowThreshold = 0.15
): "high" | "medium" | "low" | "dead" {
  if (score >= highThreshold) return "high";
  if (score >= mediumThreshold) return "medium";
  if (score >= lowThreshold) return "low";
  return "dead";
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Score a single candidate. Returns the scoring result.
 * Does NOT write to DB — caller is responsible for persisting.
 */
export async function scoreCandidate(
  candidate: CandidateInput,
  recentHeadlines: string[],
  dbCategories: Array<{ slug: string; keywords?: string | null }>
): Promise<ScoringResult> {
  // Read configurable thresholds and brand genre
  const [highThresholdSetting, minThresholdSetting, brandGenreSetting] = await Promise.all([
    getSetting("score_high_threshold"),
    getSetting("min_score_threshold"),
    getSetting("brand_genre"),
  ]);

  const highThreshold = parseFloat(highThresholdSetting?.value ?? "0.70");
  const mediumThreshold = parseFloat(minThresholdSetting?.value ?? "0.40");
  const brandGenre = (brandGenreSetting?.value ?? "satire").toLowerCase().trim();

  // Factor scores
  const recency = scoreRecency(candidate.publishedDate);
  const editorialPotential = scoreEditorialPotential(
    candidate.title,
    candidate.summary,
    dbCategories,
    brandGenre
  );
  const { score: uniqueness, isDuplicate } = scoreUniqueness(
    candidate.title,
    recentHeadlines
  );
  const sourceAuthority = scoreSourceAuthority(
    candidate.sourceType,
    candidate.summary // sourceName not in input, use summary as proxy; actual name passed separately
  );
  const engagementSignal = scoreEngagement(candidate.metadata);

  // Weighted composite
  const composite =
    recency * 0.30 +
    editorialPotential * 0.25 +
    uniqueness * 0.25 +
    sourceAuthority * 0.10 +
    engagementSignal * 0.10;

  const breakdown: ScoreBreakdown = {
    recency,
    editorialPotential,
    uniqueness,
    sourceAuthority,
    engagementSignal,
    composite,
  };

  // Auto-reject duplicates
  if (isDuplicate) {
    return {
      score: composite,
      articlePotential: "dead",
      scoreBreakdown: breakdown,
      expiresAt: new Date(), // immediate expiry
      shouldReject: true,
      rejectReason: "duplicate",
    };
  }

  const expiresAt = await calculateExpiry(recency, uniqueness);
  const articlePotential = classifyPotential(composite, highThreshold, mediumThreshold);

  return {
    score: composite,
    articlePotential,
    scoreBreakdown: breakdown,
    expiresAt,
    shouldReject: false,
  };
}

// ─── Batch Scoring Job ────────────────────────────────────────────────────────

/**
 * Score all unscored pending candidates. Called by the 5-minute recurring job
 * for candidates that couldn't be scored at ingestion.
 *
 * Returns the number of candidates scored.
 */
export async function scoreUnscoredCandidates(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Fetch unscored pending candidates (score IS NULL)
  const unscored = await db
    .select()
    .from(selectorCandidates)
    .where(
      eq(selectorCandidates.status, "pending")
    )
    .orderBy(desc(selectorCandidates.createdAt))
    .limit(200);

  // Filter to only those without a score
  const needsScoring = unscored.filter((c) => c.score === null || c.score === undefined);
  if (needsScoring.length === 0) return 0;

  // Fetch recent headlines once for all candidates
  const { getRecentHeadlines, listCategories } = await import("./db");
  const [recentHeadlines, dbCategoriesRaw] = await Promise.all([
    getRecentHeadlines(3),
    listCategories(),
  ]);
  const dbCategories = dbCategoriesRaw.map((c: { slug: string; keywords?: string | null }) => ({
    slug: c.slug,
    keywords: c.keywords,
  }));

  let scored = 0;
  for (const candidate of needsScoring) {
    try {
      const result = await scoreCandidate(
        {
          id: candidate.id,
          title: candidate.title,
          summary: candidate.summary,
          publishedDate: candidate.publishedDate,
          sourceType: candidate.sourceType,
          metadata: null,
        },
        recentHeadlines,
        dbCategories
      );

      if (result.shouldReject) {
        await db
          .update(selectorCandidates)
          .set({
            status: "rejected",
            score: result.score,
            scoredAt: new Date(),
            scoreBreakdown: JSON.stringify(result.scoreBreakdown),
            articlePotential: result.articlePotential,
          })
          .where(eq(selectorCandidates.id, candidate.id));
      } else {
        await db
          .update(selectorCandidates)
          .set({
            score: result.score,
            scoredAt: new Date(),
            scoreBreakdown: JSON.stringify(result.scoreBreakdown),
            articlePotential: result.articlePotential,
            expiresAt: result.expiresAt,
          })
          .where(eq(selectorCandidates.id, candidate.id));
      }
      scored++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Scoring] Failed to score candidate ${candidate.id}: ${msg}`);
    }
  }

  return scored;
}

// ─── Score Decay Job ─────────────────────────────────────────────────────────
/**
 * Decay scores of pending candidates that were scored more than N hours ago.
 *
 * The recency factor is the largest contributor (30%) to the composite score.
 * As candidates age, their recency score naturally drops — but only if we
 * RE-SCORE them. This function re-scores any pending candidate whose
 * scoredAt timestamp is older than `decayIntervalHours` (default: 3 hours).
 *
 * This ensures that a candidate scored at 0.85 at 6am won't still be at 0.85
 * at 11pm — it will have decayed as the news ages.
 *
 * Returns the number of candidates re-scored.
 */
export async function decayStaleScores(decayIntervalHours = 3): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - decayIntervalHours * 60 * 60 * 1000);

  // Find pending candidates that were scored before the cutoff
  const { and, lt, isNotNull } = await import("drizzle-orm");
  const stale = await db
    .select()
    .from(selectorCandidates)
    .where(
      and(
        eq(selectorCandidates.status, "pending"),
        isNotNull(selectorCandidates.scoredAt),
        lt(selectorCandidates.scoredAt, cutoff)
      )
    )
    .limit(100);

  if (stale.length === 0) return 0;

  // Fetch shared data once
  const { getRecentHeadlines, listCategories, getSetting: getSettingFn } = await import("./db");
  const [recentHeadlines, dbCategoriesRaw, minScoreSetting] = await Promise.all([
    getRecentHeadlines(3),
    listCategories(),
    getSettingFn("min_score_to_publish"),
  ]);
  const dbCategories = dbCategoriesRaw.map((c: { slug: string; keywords?: string | null }) => ({
    slug: c.slug,
    keywords: c.keywords,
  }));
  const minScore = parseFloat(minScoreSetting?.value ?? "0.30");

  let decayed = 0;
  for (const candidate of stale) {
    try {
      const result = await scoreCandidate(
        {
          id: candidate.id,
          title: candidate.title,
          summary: candidate.summary,
          publishedDate: candidate.publishedDate,
          sourceType: candidate.sourceType,
          metadata: null,
        },
        recentHeadlines,
        dbCategories
      );

      if (result.shouldReject || result.score < minScore * 0.5) {
        // Score decayed below half the publish threshold — reject it
        await db
          .update(selectorCandidates)
          .set({
            status: "rejected",
            score: result.score,
            scoredAt: new Date(),
            scoreBreakdown: JSON.stringify(result.scoreBreakdown),
            articlePotential: result.articlePotential,
          })
          .where(eq(selectorCandidates.id, candidate.id));
      } else {
        await db
          .update(selectorCandidates)
          .set({
            score: result.score,
            scoredAt: new Date(),
            scoreBreakdown: JSON.stringify(result.scoreBreakdown),
            articlePotential: result.articlePotential,
            expiresAt: result.expiresAt,
          })
          .where(eq(selectorCandidates.id, candidate.id));
      }
      decayed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ScoreDecay] Failed to re-score candidate ${candidate.id}: ${msg}`);
    }
  }

  return decayed;
}
