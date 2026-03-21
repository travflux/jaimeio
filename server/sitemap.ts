import { getDb } from "./db";
import { articles, categories, tags } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ─── In-memory cache ─────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache: { sitemap: string | null; index: string | null; ts: number } = {
  sitemap: null,
  index: null,
  ts: 0,
};

function isCacheValid(): boolean {
  return Date.now() - cache.ts < CACHE_TTL_MS;
}

export function invalidateSitemapCache(): void {
  cache.sitemap = null;
  cache.index = null;
  cache.ts = 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDate(val: Date | string | number | null | undefined): string {
  if (!val) return new Date().toISOString().split("T")[0];
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0];
}

function isRecent(val: Date | string | number | null | undefined, days = 7): boolean {
  if (!val) return false;
  const d = val instanceof Date ? val : new Date(val);
  return Date.now() - d.getTime() < days * 24 * 60 * 60 * 1000;
}

function buildUrl(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

// ─── Static pages ────────────────────────────────────────────────────────────
// Only include public-facing pages with indexable content.
// Excluded: /search (search results not indexable), /admin/* (auth-gated),
//           /advertise, /careers, /privacy (low SEO value per CEO directive)
const STATIC_PAGES = [
  { path: "/",                     changefreq: "daily",   priority: "1.0" },
  { path: "/trending",             changefreq: "daily",   priority: "0.7" },
  { path: "/most-read",            changefreq: "daily",   priority: "0.7" },
  { path: "/latest",               changefreq: "daily",   priority: "0.7" },
  { path: "/about",                changefreq: "monthly", priority: "0.3" },
  { path: "/contact",              changefreq: "monthly", priority: "0.3" },
  { path: "/editorial-standards",  changefreq: "monthly", priority: "0.3" },
  { path: "/games",                changefreq: "weekly",  priority: "0.4" },
];

const MAX_URLS_PER_SITEMAP = 45_000; // stay under Google's 50K limit

// ─── Main sitemap (single file, up to MAX_URLS_PER_SITEMAP) ──────────────────
export async function generateSitemap(baseUrl: string): Promise<string> {
  if (isCacheValid() && cache.sitemap) return cache.sitemap;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split("T")[0];

  const [publishedArticles, allCategories] = await Promise.all([
    db.select().from(articles).where(eq(articles.status, "published")),
    db.select().from(categories),
  ]);

  const urlBlocks: string[] = [];

  // Fetch tags in parallel with articles and categories
  const allTags = await db.select({ slug: tags.slug, createdAt: tags.createdAt }).from(tags).orderBy(desc(tags.articleCount)).limit(5000);

  // Static pages
  for (const page of STATIC_PAGES) {
    urlBlocks.push(buildUrl(`${baseUrl}${page.path}`, today, page.changefreq, page.priority));
  }

  // Tag index and tag pages
  urlBlocks.push(buildUrl(`${baseUrl}/tags`, today, "daily", "0.6"));
  urlBlocks.push(buildUrl(`${baseUrl}/archive`, today, "weekly", "0.5"));
  for (const tag of allTags) {
    const lastmod = toDate(tag.createdAt);
    urlBlocks.push(buildUrl(
      `${baseUrl}/tag/${escapeXml(tag.slug)}`,
      lastmod,
      "daily",
      "0.5",
    ));
  }

  // Category pages
  for (const cat of allCategories) {
    urlBlocks.push(buildUrl(
      `${baseUrl}/category/${(cat as any).slug}`,
      today,
      "daily",
      "0.6",
    ));
  }

  // Article pages — use canonical /article/:slug URLs (not /api/article/)
  // /api/article/:slug is blocked by robots.txt; /article/:slug is the indexable canonical URL.
  // Edge layer confirmed fixed — clean URLs serve server-rendered HTML to crawlers without query params.
  const articleBlocks = publishedArticles.slice(0, MAX_URLS_PER_SITEMAP - urlBlocks.length).map((article: any) => {
    const lastmod = toDate(article.updatedAt || article.publishedAt || article.createdAt);
    return buildUrl(
      `${baseUrl}/article/${article.slug}`,
      lastmod,
      "never",
      "0.8",
    );
  });

  urlBlocks.push(...articleBlocks);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks.join("\n")}\n</urlset>`;
  cache.sitemap = xml;
  cache.ts = Date.now();
  return xml;
}

// ─── Sitemap index (for deployments with >45K articles) ──────────────────────
export async function generateSitemapIndex(baseUrl: string): Promise<string> {
  if (isCacheValid() && cache.index) return cache.index;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split("T")[0];
  const [publishedArticles] = await Promise.all([
    db.select({ id: (articles as any).id }).from(articles).where(eq(articles.status, "published")),
  ]);

  const totalArticles = publishedArticles.length;
  const articleSitemapCount = Math.ceil(totalArticles / MAX_URLS_PER_SITEMAP);

  const sitemapEntries: string[] = [
    `  <sitemap>\n    <loc>${escapeXml(`${baseUrl}/sitemap.xml`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
  ];

  for (let i = 1; i <= articleSitemapCount; i++) {
    sitemapEntries.push(
      `  <sitemap>\n    <loc>${escapeXml(`${baseUrl}/sitemap-articles-${i}.xml`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join("\n")}\n</sitemapindex>`;
  cache.index = xml;
  return xml;
}

// ─── Paginated article sitemap ────────────────────────────────────────────────
export async function generateArticleSitemap(baseUrl: string, page: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offset = (page - 1) * MAX_URLS_PER_SITEMAP;
  const publishedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, "published"))
    .limit(MAX_URLS_PER_SITEMAP)
    .offset(offset);

  if (publishedArticles.length === 0) throw new Error("Page out of range");

  // Edge layer confirmed fixed — clean URLs serve server-rendered HTML to crawlers without query params.
  const urlBlocks = publishedArticles.map((article: any) => {
    const lastmod = toDate(article.updatedAt || article.publishedAt || article.createdAt);
    const recent = isRecent(article.publishedAt || article.createdAt);
    return buildUrl(
      `${baseUrl}/article/${article.slug}`,
      lastmod,
      "never",
      recent ? "0.9" : "0.7",
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks.join("\n")}\n</urlset>`;
}
