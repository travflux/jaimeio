/**
 * Manual Injection Source Module — v4.0 Multi-Source Selector Window
 *
 * Allows admins to paste raw URLs or text snippets directly into the
 * selector_candidates pool. These get high priority (80) so they're
 * reliably picked up by the AI selector on the next pipeline run.
 *
 * White-label compatible: no hardcoded brand names.
 */

import { getDb } from "../db";
import { selectorCandidates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface ManualInjectionInput {
  title: string;
  summary?: string;
  sourceUrl?: string;
  priority?: number; // defaults to 80
}

/**
 * Inject one or more manually-entered candidates into the selector pool.
 * Returns the number of rows inserted.
 */
export async function injectManualCandidates(
  entries: ManualInjectionInput[],
  batchDate: string,
  expiryHours = 48
): Promise<number> {
  if (entries.length === 0) return 0;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  // Dedup: skip entries whose sourceUrl already exists as pending
  let toInsert = entries;
  const urlsToCheck = entries.map(e => e.sourceUrl).filter((u): u is string => !!u);
  if (urlsToCheck.length > 0) {
    const existing = await db
      .select({ sourceUrl: selectorCandidates.sourceUrl })
      .from(selectorCandidates)
      .where(eq(selectorCandidates.status, "pending"));
    const existingUrls = new Set(existing.map(r => r.sourceUrl).filter(Boolean));
    toInsert = entries.filter(e => !e.sourceUrl || !existingUrls.has(e.sourceUrl));
  }

  if (toInsert.length === 0) return 0;

  await db.insert(selectorCandidates).values(
    toInsert.map(e => ({
      sourceType: "manual" as const,
      sourceName: "Manual Injection",
      sourceUrl: e.sourceUrl || null,
      feedSourceId: null,
      title: e.title.slice(0, 1000),
      summary: e.summary ? e.summary.slice(0, 2000) : null,
      publishedDate: new Date().toISOString(),
      status: "pending" as const,
      priority: e.priority ?? 80,
      batchDate,
      articleId: null,
      expiresAt,
    }))
  );

  return toInsert.length;
}

/**
 * Get all pending manual injection candidates (for admin display).
 */
export async function getPendingManualCandidates(): Promise<
  Array<{
    id: number;
    title: string;
    summary: string | null;
    sourceUrl: string | null;
    priority: number;
    createdAt: Date | null;
    expiresAt: Date | null;
  }>
> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: selectorCandidates.id,
      title: selectorCandidates.title,
      summary: selectorCandidates.summary,
      sourceUrl: selectorCandidates.sourceUrl,
      priority: selectorCandidates.priority,
      createdAt: selectorCandidates.createdAt,
      expiresAt: selectorCandidates.expiresAt,
    })
    .from(selectorCandidates)
    .where(
      and(
        eq(selectorCandidates.sourceType, "manual"),
        eq(selectorCandidates.status, "pending")
      )
    );
}
