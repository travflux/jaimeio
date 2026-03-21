# Hambry Engine — Project Context

**READ THIS FILE AT THE START OF EVERY SESSION.** This is the project knowledge base. It documents how everything works, what has been built, what the architecture is, and what the owner expects. Do not ask the owner to re-explain things documented here.

---

## 0. Grounding Commands

When the user says any of these words or phrases, **STOP what you are doing** and re-read this entire file plus `CUSTOMIZABLE_FILES.md`, `RELEASE-PROCESS.md`, and `todo.md` before continuing:

- **"ground yourself"** — Read PROJECT-CONTEXT.md, CUSTOMIZABLE_FILES.md, RELEASE-PROCESS.md, and todo.md. Confirm what you now understand before taking any action.
- **"reboot"** — Same as "ground yourself." Full knowledge base re-read.
- **"read your notes"** — Same as "ground yourself."
- **"what do you know"** — Read PROJECT-CONTEXT.md and summarize the key facts back to the user without taking any action.
- **"check your work"** — Read todo.md and report what's completed vs. pending.

These commands exist because context gets lost between sessions. When the user uses them, it means you are off track and need to re-orient before proceeding. Do NOT skip this step. Do NOT summarize from memory — actually re-read the files.

---

## 1. What Is Hambry?

Hambry is a **fully automated satirical news platform** that generates, publishes, and distributes AI-written satirical articles based on real news events. The engine runs autonomously: it scrapes RSS feeds, generates satirical articles via LLM, creates featured images, publishes to the website, and distributes to social media (X/Twitter via direct API, FeedHive for other platforms).

The platform is also a **white-label SaaS product**. The core engine can be licensed to other clients who deploy their own branded version. The SaaS distribution repo is at **https://github.com/pinbot9000-beep/satire-news-saas.git**. The main development repo is at **https://github.com/pinbot9000-beep/satire-news.git**.

**Live production site:** https://www.hambry.com (also hambry.com)

---

## 2. Architecture Overview

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Tailwind 4 + shadcn/ui | SPA with SSR for SEO via /api/ routes |
| Backend | Express 4 + tRPC 11 | All API via /api/trpc, REST endpoints for schedulers |
| Database | MySQL/TiDB via Drizzle ORM | Schema in drizzle/schema.ts |
| Auth | Manus OAuth | Session cookie, protectedProcedure for gated routes |
| Image Gen | Built-in imageGeneration helper | Server-side only, uses BUILT_IN_FORGE_API |
| Video Gen | Replicate API | Multiple providers in videoProviders.ts |
| Social | X/Twitter direct API + FeedHive triggers | X credentials in env, FeedHive via webhook URLs |
| Storage | S3 via storagePut/storageGet helpers | All file bytes in S3, metadata in DB |
| Hosting | Manus platform | Custom domain hambry.com, publish via Management UI |

---

## 3. Key Automated Systems

### Article Workflow Pipeline (server/workflow.ts + server/scheduler.ts)
The main content pipeline runs up to **3 times per day** (configurable in Settings > Schedule). Each run:
1. Scrapes RSS feeds for real news events
2. Filters and deduplicates against existing articles
3. Generates satirical articles via LLM (respects writing style, target word count, category balance)
4. Generates featured images via image API (respects image_style_prompt, image_style_keywords, mascot_instruction)
5. Auto-approves articles after a configurable timer
6. Publishes to the website
7. Generates social media posts and queues them

**Settings keys:** `runs_per_day`, `run_time_1`, `run_time_2`, `run_time_3`, `articles_per_batch`, `auto_generate_images`, `image_style_prompt`, `image_style_keywords`, `mascot_instruction`, `writing_style`, `target_article_length`

### Game Schedulers (5 daily generators)
Each runs once daily at a configured time. All self-initialize on module import in server/_core/index.ts.

| Game | Scheduler File | Default Time | Settings Keys |
|---|---|---|---|
| Horoscopes | server/horoscope-scheduler.ts | 6:00 AM | auto_generate_horoscope, horoscope_generation_time |
| Crossword | server/crossword-scheduler.ts | 6:30 AM | auto_generate_crossword, crossword_generation_time |
| Word Scramble | server/word-scramble-scheduler.ts | 7:00 AM | auto_generate_word_scramble, word_scramble_generation_time |
| Trivia Quiz | server/trivia-quiz-scheduler.ts | 7:30 AM | auto_generate_trivia_quiz, trivia_quiz_generation_time |
| Mad Libs | server/mad-libs-scheduler.ts | 8:00 AM | auto_generate_mad_lib, mad_lib_generation_time |

### X/Twitter Posting (server/xPostQueue.ts + server/xTwitterService.ts)
Posts are queued and distributed throughout the day. The queue respects daily limits (default 48/day). X credentials are stored as env secrets (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET).

### Standalone Tweet Engine (server/standaloneXTweetEngine.ts + server/standalone-tweet-scheduler.ts)
Generates and posts satirical tweets that are NOT tied to articles. Has its own scheduler and admin page.

### X Reply Engine (server/xReplyEngine.ts)
Monitors mentions and generates satirical replies.

---

## 4. SEO Infrastructure (Added v1.4.0)

This was the **single most important technical milestone since launch**. All 860+ articles are now crawlable by Google.

**How it works:** The engine serves two versions of each article:
- `/api/article/:slug` — Always returns full SSR HTML with all meta tags. This is the canonical URL.
- `/article/:slug` — Detects user agent. Crawlers get SSR HTML; browsers get the React SPA.

**Key files:** server/articleSsr.ts (SSR renderer), server/sitemap.ts (XML sitemap), server/seo.ts (SEO middleware)

**Verified elements:** `<title>` tag, OG meta tags, Twitter Card meta tags, JSON-LD NewsArticle schema, canonical URL, full article body in HTML, XML sitemap at /sitemap.xml.

**Pending:** Submit sitemap to Google Search Console (owner action).

---

## 5. White-Label SaaS Model

### Business Model
- Setup: $3,000–$5,000 one-time
- Monthly: $200–$500/month
- BYOK (Bring Your Own Keys): clients provide their own Manus account and API credentials

### Distribution
- SaaS repo: **https://github.com/pinbot9000-beep/satire-news-saas.git**
- Main dev repo: **https://github.com/pinbot9000-beep/satire-news.git**
- The Manus GitHub App integration only has access to `satire-news`. To push to `satire-news-saas`, use a Personal Access Token (PAT) with Contents read/write permission.

### File Separation (CRITICAL for upgrades)
See **CUSTOMIZABLE_FILES.md** for the complete list. The key principle:

**Engine core files** (server logic, schedulers, DB, admin pages, game pages) are safe to overwrite on upgrade. **Client customizable files** (branding, navigation, homepage, footer, CSS variables, public assets, siteConfig.ts) must NEVER be overwritten.

### Versioning
Version history is in `server/version-manager.ts`. Current version: **1.4.0** (Feb 28, 2026). Release process is documented in `RELEASE-PROCESS.md`.

---

## 6. Admin Dashboard Structure

The admin UI is organized with a left-hand sidebar menu. The owner prefers a **highly organized** admin UI with functionalities categorized and accessible via the sidebar, using sub-menus for further organization.

### Admin Pages
- **Dashboard** — Overview analytics (article counts, views, workflow stats)
- **Articles** — Article management with status filters, "No Image" filter chip, missing images badge
- **Categories** — Category CRUD
- **Source Feeds** — RSS feed management
- **Workflow** — Workflow control panel, batch history, quick actions
- **AI Generator** — Manual article generation
- **Social / X Queue** — Social media posting queue
- **Standalone Tweets** — Independent satirical tweet engine
- **X Reply Queue** — Mention monitoring and reply engine
- **Games** — Crosswords, Horoscopes, Word Scrambles, Trivia, Mad Libs management
- **Comments** — Comment moderation
- **Newsletter** — Subscriber management
- **Feed Performance** — Analytics on content performance
- **Search Analytics** — Search term analytics
- **CEO Directives** — Strategic directives system
- **Settings** (sub-menu):
  - Branding — Site name, logo, colors
  - Homepage — Homepage layout settings
  - Generation — AI writing settings
  - Images — Image generation settings + backfill panel
  - Videos — Video generation settings
  - Schedule — Workflow schedule (1-3 runs/day)
  - Publishing — Auto-approve, publishing rules
  - Social — FeedHive, Reddit settings
  - Category Balance — Category distribution targets
  - Amazon — Amazon affiliate integration
  - Goodies — Miscellaneous settings

---

## 7. Database Settings System

All runtime configuration is stored in a `workflow_settings` table (key-value store). Settings are read via `getSetting(key)` and written via `setSetting(key, value)`. Default values are seeded by `seedDefaultSettings()` in server/db.ts on first startup.

When adding new features that need settings, ALWAYS:
1. Add the default value to `DEFAULT_SETTINGS` array in db.ts
2. Add the key to the `ensureKeys` backfill section for existing installations
3. Add the settings key to the admin UI (usually in the appropriate Settings sub-page)

---

## 8. Key Decisions & Preferences

- **Design style:** Apple-inspired, enterprise-grade. Inter for body text, Playfair Display for headlines. Clean, tight margins, subtle micro-interactions.
- **Font minimum:** 13-14px for body text, 11-12px absolute minimum for small text.
- **Scrollbar:** Custom red/primary-colored scrollbar via CSS variables.
- **Category menu bar:** Dark/red color scheme (not light).
- **Breaking news ticker:** Dark/red color scheme.
- **Tagline:** "The News, Remastered" (changed from "Fake News You Can Trust").
- **AdSense:** Publisher ID ca-pub-8035531423312933, ads.txt in client/public.
- **Social links:** X/Twitter at https://x.com/Hambry_com, RSS feed at /api/rss.

---

## 9. Common Pitfalls to Avoid

1. **Never run `git checkout` or `git reset --hard`** — use `webdev_rollback_checkpoint` instead.
2. **Never overwrite client-customizable files** during upgrades (see CUSTOMIZABLE_FILES.md).
3. **Game schedulers must be imported** in server/_core/index.ts to self-initialize. If you add a new scheduler, import it there.
4. **New settings keys must be seeded** in both DEFAULT_SETTINGS and the ensureKeys backfill in db.ts.
5. **The satire-news-saas repo** requires a PAT to push (Manus GitHub App only has access to satire-news).
6. **Image generation was a placeholder until v1.4.0** — it now actually calls the API. If images are missing, check the `auto_generate_images` setting and the image generation logs.
7. **The CEO Dashboard** is at /api/briefing-room-m4x1q (no auth, obscured URL).

---

## 10. Version History Summary

| Version | Date | Key Changes |
|---|---|---|
| 1.0.0 | Feb 16, 2026 | Initial launch: article generation, admin dashboard, social posting |
| 1.1.0 | Feb 19, 2026 | FeedHive integration, mobile responsiveness, workflow control panel |
| 1.2.0 | Feb 22, 2026 | Design polish, games (crossword, horoscopes, trivia, word scramble, mad libs), RSS feed, AdSense |
| 1.3.0 | Feb 26, 2026 | Latest page, homepage settings, RSS feed management, 30 new feeds, mobile fixes |
| 1.4.0 | Feb 28, 2026 | SEO infrastructure, image gen fix, backfill images, multi-run scheduler, games scheduler fix |

---

## 11. Session Start Checklist

At the start of every new session, before doing anything else:
1. Read this file (PROJECT-CONTEXT.md)
2. Read todo.md (check what's pending)
3. Read RELEASE-PROCESS.md (if a release is requested)
4. Read CUSTOMIZABLE_FILES.md (if an upgrade or file change is involved)
5. Acknowledge to the user what you understand about the current state

---

## 12. File Quick Reference

| Purpose | File |
|---|---|
| Database schema | drizzle/schema.ts |
| DB query helpers | server/db.ts |
| tRPC procedures | server/routers.ts |
| Server entry point | server/_core/index.ts |
| Article SSR | server/articleSsr.ts |
| Sitemap | server/sitemap.ts |
| Main scheduler | server/scheduler.ts |
| Workflow pipeline | server/workflow.ts |
| Version tracking | server/version-manager.ts |
| Site branding config | shared/siteConfig.ts |
| Frontend routes | client/src/App.tsx |
| Homepage | client/src/pages/Home.tsx |
| CSS variables | client/src/index.css |
| Release process | RELEASE-PROCESS.md |
| Deployment guide | DEPLOYMENT.md |
| Upgrade guide | UPGRADE-v1.4.0.md |
| File classification | CUSTOMIZABLE_FILES.md |
| This file | PROJECT-CONTEXT.md |
