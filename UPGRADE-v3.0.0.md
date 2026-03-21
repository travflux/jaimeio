# Upgrading to v3.0.0

v3.0.0 is a major release. It ships the 9-screen Setup Wizard, a unified Social Distribution Engine, a single transparent Content Generation Prompt, and a consolidated `platform_credentials` table. Because this release adds five new database tables and multiple new columns across existing tables, **you must run the database migration before starting the upgraded server.**

---

## ⚠️ Critical: Read Before Upgrading

### Schedule Keys Were Corrected

**This is the most important behavioral change for existing installs.**

The old Setup Wizard (pre-v3.0.0) wrote schedule settings to the wrong keys (`schedule_start_hour`, `schedule_end_hour`). The scheduler engine never read those keys — it reads `schedule_hour`, `schedule_minute`, `schedule_run2_hour`, `schedule_run2_minute`, etc. This means that if you configured your schedule through the old wizard, **your schedule was silently running on seed defaults**, not your saved values.

After upgrading, go to **Admin → Setup Wizard → Screen 7 (Schedule)** and set your intended run times. The wizard now writes to the correct keys.

### Content Generation Prompt Consolidation

The fragmented prompt system (`writing_style_prompt`, `ai_custom_prompt`, `ai_system_prompt`) has been replaced by a single `article_llm_system_prompt` field. On first load of Screen 2 (Content Engine), the wizard assembles an effective prompt from your old fields and pre-populates the textarea. **Review it and click Save** to lock the consolidated prompt into the new key. Your old fields remain in the database as a fallback until you save.

### Image Provider Values Changed

The `image_provider` setting now uses lowercase provider identifiers: `manus`, `openai`, `replicate`, `custom`, or `none`. If your existing value was `built_in` or `openai_dalle`, the wizard will show the field as blank. Set it to the correct value on Screen 3 (Image & Video) and save.

---

## What's New in v3.0.0

### 9-Screen Setup Wizard

A complete first-run configuration flow covering all major subsystems: Brand (Screen 1), Content Engine (Screen 2), Image & Video (Screen 3), Categories (Screen 4), Social Media (Screen 5), Email/SMS/Monetization (Screen 6), Schedule (Screen 7), SEO (Screen 8), and Review & Launch (Screen 9). The wizard pre-populates from your existing database settings — nothing is lost on upgrade. Screen 9 shows a live progress percentage, 8 summary cards with Edit links, and a Needs Attention section with 11 critical checks.

### Social Distribution Engine

A unified `distribution_queue` table replaces the ad-hoc per-platform posting logic. Platform adapters for X, Reddit, Facebook, Instagram, Bluesky, Threads, and LinkedIn share a common interface. A hardcoded rate governor prevents API abuse. An engagement feedback collector updates queue rows with like/retweet/reply counts after posting. Platform enable/disable toggles (`dist_enabled_{platform}`) are respected by `getEnabledPlatforms()` — setting a platform to disabled stops posting even if credentials are present.

### Platform Credentials Table

A new `platform_credentials` table consolidates all third-party API keys in one place. `xTwitterService.ts` now reads X credentials from this table with an env var fallback, enabling white-label deployments to configure X posting through the wizard without touching environment variables.

### Google News Sitemap and IndexNow

A Google News Sitemap is served at `/news-sitemap.xml` (outside the `/api/` prefix, directly accessible to crawlers). An IndexNow key file is served at the root for instant Bing and Yandex indexing on article publish.

### Newsletter and SMS

A newsletter digest system via Resend with weekly cron scheduling and CAN-SPAM-compliant unsubscribe. SMS/text marketing via Twilio with TCPA compliance, quiet hours enforcement, and frequency caps.

---

## Breaking Changes Summary

| Change | Action Required |
|---|---|
| New `distribution_queue` table | Run migration 0030 SQL |
| New `reddit_subreddit_map` table | Run migration 0030 SQL |
| New `setup_checklist` table | Run migration 0030 SQL |
| New `platform_credentials` table | Run migration 0029 SQL |
| New `newsletter_send_history` table | Run migration 0029 SQL |
| New `sms_subscribers` table | Run migration 0031 SQL |
| New columns on `distribution_queue` | Run migrations 0032, 0033 SQL |
| New columns on `platform_credentials` | Run migration 0033 SQL |
| New columns on `reddit_subreddit_map` | Run migration 0033 SQL |
| New columns on `setup_checklist` | Run migration 0033 SQL |
| `article_llm_system_prompt` replaces fragmented prompt settings | Existing voice/style settings still work as fallback — no action required unless you want to customize the prompt via the wizard |
| `dist_enabled_{platform}` settings control posting | New setting keys auto-seed on restart. X defaults to `"true"` if env vars exist. All others default based on whether credentials are configured. |
| `xTwitterService.ts` reads from `platform_credentials` | No action required — falls back to env vars. Existing env var setups continue working. |
| Schedule keys corrected | If you previously saved schedule settings from an older wizard version, verify your schedule in Admin → Setup Wizard → Screen 7 |

---

## Upgrade Steps

### Step 1: Pull Latest from GitHub

```bash
cd your-project-directory
git pull origin main
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Run Database Migrations

**Option A — Drizzle push (recommended for Manus deployments):**

```bash
pnpm drizzle-kit push
```

**Option B — Manual SQL:** Execute migrations 0029 through 0033 in order from the `/drizzle/` directory.

### Step 4: Restart the Server

The `seedDefaultSettings` function backfills new setting keys on first startup, including:

- `dist_enabled_x` (defaults to `"true"` if X env vars exist)
- All watermark settings
- `image_aspect_ratio`
- New schedule and video settings

### Step 5: Verify in Admin

1. Go to **Admin → Setup Wizard** and walk through each screen.
2. Verify your content generation prompt on Screen 2 shows the full assembled prompt.
3. Verify your image/video providers show correct values on Screen 3.
4. Verify your social platform toggles reflect which platforms you use on Screen 5.
5. Verify your schedule matches your intended run times on Screen 7.

### Step 6: (Optional) Run the Full Setup Wizard

The wizard is designed for first-run setup but also works as a configuration audit. Walk through all 9 screens to verify everything is configured correctly. The wizard pre-populates from your existing settings — nothing is lost.

---

## Rollback

If you need to roll back to v2.0.0, restore from your pre-upgrade database backup and check out the `v2.0.0` tag:

```bash
git checkout v2.0.0
pnpm install
# Restore database from backup
pnpm dev
```

The new tables added in v3.0.0 do not affect v2.0.0 engine operation if left in place, but the new columns on existing tables may cause issues. A full database restore is recommended if rolling back.
