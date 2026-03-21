# Settings Placement Analysis

## Summary

95 total settings in the database. After auditing every admin page, I found:

- **59 settings** are properly displayed on the correct admin page
- **3 settings** are internal tracking only (_internal category) — correctly hidden
- **9 settings** are FeedHive-related (archived) — correctly hidden from UI
- **11 settings** are used by the server but have NO admin UI exposure
- **13 settings** have wrong DB category (cosmetic issue, doesn't affect functionality)

## Settings Missing from Admin UI (Server Uses Them, No UI Control)

| Setting Key | DB Category | Used By | Should Be On |
|---|---|---|---|
| feed_randomize_order | general | routers.ts (Source Feeds) | Source Feeds page (already has UI via custom tRPC, not useSettings) |
| feed_shuffle_seed | general | routers.ts (Source Feeds) | Source Feeds page (already has UI via custom tRPC) |
| randomize_feed_sources | general | workflow.ts | Source Feeds page (already has UI via custom tRPC) |
| auto_generate_videos | video_providers | workflow.ts | Videos page — MISSING toggle |
| auto_post_on_publish | social | workflow.ts | Social Media page — MISSING toggle |
| site_url | social | workflow.ts, routers.ts | Social Media page — MISSING field |
| x_post_interval_minutes | general | xPostQueue.ts | X Post Queue page — MISSING slider |
| amazon_client_id | amazon | migrations | Amazon page — MISSING field |
| amazon_client_secret | amazon | migrations | Amazon page — MISSING field |
| amazon_affiliate_link | general | server | Amazon page — MISSING field |
| amazon_keywords | general | server | Amazon page — MISSING field |

NOTE: feed_randomize_order, feed_shuffle_seed, and randomize_feed_sources ARE in the Source Feeds page but via a custom tRPC procedure (admin.getSourceFeedsConfig/updateSourceFeedsConfig), not via the useSettings hook. So they ARE controlled via UI — just not through the standard settings pattern. These are OK.

## Settings That Need to Be ADDED to Admin Pages

| Setting | Add To Page | UI Element |
|---|---|---|
| auto_generate_videos | Videos | Toggle switch |
| auto_post_on_publish | Social Media | Toggle switch |
| site_url | Social Media | Text input |
| x_post_interval_minutes | X Post Queue | Number slider |
| amazon_client_id | Amazon | Text input (sensitive) |
| amazon_client_secret | Amazon | Text input (sensitive) |
| amazon_affiliate_link | Amazon | Text input |
| amazon_keywords | Amazon | Text input |

## Settings with Wrong DB Category (Cosmetic Fix)

| Setting | Current Category | Should Be |
|---|---|---|
| amazon_affiliate_link | general | amazon |
| amazon_keywords | general | amazon |
| enable_horoscopes | general | horoscopes |
| feed_randomize_order | general | sources |
| feed_shuffle_seed | general | sources |
| image_llm_system_prompt | general | image_providers |
| mascot_instruction | general | image_providers |
| randomize_feed_sources | general | sources |
| x_auto_queue_on_publish | general | social |
| x_post_interval_minutes | general | social |
| feedhive_mode | schedule | social |
| schedule_hour_utc | schedule | schedule (OK but duplicate of schedule_hour) |
| ai_excluded_styles | schedule | generation |
| enable_crosswords | schedule | crosswords |
| image_provider | schedule | image_providers |
| image_provider_openai_api_key | schedule | image_providers |
| image_style_keywords | schedule | image_providers |
| image_style_prompt | schedule | image_providers |
| trending_time_window_hours | schedule | homepage |
| watermark_enabled | schedule | image_providers |
| watermark_mascot_size | schedule | image_providers |
| watermark_opacity | schedule | image_providers |
| watermark_position | schedule | image_providers |
| watermark_text | schedule | image_providers |
| writing_style_prompt | schedule | generation |

## Settings Displayed on WRONG Admin Page

| Setting | Currently On | Should Be On | Reason |
|---|---|---|---|
| auto_generate_images | Generation | Images | Image toggle belongs with image settings |
| enable_horoscopes | Goodies | Horoscopes | Horoscope toggle belongs with horoscope settings |
| enable_crosswords | Goodies | Crosswords | Crossword toggle belongs with crossword settings |
| trending_time_window_hours | Homepage | Homepage | Already correct |
| x_auto_queue_on_publish | X Post Queue | X Post Queue | Already correct |

NOTE: auto_generate_images being on Generation page is debatable — it's part of the generation workflow. But it would be more intuitive on the Images page alongside all other image settings. Same logic for enable_horoscopes/enable_crosswords — they're on Goodies as a master toggle, but each game page already has its own auto_generate toggle.
