import type { Express } from "express";
import { listArticles, getSettingsByCategory } from "./db";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\n\n+/g, "\n\n").trim();
}

export function registerRssFeed(app: Express) {
  app.get("/api/rss", async (req, res) => {
    try {
      const { articles: items } = await listArticles({
        status: "published",
        limit: 100000, // no practical cap — return all published articles
        offset: 0,
      });

      // Use SITE_URL env var so the feed always shows the public domain,
      // not the internal Cloud Run hostname that req.get("host") returns.
      const baseUrl = (process.env.SITE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      const now = new Date().toUTCString();

      // Load branding from database
      const brandingSettings = await getSettingsByCategory("branding");
      const brandMap = Object.fromEntries(brandingSettings.map(s => [s.key, s.value]));
      const siteName = brandMap.brand_site_name || "News";
      const tagline = brandMap.brand_tagline || "The Latest News";
      const siteDescription = brandMap.brand_description || `${siteName} — ${tagline}`;

      const itemsXml = items
        .map((article) => {
          const link = `${baseUrl}/article/${article.slug}`;
          const pubDate = article.publishedAt
            ? new Date(article.publishedAt).toUTCString()
            : new Date(article.createdAt).toUTCString();
          const description = article.subheadline
            ? escapeXml(article.subheadline)
            : escapeXml(stripHtml(article.body).slice(0, 300) + "...");

          let imageTag = "";
          if (article.featuredImage) {
            imageTag = `\n        <enclosure url="${escapeXml(article.featuredImage)}" type="image/png" length="0" />`;
          }

          return `    <item>
      <title>${escapeXml(article.headline)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>${imageTag}
    </item>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} - ${escapeXml(tagline)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl)}/api/rss" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeXml(baseUrl)}/favicon.ico</url>
      <title>${escapeXml(siteName)}</title>
      <link>${escapeXml(baseUrl)}</link>
    </image>
${itemsXml}
  </channel>
</rss>`;

      res.set("Content-Type", "application/rss+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=900"); // cache 15 min
      res.send(xml);
    } catch (e: any) {
      console.error("[RSS] Error generating feed:", e);
      res.status(500).send("Error generating RSS feed");
    }
  });
}
