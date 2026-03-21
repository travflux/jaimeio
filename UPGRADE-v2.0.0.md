# Satire Engine — Upgrade Guide v2.0.0

**Release date:** March 2, 2026  
**Previous version:** v1.4.0  
**Breaking changes:** Yes — database schema migrations required before starting the server

---

## Overview

Version 2.0.0 is the largest release since the initial launch. It adds a full print-on-demand merch store, a sponsor bar monetization channel, first-party analytics, a fully configurable LLM prompt system, a content pipeline scaling overhaul, and extensive white-label hardening. Because this release adds new database tables, a new column, and a new unique index, **you must run the migration SQL before starting the upgraded server.**

---

## ⚠️ Critical: Read Before Upgrading

### Image Provider Now Defaults to `none`

**This is the most important behavioral change in v2.0.0.**

In v1.4.0, the `image_provider` setting defaulted to `manus`, meaning image generation worked out of the box on Manus-hosted deployments. In v2.0.0, the default is `none`. On a fresh install, image generation will throw a clear error rather than silently consuming credits from the wrong account.

**If you are upgrading an existing install:** your current `image_provider` value in the database will not be changed — the default only applies to new installs. However, after upgrading, go to **Admin → Settings → Images** and confirm your provider is still set correctly. If the field shows `none` or is blank, set it to your preferred provider before running the workflow.

**Why this changed:** The previous default caused white-label clients on non-Manus hosting to silently fail or, in some configurations, attempt to use the engine operator's Manus credits. The new default forces an explicit choice.

### Social Posts Unique Index — Duplicate Cleanup Required

The migration adds a unique index on `social_posts(article_id, platform)`. If your database has any duplicate rows for the same article and platform (which can happen after server restarts with the old queue logic), the `CREATE UNIQUE INDEX` statement will fail. **Run the cleanup query first**, then create the index. Both are included in the migration steps below.

---

## What's New in v2.0.0

### Merch Store — Phase 1

A provider-agnostic print-on-demand storefront with a Printify implementation. The `MerchSidebar` component appears on article pages (desktop sidebar + mobile strip) and links to `/shop/:slug` where readers can browse product variants, select sizes, and submit their email for a checkout link. The store is **disabled by default** — no merch UI will appear until you enable it in Admin → Settings → Merch Store and configure your Printify credentials.

### Adsterra Sponsor Bar

A slim strip rendered below the breaking news ticker on all public pages. Clicks route through `/api/go/sponsor`, which logs the event to the `affiliate_clicks` table with `clickType = 'sponsor'` before redirecting. Configure the URL, label text, and CTA text in Admin → Settings → Sponsor Bar.

### CEO Dashboard Upgrades

Section §2 now shows X queue status (Running/Stopped), posts today as a fraction of the daily limit, and last post time in ET. Section §3 shows first-party page views with source breakdown and affiliate clicks split by type (Amazon vs. Sponsor). Section §7 shows sponsor bar performance and merch store lead counts. Section §9 shows the X Promotion Candidates queue.

### Content Pipeline Scaling

The RSS feed weights table is now the authoritative feed source — the legacy `rss_feeds` JSON setting is retired. The article selector window expanded from 80 to 200 entries (configurable). Headline deduplication checks against the last 3 days of published articles. The scheduler supports up to 4 runs per day. Topic clustering groups similar RSS entries before AI selection to improve topic diversity.

### Fully Configurable LLM Prompts

The article generation system prompt, user message (Step 4), and event selector prompt (Step 1) are all configurable from Admin → Generation. An article preview panel lets you generate a test article from any headline without storing or publishing it. Both `{placeholder}` and `{{placeholder}}` formats are now normalized.

### White-Label Hardening

All hardcoded brand references have been removed from engine-core files. The image provider defaults to `none`. `WHITELABEL.md` provides a step-by-step deployment guide. `CUSTOMIZABLE_FILES.md` classifies every file as engine-core or client-customizable. `scripts/upgrade.sh` automates the backup/restore upgrade process.

---

## Breaking Changes Summary

| Change | Action Required |
|---|---|
| New `merch_products` table | Run `CREATE TABLE` SQL (Step 3 below) |
| New `merch_leads` table | Run `CREATE TABLE` SQL (Step 3 below) |
| New `click_type` column on `affiliate_clicks` | Run `ALTER TABLE` SQL (Step 3 below) |
| Duplicate cleanup on `social_posts` | Run `DELETE` SQL before index creation (Step 3 below) |
| New unique index on `social_posts` | Run `CREATE UNIQUE INDEX` SQL (Step 3 below) |
| `image_provider` default changed to `none` | Verify your provider setting after upgrade (see warning above) |

---

## Upgrade Methods

Two methods are available. **Method A (Automated Script)** is recommended for most deployments. **Method B (Manual Cherry-Pick)** is for deployments with heavy customization where you want fine-grained control.

---

### Method A — Automated Script (Recommended)

The `scripts/upgrade.sh` script backs up your customizable files, pulls the new engine code, restores your customizations, and runs dependency installation.

**Step 1: Back up your environment file**

```bash
cp .env .env.backup
```

**Step 2: Run the upgrade script**

```bash
chmod +x scripts/upgrade.sh
./scripts/upgrade.sh
```

The script will:
- Back up all client-customizable files (brand config, CSS, public assets, page components)
- Pull the latest engine code from the `satire-news-saas` repository
- Restore your backed-up customizations
- Run `pnpm install`

**Step 3: Run the database migrations**

Connect to your MySQL/TiDB database and run the following SQL in order. Do not skip the duplicate cleanup query — the unique index creation will fail if duplicates exist.

```sql
-- 1. Add click_type column to affiliate_clicks (safe to run even if column exists)
ALTER TABLE affiliate_clicks 
  ADD COLUMN IF NOT EXISTS click_type VARCHAR(50) NOT NULL DEFAULT 'amazon';

-- 2. Create merch_products table
CREATE TABLE IF NOT EXISTS merch_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  article_slug VARCHAR(500) NOT NULL,
  article_headline TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'printify',
  provider_product_id VARCHAR(255),
  product_type VARCHAR(100) NOT NULL DEFAULT 't-shirt',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  base_price_cents INT NOT NULL DEFAULT 0,
  sell_price_cents INT NOT NULL DEFAULT 0,
  digital_price VARCHAR(20),
  image_url TEXT,
  checkout_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_merch_products_article_slug (article_slug),
  INDEX idx_merch_products_status (status)
);

-- 3. Create merch_leads table
CREATE TABLE IF NOT EXISTS merch_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_slug VARCHAR(500) NOT NULL,
  article_headline TEXT,
  email VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  newsletter_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  converted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_merch_leads_email (email),
  INDEX idx_merch_leads_article_slug (article_slug),
  INDEX idx_merch_leads_created_at (created_at)
);

-- 4. Remove duplicate social posts BEFORE adding unique index
--    (keeps the oldest row per article+platform combination)
DELETE sp1 FROM social_posts sp1
INNER JOIN social_posts sp2
WHERE sp1.id > sp2.id
AND sp1.article_id = sp2.article_id
AND sp1.platform = sp2.platform;

-- 5. Add unique index on social_posts (prevents duplicate queue entries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_article_platform 
  ON social_posts(article_id, platform);
```

**Step 4: Start the server and verify**

```bash
pnpm build
pnpm start
```

Check the post-upgrade verification checklist below before going live.

---

### Method B — Manual Cherry-Pick

Use this method if you have made significant modifications to engine-core files and want to review each change before applying it.

**Step 1: Back up your customizable files**

```bash
# Back up all client-customizable files
cp -r client/src/pages/ ~/backup-pages/
cp -r client/public/ ~/backup-public/
cp client/src/index.css ~/backup-index.css
cp client/index.html ~/backup-index.html
cp shared/siteConfig.ts ~/backup-siteConfig.ts
cp shared/brandConfig.ts ~/backup-brandConfig.ts
cp shared/categoryColors.ts ~/backup-categoryColors.ts
cp shared/categoryImages.ts ~/backup-categoryImages.ts
cp client/src/App.tsx ~/backup-App.tsx
cp client/src/components/Navbar.tsx ~/backup-Navbar.tsx
cp client/src/components/Footer.tsx ~/backup-Footer.tsx
cp .env .env.backup
```

**Step 2: Copy engine-core files from the new release**

The following files are safe to overwrite. They contain no client branding and have been updated in this release.

```
server/
  version-manager.ts
  db.ts
  routers.ts
  ceoDashboard.ts
  sitemap.ts
  seo.ts
  articleSsr.ts
  imageProviders.ts
  scheduler.ts
  workflow.ts
  workflowApi.ts
  imagePromptBuilder.ts
  merch/
    provider.ts
    printifyProvider.ts
  routers/
    merch.ts

client/src/
  components/
    MerchSidebar.tsx
    SponsorBar.tsx
    XFollowAd.tsx
    NewsletterAd.tsx
    AmazonAd.tsx
    YouMightAlsoLike.tsx
    BreakingNewsTicker.tsx
    AdminLayout.tsx
  pages/
    ShopPage.tsx
    admin/
      settings/
        SettingsMerch.tsx
        SettingsSponsor.tsx
        SettingsPromotion.tsx
        SettingsGeneration.tsx
        SettingsImages.tsx
        SettingsSchedule.tsx
  hooks/
    usePageSEO.ts

drizzle/
  schema.ts

shared/
  writingStyles.ts

scripts/
  upgrade.sh
```

**Step 3: Run database migrations**

Same SQL as Method A, Step 3 above.

**Step 4: Restore your customizations**

```bash
cp -r ~/backup-pages/ client/src/pages/
cp -r ~/backup-public/ client/public/
cp ~/backup-index.css client/src/index.css
cp ~/backup-index.html client/index.html
cp ~/backup-siteConfig.ts shared/siteConfig.ts
cp ~/backup-brandConfig.ts shared/brandConfig.ts
cp ~/backup-categoryColors.ts shared/categoryColors.ts
cp ~/backup-categoryImages.ts shared/categoryImages.ts
cp ~/backup-App.tsx client/src/App.tsx
cp ~/backup-Navbar.tsx client/src/components/Navbar.tsx
cp ~/backup-Footer.tsx client/src/components/Footer.tsx
```

**Step 5: Install dependencies and build**

```bash
pnpm install
pnpm build
pnpm start
```

---

## Post-Upgrade Verification Checklist

Work through this list after the server starts. Do not go live until all items are confirmed.

**Image Provider (Critical)**

> ⚠️ Go to **Admin → Settings → Images** immediately after upgrading. Confirm the Image Provider field shows your intended provider (e.g., `manus`, `openai`, or `replicate`). If it shows `none` or is blank, set it now. The workflow will not generate images until a provider is configured.

**Database**

- [ ] Server starts without migration errors in the console log
- [ ] Admin → Articles loads without errors
- [ ] Admin → Settings → Merch Store page loads (new page)
- [ ] Admin → Settings → Sponsor Bar page loads (new page)
- [ ] Admin → Settings → Promotion page loads (new page)

**Content Pipeline**

- [ ] Admin → Source Feeds shows your RSS feeds (now read from `rss_feed_weights` table)
- [ ] Trigger a manual workflow run and confirm articles generate correctly
- [ ] Confirm article images generate (requires image provider to be set)

**Monetization**

- [ ] Sponsor Bar: if you want it active, go to Admin → Settings → Sponsor Bar, enter your URL, and enable the toggle
- [ ] Merch Store: leave disabled (`merch_sidebar_enabled = false`) until you have configured Printify credentials

**X / Social**

- [ ] Admin → X Post Queue shows your queued posts
- [ ] Confirm no duplicate posts appear in the queue

**CEO Dashboard**

- [ ] Fetch `/api/briefing-room-m4x1q` and confirm all 9 sections render without "Data unavailable" errors
- [ ] §3 shows page view data (may be zero on a fresh install — that is expected)

---

## New Settings Keys (Auto-Seeded)

The following settings are automatically added to your database on first server start. No manual action is required, but you may want to review and configure them.

| Key | Default | Description |
|---|---|---|
| `merch_sidebar_enabled` | `false` | Enable the merch sidebar on article pages |
| `merch_printify_api_token` | _(empty)_ | Your Printify API token |
| `merch_printify_shop_id` | _(empty)_ | Your Printify shop ID |
| `merch_markup_percent` | `50` | Percentage markup above Printify base cost |
| `merch_digital_price` | `2.99` | Fixed price for digital download products |
| `sponsor_bar_enabled` | `false` | Enable the sponsor bar strip |
| `sponsor_bar_url` | _(empty)_ | Sponsor destination URL (e.g., Adsterra Smartlink) |
| `sponsor_bar_label` | `Sponsored` | Label text on the bar |
| `sponsor_bar_cta` | `Learn More` | CTA button text |
| `promo_enabled` | `false` | Enable X promotion candidate scoring |
| `promo_max_age_days` | `7` | Max article age for promotion candidates |
| `promo_min_x_views` | `3` | Minimum X views to qualify |
| `promo_min_affiliate_ctr` | `0` | Minimum affiliate CTR to qualify |
| `promo_max_candidates` | `10` | Maximum candidates per scoring run |
| `promo_category_cap` | `3` | Max candidates per category |
| `brand_launch_date` | `2026-02-19` | Site launch date (used in CEO Dashboard) |
| `image_provider` | `none` | Image generation provider — **must be set explicitly** |

---

## Rollback Instructions

If something goes wrong after upgrading, restore from your backup:

```bash
# Restore customizable files
cp -r ~/backup-pages/ client/src/pages/
cp ~/backup-index.css client/src/index.css
cp ~/backup-index.html client/index.html
cp ~/backup-siteConfig.ts shared/siteConfig.ts
cp ~/backup-brandConfig.ts shared/brandConfig.ts
cp .env.backup .env

# Restore the previous engine version from git
git checkout v1.4.0

# Install dependencies for the old version
pnpm install
pnpm build
pnpm start
```

The database migrations in Step 3 are additive (new tables and columns only). Rolling back the code while leaving the new tables in place is safe — the v1.4.0 code will simply ignore the new tables.

---

## Support

For questions about this upgrade, open an issue on the GitHub repository or contact the engine maintainer. Include your current version, the error message, and the output of `pnpm test` in your report.
