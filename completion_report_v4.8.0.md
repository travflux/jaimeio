# v4.8.0 — Admin & Setup Wizard Redesign

**Release date:** Mar 9, 2026  
**Branch:** main → satire-news-saas  
**Directive:** Admin & Setup Wizard Redesign Spec v1.0

---

## Summary

Full implementation of the Admin & Setup Wizard Redesign Spec v1.0. The wizard is now exactly 8 screens, the admin left nav matches the spec, Microsoft Clarity is integrated, a dev-time keysForScreen warning hook prevents future silent-drop bugs, and the mobile UX has a sticky save/nav footer.

---

## Changes

### 1. Wizard restructured to 8 screens

| # | Screen ID | Title | Status |
|---|-----------|-------|--------|
| 1 | `brand` | Brand & Identity | Existing (unchanged) |
| 2 | `content` | Content Engine | Trimmed to AI settings only |
| 3 | `media` | Image & Video | Existing (unchanged) |
| 4 | `categories` | Categories | Existing (unchanged) |
| 5 | `sources` | Content Sources | **New** — split from Content Engine |
| 6 | `seo` | SEO & Analytics | Renamed + Analytics section added |
| 7 | `production` | Production Engine | Renumbered from 9→7 |
| 8 | `review` | Review & Launch | Renumbered from 11→8 |

**Removed screens:** `social`, `email` (Email/SMS/Monetization), `schedule`, `network`  
These settings remain accessible via Admin → Settings sub-nav.

### 2. ContentSourcesScreen (new component)

Extracted from ContentEngineScreen. Contains: RSS Feed Manager, Google News toggle + keywords, X Listener toggle + keywords, Reddit toggle + subreddits, YouTube toggle + channel IDs, Web Scraper toggle + URLs, Manual Injection toggle.

### 3. Microsoft Clarity integration

- `brand_clarity_id` added to DEFAULT_SETTINGS (branding category, empty default)
- `client/src/hooks/useClarity.ts` — dynamically injects Clarity script when `brand_clarity_id` is set (dev-only suppressed)
- Called in `App.tsx` alongside `useGtag`
- Analytics section added to SEO wizard screen: GA Tag ID + Clarity Project ID side by side

### 4. Dev-time keysForScreen warning hook

`client/src/hooks/useWizardKeyAudit.ts` — logs a console warning in development when a wizard setting key is rendered but missing from `keysForScreen`. Catches the class of silent-drop bug found in v4.7.3-patch1 and v4.7.5 immediately during development.

### 5. Admin left nav restructured

**Before:** Dashboard, Articles, Categories, Newsletter, Social, Standalone Tweets, CEO Directives, Search Analytics

**After:**
- Dashboard
- Articles
- Categories
- Tags
- Candidates
- Sources
- Settings *(collapsible sub-nav: Generation, Source Feeds, Schedule, Images, Videos, Social, Homepage, Branding, Monetization, Category Balance)*
- **Setup Wizard** *(highlighted in primary color, prominent)*
- CEO Dashboard *(opens in new tab)*

Settings sub-nav auto-expands when on a settings route. Collapsed sidebar shows tooltips for all items.

### 6. Mobile UX pass

- Save button + Prev/Next nav wrapped in a sticky bottom bar on mobile (`sticky bottom-0 z-10 bg-background/95 backdrop-blur`)
- Reverts to static layout on `sm:` and above (no visual change on desktop)
- All save buttons are `w-full sm:w-auto`

### 7. Review screen updated

- `screenSummaries` array updated to 8 screens
- Critical checks updated: removed social/email/schedule references, fixed screen index numbers
- Save button condition simplified: `currentScreen.id !== "review"` (removed stale `social` exclusion)

---

## Files changed

| File | Change |
|------|--------|
| `client/src/pages/admin/AdminSetup.tsx` | Wizard restructure, 8 screens, review screen, sticky footer |
| `client/src/components/DashboardLayout.tsx` | Full nav rewrite per spec |
| `client/src/hooks/useClarity.ts` | New — Clarity injection hook |
| `client/src/hooks/useWizardKeyAudit.ts` | New — dev-time keysForScreen warning |
| `client/src/hooks/useBranding.ts` | Added `clarityId` to BrandingConfig |
| `client/src/App.tsx` | Added `useClarity()` call |
| `server/db.ts` | Added `brand_clarity_id` to DEFAULT_SETTINGS |
| `package.json` | Bumped to v4.8.0 |

---

## White-label compatibility

All changes are brand-agnostic. `brand_clarity_id` defaults to empty; white-label deployments that don't configure it will not inject any Clarity script. The nav restructure uses no hardcoded Hambry references.

---

## Known gaps / follow-up

1. **`#9 Test every screen: enter values, save, refresh, verify persistence`** — manual QA pass recommended on production. The keysForScreen audit script confirms no silent-drop bugs exist in code, but end-to-end save/reload testing on Hambry and Apex Racing is advised.
2. **Umami analytics ID** — `VITE_ANALYTICS_WEBSITE_ID` is still a build-time env variable, not a DB setting. A `brand_umami_website_id` setting would complete the analytics debranding.
3. **Settings sub-nav items** — some settings pages (e.g., `/admin/settings/amazon`, `/admin/settings/merch`) may have stale references to removed features. A settings page audit is recommended.
