/**
 * Workflow REST API — used by the Python bridge script to import articles
 * and manage workflow batches without needing OAuth session cookies.
 * 
 * Authentication: API key passed via X-API-Key header, validated against
 * the WORKFLOW_API_KEY environment variable.
 */
import { Express, Request, Response, NextFunction } from "express";
import * as db from "./db";
import { validateArticleHeadline, validateArticleBody } from "./articleValidation";
import { buildImagePrompt } from "./imagePromptBuilder";

const WORKFLOW_API_KEY = process.env.WORKFLOW_API_KEY || "satire-engine-workflow-default-key";
if (!process.env.WORKFLOW_API_KEY) {
  console.warn("[WorkflowAPI] WARNING: WORKFLOW_API_KEY not set in environment. Using default key. Set this in production.");
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (key !== WORKFLOW_API_KEY) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }
  next();
}

export function registerWorkflowApi(app: Express) {
  // ─── Health check ───────────────────────────────────
  app.get("/api/workflow/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── Create or get workflow batch ───────────────────
  app.post("/api/workflow/batch", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { batchDate, totalEvents } = req.body;
      if (!batchDate) { res.status(400).json({ error: "batchDate required" }); return; }

      // Check if batch already exists
      const existing = await db.getWorkflowBatchByDate(batchDate);
      if (existing) {
        res.json({ id: existing.id, existing: true, batch: existing });
        return;
      }

      const id = await db.createWorkflowBatch({ batchDate, totalEvents, status: "gathering" });
      res.json({ id, existing: false });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Update workflow batch ──────────────────────────
  app.patch("/api/workflow/batch/:id", requireApiKey, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.updateWorkflowBatch(id, req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Get categories ─────────────────────────────────
  app.get("/api/workflow/categories", requireApiKey, async (_req: Request, res: Response) => {
    try {
      const categories = await db.listCategories();
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Bulk import articles ───────────────────────────
  app.post("/api/workflow/articles/import", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { articles } = req.body;
      if (!articles || !Array.isArray(articles)) {
        res.status(400).json({ error: "articles array required" });
        return;
      }

      // Get the first admin user for authorId
      const adminUser = await db.getFirstAdmin();
      const authorId = adminUser?.id ?? 1;

      // Validate articles before import
      const validArticles = articles.filter((a: any) => {
        if (!a.headline || a.headline.trim().length === 0) {
          console.warn(`[WorkflowAPI] Skipping article with empty headline`);
          return false;
        }
        if (!a.body || a.body.trim().length === 0) {
          console.warn(`[WorkflowAPI] Skipping article with empty body: ${a.headline?.slice(0, 50)}`);
          return false;
        }
        if (a.headline.length > 500) {
          console.warn(`[WorkflowAPI] Skipping article with headline > 500 chars: ${a.headline.slice(0, 50)}...`);
          return false;
        }
        return true;
      });

      const articlesWithAuthor = validArticles.map((a: any) => ({
        headline: a.headline,
        subheadline: a.subheadline || null,
        body: a.body,
        slug: a.slug,
        status: a.status || "pending",
        categoryId: a.categoryId || null,
        featuredImage: a.featuredImage || null,
        batchDate: a.batchDate || null,
        sourceEvent: a.sourceEvent || null,
        sourceUrl: a.sourceUrl || null,
        authorId,
      }));

      const ids = await db.bulkCreateArticles(articlesWithAuthor);
      res.json({ ids, count: ids.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Get articles by batch date ─────────────────────
  app.get("/api/workflow/articles", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { batchDate, status } = req.query;
      const result = await db.listArticles({
        status: status as string | undefined,
        limit: 100,
      });
      // Filter by batchDate if provided
      if (batchDate) {
        result.articles = result.articles.filter((a: any) => a.batchDate === batchDate);
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Bulk create social posts ───────────────────────
  app.post("/api/workflow/social/import", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { posts } = req.body;
      if (!posts || !Array.isArray(posts)) {
        res.status(400).json({ error: "posts array required" });
        return;
      }
      await db.bulkCreateSocialPosts(posts);
      res.json({ success: true, count: posts.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Update article status ──────────────────────────
  app.patch("/api/workflow/articles/:id/status", requireApiKey, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      await db.updateArticleStatus(id, status);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Generate media for articles ───────────────────
  app.post("/api/workflow/articles/generate-media", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { articleIds, batchDate } = req.body;
      let articles: any[] = [];

      if (articleIds && Array.isArray(articleIds)) {
        // Generate for specific article IDs
        for (const id of articleIds) {
          const a = await db.getArticleById(id);
          if (a && !a.featuredImage) articles.push(a);
        }
      } else if (batchDate) {
        // Generate for all approved articles in a batch
        const result = await db.listArticles({ status: "approved", limit: 100 });
        articles = result.articles.filter((a: any) => a.batchDate === batchDate && !a.featuredImage);
      }

      if (articles.length === 0) {
        res.json({ success: true, generated: 0, message: "No articles need media generation" });
        return;
      }

      const { generateImage } = await import("./_core/imageGeneration");
      const results = [];
      for (const article of articles) {
        try {
          const finalPrompt = await buildImagePrompt(article.headline, article.subheadline);
          // Generate image
           const result = await generateImage({
            prompt: finalPrompt,
          });
          if (result?.url) {
            await db.updateArticle(article.id, { featuredImage: result.url, llmImagePrompt: finalPrompt });
            results.push({ articleId: article.id, success: true, imageUrl: result.url });
            console.log(`[MediaAPI] Generated image for article ${article.id}`);
          } else {
            results.push({ articleId: article.id, success: false, error: "No URL returned" });
          }
        } catch (err: any) {
          console.error(`[MediaAPI] Failed for article ${article.id}:`, err.message);
          results.push({ articleId: article.id, success: false, error: err.message });
        }
      }

      res.json({
        success: true,
        generated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Get all workflow settings ─────────────────────
  app.get("/api/workflow/settings", requireApiKey, async (_req: Request, res: Response) => {
    try {
      const settings = await db.getAllSettings();
      // Convert to a key-value map for easy consumption
      const settingsMap: Record<string, string> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }
      res.json({ settings: settingsMap, raw: settings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Get a single setting ──────────────────────────
  app.get("/api/workflow/settings/:key", requireApiKey, async (req: Request, res: Response) => {
    try {
      const setting = await db.getSetting(req.params.key);
      if (!setting) { res.status(404).json({ error: "Setting not found" }); return; }
      res.json(setting);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Send post to FeedHive ─────────────────────────
  app.post("/api/workflow/feedhive/send", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { text, media_urls, scheduled, prompt, platform } = req.body;
      if (!text && !prompt) {
        res.status(400).json({ error: "Either text or prompt is required" });
        return;
      }

      // Resolve trigger URL: platform-specific first, then default fallback
      let triggerUrl: string | undefined;
      if (platform) {
        triggerUrl = await db.getFeedHiveTriggerUrl(platform);
      }
      if (!triggerUrl) {
        const triggerUrlSetting = await db.getSetting("feedhive_trigger_url");
        triggerUrl = triggerUrlSetting?.value || undefined;
      }
      if (!triggerUrl) {
        res.status(400).json({ error: "FeedHive trigger URL not configured. Set it in Workflow > Social Media settings." });
        return;
      }

      const payload: Record<string, any> = {};
      if (text) payload.text = text;
      if (prompt) payload.prompt = prompt;
      if (media_urls) payload.media_urls = Array.isArray(media_urls) ? media_urls : [media_urls];
      if (scheduled) payload.scheduled = scheduled;

      const response = await fetch(triggerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      res.json({
        success: response.ok,
        status: response.status,
        platform: platform || "default",
        feedhiveResponse: responseText,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Bulk send posts to FeedHive ───────────────────
  app.post("/api/workflow/feedhive/bulk-send", requireApiKey, async (req: Request, res: Response) => {
    try {
      const { posts, intervalMinutes } = req.body;
      if (!posts || !Array.isArray(posts)) {
        res.status(400).json({ error: "posts array required" });
        return;
      }

      // Pre-load all trigger URLs for efficiency
      const triggerUrls = await db.getAllFeedHiveTriggerUrls();
      const defaultTriggerSetting = await db.getSetting("feedhive_trigger_url");
      const defaultTriggerUrl = defaultTriggerSetting?.value || "";

      if (Object.keys(triggerUrls).length === 0 && !defaultTriggerUrl) {
        res.status(400).json({ error: "No FeedHive trigger URLs configured" });
        return;
      }

      const includeImageSetting = await db.getSetting("feedhive_include_image");
      const includeImage = includeImageSetting?.value !== "false";

      const results = [];
      for (const post of posts) {
        try {
          // Resolve trigger URL for this post's platform
          const platform = post.platform || "";
          const triggerUrl = triggerUrls[platform] || defaultTriggerUrl;
          if (!triggerUrl) {
            results.push({
              success: false,
              error: `No trigger URL configured for platform: ${platform}`,
              articleId: post.articleId,
              platform,
            });
            continue;
          }

          const payload: Record<string, any> = {};
          if (post.text) payload.text = post.text;
          if (post.prompt) payload.prompt = post.prompt;
          if (includeImage && post.media_urls) {
            payload.media_urls = Array.isArray(post.media_urls) ? post.media_urls : [post.media_urls];
          }
          if (post.scheduled) payload.scheduled = post.scheduled;

          // Add any custom template variables
          if (post.variables) {
            Object.assign(payload, post.variables);
          }

          const response = await fetch(triggerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          results.push({
            success: response.ok,
            status: response.status,
            articleId: post.articleId,
            platform,
          });

          // Update social post status in DB if we have an ID
          if (post.socialPostId && response.ok) {
            await db.updateSocialPostStatus(post.socialPostId, "posted");
          }

          // Delay between posts: use interval if specified, otherwise 500ms for rate limiting
          const delayMs = intervalMinutes ? intervalMinutes * 60 * 1000 : 500;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (e: any) {
          results.push({
            success: false,
            error: e.message,
            articleId: post.articleId,
          });
        }
      }

      res.json({
        total: posts.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
