/**
 * Article SSR — Full Newspaper-Aesthetic Server-Rendered Page (v3 — publish trigger)
 *
 * /article/:slug → canonical URL; SSR for crawlers, SPA for browsers
 * /article/:slug     → known crawlers get SSR HTML; human browsers get React SPA
 *
 * The SSR page matches the site design: masthead, category nav, full
 * article layout, related articles, and footer — all in raw HTML with no JS
 * required to see content.
 *
 * Canonical URL: /article/:slug  (indexed by Google, shared on social)
 * Sitemap URLs:  /article/:slug  (via /content-sitemap.xml)
 */

import { type Express, type Request, type Response, type NextFunction } from "express";
import { getArticleBySlug, getSetting, getMostReadArticles, listCategories } from "./db";
import { eq, and, ne } from "drizzle-orm";
import { articles } from "../drizzle/schema";
import { getDb } from "./db";

// ─── Bot / crawler detection ──────────────────────────────────────────────────

const BOT_UA_PATTERNS = [
  /googlebot/i, /google-inspectiontool/i, /adsbot-google/i,
  /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /sogou/i, /exabot/i,
  /facebot/i, /facebookexternalhit/i, /twitterbot/i,
  /linkedinbot/i, /whatsapp/i, /slackbot/i, /telegrambot/i,
  /discordbot/i, /pinterest/i, /applebot/i,
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i,
  /archive\.org_bot/i,
  /^curl\//i, /^wget\//i, /python-requests/i, /go-http-client/i,
  /node-fetch/i, /axios/i,
];

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERNS.some(p => p.test(userAgent));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return (str || "")
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
  return (str || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function getBranding() {
  const [siteName, tagline, description, siteUrl, ogImage, editorialTeam, twitterUrl, commentsEnabled, disqusShortname, disclaimer] =
    await Promise.all([
      getSetting("brand_site_name"),
      getSetting("brand_tagline"),
      getSetting("brand_description"),
      getSetting("site_url"),
      getSetting("brand_og_image"),
      getSetting("brand_editorial_team"),
      getSetting("brand_twitter_url"),
      getSetting("article_comments_enabled"),
      getSetting("disqus_shortname"),
      getSetting("brand_disclaimer"),
    ]);
  return {
    siteName: siteName?.value || process.env.VITE_APP_TITLE || "",
    tagline: tagline?.value || "AI-Powered Content, Automated",
    description: description?.value || "Your source for the latest news and commentary.",
    siteUrl: (siteUrl?.value || "https://example.com").replace(/\/$/, ""),
    ogImage: ogImage?.value || "/og-image.jpg",
    editorialTeam: editorialTeam?.value || "Editorial Team",
    twitterUrl: twitterUrl?.value || "https://x.com/yourbrand",
    commentsEnabled: commentsEnabled?.value === "true",
    disqusShortname: disqusShortname?.value || "",
    disclaimer: disclaimer?.value || "",
  };
}

async function getRelatedArticles(currentSlug: string, categoryId: number | null, limit = 3) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { desc } = await import("drizzle-orm");
    let rows: any[];
    if (categoryId) {
      rows = await db.select({
        id: articles.id,
        headline: articles.headline,
        slug: articles.slug,
        featuredImage: articles.featuredImage,
        publishedAt: articles.publishedAt,
        subheadline: articles.subheadline,
      })
        .from(articles)
        .where(and(
          eq(articles.status, "published" as any),
          eq(articles.categoryId, categoryId),
          ne(articles.slug, currentSlug),
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(limit);
    } else {
      rows = [];
    }
    if (rows.length < limit) {
      const { desc: d2 } = await import("drizzle-orm");
      const extra = await db.select({
        id: articles.id,
        headline: articles.headline,
        slug: articles.slug,
        featuredImage: articles.featuredImage,
        publishedAt: articles.publishedAt,
        subheadline: articles.subheadline,
      })
        .from(articles)
        .where(and(
          eq(articles.status, "published" as any),
          ne(articles.slug, currentSlug),
        ))
        .orderBy(d2(articles.publishedAt))
        .limit(limit - rows.length + 3);
      const existingIds = new Set(rows.map((r: any) => r.id));
      for (const r of extra) {
        if (!existingIds.has(r.id) && rows.length < limit) rows.push(r);
      }
    }
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

// ─── SSR HTML builder ─────────────────────────────────────────────────────────

function buildArticleHtml(params: {
  headline: string;
  subheadline: string | null;
  body: string;
  slug: string;
  featuredImage: string;
  publishedAt: string;
  modifiedAt: string;
  categoryName: string | null;
  categorySlug: string | null;
  siteName: string;
  tagline: string;
  description: string;
  siteUrl: string;
  editorialTeam: string;
  twitterUrl: string;
  ogImage: string;
  navCategories: Array<{ name: string; slug: string }>;
  relatedArticles: Array<{
    headline: string;
    slug: string;
    featuredImage: string | null;
    subheadline: string | null;
    publishedAt: Date | null;
  }>;
  commentsEnabled?: boolean;
  disqusShortname?: string;
  disclaimer?: string;
  isApiRoute?: boolean;
  geoSchema?: string;
  geoFaq?: string;
  geoSummary?: string;
  geoSpeakable?: string;
}): string {
  const {
    headline, subheadline, body, slug, featuredImage,
    publishedAt, modifiedAt, categoryName, categorySlug,
    siteName, tagline, description, siteUrl, editorialTeam,
    twitterUrl, ogImage,
    navCategories, relatedArticles,
    commentsEnabled = false, disqusShortname = "", disclaimer = "",
  } = params;

  const canonicalUrl = `${siteUrl}/article/${slug}`;
  const desc = subheadline ? subheadline : truncate(stripHtml(body), 160);
  const image = featuredImage || (ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`);
  const logoAbsUrl = ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const pubDate = new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Ensure dates are in full ISO 8601 format with timezone (Google recommends this)
  function toIso(val: string): string {
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toISOString();
    } catch { return val; }
  }

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description: desc,
    // Google recommends an array of images; wrap single image in array
    image: [image],
    datePublished: toIso(publishedAt),
    dateModified: toIso(modifiedAt),
    // author.url helps Google disambiguate the author — link to the site for org authors
    author: {
      "@type": "Organization",
      name: editorialTeam || process.env.VITE_APP_TITLE || "Editorial Team",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      // publisher.url is recommended by Google
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: logoAbsUrl,
        // Google recommends logo dimensions for publisher logos
        width: 600,
        height: 60,
      },
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#key-takeaways", "h1", ".article-subheadline", ".geo-speakable"]
    },
    timeRequired: "PT" + Math.max(1, Math.ceil(stripHtml(body).split(/\s+/).length / 200)) + "M",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
  });

  // GEO data from stored fields
  const geoJsonLd = params.geoSchema || "";
  const geoFaqSchema = (() => {
    if (!params.geoFaq) return "";
    try {
      const faq = JSON.parse(params.geoFaq);
      if (!Array.isArray(faq) || faq.length === 0) return "";
      return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item: any) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    } catch { return ""; }
  })();
  const geoSummary = params.geoSummary || "";
  const geoSpeakable = params.geoSpeakable || "";
  const geoFaqItems: Array<{question: string; answer: string}> = (() => {
    try { return params.geoFaq ? JSON.parse(params.geoFaq) : []; }
    catch { return []; }
  })();

  // Convert HTML body to readable paragraphs
  const paragraphs = body
    .split(/<\/p>/i)
    .map(p => p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(p => p.length > 0);

  const paragraphsHtml = paragraphs
    .map(p => `        <p>${escapeHtml(p)}</p>`)
    .join("\n");

  // Nav categories HTML
  const navCatsHtml = navCategories.map(cat => `
          <a href="${escapeHtml(siteUrl)}/category/${escapeHtml(cat.slug)}" class="nav-link">${escapeHtml(cat.name)}</a>`).join("");

  // Related articles HTML
  const relatedHtml = relatedArticles.length > 0 ? `
    <section class="related-section">
      <h2 class="related-title">More From ${escapeHtml(siteName)}</h2>
      <div class="related-grid">
        ${relatedArticles.map(r => {
          const rImg = r.featuredImage || "";
          const rDate = r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
          return `
        <a href="${escapeHtml(siteUrl)}/article/${escapeHtml(r.slug)}" class="related-card">
          ${rImg ? `<div class="related-img-wrap"><img src="${escapeHtml(rImg)}" alt="${escapeHtml(r.headline)}" loading="lazy" class="related-img"></div>` : `<div class="related-img-wrap related-img-placeholder"></div>`}
          <div class="related-card-body">
            ${rDate ? `<span class="related-date">${rDate}</span>` : ""}
            <h3 class="related-headline">${escapeHtml(r.headline)}</h3>
            ${r.subheadline ? `<p class="related-sub">${escapeHtml(truncate(r.subheadline, 100))}</p>` : ""}
          </div>
        </a>`;
        }).join("")}
      </div>
    </section>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(headline)} | ${escapeHtml(siteName)}</title>
  <meta name="description" content="${escapeHtml(truncate(desc, 160))}">\n  ${params.isApiRoute ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow">'}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(truncate(headline, 95))}">
  <meta property="og:description" content="${escapeHtml(truncate(desc, 200))}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="article:published_time" content="${escapeHtml(publishedAt)}">
  <meta property="article:modified_time" content="${escapeHtml(modifiedAt)}">
  <meta property="article:author" content="${escapeHtml(editorialTeam)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(truncate(headline, 70))}">
  <meta name="twitter:description" content="${escapeHtml(truncate(desc, 200))}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <!-- JSON-LD NewsArticle -->
  <script type="application/ld+json">${geoJsonLd || jsonLd}</script>
  ${geoFaqSchema ? `<script type="application/ld+json">${geoFaqSchema}</script>` : ""}

  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; -webkit-text-size-adjust: 100%; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #faf9f7;
      color: #1a1a1a;
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; height: auto; display: block; }

    /* ── Layout ── */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1.25rem; }
    @media (min-width: 640px) { .container { padding: 0 2rem; } }
    @media (min-width: 1024px) { .container { padding: 0 2.5rem; } }

    /* ── Utility bar ── */
    .util-bar {
      background: #1a1a1a;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .util-bar .container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
    .util-bar a { color: #fff; opacity: 0.7; transition: opacity 0.2s; }
    .util-bar a:hover { opacity: 1; }

    /* ── Masthead ── */
    .masthead {
      text-align: center;
      padding: 2.5rem 1.25rem 1.5rem;
      border-bottom: 3px double #1a1a1a;
    }
    .masthead-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #1a1a1a;
      line-height: 1;
    }
    .masthead-title a { color: inherit; }
    .masthead-title a:hover { color: #9a1d22; }
    .masthead-tagline {
      font-size: 11px;
      color: #888;
      margin-top: 0.5rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      font-weight: 500;
    }

    /* ── Category nav ── */
    .cat-nav {
      background: #1a1a1a;
      color: #fff;
      position: sticky;
      top: 0;
      z-index: 50;
      border-top: 1px solid #333;
      border-bottom: 1px solid #333;
    }
    .cat-nav .container {
      display: flex;
      align-items: center;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .cat-nav .container::-webkit-scrollbar { display: none; }
    .nav-link {
      flex-shrink: 0;
      padding: 0.75rem 1rem;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255,255,255,0.6);
      transition: color 0.2s;
      white-space: nowrap;
    }
    .nav-link:hover { color: #fff; }
    .nav-link.active { color: #9a1d22; }

    /* ── Article layout ── */
    .article-wrap {
      max-width: 820px;
      margin: 0 auto;
      padding: 2.5rem 1.25rem 3rem;
    }
    @media (min-width: 640px) { .article-wrap { padding: 3rem 2rem 4rem; } }

    /* Category tag */
    .cat-tag {
      display: inline-block;
      background: #9a1d22;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0.25rem 0.6rem;
      border-radius: 2px;
      margin-bottom: 1rem;
    }
    .cat-tag:hover { background: #7a1519; }

    /* Headline */
    .article-headline {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.75rem, 4vw, 2.75rem);
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -0.01em;
      color: #1a1a1a;
      margin-bottom: 1rem;
    }

    /* Subheadline */
    .article-sub {
      font-size: 1.2rem;
      color: #555;
      font-style: italic;
      line-height: 1.5;
      margin-bottom: 1.25rem;
      font-family: 'Playfair Display', Georgia, serif;
    }

    /* Byline / meta */
    .article-meta {
      font-size: 13px;
      color: #888;
      padding-bottom: 1.25rem;
      margin-bottom: 1.75rem;
      border-bottom: 2px solid #1a1a1a;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .article-meta .sep { opacity: 0.4; }
    .article-meta .byline { font-weight: 600; color: #444; }

    /* Hero image */
    .hero-img {
      width: 100%;
      border-radius: 4px;
      margin-bottom: 2rem;
      aspect-ratio: 16/9;
      object-fit: cover;
    }

    /* Article body */
    .article-body p {
      font-size: 1.05rem;
      line-height: 1.85;
      margin-bottom: 1.4em;
      color: #222;
    }
    .article-body p:first-child::first-letter {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 3.5rem;
      font-weight: 900;
      float: left;
      line-height: 0.8;
      margin-right: 0.1em;
      margin-top: 0.1em;
      color: #9a1d22;
    }

    /* Share bar */
    .share-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e5e5;
      flex-wrap: wrap;
    }
    .share-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #888;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.9rem;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .share-btn:hover { opacity: 0.8; }
    .share-btn-x { background: #000; color: #fff; }
    .share-btn-fb { background: #1877f2; color: #fff; }
    .share-btn-copy { background: #f0f0f0; color: #333; cursor: pointer; }

    /* ── Related articles ── */
    .related-section {
      max-width: 820px;
      margin: 0 auto;
      padding: 0 1.25rem 3rem;
      border-top: 3px double #1a1a1a;
    }
    @media (min-width: 640px) { .related-section { padding: 0 2rem 4rem; } }
    .related-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: #1a1a1a;
      margin: 2rem 0 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e5e5e5;
    }
    .related-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 640px) {
      .related-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .related-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: opacity 0.2s;
    }
    .related-card:hover { opacity: 0.8; }
    .related-img-wrap {
      aspect-ratio: 16/9;
      overflow: hidden;
      border-radius: 4px;
      background: #e5e5e5;
    }
    .related-img-placeholder { background: #e5e5e5; }
    .related-img { width: 100%; height: 100%; object-fit: cover; }
    .related-card-body { display: flex; flex-direction: column; gap: 0.35rem; }
    .related-date { font-size: 11px; color: #999; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .related-headline {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
      color: #1a1a1a;
    }
    .related-sub { font-size: 13px; color: #666; line-height: 1.4; }

    /* ── Footer ── */
    .site-footer {
      background: #1a1a1a;
      color: #fff;
      margin-top: 2rem;
    }
    .footer-accent { height: 4px; background: linear-gradient(to right, #9a1d22, rgba(154,29,34,0.4), transparent); }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 3.5rem 1.25rem 2rem;
    }
    @media (min-width: 640px) { .footer-inner { padding: 3.5rem 2rem 2rem; } }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
    @media (min-width: 640px) { .footer-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }
    .footer-brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
    }
    .footer-brand-desc { font-size: 14px; opacity: 0.55; line-height: 1.6; }
    .footer-social { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
    .footer-social-btn {
      width: 36px; height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      display: flex; align-items: center; justify-content: center;
      opacity: 0.6;
      transition: opacity 0.2s, background 0.2s;
      color: #fff;
    }
    .footer-social-btn:hover { opacity: 1; background: #9a1d22; border-color: #9a1d22; }
    .footer-col-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      opacity: 0.45;
      margin-bottom: 1rem;
    }
    .footer-link {
      display: block;
      font-size: 14px;
      opacity: 0.6;
      margin-bottom: 0.65rem;
      transition: opacity 0.2s, padding-left 0.2s;
    }
    .footer-link:hover { opacity: 1; padding-left: 4px; }
    .footer-newsletter-form { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .footer-newsletter-input {
      flex: 1;
      padding: 0.6rem 0.875rem;
      border-radius: 6px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      font-size: 14px;
      font-family: inherit;
    }
    .footer-newsletter-input::placeholder { color: rgba(255,255,255,0.35); }
    .footer-newsletter-btn {
      padding: 0.6rem 1rem;
      border-radius: 6px;
      background: #9a1d22;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    .footer-newsletter-btn:hover { background: #7a1519; }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
      text-align: center;
    }
    @media (min-width: 640px) {
      .footer-bottom { flex-direction: row; justify-content: space-between; text-align: left; }
    }
    .footer-copy { font-size: 13px; opacity: 0.35; }
    .footer-disclaimer { font-size: 12px; opacity: 0.25; font-style: italic; }

    /* ── Responsive ── */
    @media (max-width: 639px) {
      .util-bar .date-str { display: none; }
    }
  </style>
</head>
<body>

  <!-- Utility bar -->
  <div class="util-bar">
    <div class="container">
      <span class="date-str">${escapeHtml(today)}</span>
      <a href="${escapeHtml(siteUrl)}">Home</a>
    </div>
  </div>

  <!-- Masthead -->
  <div class="masthead">
    <div class="masthead-title"><a href="${escapeHtml(siteUrl)}">${escapeHtml(siteName)}</a></div>
    <p class="masthead-tagline">${escapeHtml(tagline)}</p>
  </div>

  <!-- Category nav -->
  <nav class="cat-nav" aria-label="Site sections">
    <div class="container">
      <a href="${escapeHtml(siteUrl)}/latest" class="nav-link">Latest</a>${navCatsHtml}
    </div>
  </nav>

  <!-- Article -->
  <main>
    <article class="article-wrap" itemscope itemtype="https://schema.org/NewsArticle">

      ${categoryName && categorySlug
        ? `<a href="${escapeHtml(siteUrl)}/category/${escapeHtml(categorySlug)}" class="cat-tag">${escapeHtml(categoryName)}</a>`
        : ""}

      <h1 class="article-headline" itemprop="headline">${escapeHtml(headline)}</h1>

      ${subheadline ? `<p class="article-sub" itemprop="description">${escapeHtml(subheadline)}</p>` : ""}

      <div class="article-meta">
        <span class="byline" itemprop="author">${escapeHtml(editorialTeam)}</span>
        <span class="sep">·</span>
        <time itemprop="datePublished" datetime="${escapeHtml(publishedAt)}">${pubDate}</time>
        <meta itemprop="publisher" content="${escapeHtml(siteName)}">
      </div>

      ${image ? `<img class="hero-img" src="${escapeHtml(image)}" alt="${escapeHtml(headline)}" itemprop="image" loading="eager">` : ""}

      <div class="article-body" itemprop="articleBody">
${paragraphsHtml}
      </div>

      <!-- Share bar -->
      <div class="share-bar">
        <span class="share-label">Share</span>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(truncate(headline, 100))}" target="_blank" rel="noopener noreferrer" class="share-btn share-btn-x">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Post
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}" target="_blank" rel="noopener noreferrer" class="share-btn share-btn-fb">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Share
        </a>
      </div>

    </article>

    ${commentsEnabled && disqusShortname ? `
    <!-- Disqus Comments -->
    <section class="article-comments" style="max-width:780px;margin:2.5rem auto 0;padding:0 1.5rem;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.25rem;font-weight:700;margin-bottom:1.5rem;border-top:2px solid #1a1a1a;padding-top:1.5rem;">Comments</h2>
      <div id="disqus_thread"></div>
      <script>
        var disqus_config = function () {
          this.page.url = '${canonicalUrl}';
          this.page.identifier = '${slug}';
        };
        (function() {
          var d = document, s = d.createElement('script');
          s.src = 'https://${disqusShortname}.disqus.com/embed.js';
          s.setAttribute('data-timestamp', +new Date());
          (d.head || d.body).appendChild(s);
        })();
      <\/script>
      <noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript" rel="nofollow">comments powered by Disqus.</a></noscript>
    </section>` : ''}

    ${geoSummary ? `
    <div class="geo-takeaway" style="margin:2rem 0;padding:1.25rem 1.5rem;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-left:4px solid #10b981;border-radius:0 12px 12px 0;">
      <p class="geo-speakable" style="font-weight:600;color:#065f46;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">Key Takeaway</p>
      <p style="font-size:1.05rem;line-height:1.6;color:#1a1a1a;margin:0;">${escapeHtml(geoSummary)}</p>
    </div>` : ""}
    ${geoFaqItems.length > 0 ? `
    <section class="geo-faq" style="margin:2.5rem 0;padding:0;" itemscope itemtype="https://schema.org/FAQPage">
      <h2 style="font-family:'Playfair Display',serif;font-size:1.5rem;margin-bottom:1.25rem;color:#1a1a1a;">Frequently Asked Questions</h2>
      ${geoFaqItems.map((faq: any) => `
      <details style="margin-bottom:0.75rem;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <summary style="padding:1rem 1.25rem;font-weight:600;cursor:pointer;background:#f9fafb;font-size:1rem;" itemprop="name">${escapeHtml(faq.question)}</summary>
        <div style="padding:1rem 1.25rem;line-height:1.6;color:#374151;" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text" style="margin:0;">${escapeHtml(faq.answer)}</p>
        </div>
      </details>`).join("")}
    </section>` : ""}
    ${relatedHtml}
  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-accent"></div>
    <div class="footer-inner">
      <div class="footer-grid">
        <!-- Brand -->
        <div>
          <div class="footer-brand-name">${escapeHtml(siteName)}</div>
          <p class="footer-brand-desc">${escapeHtml(description)}</p>
          <div class="footer-social">
            <a href="${escapeHtml(twitterUrl)}" target="_blank" rel="noopener noreferrer" class="footer-social-btn" aria-label="Follow on X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="${escapeHtml(siteUrl)}/api/rss" target="_blank" rel="noopener noreferrer" class="footer-social-btn" aria-label="RSS Feed">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
            </a>
          </div>
        </div>

        <!-- Sections -->
        <div>
          <div class="footer-col-title">Sections</div>
          <a href="${escapeHtml(siteUrl)}/latest" class="footer-link">Latest</a>
          ${navCategories.map(cat => `<a href="${escapeHtml(siteUrl)}/category/${escapeHtml(cat.slug)}" class="footer-link">${escapeHtml(cat.name)}</a>`).join("\n          ")}
        </div>

        <!-- Company -->
        <div>
          <div class="footer-col-title">Company</div>
          <a href="${escapeHtml(siteUrl)}/about" class="footer-link">About</a>
          <a href="${escapeHtml(siteUrl)}/contact" class="footer-link">Contact</a>
          <a href="${escapeHtml(siteUrl)}/advertise" class="footer-link">Advertise</a>
          <a href="${escapeHtml(siteUrl)}/privacy" class="footer-link">Privacy &amp; Terms</a>
          <a href="${escapeHtml(siteUrl)}/editorial-standards" class="footer-link">Editorial Standards</a>
          <a href="${escapeHtml(siteUrl)}/api/rss" class="footer-link">RSS Feed</a>
        </div>

        <!-- Newsletter -->
        <div>
          <div class="footer-col-title">Newsletter</div>
          <p style="font-size:14px;opacity:0.55;line-height:1.6;margin-bottom:0.75rem;">Get the best delivered to your inbox, curated by ${escapeHtml(siteName)}.</p>
          <form class="footer-newsletter-form" action="${escapeHtml(siteUrl)}/api/trpc/newsletter.subscribe" method="post" onsubmit="return false;">
            <input type="email" placeholder="your@email.com" class="footer-newsletter-input" aria-label="Email address">
            <button type="submit" class="footer-newsletter-btn">Join</button>
          </form>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(siteName)}. All rights reserved.</p>
        ${disclaimer ? `<p class="footer-disclaimer">${escapeHtml(disclaimer)}</p>` : ""}
      </div>
    </div>
  </footer>

</body>
</html>`;
}

// ─── Shared handler ───────────────────────────────────────────────────────────

async function handleArticleRequest(
  slug: string,
  res: Response,
  next: NextFunction,
  isApiRoute: boolean = false
): Promise<void> {
  try {
    const [article, branding, navCategories] = await Promise.all([
      getArticleBySlug(slug),
      getBranding(),
      listCategories(),
    ]);

    if (!article || article.status !== "published") {
      next();
      return;
    }

    // Fetch category name
    let categoryName: string | null = null;
    let categorySlug: string | null = null;
    if (article.categoryId) {
      const cat = navCategories.find((c: any) => c.id === article.categoryId);
      if (cat) {
        categoryName = cat.name;
        categorySlug = cat.slug;
      }
    }

    // Fetch related articles
    const relatedArticles = await getRelatedArticles(slug, article.categoryId ?? null);

    const publishedAt = (article.publishedAt || article.createdAt).toISOString();
    const modifiedAt = (article.updatedAt || article.publishedAt || article.createdAt).toISOString();
    let featuredImage = article.featuredImage || "";
    if (featuredImage && !featuredImage.startsWith("http")) {
      featuredImage = `${branding.siteUrl}${featuredImage}`;
    }

    const html = buildArticleHtml({
      headline: article.headline,
      subheadline: article.subheadline || null,
      body: article.body,
      slug: article.slug,
      featuredImage,
      publishedAt,
      modifiedAt,
      categoryName,
      categorySlug,
      siteName: branding.siteName,
      tagline: branding.tagline,
      description: branding.description,
      siteUrl: branding.siteUrl,
      editorialTeam: branding.editorialTeam,
      twitterUrl: branding.twitterUrl,
      ogImage: branding.ogImage,
      navCategories: navCategories.map((c: any) => ({ name: c.name, slug: c.slug })),
      relatedArticles,
      commentsEnabled: branding.commentsEnabled,
      disqusShortname: branding.disqusShortname,
      disclaimer: branding.disclaimer,
      isApiRoute,
      geoSchema: article.geoSchema ?? undefined,
      geoFaq: article.geoFaq ?? undefined,
      geoSummary: article.geoSummary ?? undefined,
      geoSpeakable: article.geoSpeakable ?? undefined,
    });

    // /api/article/:slug is the internal SSR endpoint — tell Google the canonical is /article/:slug
    const robotsTag = isApiRoute ? "noindex, follow" : "index, follow";
    res
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": isApiRoute ? "public, max-age=86400" : "public, max-age=300, stale-while-revalidate=60",
        "X-Robots-Tag": robotsTag,
      })
      .end(html);
  } catch (e: any) {
    next(e);
  }
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerArticleSsrRoutes(app: Express): void {
  /**
   * Dynamic rendering on /article/:slug
   * - Known crawlers (Googlebot, Twitterbot, curl, etc.) → full SSR HTML
   * - Human browsers → pass through to React SPA via next()
   */
  app.get("/article/:slug", async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] || "";
    if (!isCrawler(ua)) {
      next();
      return;
    }
    await handleArticleRequest(req.params.slug, res, next);
  });

  /**
   * /api/article/:slug
   * - Browser/bot requests → 301 redirect to /article/:slug (canonical URL)
   * - Internal server calls (Accept: application/json, or X-Internal header) → SSR HTML as before
   *
   * This preserves all query params (UTM tags, etc.) through the redirect.
   * 1,284 X posts link to /api/article/:slug — the 301 makes them all work and
   * passes link equity to the canonical /article/:slug URL.
   */
  app.get("/api/article/:slug", async (req: Request, res: Response, next: NextFunction) => {
    const accept = req.headers["accept"] || "";
    const isInternal = req.headers["x-internal"] === "1" || accept.includes("application/json");

    if (isInternal) {
      // Internal server-to-server calls (CEO dashboard, tRPC, etc.) — serve SSR HTML directly
      await handleArticleRequest(req.params.slug, res, next, true);
      return;
    }

    // Browser or bot — 301 redirect to canonical URL, preserving query string
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const canonical = `/article/${req.params.slug}${qs}`;
    res
      .set("Cache-Control", "public, max-age=86400")
      .redirect(301, canonical);
  });
}
