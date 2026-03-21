# Hambry Engine v1.4.0 — White-Label Upgrade Guide

**Release Date:** February 28, 2026
**Previous Version:** 1.3.0
**Breaking Changes:** None
**Repository:** https://github.com/pinbot9000-beep/satire-news-saas.git

---

## Important: White-Label Safe Upgrade

This upgrade is designed to **never overwrite your client customizations**. The engine separates files into two categories:

- **Engine core files** (server logic, schedulers, database, admin pages) — safe to replace.
- **Client customizable files** (branding, navigation, homepage, footer, CSS, public assets) — never touched.

See `CUSTOMIZABLE_FILES.md` in the repo root for the complete classification. If you have customized any engine-core files (which is not recommended), you will need to manually merge those changes.

---

## Upgrade Method A: Automated Script (Recommended)

The upgrade script automatically backs up your client-customizable files, applies the engine update, and restores your customizations.

```bash
cd /path/to/your-hambry-installation
git fetch origin --tags
bash scripts/upgrade.sh v1.4.0
```

The script performs these steps: backs up all client files listed in `CUSTOMIZABLE_FILES.md`, checks out v1.4.0, restores your client files, installs dependencies, runs database migrations, and runs the test suite. Your backup is preserved in a timestamped `.upgrade-backup-*` directory until you delete it.

If the script is not yet available in your installation (it ships with v1.4.0), download it first:

```bash
curl -o scripts/upgrade.sh https://raw.githubusercontent.com/pinbot9000-beep/satire-news-saas/v1.4.0/scripts/upgrade.sh
chmod +x scripts/upgrade.sh
bash scripts/upgrade.sh v1.4.0
```

---

## Upgrade Method B: Manual Cherry-Pick

If you prefer full control, apply only the new and changed engine-core files without touching your customizations. This copies specific files from the new version into your installation.

**Step 1: Fetch the new version into a temporary directory**

```bash
cd /tmp
git clone --branch v1.4.0 --depth 1 https://github.com/pinbot9000-beep/satire-news-saas.git hambry-v1.4.0
```

**Step 2: Copy new server files (SEO infrastructure — these are entirely new)**

```bash
cd /path/to/your-hambry-installation

# New SEO files (did not exist before)
cp /tmp/hambry-v1.4.0/server/articleSsr.ts server/
cp /tmp/hambry-v1.4.0/server/sitemap.ts server/
cp /tmp/hambry-v1.4.0/server/seo.ts server/

# New documentation and tooling
mkdir -p scripts
cp /tmp/hambry-v1.4.0/scripts/upgrade.sh scripts/
chmod +x scripts/upgrade.sh
cp /tmp/hambry-v1.4.0/CUSTOMIZABLE_FILES.md .
cp /tmp/hambry-v1.4.0/PROJECT-CONTEXT.md .
cp /tmp/hambry-v1.4.0/UPGRADE-v1.4.0.md .
```

**Step 3: Update changed engine-core server files**

```bash
cp /tmp/hambry-v1.4.0/server/_core/index.ts server/_core/
cp /tmp/hambry-v1.4.0/server/db.ts server/
cp /tmp/hambry-v1.4.0/server/routers.ts server/
cp /tmp/hambry-v1.4.0/server/scheduler.ts server/
cp /tmp/hambry-v1.4.0/server/workflow.ts server/
cp /tmp/hambry-v1.4.0/server/version-manager.ts server/

# Game schedulers (existed but were never imported — now they are)
cp /tmp/hambry-v1.4.0/server/word-scramble-scheduler.ts server/
cp /tmp/hambry-v1.4.0/server/trivia-quiz-scheduler.ts server/
cp /tmp/hambry-v1.4.0/server/mad-libs-scheduler.ts server/
cp /tmp/hambry-v1.4.0/server/horoscope-scheduler.ts server/
cp /tmp/hambry-v1.4.0/server/crossword-scheduler.ts server/
```

**Step 4: Update changed admin UI files (engine functionality, not client branding)**

```bash
cp /tmp/hambry-v1.4.0/client/src/pages/admin/AdminArticles.tsx client/src/pages/admin/
cp /tmp/hambry-v1.4.0/client/src/pages/admin/settings/SettingsSchedule.tsx client/src/pages/admin/settings/
cp /tmp/hambry-v1.4.0/client/src/pages/admin/settings/SettingsImages.tsx client/src/pages/admin/settings/
```

**Step 5: Update SEO components (engine components, not client-branded)**

```bash
cp /tmp/hambry-v1.4.0/client/src/lib/canonical-url.ts client/src/lib/
cp /tmp/hambry-v1.4.0/client/src/lib/og-tags.ts client/src/lib/
cp /tmp/hambry-v1.4.0/client/src/lib/organization-schema.ts client/src/lib/
cp /tmp/hambry-v1.4.0/client/src/lib/schema-markup.ts client/src/lib/
cp /tmp/hambry-v1.4.0/client/src/components/ArticleJsonLd.tsx client/src/components/
cp /tmp/hambry-v1.4.0/client/src/components/BreadcrumbJsonLd.tsx client/src/components/
cp /tmp/hambry-v1.4.0/client/src/components/CanonicalUrl.tsx client/src/components/
cp /tmp/hambry-v1.4.0/client/src/components/OpenGraphTags.tsx client/src/components/
cp /tmp/hambry-v1.4.0/client/src/components/OrganizationJsonLd.tsx client/src/components/
cp /tmp/hambry-v1.4.0/client/src/components/TwitterCard.tsx client/src/components/
```

**Step 6: Update database schema and migrations**

```bash
cp /tmp/hambry-v1.4.0/drizzle/schema.ts drizzle/
cp /tmp/hambry-v1.4.0/drizzle/relations.ts drizzle/
cp -r /tmp/hambry-v1.4.0/drizzle/migrations/ drizzle/
cp -r /tmp/hambry-v1.4.0/drizzle/meta/ drizzle/
```

**Step 7: Install dependencies and run migrations**

```bash
pnpm install
pnpm db:push
```

**Step 8: Run tests**

```bash
pnpm test
```

All **486 tests** should pass.

**Step 9: Clean up**

```bash
rm -rf /tmp/hambry-v1.4.0
```

---

## Client-Customizable File Patches

If a new version requires changes to client-customizable files, they are documented here as manual patches with before/after snippets that clients apply themselves.

**v1.4.0 requires no changes to client-customizable files.** All SEO routes are handled entirely server-side. Your homepage, navbar, footer, branding, and styles are untouched.

---

## Database Changes

Version 1.4.0 does not add new tables or columns. The `seedDefaultSettings()` function now includes 10 new settings keys for game schedulers and 4 new keys for the multi-run scheduler. These are **automatically inserted on server restart** if they don't already exist. No manual SQL is needed.

| Settings Key | Default Value | Purpose |
|---|---|---|
| `auto_generate_horoscope` | `true` | Enable daily horoscope generation |
| `horoscope_generation_time` | `06:00` | Time to generate horoscopes |
| `auto_generate_crossword` | `true` | Enable daily crossword generation |
| `crossword_generation_time` | `06:30` | Time to generate crosswords |
| `auto_generate_word_scramble` | `true` | Enable daily word scramble generation |
| `word_scramble_generation_time` | `07:00` | Time to generate word scrambles |
| `auto_generate_trivia_quiz` | `true` | Enable daily trivia quiz generation |
| `trivia_quiz_generation_time` | `07:30` | Time to generate trivia quizzes |
| `auto_generate_mad_lib` | `true` | Enable daily mad libs generation |
| `mad_lib_generation_time` | `08:00` | Time to generate mad libs |
| `runs_per_day` | `1` | Number of workflow runs per day (1-3) |
| `run_time_1` | `05:00` | First run time |
| `run_time_2` | `11:00` | Second run time |
| `run_time_3` | `17:00` | Third run time |

---

## Post-Upgrade Verification

| Check | How to Verify |
|---|---|
| Tests pass | `pnpm test` — expect 486 passing |
| Server starts | Logs show all 5 game scheduler initialization messages |
| SEO working | Visit `/api/article/{any-slug}` — full HTML with meta tags |
| Sitemap | Visit `/sitemap.xml` — valid XML with article URLs |
| Image backfill | Admin > Settings > Images — "Backfill Missing Images" panel |
| Multi-run scheduler | Admin > Settings > Schedule — 1-3 runs/day controls |
| Missing images badge | Admin > Articles — amber badge if articles lack images |
| No Image filter | Admin > Articles — "No Image" filter chip in filter bar |
| Games running | Check server logs next day for all 5 scheduler runs |
| Client branding intact | Verify homepage, navbar, footer, logo, colors unchanged |

---

## Post-Upgrade: Submit Sitemap to Google

After deploying the upgrade to production:

1. Go to https://search.google.com/search-console
2. Select your property (or add your domain)
3. Navigate to **Sitemaps** in the left menu
4. Enter: `https://your-domain.com/sitemap.xml`
5. Click **Submit**

Google will begin crawling and indexing your articles within days.

---

## Rollback

**If you used the upgrade script:** Your backup is in the `.upgrade-backup-*` directory:
```bash
cp -r .upgrade-backup-*/* .
pnpm install
pnpm db:push
```

**If you used manual cherry-pick:** Revert to the previous version:
```bash
git stash
git checkout v1.3.0
git stash pop
pnpm install
pnpm db:push
```

**If deployed on Manus:** Use the Rollback button on a previous checkpoint in the Management UI.

---

## What's New in v1.4.0 — Full Changelog

**SEO Infrastructure (Major Milestone)**

Server-side rendered article pages at `/api/article/:slug` with complete HTML, Open Graph meta tags for Facebook/LinkedIn sharing, Twitter Card meta tags for rich previews, JSON-LD NewsArticle schema for Google rich snippets, canonical URLs to prevent duplicate indexing, dynamic XML sitemap at `/sitemap.xml`, and user-agent detection that serves SSR to crawlers and SPA to browsers. This makes all 860+ articles crawlable by Google and shareable on social media with proper previews.

**Image Generation**

Fixed the image generation pipeline which was previously a placeholder that never called the API. Added a backfill feature with real-time progress tracking, a missing images badge in the Articles admin header, a "No Image" filter chip on the Articles list, and auto-refresh of the badge when backfill completes.

**Scheduling**

Multi-run scheduler supporting up to 3 workflow runs per day for higher daily article output. Fixed word scramble, trivia quiz, and mad libs schedulers that were never imported at server startup. All 10 game/horoscope settings keys now seeded in the database. Standalone tweet scheduler REST API endpoints added.

---

## Support

For questions or issues with this upgrade, contact the Hambry Engine team.

**Tag:** v1.4.0 | **Repo:** https://github.com/pinbot9000-beep/satire-news-saas.git
