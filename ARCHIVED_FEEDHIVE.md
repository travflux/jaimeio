# Archived: FeedHive Integration

**Archived Date:** February 26, 2026  
**Reason:** Consolidating social media integrations. FeedHive functionality removed from UI but preserved for potential future reactivation.

---

## Settings Variables (workflow_settings table)

All FeedHive-related settings have been removed from the admin UI but remain in the database for future use:

| Key | Type | Description | Default Value |
|-----|------|-------------|---------------|
| `feedhive_enabled` | boolean | Enable FeedHive integration | false |
| `feedhive_trigger_url` | string | Default/backup FeedHive trigger URL | "" |
| `feedhive_trigger_url_twitter` | string | FeedHive trigger URL for X/Twitter | "" |
| `feedhive_trigger_url_facebook` | string | FeedHive trigger URL for Facebook | "" |
| `feedhive_trigger_url_instagram` | string | FeedHive trigger URL for Instagram | "" |
| `feedhive_trigger_url_linkedin` | string | FeedHive trigger URL for LinkedIn | "" |
| `feedhive_trigger_url_threads` | string | FeedHive trigger URL for Threads | "" |
| `feedhive_post_mode` | string | Post mode: "draft" or "publish" | "draft" |
| `feedhive_include_image` | boolean | Include featured image in posts | true |

---

## Backend Code Locations

The following files contain FeedHive integration logic (NOT removed, just UI hidden):

- **`server/routers.ts`** — `articles.publish` procedure checks `feedhive_enabled` setting
- **`server/workflow.ts`** — Auto-post logic after article generation
- **`server/db.ts`** — `getSetting()` calls for FeedHive configuration

---

## How to Reactivate

If you want to bring FeedHive back in the future:

1. **Restore UI fields** in `/home/ubuntu/satire-news/client/src/pages/admin/settings/SettingsSocial.tsx`
2. **Add back the settings cards** for:
   - FeedHive Enable toggle
   - Trigger URLs (per platform)
   - Post mode dropdown
   - Include image toggle
3. **Test the integration** by publishing an article and verifying posts are sent to FeedHive

The backend logic is still intact and functional — only the UI controls were removed.

---

## Alternative: Direct X/Twitter Integration

The site now has direct X/Twitter integration via the X Queue system (`/admin/x-queue`), which may be preferable to routing through FeedHive for Twitter posts.
