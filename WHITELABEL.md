# White-Label Deployment Guide — Satire Engine

This guide walks a new operator through deploying their own branded instance of the Satire Engine from the GitHub repository. The engine is the product. Your brand is the configuration. Hambry is the flagship deployment; your site is a separate, independent instance using your own credentials and domain.

---

## Architecture Overview

The engine separates concerns into two distinct layers:

| Layer | What it contains | Where it lives |
|---|---|---|
| **Engine** | Article generation, publishing pipeline, X posting queue, SEO, CEO Dashboard, admin UI | All server and client code |
| **Brand** | Site name, tagline, voice, categories, colours, domain, API keys | `workflow_settings` DB table + environment variables |

No engine code needs to be modified for a new deployment. All brand customisation happens through the Admin panel after first boot.

---

## Prerequisites

Before deploying, you need:

- A **Manus Pro account** (or any Node.js host with MySQL/TiDB)
- An **Anthropic API key** (Claude, for article generation)
- A **domain name** pointed at your host
- An **X (Twitter) Developer account** with a project and app (for social posting)
- An **AWS S3 bucket** or compatible object storage (for article images)

---

## Step 1 — Fork and Clone

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/satire-news.git
cd satire-news
pnpm install
```

---

## Step 2 — Environment Variables

Create a `.env` file at the project root (never commit this file). The following variables are required:

### Required — Platform

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string | `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | Random 32+ character string for session signing | `openssl rand -hex 32` |
| `SITE_URL` | Your canonical domain with protocol | `https://yourdomain.com` |

### Required — LLM (Article Generation)

| Variable | Description |
|---|---|
| `BUILT_IN_FORGE_API_KEY` | Your LLM provider API key (Anthropic/OpenAI) |
| `BUILT_IN_FORGE_API_URL` | LLM provider base URL |
| `VITE_FRONTEND_FORGE_API_KEY` | Same key, exposed to frontend for streaming |
| `VITE_FRONTEND_FORGE_API_URL` | Same URL, exposed to frontend |

### Required — X (Twitter) Posting

| Variable | Description |
|---|---|
| `X_API_KEY` | X Developer app API key |
| `X_API_SECRET` | X Developer app API secret |
| `X_ACCESS_TOKEN` | Access token for your X account |
| `X_ACCESS_TOKEN_SECRET` | Access token secret for your X account |

### Optional — Manus OAuth (if deploying on Manus)

| Variable | Description |
|---|---|
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `OWNER_OPEN_ID` | Owner's Manus Open ID |
| `OWNER_NAME` | Owner's display name |

### Optional — Analytics

| Variable | Description |
|---|---|
| `VITE_ANALYTICS_ENDPOINT` | Umami or compatible analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

---

## Step 3 — Database Setup

```bash
pnpm db:push
```

This runs all Drizzle migrations and creates the required tables. On first boot, the engine seeds `workflow_settings` with generic fallback values — no Hambry branding will appear.

---

## Step 4 — First Boot

```bash
pnpm dev   # development
pnpm build && pnpm start   # production
```

Navigate to `https://yourdomain.com/admin` and log in with the owner account. You will see the Admin panel with all settings at their generic defaults.

---

## Step 5 — Brand Configuration

In **Admin → Settings → Branding**, configure:

| Setting | DB Key | Description |
|---|---|---|
| Site Name | `brand_site_name` | Your publication name |
| Tagline | `brand_tagline` | One-line brand statement |
| Site URL | `brand_site_url` | Canonical domain (must match `SITE_URL` env var) |
| Twitter Handle | `brand_twitter_handle` | `@yourhandle` |
| Contact Email | `brand_contact_email` | Public contact address |
| Launch Date | `brand_launch_date` | `YYYY-MM-DD` — used for "Days Since Launch" in CEO Dashboard |
| Founded Year | `brand_founded_year` | Used in footer copyright |

In **Admin → Settings → Content**, configure:

| Setting | DB Key | Description |
|---|---|---|
| Voice Instructions | `content_voice_instructions` | The editorial voice prompt sent to the LLM for every article |
| Categories | Managed via Categories UI | Add/remove/rename content categories |
| Daily Article Target | `content_daily_target` | Articles to generate per day (default: 50) |

---

## Step 6 — Social Platform Credentials

The engine supports 7 social distribution platforms. Credentials are stored in the `platform_credentials` table (not in `.env`) and managed via **Admin → Social → Settings → Credentials** or the **Setup Wizard**.

For each platform you want to enable:
1. Navigate to **Admin → Setup** and complete the Social Media step, **or**
2. Go to **Admin → Social → Settings → Credentials** and enter credentials directly.

Each credential entry has a **Test Connection** button that validates credentials before saving. The `is_valid`, `last_tested_at`, and `last_error` columns track credential health automatically.

| Platform | Required Credentials | Daily Post Limit |
|---|---|---|
| X (Twitter) | API Key, API Secret, Access Token, Access Token Secret | 48 |
| Reddit | Client ID, Client Secret, Username, Password, User Agent | 25 |
| Facebook | Page ID, Access Token | 10 |
| Instagram | Account ID, Access Token | 10 |
| Bluesky | Handle, App Password | 20 |
| Threads | User ID, Access Token | 10 |
| LinkedIn | Access Token, Person URN | 3 |

**X Queue settings** (in **Admin → Social → X Queue**):

| Setting | DB Key | Default |
|---|---|---|
| Daily Post Limit | `x_daily_post_limit` | 48 |
| Post Interval (minutes) | `x_post_interval_minutes` | 120 |
| Auto-approve articles for X | `x_auto_approve` | true |

---

## Step 6b — Setup Wizard

The engine includes a guided **Setup Wizard** at **Admin → Setup**. It walks through every configuration step in order and tracks completion in the `setup_checklist` table. Each checklist item has:

- `check_type`: `manual` (user confirms) or `auto` (engine validates automatically)
- `check_config`: JSON validation rules (e.g., required DB keys, API test endpoints)
- `setup_url`: Deep link to the relevant settings page for one-click navigation
- `added_in_version`: Engine version when the step was introduced

The wizard covers:
1. Brand configuration (site name, tagline, domain)
2. LLM credentials (article generation API key and URL)
3. Social media credentials (per-platform, with Test Connection)
4. Newsletter setup (Resend API key, sender address, test email)
5. SMS setup (Twilio credentials — optional)
6. SEO configuration (IndexNow key, Google Search Console)

---

## Step 7 — Verify

Run the following checks after first deploy:

```bash
# 1. Sitemap is live and contains your articles
curl -s https://yourdomain.com/api/sitemap.xml | grep -c "<loc>"

# 2. An article page is server-rendered (not a JS SPA)
curl -s https://yourdomain.com/api/article/SOME-SLUG | grep "<title>"

# 3. CEO Dashboard is accessible and shows your brand name
curl -s https://yourdomain.com/api/briefing-room-m4x1q | grep -i "company snapshot"

# 4. X queue is running
curl -s https://yourdomain.com/api/briefing-room-m4x1q | grep -i "queue status"
```

---

## What NOT to Modify

The following files contain engine logic and should not be modified for brand customisation. Changes here affect all deployments and should be contributed back to the main repo:

- `server/_core/` — OAuth, tRPC context, LLM helpers, server bootstrap
- `server/workflow.ts` — Article generation pipeline
- `server/xPostQueue.ts` — X posting queue
- `server/ceoDashboard.ts` — CEO Dashboard renderer
- `drizzle/schema.ts` — Database schema

---

## White-Label Compatibility Rule

Every feature built for Hambry must pass this test: **"Would this work if someone forked this repo and pointed it at a different brand?"**

If the answer is no, refactor before merging:

- No hardcoded brand names in engine logic — use `getSetting('brand_site_name')` or the `WHITE_LABEL_CONFIG` fallback from `shared/brandConfig.ts`
- No hardcoded domain URLs — use the `SITE_URL` environment variable
- No hardcoded API keys — each deployment uses its own credentials via environment variables
- No hardcoded categories — categories are managed via the DB, not code constants

---

## Support

This is a self-service deployment. The Hambry team does not provide deployment support. For engine bugs and feature requests, open an issue on the GitHub repository.

---

*Satire Engine — built by Hambry. White-label licensing enquiries: contact@hambry.com*
