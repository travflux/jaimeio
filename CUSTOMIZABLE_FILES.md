# Hambry Engine — File Classification for White-Label Upgrades

This document defines which files are **engine core** (safe to overwrite during upgrades) and which are **client customizable** (must NEVER be overwritten during upgrades). Every file in the project falls into one of these two categories.

---

## Client Customizable Files — NEVER Overwrite

These files contain branding, visual identity, content copy, navigation structure, and layout decisions that each white-label client customizes after initial installation. An upgrade must never touch these files.

### Brand Configuration

| File | What Clients Customize |
|---|---|
| `shared/siteConfig.ts` | Site name, tagline, description, logo, colors, contact info, content genre/tone, SEO keywords, OG image |
| `shared/categoryColors.ts` | Custom color mapping per category slug |
| `shared/categoryImages.ts` | Custom header images per category |

### HTML Shell & Global Styles

| File | What Clients Customize |
|---|---|
| `client/index.html` | Page `<title>`, meta description, meta keywords, Google Fonts selection, AdSense publisher ID, favicon references, RSS feed title, analytics script |
| `client/src/index.css` | CSS custom properties (brand colors, font families, spacing tokens, scrollbar colors, component-level overrides) |

### Public Assets (Logos, Favicons, Static Files)

| File | What Clients Customize |
|---|---|
| `client/public/favicon.ico` | Browser tab icon |
| `client/public/favicon.png` | PNG favicon |
| `client/public/favicon-16x16.ico` | Small favicon |
| `client/public/android-chrome-192x192.png` | Mobile app icon |
| `client/public/hambry-mascot.png` | Site mascot / brand character |
| `client/public/hambry-mascot-head-og.png` | OG share image |
| `client/public/hambry-head.png` | Brand head image |
| `client/public/hambry-transparent.png` | Transparent logo variant |
| `client/public/ads.txt` | AdSense publisher ID for ad verification |
| `client/public/robots.txt` | Search engine crawl rules |

### Branded Public Pages

| File | What Clients Customize |
|---|---|
| `client/src/pages/Home.tsx` | Homepage layout, hero section, featured content arrangement, branding elements |
| `client/src/pages/ArticlePage.tsx` | Article reading layout, branding in article chrome |
| `client/src/pages/CategoryPage.tsx` | Category landing page layout |
| `client/src/pages/AboutPage.tsx` | "About Us" copy and branding |
| `client/src/pages/ContactPage.tsx` | Contact information and form |
| `client/src/pages/CareersPage.tsx` | Careers page copy |
| `client/src/pages/AdvertisePage.tsx` | Advertising information |
| `client/src/pages/EditorialStandardsPage.tsx` | Editorial standards copy |
| `client/src/pages/PrivacyTermsPage.tsx` | Privacy policy and terms of service |
| `client/src/pages/NotFound.tsx` | 404 error page with custom branding/mascot |

### Navigation & Layout Components

| File | What Clients Customize |
|---|---|
| `client/src/App.tsx` | Route definitions, navigation structure, "More" dropdown decisions, page ordering |
| `client/src/components/Navbar.tsx` | Nav bar layout, category ordering, dropdown behavior, mobile menu |
| `client/src/components/Footer.tsx` | Footer layout, social media links, newsletter copy, legal links |
| `client/src/components/BreakingNewsTicker.tsx` | Ticker styling and behavior |
| `client/src/components/LoadingScreen.tsx` | Loading animation, mascot/logo display |
| `client/src/components/NewsletterBanner.tsx` | Newsletter CTA copy and styling |

### Frontend Configuration

| File | What Clients Customize |
|---|---|
| `client/src/contexts/ThemeContext.tsx` | Default theme (dark/light) |
| `client/src/main.tsx` | Provider wiring (rarely changed, but client-specific) |
| `client/src/const.ts` | Frontend constants |

---

## Engine Core Files — Safe to Overwrite

Everything not listed above is engine core. These files contain the platform logic, schedulers, database operations, admin UI, game pages, and infrastructure that is identical across all installations. Upgrades should freely replace these files.

### Server Core Infrastructure (`server/_core/`)

All files in `server/_core/` are engine infrastructure: context.ts, cookies.ts, dataApi.ts, env.ts, imageGeneration.ts, imageProviders.ts, index.ts, llm.ts, map.ts, notification.ts, oauth.ts, promptSanitizer.ts, redditPoster.ts, sdk.ts, systemRouter.ts, trpc.ts, types/*, videoGeneration.ts, videoProviders.ts, videoThumbnail.ts, vite.ts, voiceTranscription.ts.

### Server Feature Files

All `.ts` files directly in `server/` (db.ts, routers.ts, scheduler.ts, workflow.ts, articleSsr.ts, sitemap.ts, seo.ts, all game generators, all game schedulers, xPostQueue.ts, xTwitterService.ts, xReplyEngine.ts, standaloneXTweetEngine.ts, licensing.ts, version-manager.ts, storage.ts, etc.).

### Server Test Files

All `*.test.ts` files in `server/` — always safe to overwrite.

### Database Schema & Migrations

All files in `drizzle/` (schema.ts, relations.ts, migrations/*, meta/*).

### Admin Pages

All files in `client/src/pages/admin/` — these are engine functionality pages, not client-branded.

### Game & Utility Pages

Crossword.tsx, GamesPage.tsx, HoroscopesPage.tsx, HoroscopeHistoryPage.tsx, MadLibsPage.tsx, TriviaQuizPage.tsx, WordScramblePage.tsx, EnhancedSearchPage.tsx, SearchPage.tsx, MostReadPage.tsx, EditorsPicksPage.tsx, TrendingPage.tsx, Latest.tsx, AdminLicenses.tsx, ComponentShowcase.tsx.

### UI Components (`client/src/components/ui/`)

All shadcn/ui components — never customized by clients.

### Engine Components

AIChatBox.tsx, AdUnit.tsx, ArticleCard.tsx, ArticleJsonLd.tsx, BreadcrumbJsonLd.tsx, CanonicalUrl.tsx, DashboardLayout.tsx, DashboardLayoutSkeleton.tsx, HoroscopeWidget.tsx, Map.tsx, OpenGraphTags.tsx, OrganizationJsonLd.tsx, ShareButtons.tsx, Streamdown.tsx, TwitterCard.tsx.

### Hooks & Libraries

All files in `client/src/hooks/` and `client/src/lib/`.

### Shared Engine Logic

shared/_core/errors.ts, shared/const.ts, shared/types.ts, shared/writingStyles.ts, shared/horoscopeStyles.ts.

### Build & Config

package.json, tsconfig.json, vite.config.ts, vitest.config.ts.

### Scripts & Utilities

All files in `scripts/` and root-level `.mjs` files.

---

## Upgrade Rules

1. **Never overwrite** any file listed in the "Client Customizable" section above.
2. **Freely replace** any file listed in the "Engine Core" section.
3. If a new version adds a **new client-customizable file** (e.g., a new branded page), document it here and provide it as an additive file that clients can optionally adopt.
4. If a new version modifies an **existing client-customizable file** in a way that affects functionality (e.g., adding a new route to App.tsx), provide the change as a **documented patch** with before/after snippets that clients can manually apply.
5. Database migrations are always safe to apply via `pnpm db:push` — they only add/modify schema, never touch client content.
6. New settings keys are automatically seeded by `seedDefaultSettings()` on server restart — no client action needed.
