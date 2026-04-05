/**
 * JAIME.IO Version Manager
 * 
 * Tracks engine versions and manages updates for white-label deployments.
 */

import fs from "fs";
import path from "path";

export interface EngineVersion {
  version: string;
  releaseDate: Date;
  changelog: string[];
  breaking: boolean;
  minLicenseVersion?: string;
}

export interface DeploymentInfo {
  engineVersion: string;
  clientName: string;
  domain: string;
  deployedAt: Date;
  lastUpdated?: Date;
  licenseKey?: string;
}

const CURRENT_VERSION = "5.9.0";

const VERSION_HISTORY: EngineVersion[] = [
  {
    version: "1.0.0",
    releaseDate: new Date("2026-02-19"),
    changelog: [
      "Initial release of JAIME.IO Engine",
      "White-label configuration system",
      "Automated content workflow",
      "Multi-provider media generation",
      "Social media auto-posting",
      "Admin dashboard and optimizer",
      "Command palette with keyboard shortcuts",
    ],
    breaking: false,
  },
  {
    version: "1.1.0",
    releaseDate: new Date("2026-02-23"),
    changelog: [
      "Amazon Native Shopping Ads integration with article-specific product recommendations",
      "Article content validation system to prevent malformed JSON and missing content",
      "Bulk migration tool for parsing JSON article bodies to HTML",
      "Backend JSON parsing for improved article rendering performance",
      "Amazon ads loading animation for better user experience",
      "Real-time validation warnings in article editor",
      "Admin migration page at /admin/migration with preview and execution",
      "15 new validation tests + 5 JSON parsing tests",
    ],
    breaking: false,
  },
  {
    version: "1.2.0",
    releaseDate: new Date("2026-02-25"),
    changelog: [
      "Category system redesign with 12 curated categories and detailed descriptions",
      "Feed management system with weighting, health monitoring, and auto-disable",
      "Image watermarking with mascot + URL overlay and batch processing",
      "Landing pages for Trending Now, Most Read, and Editor's Picks with auto-population",
      "Article page sidebar reorganization with stacked widgets (Trending, Most Read, Goodies)",
      "Homepage layout improvements: eliminated white space, expanded mid-feature to 6 articles",
      "Admin panel navigation upgrade with organized tabs and status badges",
      "Feed source order randomization toggle with optimistic updates",
      "Amazon affiliate link replacement for native shopping ads",
      "Category banner consistency using solid color backgrounds",
      "Bug fixes: feed toggles persistence, watermark rendering, dashboard counts",
    ],
    breaking: false,
  },
  {
    version: "1.3.0",
    releaseDate: new Date("2026-02-26"),
    changelog: [
      "Latest page at /latest with category and date range filters, Load More pagination",
      "Mobile homepage white space fix: resolved invisible articles caused by scroll animation on tall sections",
      "Admin feed widget mobile responsiveness with responsive sort buttons and card layout",
      "Check & Reactivate feature for bulk-testing and re-enabling disabled RSS feeds",
      "Homepage initial article count now configurable via admin settings (default: 40)",
      "30 new RSS feeds added targeting underrepresented categories (Sports, Science, Finance, Lifestyle, Trends)",
      "Article source attribution redesigned: replaced source URL with 'Inspired by real news on [date]'",
      "SEO title length optimization to meet 30-60 character best practice",
      "CSS safety-net animation to prevent invisible content from failed IntersectionObserver triggers",
      "Release process documentation (RELEASE-PROCESS.md) for consistent version management",
    ],
    breaking: false,
  },
  {
    version: "1.4.0",
    releaseDate: new Date("2026-02-28"),
    changelog: [
      "SEO infrastructure fully deployed: article pages serve complete HTML with meta tags, schema markup, and sitemap",
      "Article pages crawlable by Google with OG tags, Twitter cards, JSON-LD NewsArticle schema, canonical URLs",
      "Edge layer workaround: all crawlable content served via /api/article/:slug routes",
      "CEO Dashboard live at /api/briefing-room-m4x1q (no-auth, obscured URL)",
      "Image generation pipeline fixed: now calls image API instead of placeholder, respects style settings",
      "Backfill missing images feature: background job with real-time progress, article log, cancel button",
      "Missing images badge in Articles admin header with count and link to backfill panel",
      "No Image filter chip on Articles list to quickly view articles missing featured images",
      "Auto-refresh missing images badge when backfill job completes",
      "Multi-run scheduler: up to 3 workflow runs per day (5 AM / 11 AM / 5 PM) targeting 50 articles/day",
      "Games and horoscopes schedulers fixed: word scramble, trivia quiz, mad libs now initialize and run on schedule",
      "All 10 game/horoscope settings keys seeded in database with backfill for existing installs",
      "Standalone tweet scheduler REST API endpoints added",
      "860+ articles now fully SEO-optimized and shareable on social with proper previews",
    ],
    breaking: false,
  },
  {
    version: "2.0.0",
    releaseDate: new Date("2026-03-02"),
    changelog: [
      "Merch Store Phase 1: Printify-backed print-on-demand storefront with MerchSidebar on article pages, /shop/:slug store page, email capture modal, and Admin → Settings → Merch Store",
      "Adsterra Sponsor Bar: slim strip on all public pages, /api/go/sponsor click tracker, Admin → Settings → Sponsor Bar, CEO Dashboard split click counts",
      "CEO Dashboard upgrades: §2 X queue status + last post time, §3 first-party analytics with source breakdown, §7 sponsor + merch lead counts, §9 Promotion Candidates",
      "X duplicate post fix: unique DB index on social_posts(articleId, platform), cascade delete on article deletion, postsToday/lastPostTime persist across restarts",
      "Content pipeline scaling: RSS feed weights as authoritative source, selector window 80→200, headline dedup (3-day window), 4 runs/day cap, topic clustering",
      "LLM model selector in Admin → Generation with 8 model options and free-text input",
      "Dynamic sitemap with per-article priority, sitemap index for large deployments, invalidateSitemapCache() wired to article publish",
      "Article-specific SEO keywords extracted from headline; usePageSEO hook on all 15+ public pages",
      "Fully configurable LLM prompts: system prompt, user message, and event selector prompt from Admin → Generation; article preview panel",
      "Amazon affiliate dynamic keyword-based search URLs with category-aware mappings and click tracking",
      "First-party analytics: page_views + affiliate_clicks DB tables, /api/pv beacon, UTM tagging on X posts",
      "XFollowAd and NewsletterAd components with sidebar/inline/above-footer variants on every public page",
      "X Promotion Candidates system with composite scoring, 6 configurable settings, Admin → Settings → Promotion",
      "White-label hardening: image provider defaults to none (no accidental credit bleed), all Hambry hardcodes removed from engine files, WHITELABEL.md + CUSTOMIZABLE_FILES.md + scripts/upgrade.sh",
      "UI/UX: homepage hero 6-card secondary column, Latest from the Wire compact list, unified ad widget styling, card hover animations",
      "Bug fixes: crossword scheduler idempotency, analytics proxy URIError handling, branding upload log noise",
    ],
    breaking: true,
  },
  {
    version: "3.0.0",
    releaseDate: new Date("2026-03-06"),
    changelog: [
      "9-screen Setup Wizard: complete first-run configuration covering Brand, Content Engine, Image/Video, Categories, Social Media, Email/SMS/Monetization, Schedule, SEO, and Review & Launch",
      "Content Generation Prompt: single transparent textarea replaces fragmented voice/style/custom prompt system — what you see is exactly what the AI receives (article_llm_system_prompt)",
      "Social Distribution Engine: unified distribution_queue table, platform adapters for X, Reddit, Facebook, Instagram, Bluesky, Threads, LinkedIn, hardcoded rate governor, feedback collector",
      "Platform enable/disable toggles: dist_enabled_{platform} settings control which platforms receive posts, respected by getEnabledPlatforms()",
      "X credential fix: xTwitterService.ts now reads from platform_credentials table with env var fallback — white-label X posting works",
      "Schedule key fix: wizard now uses correct schedule_hour/schedule_minute/schedule_run2_hour etc. keys matching scheduler.ts",
      "Image/Video provider fix: dropdown values match engine expectations (manus/openai/replicate/custom, not built_in/openai_dalle)",
      "Image aspect ratio, video style prompt, video duration, video aspect ratio configurable from wizard",
      "Article Categories screen: manage categories with add/edit/delete and category quotas toggle",
      "Newsletter digest via Resend with weekly cron, CAN-SPAM compliant unsubscribe",
      "SMS/Text marketing via Twilio with TCPA compliance, quiet hours, frequency caps",
      "Google News Sitemap at /news-sitemap.xml (outside /api/)",
      "IndexNow key file served at root for instant Bing/Yandex indexing",
      "Homepage and category pages inject SSR article links for Googlebot crawl path",
      "Admin sidebar reorganized into 6 collapsible groups (Overview, Content, Social, Monetization, Tools, System)",
      "setup_checklist table with version-aware feature tracking",
      "platform_credentials table consolidating all API keys in one place",
      "distribution_queue table with engagement tracking columns",
      "reddit_subreddit_map table with per-subreddit rate limiting",
      "sms_subscribers table with TCPA-compliant opt-in tracking",
      "35 dead settings keys archived from seed defaults",
      "White-label brand cleanup: 4 remaining hardcoded Hambry references removed from active code",
    ],
    breaking: true,
  },
  {
    version: "3.0.1",
    releaseDate: new Date("2026-03-06"),
    changelog: [
      "HOTFIX: Purged all Hambry-specific values from DEFAULT_SETTINGS seed — brand_site_name, brand_tagline, brand_description, brand_genre, brand_twitter_handle, brand_twitter_url, brand_facebook_url, brand_instagram_url, brand_editor_email, brand_privacy_email, brand_legal_email, brand_corrections_email, brand_moderation_email, brand_mascot_name, brand_editorial_team, brand_company_name, brand_content_type all now seed as empty strings",
      "HOTFIX: seedDefaultSettings backfill no longer uses onDuplicateKeyUpdate — existing values are never overwritten on server restart",
      "HOTFIX: useBranding.ts DEFAULTS purged of all Hambry-specific fallback values",
      "HOTFIX: Home.tsx SEO useEffect now reads tagline/description/seoKeywords from branding hook instead of hardcoded satire strings",
      "HOTFIX: NewsletterAd.tsx three hardcoded satire copy strings replaced with branding.tagline/description reads",
      "HOTFIX: og-tags.ts default title/description fallbacks cleared to empty strings",
      "HOTFIX: organization-schema.ts HAMBRY_ORGANIZATION name/description now empty strings",
      "HOTFIX: 9 page components — hardcoded 'Satirical News, Sharp Commentary' defaultTitle replaced with siteName",
      "HOTFIX: getEnabledPlatforms() now respects dist_enabled_x=false even when X env vars are present",
      "HOTFIX: dist_enabled_x backfill SQL — live DB stale false value corrected to true",
      "Screen 1: brand_genre (Content Genre) field added as required field in Section A",
      "Screen 9: Goodies & Games screen added (10-screen wizard) — horoscopes, crossword, word scramble, trivia, mad libs, article comments",
      "Screen 9: Article Comments toggle with conditional Disqus shortname field",
      "Screen 9: Select All / Deselect All buttons with live enabled counter",
      "Screen 10 (Review): Goodies summary card added showing enabled feature count",
      "Screen 10 (Review): Comments critical check — flags missing Disqus shortname when comments enabled",
      "ArticlePage.tsx: DisqusEmbed component renders after ad banner when article_comments_enabled=true and disqus_shortname is set",
      "articleSsr.ts: Disqus embed injected into server-rendered article HTML for SEO-safe comment thread",
      "Admin sidebar: Setup Wizard pinned to top with accent highlight and Start badge",
      "Breaking news bar: color changed from bg-primary to bg-secondary for white-label compatibility",
      "Favicon: injected from brand_favicon_url setting via useEffect in App.tsx",
    ],
    breaking: false,
  },
  {
    version: "4.0.0",
    releaseDate: new Date("2026-03-07"),
    changelog: [
      "v4.0 Phase 1: selector_candidates table — multi-source candidate pipeline replaces direct RSS-to-selector flow",
      "v4.0 Phase 2: Google News source module — configurable queries, priority scoring, Wizard Screen 2 integration",
      "v4.0 Phase 2: Manual topic injection endpoint and admin dashboard widget",
      "v4.0 Phase 3: X/Twitter listener module (twitter-api-v2, every 15 min)",
      "v4.0 Phase 3: Reddit listener module (public JSON API, every 30 min)",
      "v4.0 Phase 4: YouTube agent module (YouTube Data API v3, every 60 min)",
      "v4.0 Phase 4: Web scraper module (Cheerio, configurable CSS selectors, every 60 min)",
      "v4.0 Phase 5: /admin/sources — Source Management page with enable/disable, Fetch Now, candidate pool stats",
      "v4.0 Phase 6: /admin/candidates — Candidate review interface with approve/reject, bulk actions, filters",
      "AI selector prompt: source type labels and SOURCE DIVERSITY soft constraint injected per batch",
    ],
    breaking: false,
  },
  {
    version: "4.1.0",
    releaseDate: new Date("2026-03-08"),
    changelog: [
      "Tagging system: tags and article_tags tables, tagging.ts service, auto-tagging in workflow pipeline",
      "Tag pages: /tag/:slug, /tags index, tag pills on article pages, /admin/tags management",
      "Tag-based related articles: tag overlap scoring with category fallback",
      "Archive browser: /archive page with month sidebar and article grid",
      "Search: DB-side word-by-word relevance scorer replaces in-memory Levenshtein",
      "Search: tagSlug, sortBy, cursor, didYouMean params added to search.enhanced endpoint",
      "Trending Topics widget on homepage sidebar",
      "Sitemap: /tag/:slug, /tags, /archive pages added",
      "CEO Dashboard: candidate pool source breakdown table in \u00a74 Content Inventory",
      "CEO Dashboard: image generation success rate sub-section in \u00a74 Content Inventory",
      "Image pipeline: broken /mascot.png fallback removed; aspect ratio wired to all providers",
      "Image pipeline: image_llm_system_prompt setting added; style seeds changed to generic professional defaults",
      "Prompt sanitizer: narrowed to hard-rejection only; news vocabulary preserved",
      "White-label: All SatireEngine/SatireEngineBot User-Agent strings replaced with VITE_APP_TITLE env var",
      "White-label: brand_disclaimer setting added; Footer/XFollowAd/ShopPage use branding.genre",
      "SSR: /tag/:slug, /tags, /archive routes added to seo.ts for crawler-friendly meta tags",
    ],
    breaking: false,
  },
  {
    version: "4.2.0",
    releaseDate: new Date("2026-03-08"),
    changelog: [
      "Licensing system: license_key and license_tier settings, /api/license/verify endpoint, LicenseBadge component",
      "Admin → Settings → License screen with tier display and key entry",
      "Wizard Screen 1: license key field with real-time validation",
      "CEO Dashboard §8 Financial Summary: license tier, revenue targets, sponsor/merch/newsletter counts",
      "Article image generation: per-article retry button in admin article list",
      "Image provider fallback chain: primary → fallback provider on generation failure",
      "Sponsor bar article-level banner (ArticleSponsorBanner) with per-article click tracking",
      "Admin → Settings → Sponsor Bar: article banner enable/disable, label, logo, click URL",
      "White-label: image provider defaults to 'none' to prevent accidental credit bleed on new installs",
    ],
    breaking: false,
  },
  {
    version: "4.3.0",
    releaseDate: new Date("2026-03-08"),
    changelog: [
      "Admin redesign: tabbed Settings page replaces flat list, organized into Brand, Content, Media, Social, Monetization, SEO, Advanced",
      "Setup Wizard: all 10 screens reviewed and aligned with new settings key names",
      "keysForScreen map in AdminSetup.tsx: each tab shows only its relevant settings",
      "Branding upload: logo and mascot image upload via S3 with CDN URL injection",
      "Loading screen: brand_loading_style (spinner/logo/none), loading_logo_url, loading_text settings",
      "Google Analytics: brand_gtag_id setting, gtag.js injected in App.tsx when set",
      "CEO Dashboard §1 Company Snapshot: version, license tier, article count, X followers",
    ],
    breaking: false,
  },
  {
    version: "4.4.0",
    releaseDate: new Date("2026-03-09"),
    changelog: [
      "X (Twitter) standalone takes: 5-10 pure joke tweets per day with no article link",
      "X reply engine: responds to trending topics with Hambry-voice commentary",
      "X follower count live display in footer and CEO Dashboard §2",
      "Distribution queue: engagement tracking columns (likes, comments, shares, clicks, checked_at)",
      "Distribution queue: removed_at column for tracking deleted posts",
      "Reddit distribution: per-subreddit rate limiting with reddit_subreddit_map table",
      "Admin → Social → Distribution: queue viewer with status filters and retry actions",
      "CEO Dashboard §2 X Performance: standalone takes count, reply count, engagement totals",
    ],
    breaking: false,
  },
  {
    version: "4.5.0",
    releaseDate: new Date("2026-03-09"),
    changelog: [
      "Newsletter: Resend integration with weekly digest, CAN-SPAM footer, unsubscribe link",
      "Newsletter: subscriber management in Admin → Monetization → Newsletter",
      "Newsletter: CEO Dashboard §5 Newsletter section with subscriber count and last send date",
      "SMS marketing: Twilio integration with TCPA compliance, quiet hours, frequency caps",
      "SMS: sms_subscribers table with opt-in tracking",
      "Merch store: Printify product sync, /shop page, MerchSidebar on article pages",
      "Merch store: email capture modal, Admin → Monetization → Merch Store",
      "Amazon affiliate: dynamic keyword-based search URLs with category-aware mappings",
    ],
    breaking: false,
  },
  {
    version: "4.6.0",
    releaseDate: new Date("2026-03-09"),
    changelog: [
      "Branded card image type: SVG-based article share card with site name, headline, category, and logo",
      "Watermark image type: original article image with text overlay (site URL + logo)",
      "Image type selector in Admin → Settings → Media: original/branded_card/watermark/sponsor_card",
      "sponsor_card as third real_image_fallback option alongside branded_card and watermark",
      "Article image workflow: image_type setting controls which image variant is stored and shared",
      "CEO Dashboard §4 Content Inventory: image type breakdown table",
    ],
    breaking: false,
  },
  {
    version: "4.7.0",
    releaseDate: new Date("2026-03-09"),
    changelog: [
      "SEO infrastructure: IndexNow key file at root, /api/indexnow/submit endpoint",
      "Google Search Console integration: OAuth flow, site verification, performance data in CEO Dashboard §6",
      "Bing Webmaster Tools: API key setting, IndexNow submission on article publish",
      "Sitemap: /news-sitemap.xml for Google News, sitemap index for large deployments",
      "CEO Dashboard §6 SEO Status: GSC impressions/clicks/CTR, IndexNow submission count, sitemap article count",
      "usePageSEO hook on all 15+ public pages for consistent meta tag management",
      "Article SSR: JSON-LD NewsArticle schema, canonical URL, OG/Twitter card tags on every article",
    ],
    breaking: false,
  },
  {
    version: "4.8.0",
    releaseDate: new Date("2026-03-09"),
    changelog: [
      "Microsoft Clarity: brand_clarity_id setting, useClarity hook, Clarity script injected in App.tsx when set",
      "Candidate pool throughput tracking: throughput24h stats in CEO Dashboard §4",
      "Auto-approve workflow: configurable auto-approve threshold, auto-approve toggle in Admin → Content",
      "Workflow settings table: workflow_settings for runtime-configurable engine behavior",
      "Distribution queue: platform_post_id column for tracking external post IDs",
      "X posting: post ID stored in distribution_queue for engagement polling",
      "CEO Dashboard §4: candidate pool source breakdown, image generation success rate",
    ],
    breaking: false,
  },
  {
    version: "4.8.6",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Branded card + watermark: Inter font (Regular + Bold) embedded as base64 via fontLoader.ts — eliminates box-glyph rendering on servers without system fonts",
      "sponsor_card added as third real_image_fallback option (alongside branded_card and watermark)",
      "sponsor_card_enabled, sponsor_card_label, sponsor_card_logo_url, sponsor_card_click_url settings added",
      "image_watermark_enabled, image_watermark_text settings added",
      "All new media settings added to keysForScreen.media in AdminSetup.tsx",
    ],
    breaking: false,
  },
  {
    version: "4.8.7",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Sponsor bar redirect fix: /api/go/sponsor and /api/go/article-sponsor now accept ?dest= fallback param",
      "DB setting takes priority for redirect URL; dest param used when DB has no URL configured",
      "Click tracking is now fire-and-forget — DB errors can no longer block the redirect",
      "URL validation (new URL()) added before redirect to catch malformed values",
      "SponsorBar.tsx and ArticleSponsorBanner.tsx updated to pass dest in every tracking link",
      "Fixes sponsor bar links on white-label deployments with empty or misconfigured sponsor_bar_url",
    ],
    breaking: false,
  },  {
    version: "5.0.0",
    releaseDate: new Date("2026-04-01"),
    changelog: [
      "Migrated image and file storage from Manus proxy to AWS S3",
      "Added staging environment with isolated deploy pipeline",
      "Added production promotion workflow with version bumping",
      "Removed Manus-specific storage dependencies",
      "Confirmed and fixed LLM provider routing",
      "Added S3 and LLM connection test endpoints",
      "deploy.sh script with rolling container updates and deploy log",
    ],
    breaking: true,
  },

  {
    version: "4.9.0",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "JS-only analytics tracker: client-side beacon (POST /api/track) fires on every route change",
      "Bot traffic excluded: bots don't execute JavaScript, so only real human visits are counted",
      "UUID session IDs in localStorage with 30-minute inactivity timeout for unique visitor tracking",
      "Spam referrer blocklist: hardcoded common spam domains + DB setting analytics_spam_referrer_blocklist",
      "js_page_views table: path, referrer, source, session_id, screen_width, ip, viewed_at",
      "daily_analytics rollup table: date, unique_visitors, page_views, source breakdown",
      "Hourly cron rolls up js_page_views into daily_analytics",
      "CEO Dashboard §3 rewritten: JS-verified traffic at top (UV/PV today/7d/30d, sources, daily bar chart)",
      "Legacy server-side analytics demoted below with 'includes bot traffic' note",
      "Microsoft Clarity confirmed live since v4.8.0 — brand_clarity_id setting, useClarity hook",
      "Branded card + watermark Inter fonts confirmed embedded via fontLoader.ts since v4.8.6",
    ],
    breaking: false,
  },
  {
    version: "4.9.1",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Powered by Hambry Engine footer link: subtle attribution link in footer bottom row",
      "DB-controlled via powered_by_url setting (default: https://hambryengine.com, category: branding)",
      "White-label opt-out: clear powered_by_url in Admin → Settings → Brand to remove the link",
      "Styling: 11px text, 20% opacity, centered below copyright row, opens in new tab with rel=noopener",
      "poweredByUrl added to BrandingConfig interface and useBranding key mapping",
      "No new tRPC procedure needed — branding.get already returns all branding-category settings",
    ],
    breaking: false,
  },
  {
    version: "4.9.2",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Version manager sync fix: CURRENT_VERSION was stuck at 4.1.0 while package.json was at 4.9.1",
      "Added missing VERSION_HISTORY entries for 4.2.0 through 4.9.1 with accurate changelogs",
      "White-label upgrade checker now shows correct current version and available updates",
      "New vitest test: CURRENT_VERSION must match package.json version (prevents future drift)",
      "New vitest test: VERSION_HISTORY must be sorted ascending with no duplicates",
    ],
    breaking: false,
  },
  {
    version: "4.9.3",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Admin sidebar: CEO Dashboard moved to top of System group (was floating at bottom, unreachable on mobile)",
      "CEO Dashboard nav item renders as native <a target=_blank> so it opens in a new tab",
      "NavItem interface extended with optional external flag for future external links in sidebar",
      "isActive check skips external items to prevent false highlight state",
    ],
    breaking: false,
  },
  {
    version: "4.9.4",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "CEO Dashboard moved from /api/briefing-room-m4x1q to /briefing-room-m4x1q",
      "Old /api/ URL now returns 301 redirect to new URL for backwards compatibility",
      "Old /api/briefing-room-m4x1q/refresh POST also redirects to new refresh endpoint",
      "robots.txt Disallow updated from /api/briefing-room-m4x1q to /briefing-room-m4x1q",
      "Admin sidebar and CeoDirectives.tsx links updated to new URL",
      "noindex meta tag preserved on new route",
    ],
    breaking: false,
  },
  {
    version: "4.9.5",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Reverted CEO Dashboard back to /api/briefing-room-m4x1q",
      "Root cause: Manus edge layer intercepts all non-/api/ routes and serves React SPA shell",
      "/api/ prefix is the only reliable bypass for server-rendered HTML on Manus hosting",
      "noindex meta tag remains the correct mechanism to prevent search engine indexing",
      "robots.txt Disallow reverted to /api/briefing-room-m4x1q",
    ],
    breaking: false,
  },
  {
    version: "4.9.6",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Fully customizable masthead system: 12 individual settings replace brand_masthead_style preset",
      "masthead_bg_color: background color (falls back to brand_color_primary)",
      "masthead_text_color: site name and tagline text color (default #ffffff)",
      "masthead_font_family: serif, sans-serif, or any Google Font name",
      "masthead_font_size: small, medium, large, extra-large",
      "masthead_layout: center, left, or logo-only (logo image with no text)",
      "masthead_show_tagline: toggle tagline below site name",
      "masthead_show_date: toggle date bar above masthead",
      "masthead_date_bg_color: date bar background (falls back to masthead_bg_color)",
      "masthead_logo_height: logo height in pixels, width scales proportionally",
      "masthead_padding: compact, medium, or spacious vertical spacing",
      "masthead_border_bottom: toggle bottom border line",
      "masthead_border_color: border color when border is enabled",
      "Live Masthead Preview in Wizard Screen 1: real-time preview updates as operator changes settings",
      "Navbar.tsx rewritten to consume all 12 settings with scroll-aware shrink behavior",
      "All 12 keys added to DEFAULT_SETTINGS (category: branding) and keysForScreen.brand",
      "27 new masthead-settings.test.ts tests covering all defaults and helper functions",
    ],
    breaking: false,
  },
  {
    version: "4.9.7",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Real Image Sourcing v2: Google Custom Search (CSE) crawler with domain whitelist/blacklist",
      "image_library table: stores crawled images with CDN URL, tags, phash, dimensions, source domain",
      "image_source_domains table: per-domain whitelist/blacklist with status tracking",
      "19 seed domains: 12 whitelisted (Reuters, AP, Wikimedia, etc.), 7 blacklisted (Getty, Shutterstock, etc.)",
      "AI content validation: LLM relevance score, entity check, safety check before storing image",
      "Tag-based library reuse: articles reuse existing images from library before crawling (max 3 uses per image)",
      "Workflow integration: Google CSE crawler runs before existing findRealImage() fallback chain",
      "6 new settings: google_cse_enabled, google_cse_api_key, google_cse_cx, google_cse_min_width, google_cse_min_height, google_cse_max_reuse",
      "Admin QC interface at /admin/image-sources: 4 tabs (Image Library, Domain Manager, Validation Log, Stats)",
      "Image Library tab: grid view with CDN preview, tag filtering, delete, pagination",
      "Domain Manager tab: add/edit/delete domains, set whitelist/blacklist/unknown status",
      "Validation Log tab: per-image AI validation results with scores and rejection reasons",
      "Stats tab: library size, crawl success rate, top domains, validation pass rate",
      "imageQC tRPC router: 8 procedures for library/domain/log/stats management",
      "25 new google-image-crawler.test.ts tests covering domain checking, size filtering, reuse logic",
    ],
    breaking: false,
  },
  {
    version: "4.9.8",
    releaseDate: new Date("2026-03-10"),
    changelog: [
      "Wizard Screen 7: Social Media Platforms — full credential forms for X, Reddit, Facebook, Instagram, Bluesky, Threads, LinkedIn",
      "PlatformCard component: collapsible credential forms, masked password fields, Test Connection button, env-lock indicator for X",
      "41 new DB settings (social category): per-platform credentials, auto-post toggles, daily limits, posting hours, profile URLs",
      "testConnection tRPC procedure: live API verification for X (OAuth 1.0a), Bluesky (AT Protocol), Threads (Graph API), Facebook, Instagram, LinkedIn",
      "keysForScreen.social: all 41 social keys registered for wizard save/restore",
      "screenCompletionStatus: social screen shows green when ≥1 platform enabled + configured, yellow when enabled but no creds, red when none enabled",
      "Duplicate social router removed: testConnection merged into primary social router at line 783",
    ],
    breaking: false,
  },
  {
    version: "5.8.0",
    releaseDate: new Date("2026-04-04"),
    changelog: [
      "Multi-provider LLM routing: Groq, OpenAI, Gemini, Anthropic with fallback chain",
      "Exponential backoff retry per provider (3 attempts, 0s/5s/15s)",
      "Per-tenant LLM preference in Workflow > AI tab",
      "Pool-drain production loop: per-tenant hourly candidate processing",
      "SEO description generation and backfill for all articles",
      "LLM provider status card in Mission Control dashboard",
    ],
  },
  {
    version: "5.9.0",
    releaseDate: new Date("2026-04-05"),
    changelog: [
      "New portal navigation: 36 items reorganized into 8 clean sections",
      "Setup wizard modal with 7-step onboarding and KB links",
      "6 publication templates: Editorial, Magazine, Modern, Minimal, Corporate, Creative",
      "S3 tenant-scoped image paths, timezone-correct batch dates",
      "Cross-tenant data isolation audit and fixes",
    ],
  },
];

/**
 * Get current engine version
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

/**
 * Get version history
 */
export function getVersionHistory(): EngineVersion[] {
  return VERSION_HISTORY;
}

/**
 * Get latest version info
 */
export function getLatestVersion(): EngineVersion {
  return VERSION_HISTORY[VERSION_HISTORY.length - 1];
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Check if an update is available
 */
export function isUpdateAvailable(currentVersion: string): boolean {
  const latest = getLatestVersion();
  return compareVersions(currentVersion, latest.version) < 0;
}

/**
 * Get updates between two versions
 */
export function getUpdatesBetween(fromVersion: string, toVersion: string): EngineVersion[] {
  return VERSION_HISTORY.filter((v) => {
    return (
      compareVersions(v.version, fromVersion) > 0 &&
      compareVersions(v.version, toVersion) <= 0
    );
  });
}

/**
 * Check if update contains breaking changes
 */
export function hasBreakingChanges(fromVersion: string, toVersion: string): boolean {
  const updates = getUpdatesBetween(fromVersion, toVersion);
  return updates.some((u) => u.breaking);
}

/**
 * Save deployment info
 */
export function saveDeploymentInfo(info: DeploymentInfo): void {
  const deploymentFile = path.join(process.cwd(), ".deployment-info.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(info, null, 2));
}

/**
 * Load deployment info
 */
export function loadDeploymentInfo(): DeploymentInfo | null {
  const deploymentFile = path.join(process.cwd(), ".deployment-info.json");
  
  if (!fs.existsSync(deploymentFile)) {
    return null;
  }

  try {
    const data = fs.readFileSync(deploymentFile, "utf-8");
    const info = JSON.parse(data);
    
    // Convert date strings back to Date objects
    info.deployedAt = new Date(info.deployedAt);
    if (info.lastUpdated) {
      info.lastUpdated = new Date(info.lastUpdated);
    }
    
    return info;
  } catch (error) {
    console.error("Failed to load deployment info:", error);
    return null;
  }
}

/**
 * Get update instructions
 */
export function getUpdateInstructions(fromVersion: string, toVersion: string): string[] {
  const updates = getUpdatesBetween(fromVersion, toVersion);
  const hasBreaking = hasBreakingChanges(fromVersion, toVersion);

  const instructions: string[] = [
    "# JAIME.IO Update Instructions",
    "",
    `Updating from v${fromVersion} to v${toVersion}`,
    "",
  ];

  if (hasBreaking) {
    instructions.push("⚠️  **WARNING: This update contains breaking changes!**");
    instructions.push("Please review the changelog carefully before proceeding.");
    instructions.push("");
  }

  instructions.push("## Changelog");
  instructions.push("");

  for (const update of updates) {
    instructions.push(`### Version ${update.version} (${update.releaseDate.toLocaleDateString()})`);
    if (update.breaking) {
      instructions.push("**BREAKING CHANGES**");
    }
    for (const change of update.changelog) {
      instructions.push(`- ${change}`);
    }
    instructions.push("");
  }

  instructions.push("## Update Steps");
  instructions.push("");
  instructions.push("1. **Backup your data**");
  instructions.push("   ```bash");
  instructions.push("   # Export database");
  instructions.push("   pnpm db:export");
  instructions.push("   ```");
  instructions.push("");
  instructions.push("2. **Pull latest engine code**");
  instructions.push("   ```bash");
  instructions.push("   git pull origin main");
  instructions.push("   ```");
  instructions.push("");
  instructions.push("3. **Install dependencies**");
  instructions.push("   ```bash");
  instructions.push("   pnpm install");
  instructions.push("   ```");
  instructions.push("");
  instructions.push("4. **Run database migrations**");
  instructions.push("   ```bash");
  instructions.push("   pnpm db:push");
  instructions.push("   ```");
  instructions.push("");
  instructions.push("5. **Test locally**");
  instructions.push("   ```bash");
  instructions.push("   pnpm test");
  instructions.push("   pnpm dev");
  instructions.push("   ```");
  instructions.push("");
  instructions.push("6. **Deploy to production**");
  instructions.push("   - Save checkpoint in Manus UI");
  instructions.push("   - Click Publish button");
  instructions.push("");

  if (hasBreaking) {
    instructions.push("## Breaking Changes Migration");
    instructions.push("");
    instructions.push("Review the changelog above for specific migration steps.");
    instructions.push("");
  }

  return instructions;
}

/**
 * Generate update report
 */
export function generateUpdateReport(): string {
  const deployment = loadDeploymentInfo();
  const current = getCurrentVersion();
  const latest = getLatestVersion();

  const lines: string[] = [
    "# JAIME.IO Update Report",
    "",
    `Current Version: ${deployment?.engineVersion || "Unknown"}`,
    `Latest Version: ${latest.version}`,
    "",
  ];

  if (!deployment) {
    lines.push("⚠️  No deployment info found. Run `pnpm deploy:setup` first.");
    return lines.join("\n");
  }

  if (isUpdateAvailable(deployment.engineVersion)) {
    const updates = getUpdatesBetween(deployment.engineVersion, latest.version);
    const hasBreaking = hasBreakingChanges(deployment.engineVersion, latest.version);

    lines.push(`✨ Update available! (${updates.length} version${updates.length > 1 ? "s" : ""})`);
    if (hasBreaking) {
      lines.push("⚠️  Contains breaking changes");
    }
    lines.push("");
    lines.push("Run `pnpm deploy:update` for update instructions.");
  } else {
    lines.push("✅ You're running the latest version!");
  }

  lines.push("");
  lines.push("## Deployment Info");
  lines.push(`Client: ${deployment.clientName}`);
  lines.push(`Domain: ${deployment.domain}`);
  lines.push(`Deployed: ${deployment.deployedAt.toLocaleDateString()}`);
  if (deployment.lastUpdated) {
    lines.push(`Last Updated: ${deployment.lastUpdated.toLocaleDateString()}`);
  }

  return lines.join("\n");
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "status";

  if (command === "status") {
    console.log(generateUpdateReport());
  } else if (command === "check") {
    const deployment = loadDeploymentInfo();
    if (!deployment) {
      console.log("No deployment info found.");
      process.exit(1);
    }

    if (isUpdateAvailable(deployment.engineVersion)) {
      console.log(`Update available: ${deployment.engineVersion} → ${getLatestVersion().version}`);
      process.exit(0);
    } else {
      console.log("Up to date");
      process.exit(0);
    }
  } else if (command === "instructions") {
    const deployment = loadDeploymentInfo();
    if (!deployment) {
      console.log("No deployment info found.");
      process.exit(1);
    }

    const latest = getLatestVersion();
    const instructions = getUpdateInstructions(deployment.engineVersion, latest.version);
    console.log(instructions.join("\n"));
  } else {
    console.log("Usage:");
    console.log("  tsx server/version-manager.ts status        - Show update status");
    console.log("  tsx server/version-manager.ts check         - Check if update available");
    console.log("  tsx server/version-manager.ts instructions  - Show update instructions");
  }
}
