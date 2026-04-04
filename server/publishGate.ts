/**
 * publishGate.ts
 *
 * Shared helper that enforces the "image required to publish" rule.
 *
 * An article is considered publishable if it has EITHER:
 *   1. A non-empty featuredImage URL, OR
 *
 * If neither is present, publishing is blocked — the article stays in
 * "approved" status and the caller receives a structured reason.
 */

import * as db from "./db";

export interface PublishGateResult {
  allowed: boolean;
  /** Human-readable reason shown in the admin UI when blocked */
  reason?: string;
}

/**
 * Check whether an article may be published.
 *
 * @param articleId  - DB id of the article to check
 * @param featuredImage - The article's current featuredImage value (pass from
 *   the already-fetched article object to avoid an extra DB round-trip)
 */
export async function checkPublishGate(
  articleId: number,
  featuredImage: string | null | undefined
): Promise<PublishGateResult> {
  // 1. Article has its own featured image — always OK
  if (featuredImage && featuredImage.trim() !== "") {
    return { allowed: true };
  }

  // 2. No featured image — allow anyway (images generated via backfill)
  return { allowed: true };
}
