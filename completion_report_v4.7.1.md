# v4.7.1 Completion Report
**Date:** 2026-03-09  
**Version:** 4.7.1  
**Status:** COMPLETE — pushed to satire-news-saas

---

## Part 1 — Tag Hygiene (satire-news-saas)

**Problem:** Tags v4.5.0 through v4.7.0 were missing from the satire-news-saas remote. White-label clients had no way to pin to a specific engine version. The `latest` tag did not exist.

**What was done:**
- Created and pushed tags `v4.5.0`, `v4.5.1`, `v4.6.0`, `v4.6.1`, `v4.7.0` to satire-news-saas (all pointed to the correct commits from git log).
- Created `latest` tag pointing to HEAD (v4.7.1) and pushed to satire-news-saas.
- Updated `scripts/push-saas-release.sh` Step 8 to always: (1) update `latest` tag and force-push it, (2) push all tags via `--tags`. This is now automatic on every future release.

**White-label client impact:** Clients can now run `git checkout latest` for the most recent stable release, or pin to any specific version (e.g., `git checkout v4.6.1`).

---

## Part 2 — White-Label Meta Tag Fix (client/index.html)

**Problem:** `client/index.html` contained hardcoded Hambry-specific values in every meta tag: title, description, keywords, og:site_name, og:title, og:description, og:url, og:image, twitter:title, twitter:description, twitter:image, twitter:site, and canonical link. Any white-label deployment would briefly flash "Hambry" branding before React hydrated.

**What was done:**
- Replaced all hardcoded Hambry values with empty strings or `Loading...` placeholder.
- Removed the static SEO `<div>` that contained hardcoded Hambry copy.
- Added a comment explaining that React hydrates within milliseconds and overwrites these with correct brand values from the database.
- The Google Analytics tag (`AW-17988276150`) was left in place — this is Hambry-specific and should be removed or made configurable in a future white-label pass.

**Files changed:** `client/index.html`

---

## Part 3 — Setup Gate (Production Loop + Batch Workflow)

**Problem:** Fresh white-label deployments would immediately start generating content using default settings (wrong niche, wrong voice) the moment the server started. There was no gate preventing content generation before the operator completed the Setup Wizard.

**What was done:**

### 3a — New DB setting
Added `setup_complete` to `DEFAULT_SETTINGS` in `server/db.ts`:
```
key: "setup_complete"
value: "false"  (default — safe for new deployments)
label: "Setup Complete"
category: "system"
type: "boolean"
```
The auto-detect backfill will insert this into any existing deployment on next server start.

### 3b — Production loop gate
In `server/production-loop.ts`, `runProductionLoopTick()` now checks `setup_complete` before any other logic. If false, it returns immediately with a clear log message:
```
[ProductionLoop] Production loop skipped — Setup Wizard not yet completed. Set setup_complete=true to enable.
```

### 3c — Batch workflow gate
In `server/scheduler.ts`, `runWorkflow()` now checks `setup_complete` before the `workflow_enabled` check. If false, it returns immediately with:
```
[Scheduler] Workflow skipped — Setup Wizard not yet completed. Set setup_complete=true to enable.
```

### 3d — Wizard trigger
In `server/routers/setup.ts`, `completeLaunch` mutation now sets `setup_complete=true` in addition to `_onboarding_completed` and `setup_banner_dismissed`. When the operator clicks "Launch Publication" on the Review screen, all three flags are set atomically.

### Hambry live DB
Hambry's `_onboarding_completed` was already set (2026-03-09T02:43:44.219Z), confirming setup was complete. `setup_complete` was set to `true` directly in the live DB to avoid disrupting the production loop.

---

## Tests

All 11 `network-report.test.ts` tests pass. TypeScript reports 0 errors.

---

## Files Changed

| File | Change |
|---|---|
| `client/index.html` | Removed all hardcoded Hambry meta tags |
| `server/db.ts` | Added `setup_complete` to DEFAULT_SETTINGS |
| `server/production-loop.ts` | Added setup_complete gate at top of `runProductionLoopTick` |
| `server/scheduler.ts` | Added setup_complete gate at top of `runWorkflow` |
| `server/routers/setup.ts` | `completeLaunch` now sets `setup_complete=true` |
| `scripts/push-saas-release.sh` | Step 8 now pushes `latest` tag + all tags |
| `package.json` | Bumped to 4.7.1 |

---

## satire-news-saas Tags (current state)

```
v1.1, v1.2.0, v1.4.0, v2.0.0, v2.1.0, v3.0.0, v3.0.1, v3.1.0
v4.1.0, v4.2.1, v4.2.2, v4.2.3, v4.3.0, v4.3.1, v4.3.2, v4.4.0
v4.5.0, v4.5.1, v4.6.0, v4.6.1, v4.7.0, v4.7.1
latest → v4.7.1 (bcdfc125)
```
