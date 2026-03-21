# Wilder Blueprint — Upgrade to v3.0.0

**For:** Adam (joinwilderblueprint.vip)  
**Date:** March 6, 2026  
**Estimated time:** 15–20 minutes

This is a pull + migrate + restart upgrade. No code changes are required on your end. Everything pre-populates from your existing database settings.

---

## What's in This Release (That Affects You)

- **9-screen Setup Wizard** — walk through all your settings in one place
- **Content Generation Prompt** — your full LLM prompt is now visible and editable in one textarea (Screen 2)
- **Schedule fix** — the old wizard wrote schedule settings to the wrong keys; this release corrects them
- **Image provider fix** — dropdown values now match what the engine actually reads
- **Social distribution engine** — unified posting queue with enable/disable toggles per platform

---

## ⚠️ Read This First: Content Prompt Risk

Your `article_llm_system_prompt` key may not exist in your database if your prompt was configured through the old `writing_style_prompt` + `ai_custom_prompt` fields.

**What will happen:** On first load of Screen 2 (Content Engine), the wizard will assemble your effective prompt from those old fields and pre-populate the textarea. **Review it carefully.** If it shows the default Hambry satire prompt instead of your Wilder Blueprint real estate content prompt, paste your correct prompt into the field and click Save before proceeding.

---

## Upgrade Steps

### Step 1: Pull Latest

In your Manus project, sync from GitHub. The latest changes are on the `main` branch of `github.com/pinbot9000-beep/satire-news`.

### Step 2: Run Database Migrations

```bash
pnpm drizzle-kit push
```

This adds five new tables and several new columns. Your existing data is not affected.

### Step 3: Restart the Server

New setting keys (including `dist_enabled_x` and schedule keys) will auto-seed on startup.

### Step 4: Walk Through the Setup Wizard

Go to **Admin → Setup Wizard** (it's now pinned at the top of the admin sidebar). Walk through each screen:

| Screen | What to Check |
|--------|---------------|
| Screen 1 — Brand | Name, colors, logo should all pre-populate. Verify they look correct. |
| Screen 2 — Content Engine | **Critical.** Review the assembled content generation prompt. If it shows satire content instead of your real estate prompt, replace it with your Wilder Blueprint prompt and save. |
| Screen 3 — Image & Video | Verify your image provider is set to `manus` (or whichever provider you use). If the field shows blank, set it back and save. |
| Screen 4 — Categories | Verify your 10 categories are present: Career Change, Current Agents, Flipping Homes, Foreclosures, High Returns, Job Seekers, RE Investing, Recession-Proof, Short Sales, Side Hustlers. |
| Screen 5 — Social Media | Enable/disable platforms as needed. X is enabled by default if your credentials are set. |
| Screen 6 — Email/SMS/Monetization | Configure Resend for newsletter if desired. No action required if you're not using these features. |
| Screen 7 — Schedule | **Important.** The old wizard wrote to wrong schedule keys — your schedule was running on seed defaults. Set your intended run times here and save. |
| Screen 8 — SEO | Verify your canonical domain and any SEO credentials. |
| Screen 9 — Review & Launch | Check the progress percentage and Needs Attention section. Resolve any flagged items, then click Launch. |

---

## What You Do NOT Need to Do

- No code changes — this is a pull + migrate + restart
- No manual DB edits — seeds backfill automatically on restart
- No re-entering existing credentials — everything pre-populates from the DB
- No changes to your Manus project instructions

---

## Wilder-Specific Risks

**1. Content prompt (highest risk):** If Screen 2 shows a satire prompt instead of your real estate content prompt, your articles will be generated as satire until you correct it. Fix it on Screen 2 before your next workflow run.

**2. Image provider:** If your `image_provider` was set to `"manus"` but Screen 3 shows blank after upgrade, set it back to `manus` and save.

**3. Schedule:** Your actual schedule was running on seed defaults before this upgrade (the old wizard wrote to wrong keys). After upgrade, set your desired run times on Screen 7. This is a one-time correction.

---

## If Something Goes Wrong

The upgrade is non-destructive — your existing articles, categories, and settings are not modified. If you encounter issues, check the server logs for migration errors and reach out to the owner (Jon) for support.
