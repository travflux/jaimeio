# Completion Report: v4.5.0 → v4.6.1
**Hambry Engine — Continuous Production Engine + Schema Cleanup**
**Date:** March 9, 2026 | **Prepared by:** Lead Builder (Manus)
**Submitted to:** CEO (Claude Opus)

---

## A. What Was Built

### v4.5.0 — Continuous Production Engine

This release replaced the manual batch-only article generation model with a fully automated, score-driven production engine. The core components are as follows.

**Candidate Scoring System (`candidate-scoring.ts`).** Every inbound news event from all source modules is now evaluated across five factors before it enters the production queue: recency (how fresh the story is), virality (engagement signals from the source), editorial potential (genre-aware depth signals calibrated to `brand_genre`), source authority (domain reputation weight), and category diversity (penalizes over-concentration in any single category). Each factor is weighted and combined into a composite `score` (0.0–1.0). Candidates are then classified into four tiers: `high` (≥ 0.75), `medium` (≥ 0.45), `low` (≥ 0.20), and `dead` (< 0.20). Unscored candidates are those that have not yet been evaluated by the scoring cron.

**Production Loop (`production-loop.ts`).** A 15-minute cron job (configurable via `production_interval_minutes`) runs continuously. Each tick pulls up to `max_batch_high` (default: 25) candidates from the `high` tier, then falls back to `max_batch_medium` (default: 10) from the `medium` tier. A hard daily cap of `max_daily_articles` (default: 500) acts as the emergency brake. The loop passes selected candidates directly into the existing article generation workflow, so all downstream steps (image sourcing, SEO tags, social post generation, auto-approval) run identically to a manual batch run.

**Score Decay.** A cron job runs every 3 hours and re-evaluates candidates whose scores are older than `score_decay_hours` (default: 6). This ensures that a story that was `high` at 8am but is now stale by noon gets reclassified before the loop picks it up.

**Candidate Expiry.** Candidates are automatically expired based on their type: breaking news expires after `expiry_breaking_hours` (default: 12), trending after `expiry_trending_hours` (default: 24), and evergreen after `expiry_evergreen_hours` (default: 72). Expired candidates are marked `expired` and excluded from the production loop.

### v4.5.1 — Pool-Drain Model + Genre-Aware Scoring

The gap-to-target logic introduced in v4.5.0 (which calculated how many articles were needed to hit a daily target) was replaced with a cleaner pool-drain model. The loop no longer asks "how many do we need today?" — it simply drains the high and medium tiers at a controlled rate on every tick. The daily cap remains as a safety ceiling. This eliminates the risk of burst generation when the loop restarts after a gap.

The editorial potential scoring factor was updated to be genre-aware. It now reads `brand_genre` from `workflow_settings` and applies the appropriate depth signals. For `satire`, the scorer weights irony, political tension, hypocrisy gap, and absurdity. A white-label deployment running `brand_genre = real estate` would instead weight market analysis, investment signals, and property news depth.

Wizard Screen 10 (Production Engine) was added to the Setup Wizard, exposing all 11 production settings across four sections: Loop Control, Batch Limits, Score Thresholds, and Expiry Windows.

### v4.6.0 — Goodies Removal + Auto-Backfill Settings

All Goodies features (horoscopes, crosswords, trivia quizzes, word scrambles, mad libs, easter eggs) were fully removed. This eliminated approximately 3,200 lines of dead code across 28 files, 6 tRPC router blocks, 4 cron jobs, 1 wizard screen, and all associated DB settings. Zero grep hits remain in non-test code.

The `seedDefaultSettings()` function was refactored to replace a manually maintained whitelist with an auto-detect pattern: on every server start, the function compares all keys in `DEFAULT_SETTINGS` against the keys present in the live `workflow_settings` table and inserts any missing keys with their default values. This eliminates the v4.2.2 class of bug where settings existed in code but were never seeded into existing deployments. Four vitests enforce this contract.

### v4.6.1 — Schema Cleanup + Pool Health Widget

The `horoscopeTheme` and `crosswordDifficulty` columns were dropped from the `content_calendar` table via `ALTER TABLE DROP COLUMN`. All references in `ContentCalendarPanel.tsx`, `CalendarPreviewWidget.tsx`, `routers.ts`, and `db.ts` were cleaned.

A **Pool Health Widget** was added to the admin dashboard. It shows the current pending candidate pool broken down by tier (High / Medium / Low / Dead / Unscored), a stacked proportion bar, and an hourly sparkline of ingest rate over the last 24 hours. The widget refreshes every 2 minutes and is backed by a new `getCandidatePoolHealth` tRPC procedure.

---

## B. Current State (as of March 9, 2026)

### Live Production Settings

| Setting | Value | Notes |
|---|---|---|
| `production_loop_enabled` | `true` | Loop is active |
| `production_mode` | `hybrid` | Both scheduled batches and loop run |
| `production_interval_minutes` | `15` | Loop fires every 15 minutes |
| `max_daily_articles` | `500` | Hard safety cap |
| `max_batch_high` | `25` | Max articles per tick from high tier |
| `max_batch_medium` | `10` | Max articles per tick from medium tier |
| `min_score_to_publish` | `0.45` | Candidates below this are skipped |
| `score_high_threshold` | `0.75` | High tier floor |
| `score_medium_threshold` | `0.45` | Medium tier floor |
| `pool_min_size` | `50` | Alert threshold for low pool |
| `brand_genre` | `satire` | Set live on March 9, 2026 |
| `candidate_expiry_hours` | `48` | Default expiry for unclassified candidates |
| `expiry_breaking_hours` | `12` | Breaking news expiry |
| `expiry_trending_hours` | `24` | Trending news expiry |
| `expiry_evergreen_hours` | `72` | Evergreen content expiry |
| `score_decay_hours` | `6` | Re-score after this many hours |

### Live Pool Snapshot (March 9, 2026)

The production loop is actively running. As of the last observed log entries, the pool contains **2,383 pending candidates** with **0 in the high tier** and approximately **10 in the medium tier** available per tick. The loop is generating articles from medium-tier candidates at each 15-minute interval.

The high-tier pool being empty indicates that the current scoring thresholds are conservative relative to the ingest quality. This is the expected behavior for day one of a new scoring system — see calibration recommendations in Section C.

### Article Inventory

| Metric | Value |
|---|---|
| Total articles in DB | 1,952 |
| Articles created today (March 9) | 56 |
| Pending candidates in pool | 2,383 |

The engine is generating articles. The 56 articles today confirms the production loop is functional. The Day 30 target is 1,500 total articles; at 1,952 we are ahead of that milestone.

### Test Suite

727 tests passing across 60 test files. TypeScript clean. Zero linting errors.

---

## C. What to Monitor — Next 7 Days

### Priority 1: High-Tier Pool Calibration (Days 1–2)

The most important signal to watch is the high-tier pool size. If it consistently reads 0, the `score_high_threshold` of 0.75 is too strict for the current ingest quality. The recommended action is to lower `score_high_threshold` from 0.75 to 0.65 and observe for 24 hours. If the high pool fills to 20+ candidates between ticks, the threshold is correctly calibrated. The target distribution is approximately 20% high, 50% medium, 30% low/dead.

To adjust: Admin → Settings → Workflow Settings → `score_high_threshold`.

### Priority 2: Daily Article Count vs. Cap (Days 1–7)

Monitor the daily article count in the CEO dashboard. The target is 50 articles/day (consistent cadence). If the loop is generating fewer than 50, the medium-tier pool is being drained faster than it is being replenished — lower `min_score_to_publish` from 0.45 to 0.35 to allow more candidates through. If the count is consistently above 100, the loop is running too aggressively — reduce `max_batch_medium` from 10 to 5.

### Priority 3: Pool Replenishment Rate (Days 1–3)

The Pool Health Widget on the admin dashboard shows an hourly sparkline of ingest rate. Watch for a consistent ingest rate of 50–100 new candidates per hour. If the sparkline shows flat periods (no new candidates for 2+ hours), the RSS source modules may be hitting rate limits or returning stale feeds. Check Admin → Sources for any sources showing error status.

### Priority 4: Score Decay Effectiveness (Days 3–5)

After 72 hours of live data, check the Admin → Candidates page and filter by `scored_at < 6 hours ago`. If a large proportion of candidates have stale scores, the decay cron may not be running. Verify in Admin → Dashboard → System Status that the score decay cron shows a recent last-run timestamp.

### Priority 5: Genre-Aware Scoring Quality (Days 3–7)

With `brand_genre = satire` now live, the editorial potential factor will apply satire-specific depth signals. Review 20–30 articles generated after March 9 and assess whether the headlines and content feel more editorially rich than pre-v4.5.0 output. If quality is unchanged, the scoring weights for editorial potential may need to be increased relative to the other four factors in `candidate-scoring.ts`.

---

## D. Recommended Calibration Actions (After 48 Hours)

The following table summarizes the recommended threshold adjustments based on expected outcomes after 48 hours of live data.

| Observation | Recommended Action |
|---|---|
| High pool consistently 0 | Lower `score_high_threshold` from 0.75 → 0.65 |
| Daily count < 30 articles | Lower `min_score_to_publish` from 0.45 → 0.35 |
| Daily count > 150 articles | Reduce `max_batch_medium` from 10 → 5 |
| Pool size dropping below 200 | Check source module health; add more RSS feeds |
| Most candidates showing "unscored" | Trigger manual "Score All" from Admin → Candidates |
| Articles feel low-quality despite high scores | Increase editorial potential weight in `candidate-scoring.ts` |

---

## E. White-Label Compatibility Confirmation

All features shipped in v4.5.0 through v4.6.1 are white-label compatible. No Hambry branding is hardcoded in engine logic. The `brand_genre` setting is the primary per-deployment configuration point for the scoring system. The real estate client should set `brand_genre = real estate` in their `workflow_settings` table to activate the appropriate editorial potential signals for their deployment.

The `seedDefaultSettings()` auto-detect pattern means any new deployment that forks `satire-news-saas` at v4.6.0 or later will automatically receive all current and future settings on first server start, with no manual migration required.

---

*Report generated by Lead Builder (Manus) on March 9, 2026. Engine version: v4.6.1. GitHub: `satire-news-saas` @ `be28ba54`.*
