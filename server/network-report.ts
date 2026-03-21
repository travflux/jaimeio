/**
 * Network Report API — v4.7.0
 *
 * Cross-site analytics and control endpoint for the Satire Engine network.
 * Designed for the CEO (or a central hub) to pull metrics from any deployment
 * and optionally push settings or trigger operations.
 *
 * Endpoints:
 *   GET  /api/network-report           — retrieve metrics snapshot
 *   POST /api/network-report           — update settings (rate-limited: 1/min)
 *   POST /api/network-report/actions   — trigger operations (score/generate/publish)
 *
 * Authentication:
 *   All requests must include the header:
 *     X-Network-API-Key: <value of network_api_key DB setting>
 *
 * Rate limits:
 *   GET  — 10 requests per minute per IP
 *   POST — 1 request per minute per IP
 *
 * White-label: no hardcoded brand references. All values read from DB settings.
 */

import { Express, Request, Response, NextFunction } from "express";
import * as db from "./db";
import { getProductionLoopStatus, runProductionLoopTick } from "./production-loop";
import { scoreUnscoredCandidates } from "./candidate-scoring";
import { getDb } from "./db";
import { selectorCandidates } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// ─── Rate limiter (in-memory, per IP) ─────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

const _rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = _rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    _rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (existing.count >= maxRequests) {
    return false; // blocked
  }
  existing.count++;
  return true; // allowed
}

// ─── Auth middleware ───────────────────────────────────────────────────────────

async function requireNetworkApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Check master switch
  const enabledSetting = await db.getSetting("network_api_enabled");
  if (enabledSetting?.value === "false") {
    res.status(503).json({ error: "Network API is disabled on this deployment" });
    return;
  }

  const providedKey = req.headers["x-network-api-key"] as string | undefined;
  if (!providedKey) {
    res.status(401).json({ error: "Missing X-Network-API-Key header" });
    return;
  }

  const storedKeySetting = await db.getSetting("network_api_key");
  const storedKey = storedKeySetting?.value;
  if (!storedKey || providedKey !== storedKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}

// ─── GET rate limiter middleware ───────────────────────────────────────────────

function rateLimitGet(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const key = `get:${ip}`;
  if (!checkRateLimit(key, 10, 60_000)) {
    res.status(429).json({ error: "Rate limit exceeded: max 10 GET requests per minute" });
    return;
  }
  next();
}

// ─── POST rate limiter middleware ──────────────────────────────────────────────

function rateLimitPost(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const key = `post:${ip}`;
  if (!checkRateLimit(key, 1, 60_000)) {
    res.status(429).json({ error: "Rate limit exceeded: max 1 POST request per minute" });
    return;
  }
  next();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getPoolHealthSnapshot(): Promise<{
  high: number;
  medium: number;
  low: number;
  dead: number;
  unscored: number;
  total: number;
}> {
  const dbConn = await getDb();
  if (!dbConn) return { high: 0, medium: 0, low: 0, dead: 0, unscored: 0, total: 0 };

  const rows = await dbConn
    .select({
      potential: selectorCandidates.articlePotential,
      count: sql<number>`count(*)`,
    })
    .from(selectorCandidates)
    .where(eq(selectorCandidates.status, "pending"))
    .groupBy(selectorCandidates.articlePotential);

  const tiers = { high: 0, medium: 0, low: 0, dead: 0, unscored: 0, total: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    tiers.total += n;
    if (row.potential === "high") tiers.high = n;
    else if (row.potential === "medium") tiers.medium = n;
    else if (row.potential === "low") tiers.low = n;
    else if (row.potential === "dead") tiers.dead = n;
    else tiers.unscored += n;
  }
  return tiers;
}

async function getKeySettings(): Promise<Record<string, string>> {
  const keys = [
    "production_loop_enabled",
    "production_mode",
    "production_interval_minutes",
    "max_daily_articles",
    "max_batch_high",
    "max_batch_medium",
    "score_high_threshold",
    "min_score_threshold",
    "min_score_to_publish",
    "pool_min_size",
    "brand_genre",
    "network_api_enabled",
    "network_hub_url",
    "network_sync_interval",
  ];

  const result: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      const setting = await db.getSetting(key);
      if (setting) result[key] = setting.value;
    })
  );
  return result;
}

// ─── Allowed settings for POST update ─────────────────────────────────────────

const UPDATABLE_SETTINGS = new Set([
  "production_loop_enabled",
  "production_mode",
  "production_interval_minutes",
  "max_daily_articles",
  "max_batch_high",
  "max_batch_medium",
  "score_high_threshold",
  "min_score_threshold",
  "min_score_to_publish",
  "pool_min_size",
  "network_api_enabled",
  "network_hub_url",
  "network_sync_interval",
]);

// ─── Route registration ────────────────────────────────────────────────────────

export function registerNetworkReportRoute(app: Express): void {
  // ── GET /api/network-report ────────────────────────────────────────────────
  app.get(
    "/api/network-report",
    rateLimitGet,
    requireNetworkApiKey,
    async (_req: Request, res: Response): Promise<void> => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [articleStats, poolHealth, settings, loopStatus] = await Promise.all([
          db.getArticleStats(),
          getPoolHealthSnapshot(),
          getKeySettings(),
          Promise.resolve(getProductionLoopStatus()),
        ]);

        const todayCount = await db.countArticlesPublishedSince(today);

        const siteName = (await db.getSetting("brand_site_name"))?.value || "";
        const siteUrl = (await db.getSetting("site_url"))?.value || "";

        res.json({
          ok: true,
          generatedAt: new Date().toISOString(),
          site: {
            name: siteName,
            url: siteUrl,
          },
          articles: {
            total: articleStats.total,
            published: articleStats.published,
            pending: articleStats.pending,
            today: todayCount,
          },
          pool: poolHealth,
          productionLoop: {
            isRunning: loopStatus.isRunning,
            runCount: loopStatus.runCount,
            lastMessage: loopStatus.lastResult?.message ?? null,
          },
          settings,
        });
      } catch (err: any) {
        console.error("[NetworkReport] GET error:", err);
        res.status(500).json({ ok: false, error: err.message ?? "Internal error" });
      }
    }
  );

  // ── POST /api/network-report ───────────────────────────────────────────────
  app.post(
    "/api/network-report",
    rateLimitPost,
    requireNetworkApiKey,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const updates = req.body as Record<string, string>;
        if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
          res.status(400).json({ ok: false, error: "Request body must be a JSON object of key:value pairs" });
          return;
        }

        const rejected: string[] = [];
        const saved: string[] = [];

        for (const [key, value] of Object.entries(updates)) {
          if (!UPDATABLE_SETTINGS.has(key)) {
            rejected.push(key);
            continue;
          }
          if (typeof value !== "string") {
            rejected.push(key);
            continue;
          }
          await db.setSetting(key, value, "system");
          saved.push(key);
        }

        res.json({
          ok: true,
          saved,
          rejected,
          message: `${saved.length} setting(s) updated${rejected.length > 0 ? `, ${rejected.length} rejected (not in allowlist)` : ""}`,
        });
      } catch (err: any) {
        console.error("[NetworkReport] POST error:", err);
        res.status(500).json({ ok: false, error: err.message ?? "Internal error" });
      }
    }
  );

  // ── POST /api/network-report/actions ──────────────────────────────────────
  app.post(
    "/api/network-report/actions",
    rateLimitPost,
    requireNetworkApiKey,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { action } = req.body as { action?: string };
        if (!action) {
          res.status(400).json({ ok: false, error: "Missing 'action' field in request body" });
          return;
        }

        switch (action) {
          case "score": {
            const scored = await scoreUnscoredCandidates();
            res.json({ ok: true, action: "score", result: { scored } });
            break;
          }
          case "generate": {
            const result = await runProductionLoopTick();
            res.json({ ok: true, action: "generate", result });
            break;
          }
          case "publish": {
            // Publish action: approve all pending articles that are in 'pending' status
            // This is a best-effort bulk-approve operation
            const dbConn = await getDb();
            if (!dbConn) {
              res.status(503).json({ ok: false, error: "Database unavailable" });
              return;
            }
            const { articles } = await import("../drizzle/schema");
            const pendingRows = await dbConn
              .select({ id: articles.id })
              .from(articles)
              .where(eq(articles.status, "pending"))
              .limit(100);
            if (pendingRows.length === 0) {
              res.json({ ok: true, action: "publish", result: { published: 0, message: "No pending articles to publish" } });
              return;
            }
            await dbConn
              .update(articles)
              .set({ status: "published", publishedAt: new Date() })
              .where(eq(articles.status, "pending"));
            res.json({
              ok: true,
              action: "publish",
              result: { published: pendingRows.length, message: `${pendingRows.length} article(s) published` },
            });
            break;
          }
          default:
            res.status(400).json({ ok: false, error: `Unknown action '${action}'. Valid actions: score, generate, publish` });
        }
      } catch (err: any) {
        console.error("[NetworkReport] POST /actions error:", err);
        res.status(500).json({ ok: false, error: err.message ?? "Internal error" });
      }
    }
  );
}

// ─── Exported helpers for testing ─────────────────────────────────────────────

export { checkRateLimit, UPDATABLE_SETTINGS };
