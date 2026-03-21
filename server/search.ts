/**
 * Enhanced search — DB-side word matching with relevance scoring.
 *
 * TiDB does not support FULLTEXT indexes, so we use:
 *   1. A regular index on `headline` (idx_articles_headline) for fast prefix/word lookups
 *   2. Per-word LIKE conditions pushed to the DB (not full-string LIKE '%query%')
 *   3. Server-side relevance scoring on the returned result set (bounded to 200 rows max)
 *
 * This replaces the old approach of loading 1000 articles into memory and running
 * Levenshtein distance on every row — which breaks at scale.
 */

import { getDb } from "./db";
import { articles, categories } from "../drizzle/schema";
import { and, eq, or, like, desc, sql, lt, gte } from "drizzle-orm";
import * as db from "./db";
import { extractSnippet, highlightMatches } from "./search-engine";

export interface EnhancedSearchResult {
  id: number;
  headline: string;
  subheadline: string | null;
  slug: string;
  featuredImage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  categoryId: number | null;
  status: string;
  score: number;
  snippet: string;
  matchedFields: string[];
  categoryName?: string | null;
  tags?: string[];
}

// Stop words to strip from queries before word-level matching
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','been','be','have','has','had','do',
  'does','did','will','would','should','could','may','might','must','can',
  'this','that','these','those','it','its','not','no','so','if','then',
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreResult(
  query: string,
  keywords: string[],
  headline: string,
  subheadline: string | null,
  body: string | null
): { score: number; matchedFields: string[] } {
  const headlineLow = headline.toLowerCase();
  const subLow = (subheadline || '').toLowerCase();
  const bodyLow = (body || '').toLowerCase();
  const queryLow = query.toLowerCase();
  let score = 0;
  const matchedFields: string[] = [];

  // Exact phrase in headline (highest weight)
  if (headlineLow.includes(queryLow)) {
    score += 200;
    if (!matchedFields.includes('headline')) matchedFields.push('headline');
  }
  // Exact phrase in subheadline
  if (subLow && subLow.includes(queryLow)) {
    score += 80;
    if (!matchedFields.includes('subheadline')) matchedFields.push('subheadline');
  }
  // Exact phrase in body
  if (bodyLow && bodyLow.includes(queryLow)) {
    score += 30;
    if (!matchedFields.includes('content')) matchedFields.push('content');
  }

  // Per-keyword scoring
  for (const kw of keywords) {
    if (headlineLow.includes(kw)) {
      score += 60;
      if (!matchedFields.includes('headline')) matchedFields.push('headline');
    }
    if (subLow && subLow.includes(kw)) {
      score += 25;
      if (!matchedFields.includes('subheadline')) matchedFields.push('subheadline');
    }
    if (bodyLow) {
      const occurrences = (bodyLow.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (occurrences > 0) {
        score += Math.min(occurrences * 8, 40);
        if (!matchedFields.includes('content')) matchedFields.push('content');
      }
    }
  }

  return { score, matchedFields };
}

/**
 * Enhanced search with DB-side filtering and server-side relevance scoring.
 * Replaces the old in-memory Levenshtein approach.
 */
export async function enhancedSearch(opts: {
  query: string;
  status?: string;
  categoryId?: number;
  tagSlug?: string;
  dateRange?: string;
  sortBy?: 'relevance' | 'date' | 'views';
  limit?: number;
  offset?: number;
  cursor?: number; // for cursor-based infinite scroll
  useFuzzy?: boolean;
}): Promise<{ results: EnhancedSearchResult[]; total: number; hasMore: boolean; nextCursor?: number }> {
  const { query, limit = 20, offset = 0, cursor } = opts;
  const dbConn = await getDb();
  if (!dbConn || !query.trim()) {
    return { results: [], total: 0, hasMore: false };
  }

  const keywords = extractKeywords(query);
  if (keywords.length === 0 && query.trim().length < 2) {
    return { results: [], total: 0, hasMore: false };
  }

  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [];

  // Status filter
  const status = opts.status || 'published';
  conditions.push(eq(articles.status, status as any));

  // Category filter
  if (opts.categoryId) {
    conditions.push(eq(articles.categoryId, opts.categoryId));
  }

  // Date range filter
  if (opts.dateRange && opts.dateRange !== 'all') {
    const now = new Date();
    let cutoff: Date;
    switch (opts.dateRange) {
      case 'today': cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': cutoff = new Date(now.getTime() - 7 * 86400000); break;
      case 'month': cutoff = new Date(now.getTime() - 30 * 86400000); break;
      case 'year': cutoff = new Date(now.getTime() - 365 * 86400000); break;
      default: cutoff = new Date(0);
    }
    conditions.push(gte(articles.publishedAt, cutoff) as any);
  }

  // Cursor-based pagination
  if (cursor) {
    conditions.push(lt(articles.id, cursor) as any);
  }

  // Keyword search conditions: each keyword must match at least one field
  // We push OR(headline LIKE, subheadline LIKE, body LIKE) per keyword
  const searchTerms = keywords.length > 0 ? keywords : [query.trim()];
  for (const kw of searchTerms.slice(0, 5)) { // cap at 5 keywords to avoid query explosion
    const pattern = `%${kw}%`;
    conditions.push(
      or(
        like(articles.headline, pattern),
        like(articles.subheadline, pattern),
        like(articles.body, pattern)
      ) as any
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch up to 200 matching rows for scoring (bounded — not unbounded 1000)
  const FETCH_LIMIT = 200;
  const rows = await dbConn
    .select({
      id: articles.id,
      headline: articles.headline,
      subheadline: articles.subheadline,
      slug: articles.slug,
      featuredImage: articles.featuredImage,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      categoryId: articles.categoryId,
      status: articles.status,
      body: articles.body,
      views: articles.views,
    })
    .from(articles)
    .where(where)
    .orderBy(desc(articles.publishedAt))
    .limit(FETCH_LIMIT);

  // Score and filter
  const scored: EnhancedSearchResult[] = [];
  for (const row of rows) {
    const { score, matchedFields } = scoreResult(query, keywords, row.headline, row.subheadline, row.body);
    if (score > 0) {
      const snippetText = row.subheadline || row.body || row.headline;
      const snippet = extractSnippet(query, snippetText, 220);
      scored.push({
        id: row.id,
        headline: row.headline,
        subheadline: row.subheadline,
        slug: row.slug,
        featuredImage: row.featuredImage,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        categoryId: row.categoryId,
        status: row.status,
        score,
        snippet,
        matchedFields,
      });
    }
  }

  // Sort
  const sortBy = opts.sortBy || 'relevance';
  if (sortBy === 'relevance') {
    scored.sort((a, b) => b.score - a.score);
  } else if (sortBy === 'date') {
    scored.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  }
  // 'views' sort would require joining — handled by DB query order if needed

  const total = scored.length;
  const paginated = cursor
    ? scored.slice(0, limit)
    : scored.slice(offset, offset + limit);

  const hasMore = cursor
    ? rows.length === FETCH_LIMIT
    : offset + limit < total;

  const nextCursor = cursor && paginated.length > 0
    ? paginated[paginated.length - 1].id
    : undefined;

  return { results: paginated, total, hasMore, nextCursor };
}

/**
 * Get autocomplete suggestions from recent article headlines.
 * Uses DB-side LIKE on the indexed headline column — fast.
 */
export async function getAutocompleteSuggestions(
  query: string,
  limit: number = 8
): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  const dbConn = await getDb();
  if (!dbConn) return [];

  const pattern = `%${query.trim()}%`;
  const rows = await dbConn
    .select({ headline: articles.headline })
    .from(articles)
    .where(and(
      eq(articles.status, 'published'),
      like(articles.headline, pattern)
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit * 2);

  // Deduplicate and return
  const seen = new Set<string>();
  const results: string[] = [];
  for (const row of rows) {
    const h = row.headline;
    if (!seen.has(h)) {
      seen.add(h);
      results.push(h);
      if (results.length >= limit) break;
    }
  }
  return results;
}

/**
 * "Did You Mean?" suggestions for zero-result queries.
 * Returns up to 3 alternative query suggestions based on recent popular searches.
 */
export async function getDidYouMeanSuggestions(
  query: string,
  limit: number = 3
): Promise<string[]> {
  if (!query || query.trim().length < 3) return [];
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const dbConn = await getDb();
  if (!dbConn) return [];

  // Try each keyword individually to find articles — suggest the keyword if it matches
  const suggestions: string[] = [];
  for (const kw of keywords.slice(0, 5)) {
    if (suggestions.length >= limit) break;
    const rows = await dbConn
      .select({ headline: articles.headline })
      .from(articles)
      .where(and(eq(articles.status, 'published'), like(articles.headline, `%${kw}%`)))
      .limit(1);
    if (rows.length > 0) {
      suggestions.push(kw);
    }
  }
  return suggestions;
}

/**
 * Get trending searches from analytics.
 */
export async function getTrendingSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
  const analytics = await db.getSearchAnalytics(1000);
  const queryCounts = new Map<string, number>();
  for (const entry of analytics) {
    const q = entry.query.toLowerCase().trim();
    if (q.length > 0) queryCounts.set(q, (queryCounts.get(q) || 0) + 1);
  }
  return Array.from(queryCounts.entries())
    .map(([q, count]) => ({ query: q, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get popular searches (searches with results).
 */
export async function getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number; avgResults: number }>> {
  const analytics = await db.getSearchAnalytics(1000);
  const queryStats = new Map<string, { count: number; totalResults: number }>();
  for (const entry of analytics) {
    const q = entry.query.toLowerCase().trim();
    if (q.length > 0 && entry.resultsCount > 0) {
      const stats = queryStats.get(q) || { count: 0, totalResults: 0 };
      stats.count++;
      stats.totalResults += entry.resultsCount;
      queryStats.set(q, stats);
    }
  }
  return Array.from(queryStats.entries())
    .map(([q, stats]) => ({
      query: q,
      count: stats.count,
      avgResults: Math.round(stats.totalResults / stats.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
