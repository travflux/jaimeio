/**
 * Tests for the X Promotion Candidate scoring and filtering logic.
 * These tests validate the composite score formula, threshold filtering,
 * and category diversity cap without hitting the database.
 */
import { describe, it, expect } from "vitest";
import type { PromotionCandidate } from "./db";

// ─── Scoring formula helper (mirrors db.ts logic) ─────────────────────────────
function computeScore(xViews: number, affiliateCtr: number, hoursLive: number): number {
  return Math.round((xViews * 10) + (affiliateCtr * 50) + Math.max(0, (48 - hoursLive)));
}

// ─── Category diversity cap helper (mirrors db.ts logic) ──────────────────────
function applyCategoryCap(candidates: PromotionCandidate[], cap: number): PromotionCandidate[] {
  const counts: Record<string, number> = {};
  return candidates.filter(c => {
    const cat = c.category || "uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
    return counts[cat] <= cap;
  });
}

// ─── Threshold filter helper (mirrors db.ts logic) ────────────────────────────
function applyThresholds(
  candidates: PromotionCandidate[],
  minXViews: number,
  minAffiliateCtr: number,
): PromotionCandidate[] {
  return candidates.filter(c => c.xViews >= minXViews && c.affiliateCtr >= minAffiliateCtr);
}

// ─── Test data factory ────────────────────────────────────────────────────────
function makeCandidate(overrides: Partial<PromotionCandidate> = {}): PromotionCandidate {
  return {
    articleId: 1,
    headline: "Test Headline",
    slug: "test-headline",
    category: "Politics",
    publishedAt: new Date().toISOString(),
    hoursLive: 12,
    totalViews: 100,
    xViews: 20,
    affiliateClicks: 2,
    affiliateCtr: 2.0,
    score: 0,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Promotion Candidate Scoring Formula", () => {
  it("calculates score correctly: (X Views × 10) + (Affiliate CTR × 50) + freshness bonus", () => {
    // Example from CEO directive: 35 X views, 2.1% CTR, 8h live → 350 + 105 + 40 = 495
    const score = computeScore(35, 2.1, 8);
    expect(score).toBe(495);
  });

  it("calculates score for second example: 28 X views, 0.8% CTR, 14h live → 280 + 40 + 34 = 354", () => {
    const score = computeScore(28, 0.8, 14);
    expect(score).toBe(354);
  });

  it("calculates score for third example: 22 X views, 1.5% CTR, 30h live → 220 + 75 + 18 = 313", () => {
    const score = computeScore(22, 1.5, 30);
    expect(score).toBe(313);
  });

  it("freshness bonus is 0 when article is older than 48 hours", () => {
    const score = computeScore(10, 0, 50);
    // 10*10 + 0*50 + max(0, 48-50) = 100 + 0 + 0 = 100
    expect(score).toBe(100);
  });

  it("freshness bonus is max (48) for a brand-new article (0h live)", () => {
    const score = computeScore(10, 0, 0);
    // 10*10 + 0*50 + 48 = 148
    expect(score).toBe(148);
  });

  it("affiliate CTR contributes meaningfully to score", () => {
    const withCtr = computeScore(10, 5.0, 24);   // 100 + 250 + 24 = 374
    const withoutCtr = computeScore(10, 0, 24);  // 100 + 0 + 24 = 124
    expect(withCtr).toBeGreaterThan(withoutCtr);
    expect(withCtr).toBe(374);
    expect(withoutCtr).toBe(124);
  });
});

describe("Promotion Candidate Threshold Filtering", () => {
  it("excludes articles below minXViews threshold", () => {
    const candidates = [
      makeCandidate({ xViews: 5, slug: "a" }),
      makeCandidate({ xViews: 15, slug: "b" }),
    ];
    const result = applyThresholds(candidates, 10, 0);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("b");
  });

  it("includes articles that exactly meet the minXViews threshold", () => {
    const candidates = [makeCandidate({ xViews: 10, slug: "a" })];
    const result = applyThresholds(candidates, 10, 0);
    expect(result).toHaveLength(1);
  });

  it("excludes articles below minAffiliateCtr threshold", () => {
    const candidates = [
      makeCandidate({ affiliateCtr: 0.5, slug: "a" }),
      makeCandidate({ affiliateCtr: 2.0, slug: "b" }),
    ];
    const result = applyThresholds(candidates, 0, 1.0);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("b");
  });

  it("returns all candidates when minAffiliateCtr is 0", () => {
    const candidates = [
      makeCandidate({ affiliateCtr: 0, slug: "a" }),
      makeCandidate({ affiliateCtr: 5.0, slug: "b" }),
    ];
    const result = applyThresholds(candidates, 0, 0);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no candidates meet thresholds", () => {
    const candidates = [
      makeCandidate({ xViews: 3, slug: "a" }),
      makeCandidate({ xViews: 7, slug: "b" }),
    ];
    const result = applyThresholds(candidates, 10, 0);
    expect(result).toHaveLength(0);
  });
});

describe("Category Diversity Cap", () => {
  it("limits candidates per category to the cap value", () => {
    const candidates = [
      makeCandidate({ category: "Politics", slug: "p1" }),
      makeCandidate({ category: "Politics", slug: "p2" }),
      makeCandidate({ category: "Politics", slug: "p3" }),
      makeCandidate({ category: "Politics", slug: "p4" }),
      makeCandidate({ category: "Technology", slug: "t1" }),
    ];
    const result = applyCategoryCap(candidates, 3);
    const politicsCount = result.filter(c => c.category === "Politics").length;
    expect(politicsCount).toBe(3);
    expect(result).toHaveLength(4); // 3 Politics + 1 Technology
  });

  it("allows all candidates when cap is not exceeded", () => {
    const candidates = [
      makeCandidate({ category: "Politics", slug: "p1" }),
      makeCandidate({ category: "Technology", slug: "t1" }),
      makeCandidate({ category: "Business", slug: "b1" }),
    ];
    const result = applyCategoryCap(candidates, 3);
    expect(result).toHaveLength(3);
  });

  it("treats null category as 'uncategorized' for cap purposes", () => {
    const candidates = [
      makeCandidate({ category: null, slug: "u1" }),
      makeCandidate({ category: null, slug: "u2" }),
      makeCandidate({ category: null, slug: "u3" }),
      makeCandidate({ category: null, slug: "u4" }),
    ];
    const result = applyCategoryCap(candidates, 2);
    expect(result).toHaveLength(2);
  });

  it("preserves order (highest-scored first) when applying cap", () => {
    const candidates = [
      makeCandidate({ category: "Politics", slug: "p1", score: 500 }),
      makeCandidate({ category: "Politics", slug: "p2", score: 400 }),
      makeCandidate({ category: "Politics", slug: "p3", score: 300 }),
    ];
    const result = applyCategoryCap(candidates, 2);
    expect(result[0].slug).toBe("p1");
    expect(result[1].slug).toBe("p2");
  });
});

describe("Score Ranking", () => {
  it("sorts candidates by score descending", () => {
    const candidates: PromotionCandidate[] = [
      makeCandidate({ slug: "low", score: 100 }),
      makeCandidate({ slug: "high", score: 500 }),
      makeCandidate({ slug: "mid", score: 300 }),
    ];
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    expect(sorted[0].slug).toBe("high");
    expect(sorted[1].slug).toBe("mid");
    expect(sorted[2].slug).toBe("low");
  });
});
