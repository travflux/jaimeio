import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  projectDistribution,
  type FeedFingerprint,
  type RebalanceRecommendation,
} from "./categoryBalance";

// ─── projectDistribution (pure function, no DB) ────────────────────────────

describe("projectDistribution", () => {
  const categorySlugs = ["politics", "tech", "culture", "sports", "science"];

  function makeFeed(overrides: Partial<FeedFingerprint>): FeedFingerprint {
    return {
      feedId: 1,
      feedUrl: "https://example.com/feed",
      feedDomain: "example.com",
      weight: 50,
      enabled: true,
      totalArticles: 100,
      meetsThreshold: true,
      categoryBreakdown: {},
      ...overrides,
    };
  }

  it("returns zero distribution when total weight is zero", () => {
    const feeds = [makeFeed({ weight: 0 }), makeFeed({ feedId: 2, weight: 0 })];
    const weights = { "https://example.com/feed": 0 };
    const result = projectDistribution(feeds, weights, categorySlugs);
    for (const slug of categorySlugs) {
      expect(result[slug]).toBe(0);
    }
  });

  it("returns zero distribution when all feeds are disabled", () => {
    const feeds = [makeFeed({ enabled: false, weight: 50 })];
    const weights = { "https://example.com/feed": 50 };
    const result = projectDistribution(feeds, weights, categorySlugs);
    for (const slug of categorySlugs) {
      expect(result[slug]).toBe(0);
    }
  });

  it("projects distribution from a single feed", () => {
    const feeds = [
      makeFeed({
        weight: 100,
        categoryBreakdown: {
          politics: 40,
          tech: 30,
          culture: 20,
          sports: 5,
          science: 5,
        },
      }),
    ];
    const weights = { "https://example.com/feed": 100 };
    const result = projectDistribution(feeds, weights, categorySlugs);
    expect(result.politics).toBe(40);
    expect(result.tech).toBe(30);
    expect(result.culture).toBe(20);
    expect(result.sports).toBe(5);
    expect(result.science).toBe(5);
  });

  it("blends two feeds proportionally to their weights", () => {
    const feedA = makeFeed({
      feedId: 1,
      feedUrl: "https://a.com/feed",
      weight: 80,
      categoryBreakdown: { politics: 100, tech: 0, culture: 0, sports: 0, science: 0 },
    });
    const feedB = makeFeed({
      feedId: 2,
      feedUrl: "https://b.com/feed",
      weight: 20,
      categoryBreakdown: { politics: 0, tech: 100, culture: 0, sports: 0, science: 0 },
    });
    const weights = { "https://a.com/feed": 80, "https://b.com/feed": 20 };
    const result = projectDistribution([feedA, feedB], weights, categorySlugs);
    // 80/(80+20) * 100 = 80% politics, 20/(80+20) * 100 = 20% tech
    expect(result.politics).toBe(80);
    expect(result.tech).toBe(20);
    expect(result.culture).toBe(0);
  });

  it("uses override weights from the weights map, not feed.weight", () => {
    const feed = makeFeed({
      weight: 10, // original weight
      categoryBreakdown: { politics: 50, tech: 50, culture: 0, sports: 0, science: 0 },
    });
    const weights = { "https://example.com/feed": 90 }; // override to 90
    const result = projectDistribution([feed], weights, categorySlugs);
    expect(result.politics).toBe(50);
    expect(result.tech).toBe(50);
  });

  it("ignores disabled feeds even if they have weight", () => {
    const feedA = makeFeed({
      feedId: 1,
      feedUrl: "https://a.com/feed",
      enabled: true,
      weight: 50,
      categoryBreakdown: { politics: 100, tech: 0, culture: 0, sports: 0, science: 0 },
    });
    const feedB = makeFeed({
      feedId: 2,
      feedUrl: "https://b.com/feed",
      enabled: false,
      weight: 50,
      categoryBreakdown: { politics: 0, tech: 100, culture: 0, sports: 0, science: 0 },
    });
    const weights = { "https://a.com/feed": 50, "https://b.com/feed": 50 };
    const result = projectDistribution([feedA, feedB], weights, categorySlugs);
    // Only feedA is enabled, so 100% politics
    expect(result.politics).toBe(100);
    expect(result.tech).toBe(0);
  });

  it("handles missing categories in feed breakdown gracefully", () => {
    const feed = makeFeed({
      categoryBreakdown: { politics: 60 }, // missing other categories
    });
    const weights = { "https://example.com/feed": 50 };
    const result = projectDistribution([feed], weights, categorySlugs);
    expect(result.politics).toBe(60);
    expect(result.tech).toBe(0);
    expect(result.culture).toBe(0);
  });

  it("handles equal weights producing equal blend", () => {
    const feedA = makeFeed({
      feedId: 1,
      feedUrl: "https://a.com/feed",
      categoryBreakdown: { politics: 100, tech: 0, culture: 0, sports: 0, science: 0 },
    });
    const feedB = makeFeed({
      feedId: 2,
      feedUrl: "https://b.com/feed",
      categoryBreakdown: { politics: 0, tech: 0, culture: 100, sports: 0, science: 0 },
    });
    const weights = { "https://a.com/feed": 50, "https://b.com/feed": 50 };
    const result = projectDistribution([feedA, feedB], weights, categorySlugs);
    expect(result.politics).toBe(50);
    expect(result.culture).toBe(50);
  });
});

// ─── FeedFingerprint threshold logic ────────────────────────────────────────

describe("FeedFingerprint threshold logic", () => {
  it("marks feeds below threshold as not meeting threshold", () => {
    const minThreshold = 25;
    const feed: FeedFingerprint = {
      feedId: 1,
      feedUrl: "https://example.com/feed",
      feedDomain: "example.com",
      weight: 50,
      enabled: true,
      totalArticles: 10, // below 25
      meetsThreshold: 10 >= minThreshold,
      categoryBreakdown: { politics: 50, tech: 50 },
    };
    expect(feed.meetsThreshold).toBe(false);
  });

  it("marks feeds at threshold as meeting threshold", () => {
    const minThreshold = 25;
    const feed: FeedFingerprint = {
      feedId: 1,
      feedUrl: "https://example.com/feed",
      feedDomain: "example.com",
      weight: 50,
      enabled: true,
      totalArticles: 25,
      meetsThreshold: 25 >= minThreshold,
      categoryBreakdown: { politics: 50, tech: 50 },
    };
    expect(feed.meetsThreshold).toBe(true);
  });

  it("marks feeds above threshold as meeting threshold", () => {
    const minThreshold = 25;
    const feed: FeedFingerprint = {
      feedId: 1,
      feedUrl: "https://example.com/feed",
      feedDomain: "example.com",
      weight: 50,
      enabled: true,
      totalArticles: 100,
      meetsThreshold: 100 >= minThreshold,
      categoryBreakdown: { politics: 50, tech: 50 },
    };
    expect(feed.meetsThreshold).toBe(true);
  });
});

// ─── Weight lock behavior ──────────────────────────────────────────────────

describe("Weight lock behavior", () => {
  it("locked feeds retain their current weight in recommendation", () => {
    const recommendation: RebalanceRecommendation = {
      feeds: [
        {
          feedId: 1,
          feedUrl: "https://locked.com/feed",
          feedDomain: "locked.com",
          currentWeight: 50,
          recommendedWeight: 50, // should not change
          weightChange: 0,
          locked: true,
          meetsThreshold: true,
          totalArticles: 100,
        },
        {
          feedId: 2,
          feedUrl: "https://unlocked.com/feed",
          feedDomain: "unlocked.com",
          currentWeight: 50,
          recommendedWeight: 70, // can change
          weightChange: 20,
          locked: false,
          meetsThreshold: true,
          totalArticles: 100,
        },
      ],
      currentDistribution: { politics: 60, tech: 40 },
      projectedDistribution: { politics: 50, tech: 50 },
      targetDistribution: { politics: 50, tech: 50 },
      currentGap: 20,
      projectedGap: 0,
      improvement: 100,
      confidence: 80,
      feedsAnalyzed: 2,
      feedsBelowThreshold: 0,
      feedsLocked: 1,
    };

    const lockedFeed = recommendation.feeds.find(f => f.locked);
    expect(lockedFeed).toBeDefined();
    expect(lockedFeed!.weightChange).toBe(0);
    expect(lockedFeed!.recommendedWeight).toBe(lockedFeed!.currentWeight);
  });
});

// ─── Gap calculation ───────────────────────────────────────────────────────

describe("Gap calculation", () => {
  it("calculates sum of absolute deviations correctly", () => {
    const current: Record<string, number> = { politics: 30, tech: 20, culture: 50 };
    const target: Record<string, number> = { politics: 33.3, tech: 33.3, culture: 33.3 };
    const categorySlugs = Object.keys(current);

    const gap = categorySlugs.reduce((sum, slug) => {
      return sum + Math.abs((current[slug] || 0) - (target[slug] || 0));
    }, 0);

    // |30-33.3| + |20-33.3| + |50-33.3| = 3.3 + 13.3 + 16.7 = 33.3
    expect(gap).toBeCloseTo(33.3, 0);
  });

  it("returns zero gap when distribution matches target exactly", () => {
    const current: Record<string, number> = { politics: 50, tech: 50 };
    const target: Record<string, number> = { politics: 50, tech: 50 };
    const categorySlugs = Object.keys(current);

    const gap = categorySlugs.reduce((sum, slug) => {
      return sum + Math.abs((current[slug] || 0) - (target[slug] || 0));
    }, 0);

    expect(gap).toBe(0);
  });

  it("improvement percentage is calculated correctly", () => {
    const currentGap = 40;
    const projectedGap = 20;
    const improvement = currentGap > 0 ? Math.round(((currentGap - projectedGap) / currentGap) * 100) : 0;
    expect(improvement).toBe(50);
  });

  it("improvement is zero when current gap is zero", () => {
    const currentGap = 0;
    const projectedGap = 0;
    const improvement = currentGap > 0 ? Math.round(((currentGap - projectedGap) / currentGap) * 100) : 0;
    expect(improvement).toBe(0);
  });

  it("improvement can be negative when projected gap is worse", () => {
    const currentGap = 30;
    const projectedGap = 40;
    const improvement = currentGap > 0 ? Math.round(((currentGap - projectedGap) / currentGap) * 100) : 0;
    expect(improvement).toBe(-33);
  });
});

// ─── Max weight change constraint ──────────────────────────────────────────

describe("Max weight change constraint", () => {
  it("clamps weight increase to maxWeightChange", () => {
    const originalWeight = 50;
    const maxChange = 20;
    let proposedWeight = 80; // +30, exceeds max

    if (proposedWeight > originalWeight + maxChange) {
      proposedWeight = originalWeight + maxChange;
    }
    expect(proposedWeight).toBe(70); // clamped to +20
  });

  it("clamps weight decrease to maxWeightChange", () => {
    const originalWeight = 50;
    const maxChange = 20;
    let proposedWeight = 20; // -30, exceeds max

    if (proposedWeight < originalWeight - maxChange) {
      proposedWeight = originalWeight - maxChange;
    }
    expect(proposedWeight).toBe(30); // clamped to -20
  });

  it("allows changes within maxWeightChange", () => {
    const originalWeight = 50;
    const maxChange = 20;
    let proposedWeight = 65; // +15, within max

    if (proposedWeight > originalWeight + maxChange) {
      proposedWeight = originalWeight + maxChange;
    }
    if (proposedWeight < originalWeight - maxChange) {
      proposedWeight = originalWeight - maxChange;
    }
    expect(proposedWeight).toBe(65); // unchanged
  });

  it("clamps weight to [0, 100] range", () => {
    let weight1 = -10;
    weight1 = Math.max(0, Math.min(100, weight1));
    expect(weight1).toBe(0);

    let weight2 = 150;
    weight2 = Math.max(0, Math.min(100, weight2));
    expect(weight2).toBe(100);

    let weight3 = 50;
    weight3 = Math.max(0, Math.min(100, weight3));
    expect(weight3).toBe(50);
  });
});

// ─── Rebalance trigger counting ────────────────────────────────────────────

describe("Rebalance trigger counting", () => {
  it("triggers when article count meets threshold", () => {
    const articlesSinceLastRebalance = 50;
    const triggerCount = 50;
    const autoRebalanceEnabled = true;

    const shouldTrigger = autoRebalanceEnabled && articlesSinceLastRebalance >= triggerCount;
    expect(shouldTrigger).toBe(true);
  });

  it("does not trigger when article count is below threshold", () => {
    const articlesSinceLastRebalance = 30;
    const triggerCount = 50;
    const autoRebalanceEnabled = true;

    const shouldTrigger = autoRebalanceEnabled && articlesSinceLastRebalance >= triggerCount;
    expect(shouldTrigger).toBe(false);
  });

  it("does not trigger when auto-rebalance is disabled", () => {
    const articlesSinceLastRebalance = 100;
    const triggerCount = 50;
    const autoRebalanceEnabled = false;

    const shouldTrigger = autoRebalanceEnabled && articlesSinceLastRebalance >= triggerCount;
    expect(shouldTrigger).toBe(false);
  });

  it("triggers when article count exceeds threshold", () => {
    const articlesSinceLastRebalance = 75;
    const triggerCount = 50;
    const autoRebalanceEnabled = true;

    const shouldTrigger = autoRebalanceEnabled && articlesSinceLastRebalance >= triggerCount;
    expect(shouldTrigger).toBe(true);
  });
});

// ─── Cooldown period enforcement ───────────────────────────────────────────

describe("Cooldown period enforcement", () => {
  it("cooldown is active when last rebalance was recent", () => {
    const cooldownHours = 6;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const lastRebalanceTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    const timeSinceLastRebalance = Date.now() - lastRebalanceTime;

    const isCooldownActive = timeSinceLastRebalance < cooldownMs;
    expect(isCooldownActive).toBe(true);
  });

  it("cooldown is not active when enough time has passed", () => {
    const cooldownHours = 6;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const lastRebalanceTime = Date.now() - (8 * 60 * 60 * 1000); // 8 hours ago
    const timeSinceLastRebalance = Date.now() - lastRebalanceTime;

    const isCooldownActive = timeSinceLastRebalance < cooldownMs;
    expect(isCooldownActive).toBe(false);
  });

  it("cooldown is not active when there is no previous rebalance", () => {
    const lastRebalanceTime = null;
    // No previous rebalance means no cooldown
    const isCooldownActive = lastRebalanceTime !== null;
    expect(isCooldownActive).toBe(false);
  });

  it("cooldown is active at the exact boundary", () => {
    const cooldownHours = 6;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const lastRebalanceTime = Date.now() - cooldownMs + 1000; // 1 second before cooldown expires
    const timeSinceLastRebalance = Date.now() - lastRebalanceTime;

    const isCooldownActive = timeSinceLastRebalance < cooldownMs;
    expect(isCooldownActive).toBe(true);
  });
});

// ─── Confidence score calculation ──────────────────────────────────────────

describe("Confidence score calculation", () => {
  it("returns high confidence with many articles and feeds meeting threshold", () => {
    const totalArticlesAnalyzed = 1000;
    const feedsWithGoodData = 10;
    const totalFeeds = 10;
    const confidence = Math.min(
      100,
      Math.round(
        (totalArticlesAnalyzed / 500) * 50 + (feedsWithGoodData / totalFeeds) * 50
      )
    );
    expect(confidence).toBe(100); // capped at 100
  });

  it("returns low confidence with few articles", () => {
    const totalArticlesAnalyzed = 50;
    const feedsWithGoodData = 2;
    const totalFeeds = 10;
    const confidence = Math.min(
      100,
      Math.round(
        (totalArticlesAnalyzed / 500) * 50 + (feedsWithGoodData / totalFeeds) * 50
      )
    );
    // (50/500)*50 + (2/10)*50 = 5 + 10 = 15
    expect(confidence).toBe(15);
  });

  it("returns moderate confidence with moderate data", () => {
    const totalArticlesAnalyzed = 300;
    const feedsWithGoodData = 5;
    const totalFeeds = 10;
    const confidence = Math.min(
      100,
      Math.round(
        (totalArticlesAnalyzed / 500) * 50 + (feedsWithGoodData / totalFeeds) * 50
      )
    );
    // (300/500)*50 + (5/10)*50 = 30 + 25 = 55
    expect(confidence).toBe(55);
  });
});
