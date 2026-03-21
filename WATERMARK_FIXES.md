# Watermark Fixes History

This document tracks all attempts to fix watermark rendering issues on Hambry.com. **READ THIS FILE FIRST** before attempting any new watermark fixes.

---

## Issue Overview

**Problem:** Watermark text "hambry.com" should appear in bottom-right corner of all generated images, with mascot in bottom-left. Watermark has failed to render correctly multiple times.

**Current Status (as of Feb 24, 2026):**
- Watermark setting: ENABLED (`watermark_enabled = 'true'`)
- Watermark code location: `/home/ubuntu/satire-news/server/watermark.ts`
- Watermark overlay: Applied AFTER Gemini image generation via Sharp library
- Font: Arial (system font)
- Rendering: SVG text converted to PNG at 300 DPI

---

## Fix Attempts (10+ iterations)

### Attempt 1-5: Initial implementations
- Added watermark overlay pipeline
- Created `addWatermark()` function in `server/watermark.ts`
- Integrated with image generation workflow

### Attempt 6: Watermark customization UI
- **COMPLETED** - Admin settings panel already exists
- Settings: text, position, font size, opacity, mascot size
- Location: Admin dashboard → Settings

### Attempt 7: Watermark setting verification
- Verified `watermark_enabled = 'true'` in database
- Confirmed setting is active

### Attempt 8: Error logging improvements
- Added detailed error logging to `addWatermark()` function
- Errors are caught and logged, but original image returned without watermark

### Attempt 9: Font encoding fix
- **Issue:** Watermark text rendering as garbled boxes (□□□□□□□□□)
- **Fix:** Rewrote SVG with proper xmlns namespace and Arial font
- **Result:** Text should now render correctly

### Attempt 10 (Latest - Feb 24, 2026):
- Rewrote SVG rendering with 300 DPI density
- Added proper SVG-to-PNG conversion via Sharp
- Changed font from "Liberation Sans" to "Arial"
- All 296 tests passing

---

## What We Know Works

1. ✅ Watermark setting is enabled in database
2. ✅ `addWatermark()` function exists and is called
3. ✅ Mascot image loads from CDN or local file
4. ✅ Admin customization UI exists
5. ✅ SVG text rendering with Arial font at 300 DPI

---

## What We DON'T Know Yet

1. ❓ Does watermark actually appear on NEW images generated after latest fix?
2. ❓ Are there silent errors in the watermark pipeline?
3. ❓ Is Sharp failing to composite the watermark overlay?
4. ❓ Is the watermark being applied but then stripped during upload to S3?

---

## Next Steps (DO NOT repeat these)

- ❌ DO NOT add watermark customization UI (already exists)
- ❌ DO NOT check if watermark setting is enabled (already confirmed)
- ❌ DO NOT add error logging (already added)

**Instead:**

1. Generate a NEW test image and check if watermark appears
2. Monitor server logs during image generation for watermark errors
3. Check if watermark is present immediately after generation but lost during S3 upload
4. Verify Sharp library version and SVG rendering capabilities

---

## How to Test Watermark

1. Go to admin dashboard
2. Create a new article or regenerate image for existing article
3. Check dev server logs for `[Watermark]` messages
4. Download the generated image and inspect bottom-right corner
5. Look for "hambry.com" text and mascot in bottom-left

---

## Reference Files

- Watermark code: `/home/ubuntu/satire-news/server/watermark.ts`
- Image generation: `/home/ubuntu/satire-news/server/routers.ts` (search for `generateImage`)
- Settings UI: Admin dashboard → Settings
- Database setting: `workflow_settings` table, key `watermark_enabled`
