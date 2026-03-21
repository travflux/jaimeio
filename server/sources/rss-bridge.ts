/**
 * RSS Bridge — v4.0 Multi-Source Selector Window
 *
 * Writes RSS-gathered NewsEvent objects into the selector_candidates table
 * so the AI selector reads from a persistent, multi-source pool rather than
 * an in-memory array.
 *
 * White-label compatible: no hardcoded brand names. All config via DB settings.
 */

import { eq, inArray, lt, gt, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { selectorCandidates } from "../../drizzle/schema";
import { getSetting, getRecentHeadlines, listCategories } from "../db";
import { scoreCandidate } from "../candidate-scoring";

export type CandidateSourceType = "rss" | "google_news" | "manual" | "x" | "reddit" | "scraper" | "youtube" | "event_calendar";

export interface NewsEventInput {
  title: string;
  summary?: string;
  source: string;
  sourceUrl?: string;
  publishedDate?: string;
  feedSourceId?: number | null;
  priority?: number;
  sourceType?: CandidateSourceType;
  category?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Persist an array of RSS entries into selector_candidates.
 * Skips entries whose sourceUrl already exists as a pending candidate
 * to avoid duplicating across pipeline runs on the same day.
 *
 * Returns the number of rows inserted.
 */
export async function writeRssCandidates(
  entries: NewsEventInput[],
  batchDate: string
): Promise<number> {
  if (entries.length === 0) return 0;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Determine expiry window from settings (default 48 hours)
  const expirySetting = await getSetting("candidate_expiry_hours");
  const expiryHours = expirySetting?.value ? parseInt(expirySetting.value, 10) : 48;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Fetch existing pending source URLs to avoid re-inserting
  const existingRows = await db
    .select({ sourceUrl: selectorCandidates.sourceUrl })
    .from(selectorCandidates)
    .where(eq(selectorCandidates.status, "pending"));

  const existingUrls = new Set<string>(
    existingRows
      .map((r) => r.sourceUrl)
      .filter((u): u is string => !!u)
  );

  const toInsert = entries.filter(
    (e) => !e.sourceUrl || !existingUrls.has(e.sourceUrl)
  );

  if (toInsert.length === 0) return 0;

  // Fetch scoring context once for all candidates (recent headlines + categories)
  let recentHeadlines: string[] = [];
  let dbCategories: Array<{ slug: string; keywords?: string | null }> = [];
  try {
    [recentHeadlines, dbCategories] = await Promise.all([
      getRecentHeadlines(3),
      listCategories().then((cats) => cats.map((c) => ({ slug: c.slug, keywords: c.keywords }))),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[rss-bridge] Could not fetch scoring context: ${msg}`);
  }

  // Insert in batches of 100 to stay within MySQL packet limits
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    await db.insert(selectorCandidates).values(
      chunk.map((e) => ({
        sourceType: (e.sourceType ?? "rss") as CandidateSourceType,
        sourceName: e.source,
        sourceUrl: e.sourceUrl || null,
        feedSourceId: e.feedSourceId ?? null,
        title: e.title.slice(0, 1000),
        summary: e.summary ? e.summary.slice(0, 2000) : null,
        publishedDate: e.publishedDate || null,
        status: "pending" as const,
        priority: e.priority ?? 50,
        batchDate,
        articleId: null,
        expiresAt,
      }))
    );
    inserted += chunk.length;
  }

  // Score newly inserted candidates asynchronously (don't block the insert return)
  // We do this in a fire-and-forget manner to keep ingestion fast
  (async () => {
    try {
      // Fetch the IDs of the candidates we just inserted (by sourceUrl or title)
      const insertedUrls = toInsert
        .map((e) => e.sourceUrl)
        .filter((u): u is string => !!u);
      const insertedTitles = toInsert.map((e) => e.title.slice(0, 1000));

      const newRows = await db
        .select()
        .from(selectorCandidates)
        .where(eq(selectorCandidates.status, "pending"))
        .orderBy(desc(selectorCandidates.createdAt))
        .limit(toInsert.length + 20);

      const toScore = newRows.filter(
        (r) =>
          (r.score === null || r.score === undefined) &&
          (insertedUrls.includes(r.sourceUrl ?? "") ||
            insertedTitles.includes(r.title))
      );

      for (const row of toScore) {
        const result = await scoreCandidate(
          {
            id: row.id,
            title: row.title,
            summary: row.summary,
            publishedDate: row.publishedDate,
            sourceType: row.sourceType,
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
            .where(eq(selectorCandidates.id, row.id));
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
            .where(eq(selectorCandidates.id, row.id));
        }
      }
      console.log(`[rss-bridge] Scored ${toScore.length} new candidates`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[rss-bridge] Background scoring failed: ${msg}`);
    }
  })();

  return inserted;
}

/**
 * Mark a set of candidate IDs as selected (chosen by AI selector).
 */
export async function markCandidatesSelected(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db
    .update(selectorCandidates)
    .set({ status: "selected" })
    .where(inArray(selectorCandidates.id, ids));
}

/**
 * Mark a set of candidate IDs as rejected (not chosen by AI selector).
 */
export async function markCandidatesRejected(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db
    .update(selectorCandidates)
    .set({ status: "rejected" })
    .where(inArray(selectorCandidates.id, ids));
}

/**
 * Link a selected candidate to the article it produced.
 */
export async function linkCandidateToArticle(
  candidateId: number,
  articleId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(selectorCandidates)
    .set({ articleId })
    .where(eq(selectorCandidates.id, candidateId));
}

/**
 * Expire all pending candidates whose expires_at has passed.
 * Called by the hourly expiry cron.
 * Returns the number of rows expired.
 */
export async function expireOldCandidates(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .update(selectorCandidates)
    .set({ status: "expired" })
    .where(
      and(
        eq(selectorCandidates.status, "pending"),
        lt(selectorCandidates.expiresAt, new Date())
      )
    );
  return (result as any)[0]?.affectedRows ?? 0;
}

/**
 * Fetch all pending (non-expired) candidates ordered by priority desc, createdAt asc.
 * Used by the pipeline to read the selector window from the DB instead of memory.
 */
export async function getPendingCandidates(limit = 500): Promise<
  Array<{
    id: number;
    title: string;
    summary: string | null;
    source: string;
    sourceUrl: string | null;
    publishedDate: string | null;
    feedSourceId: number | null;
    priority: number;
    sourceType: CandidateSourceType | null;
    score: number | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: selectorCandidates.id,
      title: selectorCandidates.title,
      summary: selectorCandidates.summary,
      source: selectorCandidates.sourceName,
      sourceUrl: selectorCandidates.sourceUrl,
      publishedDate: selectorCandidates.publishedDate,
      feedSourceId: selectorCandidates.feedSourceId,
      priority: selectorCandidates.priority,
      sourceType: selectorCandidates.sourceType,
      score: selectorCandidates.score,
    })
    .from(selectorCandidates)
    .where(
      and(
        eq(selectorCandidates.status, "pending"),
        gt(selectorCandidates.expiresAt, new Date())
      )
    )
    // v4.5: Sort by composite score DESC (scored candidates first), then priority, then createdAt
    // MySQL/TiDB: ISNULL(score) puts NULLs last (0=has score, 1=null), then score DESC
    .orderBy(
      sql`ISNULL(${selectorCandidates.score})`,
      desc(selectorCandidates.score),
      desc(selectorCandidates.priority),
      asc(selectorCandidates.createdAt)
    )
    .limit(limit);

  return rows;
}
