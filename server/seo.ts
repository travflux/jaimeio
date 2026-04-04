/**
 * Server-Side SEO Meta Tag Injection
 *
 * Intercepts requests to public-facing pages and injects article-specific
 * meta tags, Open Graph tags, JSON-LD structured data, and canonical URLs
 * directly into the HTML before it reaches the browser.
 *
 * This ensures Google and social crawlers see fully populated meta tags
 * without needing to execute JavaScript.
 */

import { type Express } from "express";
import fs from "fs";
import path from "path";
import { getArticleBySlug, getSetting, getRecentPublishedArticles, getArticlesByCategory } from "./db";

// ─── HTML template loader ─────────────────────────────────────────────────────

function getHtmlTemplate(): string {
  // Try production build path first, then dev source path
  const candidates = [
    path.resolve(import.meta.dirname, "public", "index.html"),
    path.resolve(import.meta.dirname, "..", "..", "client", "index.html"),
    path.resolve(import.meta.dirname, "..", "client", "index.html"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf-8");
    }
  }
  // Minimal fallback
  return `<!doctype html><html><head></head><body><div id="root"></div></body></html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function getBrandingSettings() {
  const [siteName, tagline, description, siteUrl, ogImage, editorialTeam, mascotUrl, genre] =
    await Promise.all([
      getSetting("brand_site_name"),
      getSetting("brand_tagline"),
      getSetting("brand_description"),
      getSetting("site_url"),
      getSetting("brand_og_image"),
      getSetting("brand_editorial_team"),
      getSetting("brand_mascot_url"),
      getSetting("brand_genre"),
    ]);
  return {
    siteName: siteName?.value || process.env.VITE_APP_TITLE || "",
    tagline: tagline?.value || "The News, Remastered",
    description:
      description?.value ||
      "Your source for the latest news and commentary.",
    siteUrl: (siteUrl?.value || "https://example.com").replace(/\/$/, ""),
    ogImage: ogImage?.value || "/og-image.jpg",
    editorialTeam: editorialTeam?.value || "Editorial Team",
    mascotUrl: mascotUrl?.value || "",
    genre: genre?.value || "news",
  };
}

// ─── Meta tag builders ────────────────────────────────────────────────────────

function buildArticleMetaTags(params: {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt: string;
  modifiedAt: string;
  siteName: string;
  editorialTeam: string;
  mascotUrl: string;
  siteUrl: string;
}): string {
  const { title, description, image, url, publishedAt, modifiedAt, siteName, editorialTeam, mascotUrl, siteUrl } = params;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: description,
    image: image,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: {
      "@type": "Organization",
      name: editorialTeam,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      logo: {
        "@type": "ImageObject",
        url: mascotUrl.startsWith("http") ? mascotUrl : `${siteUrl}${mascotUrl}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  });

  return `
    <!-- SEO: Dynamic meta tags injected server-side -->
    <title>${escapeHtml(title)} | ${escapeHtml(siteName)}</title>
    <meta name="description" content="${escapeHtml(truncate(description, 160))}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(truncate(title, 95))}" />
    <meta property="og:description" content="${escapeHtml(truncate(description, 200))}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="article:published_time" content="${escapeHtml(publishedAt)}" />
    <meta property="article:modified_time" content="${escapeHtml(modifiedAt)}" />
    <meta property="article:author" content="${escapeHtml(editorialTeam)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(truncate(title, 70))}" />
    <meta name="twitter:description" content="${escapeHtml(truncate(description, 200))}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${jsonLd}</script>`;
}

function buildDefaultMetaTags(params: {
  pageTitle: string;
  description: string;
  siteUrl: string;
  ogImage: string;
  pagePath: string;
}): string {
  const { pageTitle, description, siteUrl, ogImage, pagePath } = params;
  const url = `${siteUrl}${pagePath}`;
  const image = ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`;

  return `
    <!-- SEO: Default meta tags injected server-side -->
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(truncate(description, 160))}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(truncate(description, 200))}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(truncate(description, 200))}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />`;
}

/**
 * Injects a hidden crawl-path nav block before </body>.
 * Googlebot follows these links to discover and index article pages.
 * The block is visually hidden (display:none) so it doesn't affect UX.
 */
function buildCrawlLinks(articles: Array<{ slug: string; headline: string }>, siteUrl: string): string {
  if (!articles.length) return "";
  const links = articles
    .map(a => `    <a href="${escapeHtml(`${siteUrl}/article/${a.slug}`)}">${escapeHtml(a.headline)}</a>`)
    .join("\n");
  return `\n<nav id="seo-articles" style="display:none" aria-hidden="true">\n${links}\n</nav>`;
}

function buildCategoryCrawlLinks(articles: Array<{ slug: string; headline: string }>, siteUrl: string): string {
  if (!articles.length) return "";
  const links = articles
    .map(a => `    <a href="${escapeHtml(`${siteUrl}/article/${a.slug}`)}">${escapeHtml(a.headline)}</a>`)
    .join("\n");
  return `\n<nav id="seo-category-articles" style="display:none" aria-hidden="true">\n${links}\n</nav>`;
}

function injectMetaTags(html: string, metaTags: string): string {
  // Strip existing title, description, og:*, twitter:*, canonical, and ld+json from template
  const cleaned = html
    .replace(/<title>[^<]*<\/title>/gi, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+property="article:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");

  return cleaned.replace("</head>", `${metaTags}\n  </head>`);
}

// ─── Express route registration ───────────────────────────────────────────────

export function registerSeoRoutes(app: Express) {
  // ── Article pages ──────────────────────────────────────────────────────────
  app.get("/article/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const [article, branding] = await Promise.all([
        getArticleBySlug(slug),
        getBrandingSettings(),
      ]);

      if (!article || article.status !== "published") {
        return next(); // Let React handle 404
      }

      const siteUrl = branding.siteUrl;
      const url = `${siteUrl}/article/${article.slug}`;
      const title = article.headline;
      const description = article.subheadline
        ? article.subheadline
        : truncate(stripHtml(article.body), 160);
      const publishedAt = (article.publishedAt || article.createdAt).toISOString();
      const modifiedAt = (article.updatedAt || article.publishedAt || article.createdAt).toISOString();

      let image = article.featuredImage || "";
      if (image && !image.startsWith("http")) image = `${siteUrl}${image}`;
      if (!image) {
        image = branding.ogImage.startsWith("http")
          ? branding.ogImage
          : `${siteUrl}${branding.ogImage}`;
      }

      const metaTags = buildArticleMetaTags({
        title,
        description,
        image,
        url,
        publishedAt,
        modifiedAt,
        siteName: branding.siteName,
        editorialTeam: branding.editorialTeam,
        mascotUrl: branding.mascotUrl,
        siteUrl,
      });

      const html = injectMetaTags(getHtmlTemplate(), metaTags);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  // ── Category pages ─────────────────────────────────────────────────────────
  app.get("/category/:slug", async (req, res, next) => {
    try {
      const branding = await getBrandingSettings();
      const categorySlug = req.params.slug;

      // Fix 2: Return 404 for non-existent category slugs
      const { categories: categoriesTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { getDb } = await import("./db");
      const database = await getDb();
      if (database) {
        const [cat] = await database.select().from(categoriesTable).where(eq(categoriesTable.slug, categorySlug)).limit(1);
        if (!cat) {
          // Category not in global table — may be a license-level category
          // Pass through to SPA which handles per-license categories
          return next();
        }
      }

      const categoryName = categorySlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const [metaTags, categoryArticles] = await Promise.all([
        Promise.resolve(buildDefaultMetaTags({
          pageTitle: `${categoryName} | ${branding.siteName}`,
          // Fix 3: Use branding.genre instead of hardcoded "satire and commentary"
          description: `${categoryName} ${branding.genre} from ${branding.siteName}. ${branding.description}`,
          siteUrl: branding.siteUrl,
          ogImage: branding.ogImage,
          pagePath: `/category/${categorySlug}`,
        })),
        getArticlesByCategory(categorySlug, 20),
      ]);

      const crawlLinks = buildCategoryCrawlLinks(categoryArticles, branding.siteUrl);
      let html = await getHtmlWithBrand(req.hostname || req.headers.host?.split(":")[0] || "", metaTags);
      if (crawlLinks) html = html.replace("</body>", `${crawlLinks}\n</body>`);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  // ── Tag pages ─────────────────────────────────────────────────────────────
  app.get("/tag/:slug", async (req, res, next) => {
    try {
      const branding = await getBrandingSettings();
      const tagSlug = req.params.slug;

      const { tags: tagsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { getDb } = await import("./db");
      const database = await getDb();

      let tagName = tagSlug.replace(/-/g, " ");
      let tagArticleCount = 0;

      if (database) {
        const [tag] = await database
          .select({ name: tagsTable.name, articleCount: tagsTable.articleCount })
          .from(tagsTable)
          .where(eq(tagsTable.slug, tagSlug))
          .limit(1);
        if (!tag) {
          const notFoundTags = buildDefaultMetaTags({
            pageTitle: "Tag Not Found",
            description: "This tag does not exist.",
            siteUrl: branding.siteUrl,
            ogImage: branding.ogImage,
            pagePath: `/tag/${tagSlug}`,
          });
          res.status(404).set({ "Content-Type": "text/html" }).end(injectMetaTags(getHtmlTemplate(), notFoundTags));
          return;
        }
        tagName = tag.name;
        tagArticleCount = tag.articleCount ?? 0;
      }

      const metaTags = buildDefaultMetaTags({
        pageTitle: `#${tagName} | ${branding.siteName}`,
        description: `Browse ${tagArticleCount > 0 ? `${tagArticleCount} ` : ""}articles tagged "${tagName}" on ${branding.siteName}. ${branding.description}`,
        siteUrl: branding.siteUrl,
        ogImage: branding.ogImage,
        pagePath: `/tag/${tagSlug}`,
      });

      const html = injectMetaTags(getHtmlTemplate(), metaTags);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  // ── Tags index ────────────────────────────────────────────────────────────
  app.get("/tags", async (req, res, next) => {
    try {
      const branding = await getBrandingSettings();
      const metaTags = buildDefaultMetaTags({
        pageTitle: `Browse Topics | ${branding.siteName}`,
        description: `Explore all topics and tags on ${branding.siteName}. Find articles by subject, theme, or keyword.`,
        siteUrl: branding.siteUrl,
        ogImage: branding.ogImage,
        pagePath: "/tags",
      });
      const html = injectMetaTags(getHtmlTemplate(), metaTags);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  // ── Archive page ──────────────────────────────────────────────────────────
  app.get("/archive", async (req, res, next) => {
    try {
      const branding = await getBrandingSettings();
      const metaTags = buildDefaultMetaTags({
        pageTitle: `Archive | ${branding.siteName}`,
        description: `Browse the complete ${branding.siteName} archive by month and year.`,
        siteUrl: branding.siteUrl,
        ogImage: branding.ogImage,
        pagePath: "/archive",
      });
      const html = injectMetaTags(getHtmlTemplate(), metaTags);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  // ── Homepage ───────────────────────────────────────────────────────────────
  app.get("/", async (req, res, next) => {
    try {
      const [branding, recentArticles] = await Promise.all([
        getBrandingSettings(),
        getRecentPublishedArticles(20),
      ]);

      const metaTags = buildDefaultMetaTags({
        pageTitle: `${branding.siteName} — ${branding.tagline}`,
        description: branding.description,
        siteUrl: branding.siteUrl,
        ogImage: branding.ogImage,
        pagePath: "/",
      });

      const crawlLinks = buildCrawlLinks(recentArticles, branding.siteUrl);
      let html = await getHtmlWithBrand(req.hostname || req.headers.host?.split(":")[0] || "", metaTags);
      if (crawlLinks) html = html.replace("</body>", `${crawlLinks}\n</body>`);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });
}

// ─── Brand-aware HTML template (appended for SSR brand injection) ─────────
import { getBrandSsrData as _getBrandSsrData, injectBrandTheme as _injectBrandTheme } from './publicPageSsr';

export async function getHtmlWithBrand(hostname: string, metaTags: string): Promise<string> {
  let html = injectMetaTags(getHtmlTemplate(), metaTags);
  try {
    const brandData = await _getBrandSsrData(hostname);
    html = _injectBrandTheme(html, brandData);
  } catch { /* non-blocking */ }
  return html;
}
