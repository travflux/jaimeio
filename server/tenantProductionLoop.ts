/**
 * tenantProductionLoop.ts — Per-tenant pool-drain production loop.
 *
 * Reads config from license_settings. Drains high-potential candidates first,
 * then medium. Daily safety cap prevents runaway costs.
 */

import { getDb, getLicenseSetting, getLLMProvider } from "./db";
import { selectorCandidates, articles } from "../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

interface LoopConfig {
  enabled: boolean;
  maxBatchHigh: number;
  maxBatchMedium: number;
  maxDailyArticles: number;
  minScore: number;
}

async function getLoopConfig(licenseId: number): Promise<LoopConfig> {
  const get = async (key: string, fallback: string) => {
    const v = await getLicenseSetting(licenseId, key);
    return v?.value ?? fallback;
  };
  const [enabled, maxHigh, maxMedium, maxDaily, minScore] = await Promise.all([
    get("production_loop_enabled", "true"),
    get("max_batch_high", "3"),
    get("max_batch_medium", "1"),
    get("max_daily_articles", "10"),
    get("min_score_to_publish", "0.40"),
  ]);
  return {
    enabled: enabled !== "false",
    maxBatchHigh: parseInt(maxHigh),
    maxBatchMedium: parseInt(maxMedium),
    maxDailyArticles: parseInt(maxDaily),
    minScore: parseFloat(minScore),
  };
}

async function getArticlesGeneratedToday(licenseId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articles)
    .where(and(eq(articles.licenseId, licenseId), gte(articles.createdAt, today)));
  return result?.count ?? 0;
}

async function getCandidatesByPotential(licenseId: number, potential: string, limit: number, minScore: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(selectorCandidates)
    .where(and(
      eq(selectorCandidates.licenseId, licenseId),
      eq(selectorCandidates.status, "pending"),
      eq(selectorCandidates.articlePotential, potential),
      gte(selectorCandidates.score, minScore),
    ))
    .orderBy(desc(selectorCandidates.score))
    .limit(limit);
}

// Per-tenant state
const loopState = new Map<number, {
  isRunning: boolean;
  lastRunAt: Date | null;
  lastRunArticles: number;
  totalToday: number;
}>();

export function getTenantProductionLoopStatus(licenseId: number) {
  return loopState.get(licenseId) ?? { isRunning: false, lastRunAt: null, lastRunArticles: 0, totalToday: 0 };
}

export async function runTenantProductionLoopTick(licenseId: number): Promise<{
  articlesGenerated: number;
  candidatesProcessed: number;
  stoppedReason: string;
}> {
  const state = loopState.get(licenseId) ?? { isRunning: false, lastRunAt: null, lastRunArticles: 0, totalToday: 0 };
  if (state.isRunning) return { articlesGenerated: 0, candidatesProcessed: 0, stoppedReason: "already_running" };

  // Check setup_complete gate
  const setupSetting = await getLicenseSetting(licenseId, "setup_complete");
  if (setupSetting?.value !== "true") {
    return { articlesGenerated: 0, candidatesProcessed: 0, stoppedReason: "setup_not_complete" };
  }

  // Check workflow_enabled — tenant can pause via portal
  const workflowSetting = await getLicenseSetting(licenseId, "workflow_enabled");
  if (workflowSetting?.value === "false") {
    return { articlesGenerated: 0, candidatesProcessed: 0, stoppedReason: "workflow_paused" };
  }

  const config = await getLoopConfig(licenseId);
  if (!config.enabled) return { articlesGenerated: 0, candidatesProcessed: 0, stoppedReason: "disabled" };

  const todayCount = await getArticlesGeneratedToday(licenseId);
  if (todayCount >= config.maxDailyArticles) {
    return { articlesGenerated: 0, candidatesProcessed: 0, stoppedReason: "daily_cap (" + todayCount + "/" + config.maxDailyArticles + ")" };
  }

  loopState.set(licenseId, { ...state, isRunning: true });
  let articlesGenerated = 0;
  let candidatesProcessed = 0;
  const remaining = config.maxDailyArticles - todayCount;

  try {
    // Drain high-potential first
    const highCandidates = await getCandidatesByPotential(licenseId, "high", Math.min(config.maxBatchHigh, remaining), config.minScore);
    for (const candidate of highCandidates) {
      if (articlesGenerated >= remaining) break;
      try {
        console.log("[TenantLoop] license " + licenseId + " — generating from high candidate " + candidate.id);
        const { generateFromCandidateInternal } = await import("./workflow");
        if (typeof generateFromCandidateInternal === "function") {
          await generateFromCandidateInternal(candidate.id, licenseId);
        } else {
          // Fallback: use the routers.ts generateFromCandidate inline logic
          const db = await getDb();
          if (!db) continue;
          const { generateSatiricalArticle } = await import("./workflow");
          const event = { title: candidate.title, summary: candidate.summary || "", sourceUrl: candidate.sourceUrl || "" };
          const writingStyle = (await getLicenseSetting(licenseId, "writing_style"))?.value || "Write in a professional editorial style.";
          const targetWords = parseInt((await getLicenseSetting(licenseId, "target_article_length"))?.value || "800");
          const article = await generateSatiricalArticle(event as any, writingStyle, targetWords);
          const slugify = (await import("slugify")).default;
          const slug = slugify(article.headline || "untitled", { lower: true, strict: true }).slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
          let body = article.body || "";
          if (!body.trim().startsWith("<")) body = body.split("\n\n").filter((p: string) => p.trim()).map((p: string) => "<p>" + p.trim() + "</p>").join("");
          const { createArticle } = await import("./db");
          const articleId = await createArticle({ headline: article.headline || "Untitled", subheadline: article.subheadline || "", body, slug, status: "pending", licenseId, sourceEvent: candidate.title, sourceUrl: candidate.sourceUrl } as any);
          await db.execute(sql.raw("UPDATE selector_candidates SET status = 'selected', article_id = " + articleId + " WHERE id = " + candidate.id));
        }
        articlesGenerated++;
        candidatesProcessed++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error("[TenantLoop] Failed for candidate " + candidate.id + ":", err);
        candidatesProcessed++;
      }
    }

    // Drain medium-potential if budget left
    if (articlesGenerated < remaining) {
      const mediumCandidates = await getCandidatesByPotential(licenseId, "medium", Math.min(config.maxBatchMedium, remaining - articlesGenerated), config.minScore);
      for (const candidate of mediumCandidates) {
        if (articlesGenerated >= remaining) break;
        try {
          console.log("[TenantLoop] license " + licenseId + " — generating from medium candidate " + candidate.id);
          const db = await getDb();
          if (!db) continue;
          const { generateSatiricalArticle } = await import("./workflow");
          const event = { title: candidate.title, summary: candidate.summary || "", sourceUrl: candidate.sourceUrl || "" };
          const writingStyle = (await getLicenseSetting(licenseId, "writing_style"))?.value || "Write in a professional editorial style.";
          const targetWords = parseInt((await getLicenseSetting(licenseId, "target_article_length"))?.value || "800");
          const article = await generateSatiricalArticle(event as any, writingStyle, targetWords);
          const slugify = (await import("slugify")).default;
          const slug = slugify(article.headline || "untitled", { lower: true, strict: true }).slice(0, 80) + "-" + Math.random().toString(36).slice(2, 7);
          let body = article.body || "";
          if (!body.trim().startsWith("<")) body = body.split("\n\n").filter((p: string) => p.trim()).map((p: string) => "<p>" + p.trim() + "</p>").join("");
          const { createArticle } = await import("./db");
          await createArticle({ headline: article.headline || "Untitled", subheadline: article.subheadline || "", body, slug, status: "pending", licenseId, sourceEvent: candidate.title, sourceUrl: candidate.sourceUrl } as any);
          await db.execute(sql.raw("UPDATE selector_candidates SET status = 'selected' WHERE id = " + candidate.id));
          articlesGenerated++;
          candidatesProcessed++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error("[TenantLoop] Failed for candidate " + candidate.id + ":", err);
          candidatesProcessed++;
        }
      }
    }

    const stoppedReason = articlesGenerated === 0 ? "no_candidates" : "batch_complete";
    loopState.set(licenseId, { isRunning: false, lastRunAt: new Date(), lastRunArticles: articlesGenerated, totalToday: todayCount + articlesGenerated });
    console.log("[TenantLoop] license " + licenseId + " — " + articlesGenerated + " articles generated");
    return { articlesGenerated, candidatesProcessed, stoppedReason };
  } catch (err) {
    loopState.set(licenseId, { ...state, isRunning: false });
    throw err;
  }
}
