/**
 * Google News Sitemap — last 48 hours of published articles.
 * Google News requires articles be < 48h old.
 * Served at /news-sitemap.xml (outside /api/ to avoid robots.txt Disallow).
 * White-label compatible: reads brand_site_name from settings.
 */

import { getDb, getSetting } from "./db";
import { articles } from "../drizzle/schema";
import { eq, gte, desc, and } from "drizzle-orm";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateNewsSitemap(baseUrl: string): Promise<string> {
  const database = await getDb();
  if (!database) return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"/>';

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const siteNameSetting = await getSetting("brand_site_name");
  const siteName = siteNameSetting?.value || process.env.VITE_APP_TITLE || "";

  const rows = await database
    .select({
      slug: articles.slug,
      headline: articles.headline,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      gte(articles.publishedAt, cutoff)
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(1000);

  const urls = rows.map(r => {
    const pubDate = r.publishedAt ? new Date(r.publishedAt).toISOString() : new Date().toISOString();
    return `  <url>
    <loc>${escapeXml(`${baseUrl}/article/${r.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(r.headline)}</news:title>
    </news:news>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.join("\n")}
</urlset>`;
}
