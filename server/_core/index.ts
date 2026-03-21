import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { seedDefaultCategories, seedDefaultSettings, closeDatabasePool } from "../db";
import { registerWorkflowApi } from "../workflowApi";
import { initScheduler, getSchedulerStatus, triggerWorkflowNow, refreshScheduler } from "../scheduler";
import { initializeQueue as initXQueue } from "../xPostQueue";
import { initReplyScheduler } from "../xReplyEngine";
import { initStandaloneTweetScheduler, getStandaloneTweetSchedulerStatus, triggerStandaloneTweetGenerationNow, refreshStandaloneTweetScheduler } from "../standalone-tweet-scheduler";
import { initMerchAvailabilityScheduler, getMerchAvailabilitySchedulerStatus, runAvailabilityCheck } from "../merch-availability-scheduler";
import { initAutoApproveTimer } from "../autoApproveTimer";
import { registerRssFeed } from "../rssFeed";
import { generateSitemap, generateSitemapIndex, generateArticleSitemap } from "../sitemap";
import { generateNewsSitemap } from "../newsSitemap";
import { registerBrandingUpload } from "../brandingUpload";
import { registerSeoRoutes } from "../seo";
import { registerCeoDashboardRoute } from "../ceoDashboard";
import { registerArticleSsrRoutes } from "../articleSsr";
import { classifyReferrer } from "../trafficSource";
import { logAffiliateClick, logPageView, getSetting } from "../db";
import { registerAttributionRoutes, recordConversionEvent, updateSessionConversionFlag } from "../attribution";
import { registerStripeWebhookRoute } from "../stripeWebhook";
import { registerPrintifyWebhook } from "../printifyWebhook";
import { initAdSpendSync } from "../adSpendSync";
import { initSearchPerformanceSync } from "../searchPerformanceSync";
import { initNewsletterDigestScheduler, registerNewsletterUnsubscribeRoute } from "../newsletterDigest";
import { initDistributionScheduler } from "../socialDistribution";
import { initProductionLoop, getProductionLoopStatus, runProductionLoopTick } from "../production-loop";
import { registerNetworkReportRoute } from "../network-report";
import { insertJsPageView, isSpamReferrer, rollupDailyAnalytics } from "../jsAnalytics";
import cron from "node-cron";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Workflow import REST API (API-key authenticated)
  registerWorkflowApi(app);
  // RSS feed
  registerRssFeed(app);
  // Branding asset uploads
  registerBrandingUpload(app);

  // ─── Scheduler API endpoints ──────────────────────────
  app.get("/api/scheduler/status", (_req, res) => {
    res.json(getSchedulerStatus());
  });

  app.post("/api/scheduler/trigger", async (_req, res) => {
    try {
      const result = await triggerWorkflowNow();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/scheduler/refresh", async (_req, res) => {
    try {
      const status = await refreshScheduler();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // ─── Standalone Tweet Scheduler API endpoints ─────────
  app.get("/api/standalone-tweet-scheduler/status", (_req, res) => {
    res.json(getStandaloneTweetSchedulerStatus());
  });

  app.post("/api/standalone-tweet-scheduler/trigger", async (_req, res) => {
    try {
      await triggerStandaloneTweetGenerationNow();
      res.json({ success: true, message: "Standalone tweet generation triggered" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/standalone-tweet-scheduler/refresh", async (_req, res) => {
    try {
      const status = await refreshStandaloneTweetScheduler();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Production Loop API endpoints ─────────────────────────────────
  app.get("/api/production-loop/status", (_req, res) => {
    res.json(getProductionLoopStatus());
  });
  app.post("/api/production-loop/trigger", async (_req, res) => {
    try {
      const result = await runProductionLoopTick();
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // ─── Tag All Articles (internal admin endpoint) ─────────────────────
  app.post("/api/admin/tag-all", async (_req, res) => {
    try {
      const { batchAutoTagAll } = await import("../tagging");
      console.log("[TagAll] Starting batch auto-tag all articles...");
      // Run in background, return immediately
      batchAutoTagAll()
        .then(r => console.log(`[TagAll] Complete: ${r.processed} processed, ${r.tagged} tagged of ${r.total} total`))
        .catch(e => console.error("[TagAll] Error:", e.message));
      res.json({ started: true, message: "Tag All Articles started in background" });
    } catch (e: any) {
      console.error("[TagAll] Endpoint error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ─── robots.txt ─────────────────────────────────────────────────────
  // The Manus edge layer overrides /robots.txt with its own auto-generated version
  // (which incorrectly has Disallow: /api/*). Serve our version at /api/robots.txt
  // which bypasses the edge layer. Google and Bing both follow the /robots.txt URL,
  // so we also keep the /robots.txt route here (works in dev; edge overrides in prod).
  const siteUrl = process.env.SITE_URL || '';
  // NOTE: The Sitemap: directive is NOT subject to Disallow rules — Google fetches it regardless.
  // /api/sitemap.xml bypasses the edge layer and returns real XML with /article/:slug URLs.
  const ROBOTS_TXT = `User-Agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/briefing-room-m4x1q\n\nSitemap: ${siteUrl}/content-sitemap.xml\nSitemap: ${siteUrl}/news-sitemap.xml\n`;

  app.get("/api/robots.txt", (_req, res) => {
    res
      .set("Content-Type", "text/plain")
      .set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      .set("Pragma", "no-cache")
      .set("Surrogate-Control", "no-store")
      .set("CDN-Cache-Control", "no-store")
      .set("Cloudflare-CDN-Cache-Control", "no-store")
      .set("Expires", "0")
      .send(ROBOTS_TXT);
  });
  app.get("/robots.txt", (_req, res) => {
    res
      .set("Content-Type", "text/plain")
      .set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      .set("Pragma", "no-cache")
      .set("Surrogate-Control", "no-store")
      .set("CDN-Cache-Control", "no-store")
      .set("Cloudflare-CDN-Cache-Control", "no-store")
      .set("Expires", "0")
      .send(ROBOTS_TXT);
  });

  // ─── Sitemap endpoints ───────────────────────────────
  // NOTE: The Manus edge layer intercepts /sitemap.xml and serves its own auto-generated
  // sitemap based on React router routes. To bypass this, we serve the real dynamic
  // sitemap at /api/sitemap.xml (which bypasses the edge layer) and redirect the
  // canonical URL to the /api/ version.

  // Helper to get canonical base URL — reads SITE_URL env var for white-label compatibility
  function getSitemapBaseUrl(req: any): string {
    // SITE_URL must be set in each deployment's environment variables
    if (process.env.SITE_URL) return process.env.SITE_URL;
    const host = req.get('host') || '';
    if (process.env.NODE_ENV === 'production' || host.includes('manus')) {
      return siteUrl; // fallback to SITE_URL or hambry.com default
    }
    return `${req.protocol}://${host}`;
  }

  // Shared sitemap cache headers — 1-hour TTL, no indefinite edge caching
  const SITEMAP_CACHE = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60";

  // /api/sitemap.xml — bypasses edge layer, serves real dynamic sitemap
  app.get("/api/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const sitemap = await generateSitemap(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // /api/sitemap-index.xml — bypasses edge layer
  app.get("/api/sitemap-index.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const index = await generateSitemapIndex(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(index);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // /api/sitemap-articles-:page.xml — bypasses edge layer
  app.get("/api/sitemap-articles-:page.xml", async (req, res) => {
    try {
      const page = parseInt(req.params.page, 10);
      if (isNaN(page) || page < 1) return res.status(400).json({ error: "Invalid page" });
      const baseUrl = getSitemapBaseUrl(req);
      const sitemap = await generateArticleSitemap(baseUrl, page);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      if (e.message === "Page out of range") return res.status(404).json({ error: "Page out of range" });
      res.status(500).json({ error: e.message });
    }
  });

  // /en/sitemap.xml — TEST: does the edge layer pass /en/* paths through to Express?
  // manus.im uses /en/sitemap.xml for its own localized sitemap. If the edge layer
  // treats /en/* as a pass-through (like /api/*), this will return real XML.
  app.get("/en/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const sitemap = await generateSitemap(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // IndexNow verification key file — must be at root, not /api/
  // Allows Bing/Yandex/DuckDuckGo to verify IndexNow submissions
  const indexNowKey = process.env.INDEXNOW_KEY || "";
  app.get(`/${indexNowKey}.txt`, (_req, res) => {
    res.type("text/plain").send(indexNowKey);
  });

  // /news-sitemap.xml — Google News sitemap (last 48h articles)
  // NOT under /api/ so robots.txt Disallow: /api/* does not block it.
  app.get("/news-sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const xml = await generateNewsSitemap(baseUrl);
      res.set("Cache-Control", "public, max-age=900, s-maxage=900")
         .type("application/xml")
         .send(xml);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // /content-sitemap.xml — THE canonical sitemap for Google Search Console submission
  // NOT under /api/ so robots.txt Disallow: /api/* does not block it.
  // NOT at /sitemap.xml so the edge layer does not overwrite it.
  // Lists all articles at /article/:slug (canonical URLs, not /api/article/).
  app.get("/content-sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const sitemap = await generateSitemap(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Legacy /sitemap.xml — also serve directly (works in dev; edge layer may override in prod)
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const sitemap = await generateSitemap(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/sitemap-index.xml", async (_req, res) => {
    try {
      const baseUrl = getSitemapBaseUrl(_req);
      const index = await generateSitemapIndex(baseUrl);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(index);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/sitemap-articles-:page.xml", async (req, res) => {
    try {
      const page = parseInt(req.params.page, 10);
      if (isNaN(page) || page < 1) return res.status(400).json({ error: "Invalid page" });
      const baseUrl = getSitemapBaseUrl(req);
      const sitemap = await generateArticleSitemap(baseUrl, page);
      res.set("Cache-Control", SITEMAP_CACHE).set("Surrogate-Control", "max-age=3600").type("application/xml").send(sitemap);
    } catch (e: any) {
      if (e.message === "Page out of range") return res.status(404).json({ error: "Page out of range" });
      res.status(500).json({ error: e.message });
    }
  });

   // ─── SEO meta tag injection (before tRPC and Vite catch-all) ────
  registerSeoRoutes(app);

  // ─── Newsletter one-click unsubscribe route ──────────────────────────
  registerNewsletterUnsubscribeRoute(app);

  // ─── CEO Dashboard (no-auth, obscured URL) ───────────────────────
  registerCeoDashboardRoute(app);

  // ─── Network Report API (API-key authenticated) ──────────────────
  registerNetworkReportRoute(app);

  // ─── Affiliate Redirect Tracker (/api/go/amazon) ─────────────────
  app.get("/api/go/amazon", async (req, res) => {
    const { url, slug, utm_source, utm_medium } = req.query as Record<string, string>;
    if (!url) { res.status(400).send("Missing url"); return; }
    const referrer = req.headers.referer || req.headers.referrer as string | undefined;
    const userAgent = req.headers["user-agent"];
    try {
      await logAffiliateClick({
        articleSlug: slug || undefined,
        targetUrl: url,
        referrer: referrer || undefined,
        userAgent: userAgent || undefined,
      });
    } catch { /* non-blocking */ }
    // Attribution: log affiliate_click conversion event
    const sessionId = req.cookies?._hsid || (req.headers.cookie?.match(/_hsid=([^;]+)/)?.[1]);
    if (sessionId) {
      recordConversionEvent({ sessionId, eventType: "affiliate_click", articleSlug: slug || undefined, eventMetadata: { url } }).catch(() => {});
      updateSessionConversionFlag(sessionId, "affiliateClick").catch(() => {});
    }
    res.redirect(302, url);
  });

  // ─── Sponsor Bar Redirect Tracker (/api/go/sponsor) ───────────────
  // ?slug=<articleSlug> — optional, for per-article attribution
  // ?dest=<url>         — fallback destination if sponsor_bar_url is not set in DB
  //                       (white-label deployments pass dest so the redirect always works)
  app.get("/api/go/sponsor", async (req, res) => {
    const { slug, dest } = req.query as Record<string, string>;
    const referrer = req.headers.referer || req.headers.referrer as string | undefined;
    const userAgent = req.headers["user-agent"];
    try {
      // DB setting takes priority; fall back to ?dest param for white-label deployments
      const sponsorUrlSetting = await getSetting("sponsor_bar_url");
      const sponsorUrl = (sponsorUrlSetting?.value) || dest || '';
      if (!sponsorUrl) { res.status(404).send("No sponsor URL configured"); return; }
      // Validate destination is a real URL before redirecting
      let destUrl: URL;
      try { destUrl = new URL(sponsorUrl); } catch {
        console.error('[Sponsor] Invalid destination URL:', sponsorUrl);
        res.status(400).send("Invalid sponsor URL"); return;
      }
      // Fire-and-forget click tracking — never block the redirect
      logAffiliateClick({
        articleSlug: slug || undefined,
        targetUrl: destUrl.href,
        clickType: 'sponsor',
        referrer: referrer || undefined,
        userAgent: userAgent || undefined,
      }).catch((e) => console.error('[Sponsor] logAffiliateClick error:', e));
      const sessionId = req.cookies?._hsid || (req.headers.cookie?.match(/_hsid=([^;]+)/)?.[1]);
      if (sessionId) {
        recordConversionEvent({ sessionId, eventType: "sponsor_click", articleSlug: slug || undefined }).catch(() => {});
      }
      res.redirect(302, destUrl.href);
    } catch (e) {
      console.error('[Sponsor] Click tracking error:', e);
      // Last-resort: if we have a dest param, redirect anyway rather than showing an error page
      if (dest) { try { res.redirect(302, dest); return; } catch { /* fall through */ } }
      res.status(500).send("Error");
    }
  });

  // ─── Article Sponsor Banner Redirect Tracker (/api/go/article-sponsor) ────
  // ?slug=<articleSlug>  — optional, for per-article attribution
  // ?variant=a|b         — A/B test variant
  // ?dest=<url>          — fallback destination if article_sponsor_url is not set in DB
  //                        (white-label deployments pass dest so the redirect always works)
  app.get("/api/go/article-sponsor", async (req, res) => {
    const { slug, variant, dest } = req.query as Record<string, string>;
    const referrer = req.headers.referer || req.headers.referrer as string | undefined;
    const userAgent = req.headers["user-agent"];
    try {
      // DB setting takes priority; fall back to ?dest param for white-label deployments
      const sponsorUrlSetting = await getSetting("article_sponsor_url");
      const sponsorUrl = (sponsorUrlSetting?.value) || dest || '';
      if (!sponsorUrl) { res.status(404).send("No article sponsor URL configured"); return; }
      // Validate destination is a real URL before redirecting
      let destUrl: URL;
      try { destUrl = new URL(sponsorUrl); } catch {
        console.error('[Article Sponsor] Invalid destination URL:', sponsorUrl);
        res.status(400).send("Invalid sponsor URL"); return;
      }
      // Determine click type: sponsor_a or sponsor_b for A/B tracking, legacy 'sponsor' otherwise
      const abEnabled = (await getSetting("article_sponsor_ab_test_enabled"))?.value === 'true';
      const clickType = abEnabled ? (variant === 'b' ? 'sponsor_b' : 'sponsor_a') : 'sponsor';
      // Fire-and-forget click tracking — never block the redirect
      logAffiliateClick({
        articleSlug: slug || undefined,
        targetUrl: destUrl.href,
        clickType,
        referrer: referrer || undefined,
        userAgent: userAgent || undefined,
      }).catch((e) => console.error('[Article Sponsor] logAffiliateClick error:', e));
      const sessionId = req.cookies?._hsid || (req.headers.cookie?.match(/_hsid=([^;]+)/)?.[1]);
      if (sessionId) {
        recordConversionEvent({ sessionId, eventType: "sponsor_click", articleSlug: slug || undefined }).catch(() => {});
      }
      res.redirect(302, destUrl.href);
    } catch (e) {
      console.error('[Article Sponsor] Click tracking error:', e);
      // Last-resort: if we have a dest param, redirect anyway rather than showing an error page
      if (dest) { try { res.redirect(302, dest); return; } catch { /* fall through */ } }
      res.status(500).send("Error");
    }
  });

  // ─── JS-Only Analytics Tracker (/api/track) ─────────────────────
  // v4.9.0: Client-side (JavaScript-only) page view tracking.
  // Only real browsers fire this endpoint — bots don't execute JS.
  // Accepts JSON body: { path, referrer, screenWidth, sessionId, timestamp }
  app.post("/api/track", async (req, res) => {
    try {
      const { path, referrer, screenWidth, sessionId, timestamp } = req.body as Record<string, string>;

      // Validate required fields
      if (!sessionId || !path) { res.status(400).end(); return; }

      // Validate session ID looks like a UUID (prevents injection)
      if (!/^[0-9a-f-]{32,36}$/i.test(sessionId)) { res.status(400).end(); return; }

      // Spam referrer filter
      if (referrer && await isSpamReferrer(referrer)) { res.status(204).end(); return; }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';

      // Fire-and-forget insert — never block the response
      insertJsPageView({
        path: path.slice(0, 2000),
        referrer: referrer || undefined,
        sessionId,
        screenWidth: screenWidth ? parseInt(screenWidth as unknown as string, 10) || undefined : undefined,
        ip: ip.slice(0, 45),
        timestamp: timestamp || undefined,
      }).catch(e => console.error('[JS Track] Insert error:', e));

      res.status(204).end();
    } catch (e) {
      console.error('[JS Track] Error:', e);
      res.status(204).end(); // Always 204 — never reveal errors to client
    }
  });

  // ─── Page View Tracker (/api/pv) ─────────────────────────────────
  // BUG FIX (Mar 3, 2026): The browser sets the HTTP Referer header to the
  // *current page URL* when making a beacon/fetch request, not the previous
  // page. We now read document.referrer from the request body (sent by the
  // client hook) which correctly captures where the user came FROM.
  app.post("/api/pv", async (req, res) => {
    try {
      const { slug, path, utm_source, utm_medium, referrer: bodyReferrer } = req.body as Record<string, string>;
      // Use body referrer (document.referrer from client) — correct traffic source.
      // HTTP header Referer is the current page URL, not the previous page.
      const referrer = bodyReferrer || undefined;
      const { source, medium } = classifyReferrer(referrer, utm_source, utm_medium);
      await logPageView({ articleSlug: slug || undefined, source, medium, referrer: referrer || undefined, path: path || undefined });
      res.json({ ok: true });
    } catch { res.json({ ok: false }); }
  });

  // ─── Attribution tracking endpoints (before tRPC) ─────────────────
  registerAttributionRoutes(app);
  registerStripeWebhookRoute(app);
  registerPrintifyWebhook(app);
  // ─── Article SSR (bypasses edge layer via /api/ prefix) ──────────
  registerArticleSsrRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Seed default data
  seedDefaultCategories().catch(e => console.warn("[Seed] Categories:", e));
  seedDefaultSettings().catch(e => console.warn("[Seed] Settings:", e));

  // Initialize the workflow scheduler
  setTimeout(() => {
    initScheduler().catch(e => console.warn("[Scheduler] Init:", e));
    initXQueue().catch(e => console.warn("[X Queue] Init:", e));
    initReplyScheduler().catch(e => console.warn("[X Reply] Init:", e));
    initAutoApproveTimer();
    initStandaloneTweetScheduler().catch(e => console.warn("[Standalone Tweet Scheduler] Init:", e));
    initMerchAvailabilityScheduler();
    initAdSpendSync();
    initSearchPerformanceSync();
    initNewsletterDigestScheduler();
    initDistributionScheduler();
    initProductionLoop();
    // v4.9.0: Hourly rollup of js_page_views into daily_analytics
    // Runs 5 minutes past each hour to ensure the previous hour's data is complete
    cron.schedule('0 5 * * * *', () => {
      rollupDailyAnalytics().catch(e => console.error('[Daily Analytics Rollup] Error:', e));
    });
  }, 10000); // Wait for DB to be ready (10s — reduces multi-instance race on rapid restarts)

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Global error handlers
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Suppress noisy but harmless errors:
    // 1. Analytics script placeholder not substituted in dev (Vite handles this at build time)
    // 2. Branding upload auth failures are expected preflights before login
    const isAnalyticsPlaceholder = err instanceof URIError && req.path?.includes("%VITE_ANALYTICS");
    if (isAnalyticsPlaceholder) {
      if (!res.headersSent) res.status(404).end();
      return;
    }

    console.error("[Server Error]", {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
    });
    
    if (res.headersSent) {
      return next(err);
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    
    server.close(async () => {
      console.log("[Shutdown] HTTP server closed");
      
      // Close database pool
      await closeDatabasePool();
      
      console.log("[Shutdown] Cleanup complete");
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("[Shutdown] Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  
  // Log unhandled errors
  process.on("uncaughtException", (error) => {
    console.error("[Uncaught Exception]", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    });
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Unhandled Rejection]", {
      timestamp: new Date().toISOString(),
      reason,
      promise,
    });
  });
}

startServer().catch((error) => {
  console.error("[Fatal] Failed to start server:", error);
  process.exit(1);
});
