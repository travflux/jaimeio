# Changelog

All notable changes to the Satire Engine are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.4.0] — 2026-03-09

### Added (CEO Dashboard v2)
- §0 Alert Bar: real-time critical alerts for velocity, candidate pool, uncategorized articles, X queue status
- §1 Trend Indicators: WoW % change on Today/Week/Month stats; oldest pending candidate age with source type
- §3 30-day external page views ASCII bar chart; 14-day table retained; velocity coloring (green/amber/red)
- §4 Daily output velocity bar chart with 30-day avg; category distribution table with % of total; uncategorized row
- §6 SEO: Articles Without Category and Articles Without Featured Image rows
- §7 Restructured: Net P&L row, Revenue Targets (90-day plan) table, Unit Economics table (cost/article, RPM, break-even), Monetization Channels table with status column
- New DB helpers: `getSnapshotTrends()`, `getContentQuality()`, `getArticleCountBetween()`, `countArticlesWithoutCategory()`, `countArticlesWithoutImage()`, `getOldestPendingCandidate()`
- `branding.get` tRPC endpoint now includes `site_url` from social settings category
- `useBranding` hook exposes `siteUrl` field

---

## [4.3.2] — 2026-03-09

### Fixed (Critical: DB-Driven Canonical URL)
- **`client/src/App.tsx`**: Replaced hardcoded `setCanonicalURL('non-www')` with DB-driven logic. Now reads `site_url` from the database via `branding.siteUrl` and derives `www` vs `non-www` preference automatically. If `site_url` starts with `://www.` it uses `www`; otherwise `non-www`. If `site_url` is not set, falls back to `window.location.origin` with no redirect.
- **`server/routers.ts` `branding.get`**: Extended to also return `site_url` (from `social` category) alongside branding settings, so the client can access it without a separate query.
- **`client/src/hooks/useBranding.ts`**: Added `siteUrl` field to `BrandingConfig` interface, `DEFAULTS`, and `mapKeyToField` mapping (`site_url` → `siteUrl`).
- **Root cause of hambry.com + apexracing.life outage**: `setCanonicalURL('www')` was redirecting to `www.` but both Cloudflare configs redirect `www.` back to non-www, creating an infinite loop. This fix makes every deployment self-configuring.

### Fixed (White-Label Pollution — v4.3.0 Client Report)
- **`client/src/pages/AboutPage.tsx`**: Removed all hardcoded satire/humor/comedy/Onion/Babylon references. Values array, milestones, team bios, mission section, and CTA now use `branding.genre` or generic editorial language. Moved `values`, `milestones`, and `team` arrays inside the component so they can reference `branding.genre` at render time.
- **`server/workflow.ts` line ~500**: Replaced hardcoded `"Satirical Take on: ${event.title}"` fallback headline with a DB-driven lookup: reads `brand_genre` setting, capitalizes it, and uses `"${genreLabel}: ${event.title}"`. A racing site will never see "Satirical Take on: Mint 400 Results."
- **`server/db.ts` line 195**: Changed Opinion category seed description from `"Satirical opinion pieces"` to `"Opinion and editorial pieces"`. Affects fresh deployments only.
- **`server/standalone-tweet-scheduler.ts` line 5**: Changed JSDoc comment from "standalone satirical tweet generation" to "standalone tweet generation".

### Tests
- **728 unit tests passing** across 60 test files. Zero regressions.
- Directive grep check: 0 matches for `"Hambry"|"satirical"|"satire"|"Satirical"` in `AboutPage.tsx` and `workflow.ts` (excluding comments and branding reads).

---

## [4.3.1] — 2026-03-09

### Fixed
- **`scripts/push-saas-release.sh`**: Added rsync/Python fallback guard. Script now detects if `rsync` is unavailable and automatically falls back to `scripts/mirror-sync.py` (Python `shutil`). Script is now reliable in all environments including the Manus sandbox where `rsync` is not pre-installed.
- **`scripts/mirror-sync.py`**: Refactored to read `ENGINE_REPO_DIR` and `SAAS_REPO_DIR` from environment variables (injected by push script). Removed duplicate import. Added proper error handling, exit codes, and error count reporting.
- **`HoroscopesPage.tsx` (#9)**: Replaced hardcoded `"Satirical predictions for all zodiac signs"` with genre-aware copy using `branding.genre`. Added `useBranding` import and dependency to `useEffect`.
- **Confirmed clean** (already genre-aware via `branding.genre`): `MadLibsPage.tsx` (#10), `TriviaQuizPage.tsx` (#11), `ShopPage.tsx` (#12), `SiteMapPage.tsx` (#13), `TagPage.tsx` (#14).

### Tests
- **728 unit tests passing** across 60 test files. Zero regressions.
- First clean full-mirror release via fixed push script.

---

## [4.3.0] — 2026-03-09

### Release Process — Full Mirror SaaS Sync
- **`scripts/push-saas-release.sh`**: Replaced partial-sync script with full mirror sync. New script: (1) verifies engine repo is clean, (2) runs unit tests, (3) clones `satire-news-saas` to temp dir, (4) deletes everything except `.git` and copies entire engine repo via `rsync`, (5) verifies 19 critical files, (6) checks for Hambry pollution in seed defaults, (7) commits with engine commit hash, (8) tags, (9) pushes, (10) cleans up temp dir. No more partial syncs. No more missed files.

### White-Label Compliance Fixes (patch1)
- **`InteractiveHambry.tsx`**: Replaced hardcoded `/hambry-mascot.png` with `branding.mascotUrl || "/mascot.png"`. Alt text now uses `branding.mascotName || "Site mascot"`.
- **`XFollowAd.tsx`**: Replaced hardcoded `@hambry_com` fallback handle with empty string; replaced `https://x.com/hambry_com` fallback URL with `https://x.com`.

### Tests
- **728 unit tests passing** across 60 test files. Zero regressions.
- 9 E2E test files present (Playwright).

---

## [4.2.3] — 2026-03-08

### White-Label Compliance — LLM Prompt & UI Copy Sweep

- **`workflow.ts` `buildSystemPrompt()`**: Removed hardcoded references to "The Onion, The Babylon Bee, and Private Eye". System prompt now uses generic editorial voice. White-label clients override via `article_llm_system_prompt` DB setting.
- **`workflow.ts` social media generator**: Replaced "satirical news publication" with generic "news publication" in LLM system prompt.
- **`workflow.ts` style fallbacks**: Replaced `"Write in a satirical style."` fallback with `"Write in a professional editorial style."`.
- **`articleSsr.ts`**: Removed hardcoded `"Delivering top-shelf satirical journalism since reality jumped the shark."` description fallback. Replaced with `"Your source for the latest news and commentary."`.
- **`articleSsr.ts` footer disclaimer**: Footer disclaimer now reads from `brand_disclaimer` DB setting instead of hardcoded `"This is a satirical publication. All articles are fictional."`. Disclaimer is hidden if the setting is empty.
- **`standaloneXTweetEngine.ts`**: Removed hardcoded satirical voice references from standalone tweet LLM prompt.
- **`xReplyEngine.ts`**: Updated JSDoc comments to remove "satirical" descriptor.
- **`trivia-generator.ts`**: Removed hardcoded satirical references from trivia generation prompt.
- **`word-scramble-generator.ts`**: Removed hardcoded satirical references.
- **`madlib-generator.ts`**: Removed hardcoded satirical references.
- **`routers/setup.ts`**: Removed hardcoded satirical references from LLM test and style fallback.
- **`ArticleSponsorBanner.tsx`**: Changed fallback copy from `"Support independent satirical journalism."` to `"Support independent journalism."`.
- **`AboutPage.tsx`**: Replaced hardcoded "satirically promising stories" and "satirical articles" with generic copy.
- **`CareersPage.tsx`**: Replaced "Senior Satirical Writer" job title and all satirical copy with generic editorial equivalents.
- **`AdvertisePage.tsx`**: Replaced "Custom satirical articles" feature and "Satire readers" copy with generic equivalents.
- **`CategoryPage.tsx`**: Removed `satire` from SEO keywords and Amazon widget keywords.
- **`Crossword.tsx`**: Replaced "satirical wordplay" and "satirical terms" with generic equivalents.

### Tests
- **728 unit tests passing** across 60 test files. Zero regressions.
- TypeScript: clean compile, zero errors.

---

## [4.2.2] — 2026-03-09

### White-Label Compliance Fix
- **Added real image sourcing settings to `DEFAULT_SETTINGS`** in `db.ts`. Fresh deployments now automatically seed `real_image_sourcing_enabled` (default: `false`), `real_image_fallback`, `real_image_relevance_threshold`, `flickr_api_key`, `unsplash_access_key`, `pexels_api_key`, and `pixabay_api_key` on first run. Previously these keys were absent from the seed, meaning `ensureDefaultSettings()` would not create them and the toggle would silently return `false` on new installs.

### Tests
- **728 unit tests passing** across 60 test files.
- **E2E: 20 passed, 0 failed, 8 skipped.**

---

## [4.2.1] — 2026-03-09

### White-Label Compliance Fixes
- **Deleted `CATEGORY_KEYWORDS` hardcoded constant** from `workflow.ts`. Category assignment is now DB-only. `guessCategory()` reads keywords from the `categories.keywords` column at runtime. White-label clients set their own keywords via the Setup Wizard.
- **Removed hardcoded "The Daily Satirist"** from `buildSystemPrompt()` default. The fallback prompt no longer references any specific publication name. White-label clients override via `article_llm_system_prompt` in DB.
- **Removed hardcoded brand name fallbacks** from `getSettingValue("site_name", ...)` in `workflow.ts` and `real-image-sourcing.ts`. Default is now empty string.
- **Removed hardcoded User-Agent** from image downloader. Replaced with generic `SatireEngine-Image/1.0`.

### E2E Test Suite (Playwright)
- **9 test files, 20 passing tests, 0 failures, 8 skipped** (white-label compliance tests correctly skip on brand deployments; optional image/canonical tests skip by design).
- Fixed white-label skip logic — `test.skip()` now correctly skips all tests in the describe block when running against a brand deployment.
- Fixed navigation test — uses SSR-compatible article link check instead of React-hydration-dependent nav selector.
- Fixed tags test — targets visible error UI, not the word "error" in page source.
- Fixed categories test — uses main-scoped selector to avoid hidden SEO nav matches.

### Unit Tests
- **728 tests passing** across 60 test files.
- Updated `category-keywords.test.ts` to reflect DB-only keyword behavior.
- Updated `article-sponsor-banner.test.ts` to not assert on live DB values that change between deployments.

---

## [4.2.0] — 2026-03-08

### Dynamic Category Assignment (DB-Driven Keywords)
- Added `keywords` column to `categories` table (comma-separated, configurable per deployment).
- `guessCategory()` reads keywords from DB at runtime, overriding any hardcoded map.
- Call site updated to pass `allCats` with fallback to first category.
- **Keywords textarea** added to Setup Wizard Screen 4 (per-category edit form).
- **Recategorize Uncategorized** bulk admin action — reassigns all `null`-category articles using current DB keywords.
- 14 new unit tests covering DB override, null fallback, and whitespace handling.

### Article Sponsor Banner
- New inline sponsor banner placement on article pages (below article body, above share buttons).
- Independent from top sponsor bar — own 5 DB settings (`article_sponsor_enabled`, `article_sponsor_url`, `article_sponsor_label`, `article_sponsor_cta`, `article_sponsor_description`).
- Click tracking at `/api/go/article-sponsor` with per-article slug attribution.
- Configurable from Setup Wizard Screen 6 (Email/SMS/Monetization).
- Top sponsor bar settings also added to Setup Wizard Screen 6 for completeness.

### X Reply Engine — 403 Conversation Guard
- Added `conversation_id` check to the mentions reply loop. Mentions buried inside a conversation started by someone else are now skipped before the API call, preventing "Reply to this conversation is not allowed" 403 errors.

### Bug Fixes
- Fixed CEO Dashboard `getImageStats()` query — was using `drizzleSql` template tag with a raw `Date` object, causing mysql2 driver serialization failure. Rewrote using Drizzle ORM builder with `eq`/`and`/`gte`.
- Fixed Setup Wizard Screen 6 save — all 9 sponsor keys were missing from `keysForScreen` save list; they are now included.

---

## [3.1.0] — 2026-03-07

### Added
- **Goodies visibility system** — new public `goodies.get` tRPC endpoint returns boolean state for all 5 goodies keys. New `useGoodies` hook reads from DB with 5-minute cache. Goodies toggles in Setup Wizard now control three surfaces simultaneously:
  - Admin sidebar "Goodies" group: each item (Horoscopes, Crosswords, Trivia, Mad Libs, Word Scrambles) hides when its toggle is off; entire group hides if all are off
  - Public Navbar: Goodies dropdown (desktop + mobile) hides per toggle; "All Games" link hides when all games are off
  - Public Footer: Goodies section hides when all off; individual links hide per toggle
- **Game page guards** — all 6 public game pages (Horoscopes, Games, Crossword, WordScramble, TriviaQuiz, MadLibs) render a friendly `GoodiesDisabledPage` instead of broken content when their toggle is off. GamesPage filters game cards to hide disabled games.
- **Publish image gate** — new `publishGate.ts` helper blocks articles from moving `approved → published` if they have no `featuredImage` URL and no `mascot_url` fallback configured. Gate covers all three publish paths: manual admin publish, auto-publish-on-approval, and background auto-approve timer. Articles stay in `approved` status when blocked; admin UI receives a clear error message.
- **CEO dashboard GSC index count** — §6 SEO Status table now shows submitted vs. indexed counts from GSC `sitemaps.get` for `/content-sitemap.xml`. Displays percentage, pending/error flags, and last-fetched timestamp. Shows "not yet submitted" when sitemap isn't registered in GSC.
- **`brand_genre` setting** — new DB key (`brand_genre`, default: `"news"`) drives category meta descriptions. Replaces hardcoded `"satire and commentary"` text. White-label clients set their own genre label via Branding Settings.

### Changed
- Admin sidebar "Tools" group renamed to **"Goodies"**; "Tools Settings" sub-item renamed to "Goodies Settings"
- Category meta descriptions now use `branding.genre` instead of hardcoded genre text (white-label compatible)

### Fixed
- **Mascot fallback** — `mascot.png` fallback changed to `""` in `seo.ts` and `articleSsr.ts`; empty mascot URL handled gracefully throughout (no broken image tags)
- **Category 404** — `/category/:nonexistent-slug` now returns HTTP 404 with proper meta tags instead of a silent 200
- **Focus outlines** — removed `outline-ring/50` from universal `*` selector; focus outlines are now fully opaque (WCAG 2.4.7)
- **Reduced motion** — added `@media (prefers-reduced-motion: reduce)` block to `index.css` (WCAG 2.3.3)
- **`target=_blank` accessibility** — all external links in Footer, SponsorBar, and XFollowAd now carry `title="Opens in a new tab"` and updated `aria-label` values
- **Hardcoded brand name in aria-labels** — replaced hardcoded "Hambry" in X follow `aria-labels` with `branding.siteName` (white-label compatible)
- **Sponsor bar contrast** — label color darkened `#666666 → #525252`; CTA color darkened `#C41E3A → #9B1830` for WCAG AAA contrast (7:1+)

### Tests
- 601 tests passing across 51 test files
- New: `goodies-get.test.ts` (7 tests — all 5 keys, default true, false isolation, bulk on/off)
- New: `publish-gate.test.ts` (8 tests — has image, has mascot, blocked, reason string, whitespace handling, unblocking)

---

## [3.0.1] — 2026-03-06

### Added
- 9-screen Setup Wizard for first-run configuration
- Screen 9: Goodies toggles (Horoscopes, Crosswords, Trivia, Mad Libs, Word Scrambles)
- Disqus comments integration
- Social Distribution Engine

### Fixed
- Purged all Hambry brand defaults from engine core (white-label hotfix)
- Wizard UX fixes and validation improvements
- Platform credential unification

---

## [3.0.0] — 2026-03-06

### Added
- Initial white-label release
- 9-screen Setup Wizard
- Social Distribution Engine
- SEO infrastructure (server-rendered article pages, JSON-LD, Open Graph, Twitter Cards, canonical URLs)
- CEO Dashboard at `/api/briefing-room-[secret]`
- Auto-approve timer and publish pipeline
- Goodies engine (Horoscopes, Crosswords, Trivia Quizzes, Mad Libs, Word Scrambles)
- Newsletter system
- Sponsor bar
- AdSense integration
- RSS feed at `/api/rss`
- Sitemap auto-generation
- IndexNow integration
- Google Search Console integration
- Bing Webmaster integration
- X (Twitter) social posting engine
- FeedHive integration
- Image generation pipeline
- Mobile-responsive admin dashboard
- Role-based access control
