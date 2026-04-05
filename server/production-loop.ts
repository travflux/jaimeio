/**
 * Production Loop — v4.5.1 Pool-Drain Model
 *
 * Runs at a configurable interval (default 15 min). Drains the high-potential
 * candidate pool first, then medium. Stops when the pool is empty or the
 * daily safety cap is hit (max_daily_articles, default 500).
 *
 * There is NO daily target / gap logic. The gas pedal is the candidate pool.
 * The safety cap is the emergency brake (prevents runaway costs).
 *
 * Settings consumed:
 *   production_loop_enabled      — master on/off switch (default: true)
 *   production_mode              — legacy | continuous | hybrid (default: hybrid)
 *   production_interval_minutes  — minutes between runs (default: 15)
 *   max_batch_high               — max articles per run from high pool (default: 25)
 *   max_batch_medium             — max articles per run from medium pool (default: 10)
 *   max_daily_articles           — safety cap: hard daily limit (default: 500)
 *   min_score_to_publish         — min candidate score to use (default: 0.40)
 *   workflow_enabled             — if false, loop also skips
 *
 * White-label compatible: no hardcoded brand names. All config via DB settings.
 */
import cron from "node-cron";
import slugify from "slugify";
import * as db from "./db";
import { invokeLLMWithFallback as invokeLLM } from "./_core/llmRouter";
import { generateImage } from "./_core/imageGeneration";
import { buildImagePrompt } from "./imagePromptBuilder";
import { buildSystemPrompt } from "./workflow";
import { generateSocialPosts } from "./workflow";
import { scoreUnscoredCandidates } from "./candidate-scoring";
import {
  markCandidatesSelected,
  linkCandidateToArticle,
} from "./sources/rss-bridge";
import { eq, and, desc, gt, isNotNull, sql as drizzleSql } from "drizzle-orm";
import { selectorCandidates, articles } from "../drizzle/schema";
import { WRITING_STYLES, getRandomStyleFromCategory } from "../shared/writingStyles";

// ─── State ───────────────────────────────────────────────────────────────────
let _loopTask: ReturnType<typeof cron.schedule> | null = null;
let _isRunning = false;
let _lastLoopResult: { time: string; articlesGenerated: number; message: string } | null = null;
let _loopRunCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

async function getSettingFloat(key: string, defaultVal: number): Promise<number> {
  const s = await db.getSetting(key);
  if (s?.value) {
    const n = parseFloat(s.value);
    if (!isNaN(n)) return n;
  }
  return defaultVal;
}

async function getSettingBool(key: string, defaultVal: boolean): Promise<boolean> {
  const s = await db.getSetting(key);
  if (s?.value) return ["true", "1", "yes"].includes(s.value.toLowerCase());
  return defaultVal;
}

/** Count articles created today (any status) using batchDate. */
async function countArticlesToday(today: string): Promise<number> {
  const dbConn = await db.getDb();
  if (!dbConn) return 0;
  const rows = await dbConn
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.batchDate, today));
  return rows.length;
}

/**
 * Fetch pending candidates filtered by articlePotential and minimum score.
 * Orders by score DESC (ISNULL for MySQL/TiDB compat) so best candidates come first.
 */
async function getCandidatesByPotential(
  potential: "high" | "medium",
  limit: number,
  minScore: number
): Promise<Array<{
  id: number;
  title: string;
  summary: string | null;
  sourceName: string;
  sourceUrl: string | null;
  publishedDate: string | null;
  feedSourceId: number | null;
  score: number | null;
}>> {
  const dbConn = await db.getDb();
  if (!dbConn) return [];
  const rows = await dbConn
    .select({
      id: selectorCandidates.id,
      title: selectorCandidates.title,
      summary: selectorCandidates.summary,
      sourceName: selectorCandidates.sourceName,
      sourceUrl: selectorCandidates.sourceUrl,
      publishedDate: selectorCandidates.publishedDate,
      feedSourceId: selectorCandidates.feedSourceId,
      score: selectorCandidates.score,
    })
    .from(selectorCandidates)
    .where(
      and(
        eq(selectorCandidates.status, "pending"),
        gt(selectorCandidates.expiresAt, new Date()),
        eq(selectorCandidates.articlePotential, potential),
        isNotNull(selectorCandidates.score)
      )
    )
    .orderBy(drizzleSql`ISNULL(${selectorCandidates.score})`, desc(selectorCandidates.score))
    .limit(limit * 3); // Fetch extra so we can filter by minScore in JS
  // Filter by minScore in JS (Drizzle ORM doesn't support gte on nullable float cleanly)
  return rows.filter(r => r.score !== null && r.score >= minScore).slice(0, limit);
}

/** Build the style prompt for article generation (same logic as workflow.ts). */
async function buildStylePrompt(): Promise<string> {
  const writingStylePrompt = await getSettingValue("writing_style_prompt", "");
  if (writingStylePrompt) return writingStylePrompt;

  const styleName = await getSettingValue("ai_writing_style", "onion");
  const additionalInstructions = await getSettingValue("ai_custom_prompt", "");

  let stylePrompt: string;
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

  if (additionalInstructions) {
    stylePrompt = `${stylePrompt}\n\nAdditional instructions: ${additionalInstructions}`;
  }
  return stylePrompt;
}

/** Generate a single article from a candidate. Returns null on failure. */
async function generateArticleFromCandidate(
  candidate: { id: number; title: string; summary: string | null; sourceName: string; sourceUrl: string | null },
  stylePrompt: string,
  targetWords: number
): Promise<{ headline: string; subheadline: string; body: string; slug: string; categoryId: number | null; sourceUrl: string | null; feedSourceId: number | null } | null> {
  const overrideSetting = await db.getSetting("article_llm_system_prompt");
  const lengthInstruction = `Target approximately ${targetWords} words for the article body.`;
  const systemPrompt = overrideSetting?.value
    ? overrideSetting.value
        .replace("{{STYLE}}", stylePrompt)
        .replace("{{LENGTH_INSTRUCTION}}", lengthInstruction)
        .replace("{STYLE}", stylePrompt)
        .replace("{LENGTH_INSTRUCTION}", lengthInstruction)
        .replace("{targetWords}", String(targetWords))
        .replace("{{targetWords}}", String(targetWords))
    : `${buildSystemPrompt(targetWords)}\n\n${stylePrompt}`;

  const userMsgSetting = await db.getSetting("article_llm_user_prompt");
  const defaultUserMsg = `Write a new article based on this real news event:\n\nHEADLINE: ${candidate.title}\nSUMMARY: ${candidate.summary || "No summary available"}\nSOURCE: ${candidate.sourceName}\n\nReturn your response as a JSON object with these fields:\n- "headline": A compelling headline (different from the original)\n- "subheadline": A subheadline or deck (one sentence)\n- "body": The full article (approximately ${targetWords} words, in plain text with paragraph breaks using \\n\\n)\n\nReturn ONLY the JSON object, no other text.`;

  const userMessage = userMsgSetting?.value
    ? userMsgSetting.value
        .replace("{{HEADLINE}}", candidate.title)
        .replace("{HEADLINE}", candidate.title)
        .replace("{{SUMMARY}}", candidate.summary || "No summary available")
        .replace("{SUMMARY}", candidate.summary || "No summary available")
        .replace("{{SOURCE}}", candidate.sourceName)
        .replace("{SOURCE}", candidate.sourceName)
        .replace("{{TARGET_WORDS}}", String(targetWords))
        .replace("{TARGET_WORDS}", String(targetWords))
        .replace("{{targetWords}}", String(targetWords))
        .replace("{targetWords}", String(targetWords))
    : defaultUserMsg;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  let content = (typeof rawContent === "string" ? rawContent.trim() : "") || "{}";
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    let parsed = JSON.parse(content) as any;
    if (typeof parsed === "string") {
      try { parsed = JSON.parse(parsed); } catch { /* ignore */ }
    }
    const headline = (parsed.headline || "").trim() || "Untitled Article";
    const subheadline = (parsed.subheadline || "").trim();
    let body = (parsed.body || "").trim();
    if (!body.trim().startsWith("<")) {
      const paragraphs = body.split("\n\n").filter((p: string) => p.trim());
      body = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join("");
    }
    const slug = slugify(headline, { lower: true, strict: true }).slice(0, 80) + `-${Math.random().toString(36).slice(2, 7)}`;

    // Guess category
    const categories = await db.listCategories();
    const catMap: Record<string, number> = {};
    for (const cat of categories) catMap[cat.slug] = cat.id;
    const text = `${headline} ${subheadline} ${candidate.title}`.toLowerCase();
    let bestSlug = categories.length > 0 ? categories[0].slug : null;
    let bestScore = 0;
    for (const cat of categories) {
      if (cat.keywords) {
        const kws = cat.keywords.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean);
        const score = kws.filter((kw: string) => text.includes(kw)).length;
        if (score > bestScore) { bestScore = score; bestSlug = cat.slug; }
      }
    }
    const categoryId = bestSlug ? (catMap[bestSlug] ?? null) : null;

    return { headline, subheadline, body, slug, categoryId, sourceUrl: candidate.sourceUrl, feedSourceId: null };
  } catch {
    return null;
  }
}

// ─── Main Loop Tick ───────────────────────────────────────────────────────────
/**
 * Run one tick of the production loop.
 * Pool-drain model: drain high pool first, then medium. Safety cap is the only brake.
 */
export async function runProductionLoopTick(): Promise<{ articlesGenerated: number; message: string }> {
  // Guard: don't run if another tick is already in progress
  if (_isRunning) {
    return { articlesGenerated: 0, message: "Loop tick skipped: already running" };
  }

  _isRunning = true;
  _loopRunCount++;
  const tickStart = Date.now();

  try {
    // ── Check master switches ──
    // v4.7.1: Setup gate — skip until operator has completed the Setup Wizard
    const setupComplete = await getSettingBool("setup_complete", false);
    if (!setupComplete) {
      console.log("[ProductionLoop] Production loop skipped — Setup Wizard not yet completed. Set setup_complete=true to enable.");
      return { articlesGenerated: 0, message: "Production loop skipped — Setup Wizard not yet completed" };
    }

    const workflowEnabled = await getSettingBool("workflow_enabled", true);
    if (!workflowEnabled) {
      return { articlesGenerated: 0, message: "Skipped: workflow_enabled=false" };
    }

    const loopEnabled = await getSettingBool("production_loop_enabled", true);
    if (!loopEnabled) {
      return { articlesGenerated: 0, message: "Skipped: production_loop_enabled=false" };
    }

    // ── Read settings (v4.5.1 pool-drain model) ──
    const maxDailyArticles = await getSettingInt("max_daily_articles", 500);
    const maxBatchHigh = await getSettingInt("max_batch_high", 25);
    const maxBatchMedium = await getSettingInt("max_batch_medium", 10);
    const minScore = await getSettingFloat("min_score_to_publish", 0.40);
    const targetWords = await getSettingInt("target_article_length", 200);
    const defaultStatus = await getSettingValue("default_status", "pending");
    const autoGenImages = await getSettingBool("auto_generate_images", false);
    const autoSocial = await getSettingBool("auto_create_social_posts", true);
    const socialPlatformsStr = await getSettingValue("social_platforms", "twitter");
    const socialPlatforms = socialPlatformsStr.split(",").map(p => p.trim()).filter(Boolean);

    // ── Safety cap check ──
    const today = new Date().toISOString().split("T")[0];
    const createdToday = await countArticlesToday(today);
    if (createdToday >= maxDailyArticles) {
      return { articlesGenerated: 0, message: `Safety cap reached: ${createdToday}/${maxDailyArticles} articles today` };
    }
    const remainingCapacity = maxDailyArticles - createdToday;
    console.log(`[ProductionLoop] Tick #${_loopRunCount}: ${createdToday}/${maxDailyArticles} today, capacity=${remainingCapacity}`);

    // ── Score any unscored candidates first ──
    try {
      const scored = await scoreUnscoredCandidates();
      if (scored > 0) console.log(`[ProductionLoop] Scored ${scored} previously unscored candidates`);
    } catch (err: any) {
      console.warn(`[ProductionLoop] Scoring pass failed (non-fatal): ${err.message}`);
    }

    // ── Pool-drain: HIGH potential first, then MEDIUM ──
    const highLimit = Math.min(maxBatchHigh, remainingCapacity);
    const highCandidates = await getCandidatesByPotential("high", highLimit, minScore);
    const mediumLimit = Math.min(maxBatchMedium, remainingCapacity - highCandidates.length);
    const mediumCandidates = mediumLimit > 0 ? await getCandidatesByPotential("medium", mediumLimit, minScore) : [];
    const candidates = [...highCandidates, ...mediumCandidates];

    if (candidates.length === 0) {
      return { articlesGenerated: 0, message: `Pool empty: no high/medium candidates above score ${minScore}` };
    }

    console.log(`[ProductionLoop] Pool: ${highCandidates.length} high + ${mediumCandidates.length} medium = ${candidates.length} total`);

    // ── Build style prompt ──
    const stylePrompt = await buildStylePrompt();

    // ── Generate articles ──
    const importedIds: number[] = [];
    const candidateIds: number[] = [];

    for (const candidate of candidates) {
      try {
        console.log(`[ProductionLoop]   Generating: ${candidate.title.slice(0, 60)}... (score=${candidate.score?.toFixed(2)})`);
        const article = await generateArticleFromCandidate(candidate, stylePrompt, targetWords);
        if (!article) {
          console.log(`[ProductionLoop]   ✗ Generation returned null`);
          continue;
        }

        const id = await db.createArticleFromWorkflow({
          headline: article.headline,
          subheadline: article.subheadline,
          body: article.body,
          slug: article.slug,
          status: defaultStatus,
          categoryId: article.categoryId,
          batchDate: today,
          sourceEvent: candidate.title,
          sourceUrl: candidate.sourceUrl || "",
          feedSourceId: candidate.feedSourceId,
        });

        if (id) {
          importedIds.push(id);
          candidateIds.push(candidate.id);
          console.log(`[ProductionLoop]   ✓ "${article.headline.slice(0, 60)}"`);
        }
      } catch (err: any) {
        if (err.message?.includes("Duplicate") || err.message?.includes("duplicate")) {
          console.log(`[ProductionLoop]   Skipped duplicate slug`);
        } else {
          console.log(`[ProductionLoop]   ✗ Error: ${err.message?.slice(0, 100)}`);
        }
      }
    }

    // ── Mark candidates as selected ──
    if (candidateIds.length > 0) {
      try {
        await markCandidatesSelected(candidateIds);
        for (let i = 0; i < candidateIds.length; i++) {
          if (importedIds[i]) {
            linkCandidateToArticle(candidateIds[i], importedIds[i]).catch(() => {});
          }
        }
      } catch (err: any) {
        console.warn(`[ProductionLoop] Could not mark candidates selected: ${err.message}`);
      }
    }

    if (importedIds.length === 0) {
      return { articlesGenerated: 0, message: "No articles imported (all failed or duplicate)" };
    }

    // ── Generate images (if enabled) ──
    if (autoGenImages && importedIds.length > 0) {
      for (const articleId of importedIds) {
        try {
          const article = await db.getArticleById(articleId);
          if (!article || article.featuredImage) continue;
          const finalPrompt = await buildImagePrompt(article.headline, article.subheadline);
          const result = await generateImage({ prompt: finalPrompt });
          if (result?.url) {
            await db.updateArticle(articleId, { featuredImage: result.url });
          }
        } catch (err: any) {
          console.warn(`[ProductionLoop] Image generation failed for article ${articleId}: ${err.message?.slice(0, 60)}`);
        }
      }
    }

    // ── Generate social posts (if enabled) ──
    if (autoSocial && importedIds.length > 0) {
      try {
        const siteUrlSetting = await db.getSetting("site_url");
        const siteBaseUrl = siteUrlSetting?.value || process.env.VITE_APP_URL || process.env.APP_URL || "https://example.com";
        const importedArticles = [];
        for (const id of importedIds) {
          const article = await db.getArticleById(id);
          if (article) importedArticles.push(article);
        }
        const articlesNeedingPosts = [];
        for (const article of importedArticles) {
          const existing = await db.listSocialPosts({ articleId: article.id });
          if (existing.length === 0) articlesNeedingPosts.push(article);
        }
        if (articlesNeedingPosts.length > 0) {
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
            await db.bulkCreateSocialPosts(posts.map(p => ({
              articleId: p.articleId,
              platform: p.platform as "twitter" | "facebook" | "linkedin" | "instagram" | "threads",
              content: p.content,
              videoUrl: p.videoUrl,
              status: p.status as "draft" | "scheduled" | "posted" | "failed",
            })));
          }
        }
      } catch (err: any) {
        console.warn(`[ProductionLoop] Social post generation failed (non-fatal): ${err.message?.slice(0, 80)}`);
      }
    }

    const elapsed = ((Date.now() - tickStart) / 1000).toFixed(1);
    const message = `Generated ${importedIds.length} articles in ${elapsed}s (${highCandidates.length} high, ${mediumCandidates.length} medium | ${createdToday + importedIds.length}/${maxDailyArticles} today)`;
    console.log(`[ProductionLoop] ${message}`);
    return { articlesGenerated: importedIds.length, message };

  } catch (err: any) {
    const message = `Loop tick error: ${err.message?.slice(0, 100)}`;
    console.error(`[ProductionLoop] ${message}`);
    return { articlesGenerated: 0, message };
  } finally {
    _isRunning = false;
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────
/**
 * Initialize the production loop cron job.
 * Interval is read from the production_interval_minutes setting (default: 15).
 * Call this once at startup; the loop reads settings fresh on each tick.
 */
export function initProductionLoop(intervalMinutes = 15): void {
  if (_loopTask) {
    _loopTask.stop();
    _loopTask = null;
  }

  // Clamp to valid range: 1-60 minutes
  const interval = Math.max(1, Math.min(60, intervalMinutes));
  const cronExpr = `*/${interval} * * * *`;
  if (!cron.validate(cronExpr)) {
    console.error("[ProductionLoop] Invalid cron expression:", cronExpr);
    return;
  }

  _loopTask = cron.schedule(cronExpr, async () => {
    try {
      const result = await runProductionLoopTick();
      _lastLoopResult = { time: new Date().toISOString(), ...result };
    } catch (err: any) {
      console.error("[ProductionLoop] Unhandled error in tick:", err.message);
    }
  });

  console.log(`[ProductionLoop] Initialized: runs every ${interval} minutes`);
}

export function stopProductionLoop(): void {
  if (_loopTask) {
    _loopTask.stop();
    _loopTask = null;
    console.log("[ProductionLoop] Stopped");
  }
}

export function getProductionLoopStatus() {
  return {
    isRunning: _isRunning,
    runCount: _loopRunCount,
    lastResult: _lastLoopResult,
  };
}
