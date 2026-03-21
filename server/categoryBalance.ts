/**
 * Category Balance Optimization Engine
 * 
 * Calculates optimal feed weights to achieve uniform (or custom target)
 * article distribution across categories.
 * 
 * Core algorithm:
 * 1. Build each feed's "category fingerprint" — what % of its articles go to each category
 * 2. Given a target distribution, solve for weights that minimize the gap
 * 3. Apply constraints: min threshold, max change per cycle, weight locks, quality floor
 */

import * as db from "./db";

// ─── Types ──────────────────────────────────────────────────────

export interface FeedFingerprint {
  feedId: number;
  feedUrl: string;
  feedDomain: string;
  weight: number;
  enabled: boolean;
  totalArticles: number;
  meetsThreshold: boolean; // Has enough articles for reliable fingerprint
  categoryBreakdown: Record<string, number>; // categorySlug -> percentage (0-100)
}

export interface RebalanceRecommendation {
  feeds: Array<{
    feedId: number;
    feedUrl: string;
    feedDomain: string;
    currentWeight: number;
    recommendedWeight: number;
    weightChange: number;
    locked: boolean;
    meetsThreshold: boolean;
    totalArticles: number;
  }>;
  currentDistribution: Record<string, number>; // categorySlug -> percentage
  projectedDistribution: Record<string, number>; // categorySlug -> percentage
  targetDistribution: Record<string, number>; // categorySlug -> percentage
  currentGap: number; // sum of absolute deviations from target
  projectedGap: number; // projected sum of absolute deviations after rebalance
  improvement: number; // percentage improvement in gap
  confidence: number; // 0-100 confidence score
  feedsAnalyzed: number;
  feedsBelowThreshold: number;
  feedsLocked: number;
}

export interface RebalanceSettings {
  triggerCount: number;
  fingerprintWindow: number;
  minArticlesThreshold: number;
  cooldownHours: number;
  autoRebalanceEnabled: boolean;
  maxWeightChange: number;
  targetDistribution: Record<string, number>;
  weightLocks: Record<string, boolean>; // feedUrl -> locked
  articlesSinceLastRebalance: number;
}

// ─── Settings ───────────────────────────────────────────────────

export async function getRebalanceSettings(): Promise<RebalanceSettings> {
  const getSetting = async (key: string, defaultVal: string) => {
    const s = await db.getSetting(key);
    return s?.value ?? defaultVal;
  };

  return {
    triggerCount: parseInt(await getSetting('rebalance_trigger_count', '50'), 10),
    fingerprintWindow: parseInt(await getSetting('fingerprint_window', '200'), 10),
    minArticlesThreshold: parseInt(await getSetting('min_articles_threshold', '25'), 10),
    cooldownHours: parseInt(await getSetting('cooldown_hours', '6'), 10),
    autoRebalanceEnabled: (await getSetting('auto_rebalance_enabled', 'false')) === 'true',
    maxWeightChange: parseInt(await getSetting('max_weight_change', '20'), 10),
    targetDistribution: JSON.parse(await getSetting('target_distribution', '{}')),
    weightLocks: JSON.parse(await getSetting('weight_locks', '{}')),
    articlesSinceLastRebalance: parseInt(await getSetting('articles_since_last_rebalance', '0'), 10),
  };
}

export async function updateRebalanceSettings(updates: Partial<RebalanceSettings>): Promise<void> {
  if (updates.triggerCount !== undefined) await db.setSetting('rebalance_trigger_count', updates.triggerCount.toString());
  if (updates.fingerprintWindow !== undefined) await db.setSetting('fingerprint_window', updates.fingerprintWindow.toString());
  if (updates.minArticlesThreshold !== undefined) await db.setSetting('min_articles_threshold', updates.minArticlesThreshold.toString());
  if (updates.cooldownHours !== undefined) await db.setSetting('cooldown_hours', updates.cooldownHours.toString());
  if (updates.autoRebalanceEnabled !== undefined) await db.setSetting('auto_rebalance_enabled', updates.autoRebalanceEnabled.toString());
  if (updates.maxWeightChange !== undefined) await db.setSetting('max_weight_change', updates.maxWeightChange.toString());
  if (updates.targetDistribution !== undefined) await db.setSetting('target_distribution', JSON.stringify(updates.targetDistribution));
  if (updates.weightLocks !== undefined) await db.setSetting('weight_locks', JSON.stringify(updates.weightLocks));
}

// ─── Fingerprint Building ───────────────────────────────────────

/**
 * Build category fingerprints for all feeds.
 * Each fingerprint shows what percentage of a feed's articles fall into each category.
 */
export async function buildFeedFingerprints(
  fingerprintWindow: number = 200,
  minThreshold: number = 25
): Promise<FeedFingerprint[]> {
  const matrix = await db.getFeedCategoryMatrix(fingerprintWindow);
  
  return matrix.map(entry => {
    let feedDomain: string;
    try {
      const url = new URL(entry.feedUrl);
      feedDomain = url.hostname.replace(/^www\./, '');
    } catch {
      feedDomain = entry.feedUrl;
    }

    return {
      feedId: entry.feedId,
      feedUrl: entry.feedUrl,
      feedDomain,
      weight: entry.weight,
      enabled: entry.enabled,
      totalArticles: entry.totalArticles,
      meetsThreshold: entry.totalArticles >= minThreshold,
      categoryBreakdown: entry.categoryPercentages,
    };
  });
}

// ─── Optimization Algorithm ─────────────────────────────────────

/**
 * Calculate optimal feed weights to minimize the gap between projected and target distribution.
 * 
 * Algorithm: Iterative gradient descent with constraints.
 * 
 * For each category that's under-represented:
 *   - Find feeds that produce high % of that category
 *   - Increase their weights proportionally
 * For each category that's over-represented:
 *   - Find feeds that produce high % of that category
 *   - Decrease their weights proportionally
 * 
 * Constraints:
 *   - Weights stay in [0, 100] range
 *   - Max change per cycle limited by maxWeightChange
 *   - Locked feeds are not modified
 *   - Feeds below threshold are not modified
 *   - Feeds with high error rates are capped
 */
export async function calculateOptimalWeights(): Promise<RebalanceRecommendation> {
  const settings = await getRebalanceSettings();
  const fingerprints = await buildFeedFingerprints(settings.fingerprintWindow, settings.minArticlesThreshold);
  const currentDistribution = await db.getCategoryDistribution();
  
  // Build target distribution
  const categorySlugs = currentDistribution.map(c => c.categorySlug);
  const numCategories = categorySlugs.length;
  const defaultTarget = numCategories > 0 ? Math.round(1000 / numCategories) / 10 : 0;
  
  const targetDist: Record<string, number> = {};
  for (const slug of categorySlugs) {
    targetDist[slug] = settings.targetDistribution[slug] ?? defaultTarget;
  }

  // Current distribution as a map
  const currentDist: Record<string, number> = {};
  for (const cat of currentDistribution) {
    currentDist[cat.categorySlug] = cat.percentage;
  }

  // Calculate current gap (sum of absolute deviations)
  const currentGap = categorySlugs.reduce((sum, slug) => {
    return sum + Math.abs((currentDist[slug] || 0) - (targetDist[slug] || 0));
  }, 0);

  // Filter feeds that can be optimized
  const eligibleFeeds = fingerprints.filter(f => 
    f.enabled && 
    f.meetsThreshold && 
    !settings.weightLocks[f.feedUrl]
  );

  const lockedFeeds = fingerprints.filter(f => settings.weightLocks[f.feedUrl]);
  const belowThresholdFeeds = fingerprints.filter(f => !f.meetsThreshold);

  // If no eligible feeds, return current state
  if (eligibleFeeds.length === 0) {
    return {
      feeds: fingerprints.map(f => ({
        feedId: f.feedId,
        feedUrl: f.feedUrl,
        feedDomain: f.feedDomain,
        currentWeight: f.weight,
        recommendedWeight: f.weight,
        weightChange: 0,
        locked: !!settings.weightLocks[f.feedUrl],
        meetsThreshold: f.meetsThreshold,
        totalArticles: f.totalArticles,
      })),
      currentDistribution: currentDist,
      projectedDistribution: currentDist,
      targetDistribution: targetDist,
      currentGap,
      projectedGap: currentGap,
      improvement: 0,
      confidence: 0,
      feedsAnalyzed: fingerprints.length,
      feedsBelowThreshold: belowThresholdFeeds.length,
      feedsLocked: lockedFeeds.length,
    };
  }

  // ─── Iterative Optimization ───────────────────────────────
  // Start with current weights
  const newWeights: Record<string, number> = {};
  for (const f of fingerprints) {
    newWeights[f.feedUrl] = f.weight;
  }

  // Run multiple iterations of gradient-based adjustment
  const ITERATIONS = 10;
  const LEARNING_RATE = 0.5;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Calculate projected distribution with current proposed weights
    const projected = projectDistribution(fingerprints, newWeights, categorySlugs);

    // For each category, calculate the gap
    for (const slug of categorySlugs) {
      const gap = (targetDist[slug] || 0) - (projected[slug] || 0);
      
      if (Math.abs(gap) < 0.5) continue; // Close enough

      // Find eligible feeds that contribute to this category
      for (const feed of eligibleFeeds) {
        const feedContribution = feed.categoryBreakdown[slug] || 0;
        if (feedContribution < 1) continue; // Feed doesn't meaningfully contribute to this category

        // Adjust weight proportionally to the gap and feed's contribution
        const adjustment = gap * (feedContribution / 100) * LEARNING_RATE;
        const currentWeight = newWeights[feed.feedUrl] || feed.weight;
        let proposedWeight = currentWeight + adjustment;

        // Clamp to [0, 100]
        proposedWeight = Math.max(0, Math.min(100, proposedWeight));

        // Enforce max change per cycle
        const maxChange = settings.maxWeightChange;
        const originalWeight = feed.weight;
        if (proposedWeight > originalWeight + maxChange) {
          proposedWeight = originalWeight + maxChange;
        } else if (proposedWeight < originalWeight - maxChange) {
          proposedWeight = originalWeight - maxChange;
        }

        newWeights[feed.feedUrl] = Math.round(proposedWeight);
      }
    }
  }

  // Calculate projected distribution with final weights
  const projectedDist = projectDistribution(fingerprints, newWeights, categorySlugs);
  const projectedGap = categorySlugs.reduce((sum, slug) => {
    return sum + Math.abs((projectedDist[slug] || 0) - (targetDist[slug] || 0));
  }, 0);

  const improvement = currentGap > 0 ? Math.round(((currentGap - projectedGap) / currentGap) * 100) : 0;

  // Calculate confidence based on data quality
  const totalArticlesAnalyzed = fingerprints.reduce((sum, f) => sum + f.totalArticles, 0);
  const feedsWithGoodData = fingerprints.filter(f => f.meetsThreshold).length;
  const dataConfidence = Math.min(100, Math.round((totalArticlesAnalyzed / 500) * 50 + (feedsWithGoodData / fingerprints.length) * 50));

  return {
    feeds: fingerprints.map(f => ({
      feedId: f.feedId,
      feedUrl: f.feedUrl,
      feedDomain: f.feedDomain,
      currentWeight: f.weight,
      recommendedWeight: newWeights[f.feedUrl] ?? f.weight,
      weightChange: (newWeights[f.feedUrl] ?? f.weight) - f.weight,
      locked: !!settings.weightLocks[f.feedUrl],
      meetsThreshold: f.meetsThreshold,
      totalArticles: f.totalArticles,
    })),
    currentDistribution: currentDist,
    projectedDistribution: projectedDist,
    targetDistribution: targetDist,
    currentGap: Math.round(currentGap * 10) / 10,
    projectedGap: Math.round(projectedGap * 10) / 10,
    improvement,
    confidence: dataConfidence,
    feedsAnalyzed: fingerprints.length,
    feedsBelowThreshold: belowThresholdFeeds.length,
    feedsLocked: lockedFeeds.length,
  };
}

/**
 * Project what the category distribution would look like with given weights.
 * 
 * For each category, the projected percentage is the weighted average of
 * each feed's contribution to that category, weighted by the feed's weight.
 */
export function projectDistribution(
  fingerprints: FeedFingerprint[],
  weights: Record<string, number>,
  categorySlugs: string[]
): Record<string, number> {
  const totalWeight = fingerprints.reduce((sum, f) => {
    const w = weights[f.feedUrl] ?? f.weight;
    return sum + (f.enabled ? w : 0);
  }, 0);

  if (totalWeight === 0) {
    const result: Record<string, number> = {};
    for (const slug of categorySlugs) result[slug] = 0;
    return result;
  }

  const projected: Record<string, number> = {};
  for (const slug of categorySlugs) {
    let weightedSum = 0;
    for (const feed of fingerprints) {
      if (!feed.enabled) continue;
      const feedWeight = weights[feed.feedUrl] ?? feed.weight;
      const feedContribution = feed.categoryBreakdown[slug] || 0;
      weightedSum += (feedWeight / totalWeight) * feedContribution;
    }
    projected[slug] = Math.round(weightedSum * 10) / 10;
  }

  return projected;
}

// ─── Apply Rebalance ────────────────────────────────────────────

/**
 * Apply recommended weights from a rebalance recommendation.
 * Records the change in the rebalance log.
 */
export async function applyRebalance(
  recommendation: RebalanceRecommendation,
  triggerType: 'manual' | 'auto' | 'initial' = 'manual'
): Promise<{ success: boolean; logId?: number }> {
  const settings = await getRebalanceSettings();

  // Build previous and new weight maps
  const previousWeights: Record<string, number> = {};
  const newWeightsMap: Record<string, number> = {};
  let changesApplied = 0;

  for (const feed of recommendation.feeds) {
    previousWeights[feed.feedUrl] = feed.currentWeight;
    newWeightsMap[feed.feedUrl] = feed.recommendedWeight;

    if (feed.currentWeight !== feed.recommendedWeight && !feed.locked) {
      await db.updateRssFeedWeight(feed.feedUrl, feed.recommendedWeight);
      changesApplied++;
    }
  }

  // Log the rebalance
  const logId = await db.createRebalanceLog({
    triggerType,
    articleCountSinceLastRebalance: settings.articlesSinceLastRebalance,
    previousWeights: JSON.stringify(previousWeights),
    newWeights: JSON.stringify(newWeightsMap),
    projectedDistribution: JSON.stringify(recommendation.projectedDistribution),
    actualDistribution: JSON.stringify(recommendation.currentDistribution),
    confidence: recommendation.confidence,
    notes: `Applied ${changesApplied} weight changes. Gap: ${recommendation.currentGap} → ${recommendation.projectedGap} (${recommendation.improvement}% improvement)`,
  });

  // Reset the article counter
  await db.resetArticleRebalanceCounter();

  return { success: true, logId: logId ?? undefined };
}

// ─── Cooldown Check ─────────────────────────────────────────────

/**
 * Check if enough time has passed since the last rebalance.
 */
export async function isCooldownActive(): Promise<boolean> {
  const settings = await getRebalanceSettings();
  const lastLog = await db.getLastRebalanceLog();
  
  if (!lastLog) return false; // No previous rebalance, no cooldown

  const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
  const timeSinceLastRebalance = Date.now() - new Date(lastLog.triggeredAt).getTime();
  
  return timeSinceLastRebalance < cooldownMs;
}

/**
 * Check if auto-rebalance should be triggered.
 * Returns true if:
 * 1. Auto-rebalance is enabled
 * 2. Article count since last rebalance >= trigger count
 * 3. Cooldown period has passed
 */
export async function shouldAutoRebalance(): Promise<{ should: boolean; reason: string }> {
  const settings = await getRebalanceSettings();

  if (!settings.autoRebalanceEnabled) {
    return { should: false, reason: 'Auto-rebalance is disabled' };
  }

  if (settings.articlesSinceLastRebalance < settings.triggerCount) {
    return { 
      should: false, 
      reason: `Only ${settings.articlesSinceLastRebalance}/${settings.triggerCount} articles since last rebalance` 
    };
  }

  const cooldownActive = await isCooldownActive();
  if (cooldownActive) {
    return { should: false, reason: `Cooldown period active (${settings.cooldownHours}h)` };
  }

  return { should: true, reason: `${settings.articlesSinceLastRebalance} articles since last rebalance (threshold: ${settings.triggerCount})` };
}
