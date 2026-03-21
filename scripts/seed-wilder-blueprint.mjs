/**
 * Wilder Blueprint v1.3.0 — Database Seed Script
 * Seeds categories, RSS feeds, and default settings into the new Manus webdev database.
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  { name: "Foreclosures",   slug: "foreclosures",   description: "Foreclosure investing and distressed properties", color: "#ef4444", icon: "🏚️" },
  { name: "Flipping",       slug: "flipping",       description: "House flipping strategies and case studies",       color: "#f97316", icon: "🔨" },
  { name: "Investing",      slug: "investing",      description: "Real estate investment strategies and tips",        color: "#eab308", icon: "📈" },
  { name: "ROI",            slug: "roi",            description: "Return on investment analysis and metrics",         color: "#22c55e", icon: "💰" },
  { name: "Agents",         slug: "agents",         description: "Real estate agents and industry news",              color: "#06b6d4", icon: "🤝" },
  { name: "Short Sales",    slug: "short-sales",    description: "Short sale strategies and opportunities",           color: "#3b82f6", icon: "📉" },
  { name: "Side Hustle",    slug: "side-hustle",    description: "Side hustle ideas and passive income",              color: "#8b5cf6", icon: "💼" },
  { name: "9-5",            slug: "9-5",            description: "Escaping the 9-5 grind and financial freedom",     color: "#ec4899", icon: "⏰" },
  { name: "Job Seekers",    slug: "job-seekers",    description: "Career advice and job market insights",             color: "#f43f5e", icon: "🔍" },
  { name: "Recession-Proof",slug: "recession-proof",description: "Recession-proof strategies and wealth protection",  color: "#14b8a6", icon: "🛡️" },
  { name: "Business",       slug: "business",       description: "Business news and entrepreneurship",                color: "#a855f7", icon: "🏢" },
];

console.log("Seeding categories...");
for (const cat of categories) {
  await db.execute(
    `INSERT INTO categories (name, slug, description, color)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), color=VALUES(color)`,
    [cat.name, cat.slug, cat.description, cat.color]
  );
}
console.log(`✓ ${categories.length} categories seeded`);

// ─── RSS Feeds ────────────────────────────────────────────────────────────────
const feeds = [
  // Foreclosures & Real Estate
  "https://www.housingwire.com/category/real-estate/feed",
  "https://www.calculatedriskblog.com/feeds/posts/default",
  "https://www.noradarealestate.com/feed",
  // Flipping
  "https://investfourmore.com/feed",
  "https://www.lexlevinrad.com/blog/feed",
  "https://retipster.com/feed",
  // Investing & ROI
  "https://www.biggerpockets.com/blog/feed",
  "https://www.reit.com/news/rss.xml",
  "https://www.cnbc.com/id/10000115/device/rss/rss.html",
  // Agents & Business
  "https://www.housingwire.com/feed",
  "https://www.inman.com/feed",
  "https://rismedia.com/blog/feed",
  "https://www.realtor.com/news/feed",
  "https://www.redfin.com/blog/feed",
  // Short Sales & Mortgage
  "https://www.housingwire.com/category/mortgage/feed",
  "https://www.mortgagenewsdaily.com/rss/full",
  "https://www.nationalmortgagenews.com/feed",
  "https://www.thetruthaboutmortgage.com/feed",
  // Side Hustle
  "https://www.makingsenseofcents.com/category/extra-income/feed",
  "https://dollarsprout.com/category/side-gigs-and-hustles/feed",
  "https://www.thewaystowealth.com/category/make-money/feed",
  "https://ratracerebellion.com/feed",
  // Job Seekers & 9-5
  "https://www.themuse.com/advice/rss",
  "https://www.flexjobs.com/blog/feed",
  // General News (existing)
  "https://feeds.theguardian.com/theguardian/world/rss",
  "https://feeds.reuters.com/reuters/businessNews",
  "https://rss.nytimes.com/services/xml/rss/nyt/RealEstate.xml",
];

console.log("Seeding RSS feed weights...");
for (const feedUrl of feeds) {
  await db.execute(
    `INSERT INTO rss_feed_weights (feedUrl, weight, enabled, errorCount)
     VALUES (?, 50, 1, 0)
     ON DUPLICATE KEY UPDATE weight=IF(weight=0, 50, weight)`,
    [feedUrl]
  );
}
console.log(`✓ ${feeds.length} RSS feeds seeded`);

// ─── Settings ─────────────────────────────────────────────────────────────────
const settings = [
  // Branding
  { key: "site_name",        value: "Wilder Blueprint",                          category: "branding",  type: "string" },
  { key: "site_tagline",     value: "Real Estate Satire & Investing Insights",   category: "branding",  type: "string" },
  { key: "site_description", value: "Satirical takes on real estate, foreclosures, flipping, and the hustle economy.", category: "branding", type: "string" },
  { key: "primary_color",    value: "#00FF00",                                   category: "branding",  type: "string" },
  { key: "secondary_color",  value: "#FFD700",                                   category: "branding",  type: "string" },
  { key: "logo_url",         value: "/logo.png",                                 category: "branding",  type: "string" },
  // Homepage
  { key: "homepage_show_ticker",          value: "true",  category: "homepage", type: "boolean" },
  { key: "homepage_show_trending",        value: "true",  category: "homepage", type: "boolean" },
  { key: "homepage_show_categories",      value: "true",  category: "homepage", type: "boolean" },
  { key: "homepage_show_sidebar",         value: "true",  category: "homepage", type: "boolean" },
  { key: "homepage_initial_article_count",value: "40",    category: "homepage", type: "number" },
  // RSS
  { key: "rss_feeds",        value: JSON.stringify(feeds),                       category: "rss",       type: "json" },
  { key: "google_news_enabled", value: "true",                                   category: "rss",       type: "boolean" },
  { key: "google_news_regions", value: "US,GB",                                  category: "rss",       type: "string" },
  // AI Generation
  { key: "ai_model",         value: "gpt-4o",                                    category: "ai",        type: "string" },
  { key: "articles_per_run", value: "10",                                        category: "workflow",  type: "number" },
  { key: "auto_publish",     value: "false",                                     category: "workflow",  type: "boolean" },
  // SEO
  { key: "seo_default_og_image", value: "/logo.png",                            category: "seo",       type: "string" },
];

console.log("Seeding workflow_settings...");
// Map branding/config settings to workflow_settings key-value store
for (const s of settings) {
  await db.execute(
    `INSERT INTO workflow_settings (\`key\`, value, category, type)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value=VALUES(value)`,
    [s.key, s.value, s.category, s.type]
  );
}
console.log(`✓ ${settings.length} settings seeded into workflow_settings`);

await db.end();
console.log("\n✅ Wilder Blueprint database seed complete!");
