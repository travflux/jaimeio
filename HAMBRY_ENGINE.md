# Hambry Engine — Wilder Blueprint Deployment Reference

## Engine Version

**Hambry Engine v1.3.0**
Source repository: `pinbot9000-beep/satire-news`
Upgrade process: Follow `DEPLOYMENT.md` in the repo for white-label deployment steps.

---

## What Is the Hambry Engine?

The Hambry Engine is a white-label satirical news SaaS platform. It ingests real-world RSS feeds, uses AI to generate satirical articles inspired by those stories, and publishes them to a fully branded public-facing news site. It ships with a complete admin dashboard, automated scheduling, social posting, games, SEO tooling, and a licensing system for multi-tenant deployments.

---

## Wilder Blueprint White-Label Configuration

| Setting | Value |
|---|---|
| **Site Name** | Wilder Blueprint |
| **Niche** | Real estate investing, foreclosure, side hustle, business |
| **Primary Color** | Neon Green `#00FF00` |
| **Accent Color** | Gold `#FFD700` |
| **Logo** | `/logo.png` (in `client/public/`) |
| **Tagline** | (set in admin → Settings → Branding) |

### Categories (11)
Foreclosures, Flipping, Investing, ROI, Agents, Short Sales, Side Hustle, 9-5, Job Seekers, Recession-Proof, Business

### RSS Source Feeds (27)
Seeded in the `rss_feed_weights` table. Covers: HousingWire, Calculated Risk, Norada Real Estate, InvestFourMore, Lex Levinrad, REtipster, BiggerPockets, REIT.com, CNBC Real Estate, Inman, RISMedia, Realtor.com, Redfin, Mortgage News Daily, National Mortgage News, The Truth About Mortgage, Making Sense of Cents, Dollar Sprout, The Ways to Wealth, Rat Race Rebellion, The Muse, FlexJobs, and others.

---

## Key Engine Files

| File | Purpose |
|---|---|
| `server/routers.ts` | All tRPC API procedures (~1500 lines) |
| `server/db.ts` | All database query helpers (~1800 lines) |
| `server/workflow.ts` | AI article generation pipeline |
| `server/scheduler.ts` | Cron-based daily workflow scheduler |
| `server/categoryBalance.ts` | Category distribution balancing |
| `server/rssFeed.ts` | RSS feed ingestion |
| `server/watermark.ts` | Article image watermarking |
| `server/xTwitterService.ts` | X/Twitter auto-posting |
| `server/licensing.ts` | License key management |
| `drizzle/schema.ts` | Full 24-table database schema |
| `shared/siteConfig.ts` | White-label branding config |
| `shared/writingStyles.ts` | AI writing style definitions |

---

## Manus Webdev Deployment

This project is deployed as a **permanent Manus webdev project** (`wilder-blueprint`).
- Always-on hosting — no sandbox hibernation issues
- Managed database (TiDB/MySQL)
- Manus OAuth for user login
- Published at: `wilderblue-5axjgj23.manus.space` (subdomain can be changed in Settings → Domains)

---

## How to Brief the AI on the Next Update

When starting a new task for an engine upgrade or feature work, include this in your first message:

> "This site runs on the **Hambry Engine v1.X** (repo: `pinbot9000-beep/satire-news`).
> Check `HAMBRY_ENGINE.md` in the project for full context.
> We are upgrading from vX.X to vX.X — follow `DEPLOYMENT.md` in the new repo."

That single message gives the AI everything it needs: the engine name, the repo, the reference file, and the upgrade path.

---

## Version History

| Version | Date | Notes |
|---|---|---|
| v1.2.0 | Prior | Original Hambry Engine deployment on Wilder Blueprint |
| v1.3.0 | 2026-02-27 | Mobile fixes, SEO improvements, 30 new RSS feeds, Latest page with filters, admin enhancements. Migrated to permanent Manus webdev hosting. |
