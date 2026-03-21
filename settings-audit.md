# Settings Audit - Category vs Admin Page Mapping

## DB Categories → Which Admin Page Displays Them

### Category: _internal (3 settings)
- _last_crossword_run, _last_horoscope_run, _last_workflow_run
- **Not displayed in any admin page** (internal tracking only) ✅ Correct

### Category: amazon (6 settings)
- amazon_associate_tag, amazon_cache_ttl_hours, amazon_client_id, amazon_client_secret, amazon_product_keywords, amazon_products_enabled
- **Displayed on:** Admin > Amazon Ads ✅ Correct

### Category: balance (9 settings)
- articles_since_last_rebalance, auto_rebalance_enabled, cooldown_hours, fingerprint_window, max_weight_change, min_articles_threshold, rebalance_trigger_count, target_distribution, weight_locks
- **Displayed on:** Admin > Category Balance > Settings tab ✅ Correct

### Category: crosswords (3 settings)
- auto_generate_crosswords, crossword_difficulty, crossword_generation_time
- **Displayed on:** Admin > Games & Fun > Crosswords ✅ Correct

### Category: general (11 settings) ⚠️ MISPLACED
These are scattered across different admin pages but all have category "general":
- _x_queue_is_running → X Post Queue (internal) 
- amazon_affiliate_link → Should be in amazon category
- amazon_keywords → Should be in amazon category
- enable_horoscopes → Should be in horoscopes category
- feed_randomize_order → Should be in sources category
- feed_shuffle_seed → Should be in sources category
- image_llm_system_prompt → Should be in image_providers category
- mascot_instruction → Should be in image_providers category
- randomize_feed_sources → Should be in sources category
- x_auto_queue_on_publish → Should be in social category
- x_post_interval_minutes → Should be in social category

### Category: generation (6 settings)
- ai_custom_prompt, ai_writing_style, articles_per_batch, auto_generate_images, default_status, target_article_length
- **Displayed on:** Admin > Generation ✅ Correct
- NOTE: auto_generate_images is in generation but displayed on Images page

### Category: horoscopes (3 settings)
- auto_generate_horoscopes, horoscope_default_style, horoscope_generation_time
- **Displayed on:** Admin > Games & Fun > Horoscopes ✅ Correct

### Category: image_providers (3 settings) ⚠️ INCOMPLETE
- watermark_bg_opacity, watermark_font_size, watermark_text_color
- **Displayed on:** Admin > Images
- MISSING from this category: watermark_enabled, watermark_opacity, watermark_position, watermark_mascot_size, watermark_text (these are in "schedule" category)

### Category: mad_libs (3 settings)
- auto_generate_mad_libs, mad_lib_category, mad_lib_generation_time
- **Displayed on:** Admin > Games & Fun > Mad Libs ✅ Correct

### Category: publishing (4 settings)
- auto_publish_approved, max_publish_per_day, publish_delay_minutes, stagger_interval_minutes
- **Displayed on:** Admin > Publishing ✅ Correct

### Category: schedule (17 settings) ⚠️ MISPLACED
Many settings in "schedule" category don't belong there:
- ai_excluded_styles → Should be in generation
- enable_crosswords → Should be in crosswords
- feedhive_mode → Should be in social (archived)
- image_provider → Should be in image_providers
- image_provider_openai_api_key → Should be in image_providers
- image_style_keywords → Should be in image_providers
- image_style_prompt → Should be in image_providers
- schedule_days → ✅ Correct
- schedule_hour → ✅ Correct
- schedule_hour_utc → ✅ Correct
- schedule_minute → ✅ Correct
- trending_time_window_hours → Should be in homepage or general
- watermark_enabled → Should be in image_providers
- watermark_mascot_size → Should be in image_providers
- watermark_opacity → Should be in image_providers
- watermark_position → Should be in image_providers
- watermark_text → Should be in image_providers
- workflow_enabled → ✅ Correct
- writing_style_prompt → Should be in generation

### Category: social (12 settings)
- auto_create_social_posts, auto_post_on_publish, feedhive_*, site_url, social_platforms
- **Displayed on:** Admin > Social Media ✅ Correct
- NOTE: FeedHive settings are archived from UI but still in DB

### Category: sources (3 settings)
- news_regions, rss_feeds, use_google_news
- **Displayed on:** Admin > Source Feeds ✅ Correct

### Category: video_providers (10 settings)
- All video provider settings
- **Displayed on:** Admin > Videos ✅ Correct

## Summary of Issues

### Settings in WRONG DB category (doesn't affect UI, but affects data hygiene):
1. "general" category has 11 orphaned settings that belong elsewhere
2. "schedule" category has 17 settings, only 5 actually relate to scheduling
3. Some watermark settings split between "image_providers" and "schedule"
4. image_provider and image_style settings are in "schedule" instead of "image_providers"

### Settings displayed on WRONG admin page:
Need to check each admin page's actual code to verify...
