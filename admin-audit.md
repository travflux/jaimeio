# Admin Section Functionality Audit

## Admin Pages & Their Functions

| Page | Route | Primary Function | Key Features |
|------|-------|------------------|--------------|
| **Dashboard** | `/admin` | Overview & quick stats | Article counts, workflow status, recent activity |
| **Articles** | `/admin/articles` | Article management | List, edit, delete, publish/unpublish articles |
| **Article Editor** | `/admin/articles/:id/edit` | Edit individual article | Full WYSIWYG editor for article content |
| **AI Generator** | `/admin/ai-generator` | Manual article generation | Generate single articles on-demand |
| **Categories** | `/admin/categories` | Category management | Create, edit, delete article categories |
| **Comments** | `/admin/comments` | Comment moderation | Approve, delete, manage user comments |
| **Workflow** | `/admin/workflow` | Automated workflow control | Start/stop auto-generation, view workflow logs |
| **Optimizer** | `/admin/optimizer` | Content optimization | Image generation, watermarking, batch operations |
| **Source Feeds** | `/admin/source-feeds` | RSS feed management | Add/remove feeds, view feed health (weights READ-ONLY) |
| **Feed Performance** | `/admin/feed-performance` | Feed analytics | View article counts and error rates per feed |
| **Search Analytics** | `/admin/search-analytics` | Search behavior tracking | View popular search terms and trends |
| **Crosswords** | `/admin/crosswords` | Crossword puzzle management | Create, edit, delete crossword puzzles |
| **Horoscopes** | `/admin/horoscopes` | Horoscope management | Create, edit, delete daily horoscopes |
| **Trivia Quizzes** | `/admin/trivia` | Trivia quiz management | Create, edit, delete trivia quizzes |
| **Word Scrambles** | `/admin/word-scrambles` | Word scramble management | Create, edit, delete word scramble games |
| **Mad Libs** | `/admin/mad-libs` | Mad Libs management | Create, edit, delete Mad Libs games |
| **Newsletter** | `/admin/newsletter` | Email newsletter management | Manage subscribers, send newsletters |
| **X Queue** | `/admin/x-queue` | X/Twitter post queue | View and manage scheduled X posts |
| **Deployment Updates** | `/admin/deployment-updates` | System updates log | View deployment history and changes |
| **Migration** | `/admin/migration` | Data migration tools | Batch operations, data cleanup |
| **Settings Overview** | `/admin/settings` | Settings hub | Navigate to all settings categories |

---

## Settings Pages (Admin > Settings)

| Settings Page | Route | Purpose | Variables Managed |
|---------------|-------|---------|-------------------|
| **Generation** | `/admin/settings/generation` | Article generation settings | `max_articles_per_run`, `min_article_length`, `max_article_length`, `article_tone`, `writing_style`, `writing_style_randomize`, `writing_style_category`, `excluded_writing_styles`, `target_categories`, `auto_categorize` |
| **Sources** | `/admin/settings/sources` | Content source configuration | `rss_feeds`, `use_google_news`, `news_regions`, feed enable/disable toggles, feed health monitoring (weights READ-ONLY - managed by Category Balance) |
| **Images** | `/admin/settings/images` | Image generation settings | `auto_generate_images`, `image_provider`, `image_provider_*`, `image_style_prompt`, `image_style_keywords`, `mascot_instruction`, `image_llm_system_prompt`, `watermark_enabled`, `watermark_text`, `watermark_font_size`, `watermark_text_color`, `watermark_bg_opacity` |
| **Videos** | `/admin/settings/videos` | Video generation settings | `auto_generate_videos`, `video_provider`, `video_provider_*`, `video_style_prompt`, `video_duration`, `video_aspect_ratio`, `video_provider_fallback_enabled` |
| **Publishing** | `/admin/settings/publishing` | Publication workflow | `auto_publish`, `publish_delay_minutes`, `articles_per_day_limit` |
| **Social** | `/admin/settings/social` | Social media integration | `auto_create_social_posts`, `social_platforms`, `feedhive_enabled`, `feedhive_trigger_url_*`, `feedhive_post_mode`, `feedhive_include_image`, `x_auto_queue_on_publish`, `reddit_enabled`, `site_url` |
| **Schedule** | `/admin/settings/schedule` | Workflow scheduling | `workflow_enabled`, `workflow_schedule_cron`, `workflow_run_interval_minutes` |
| **Homepage** | `/admin/settings/homepage` | Homepage customization | `homepage_hero_title`, `homepage_hero_subtitle`, `featured_article_id` |
| **Goodies** | `/admin/settings/goodies` | Games & fun content settings | Crossword, horoscope, trivia, word scramble, Mad Libs settings |
| **Amazon** | `/admin/settings/amazon` | Amazon affiliate integration | Amazon product widget settings |
| **Category Balance** | `/admin/settings/category-balance` | Feed weight optimization | `rebalance_trigger_count`, `fingerprint_window`, `min_articles_threshold`, `cooldown_hours`, `auto_rebalance_enabled`, `max_weight_change_per_cycle`, `target_distribution`, `weight_locks`, feed weights (WRITE access) |

---

## All Workflow Settings Variables

### Generation Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `max_articles_per_run` | number | Maximum number of articles to generate in a single workflow run | generation |
| `min_article_length` | number | Minimum word count for generated articles | generation |
| `max_article_length` | number | Maximum word count for generated articles | generation |
| `article_tone` | string | Overall tone for articles (satirical, humorous, serious, etc.) | generation |
| `writing_style` | string | Specific writing style to use | generation |
| `writing_style_randomize` | boolean | Randomize writing style for each article | generation |
| `writing_style_category` | string | Category of writing styles to randomize from | generation |
| `excluded_writing_styles` | json | Array of writing style IDs to exclude from randomization | generation |
| `target_categories` | json | Array of category IDs to target for article generation | generation |
| `auto_categorize` | boolean | Automatically assign categories to articles | generation |

### Source Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `rss_feeds` | json | JSON array of RSS feed URLs to gather news from | sources |
| `use_google_news` | boolean | Include Google News as a source | sources |
| `news_regions` | string | Comma-separated region codes (US, GB, AU, etc.) | sources |

### Image Provider Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `auto_generate_images` | boolean | Automatically generate images for articles | image_providers |
| `image_provider` | string | Primary image provider (manus, openai, replicate, custom) | image_providers |
| `image_provider_openai_api_key` | string | OpenAI API key for DALL-E | image_providers |
| `image_provider_replicate_api_key` | string | Replicate API key | image_providers |
| `image_provider_replicate_model` | string | Replicate model ID | image_providers |
| `image_provider_custom_api_url` | string | Custom API endpoint URL | image_providers |
| `image_provider_custom_api_key` | string | Custom API key | image_providers |
| `image_provider_fallback_enabled` | boolean | Fall back to Manus if primary provider fails | image_providers |
| `image_style_prompt` | text | Base style description for image generation | image_providers |
| `image_style_keywords` | string | Keywords to enhance image style | image_providers |
| `mascot_instruction` | text | Instructions for including mascot in images | image_providers |
| `image_llm_system_prompt` | text | System prompt for LLM-based image prompt generation | image_providers |
| `watermark_enabled` | boolean | Add watermark to generated images | image_providers |
| `watermark_text` | string | Text to display in watermark | image_providers |
| `watermark_font_size` | number | Font size for watermark text | image_providers |
| `watermark_text_color` | string | Color for watermark text (hex or rgba) | image_providers |
| `watermark_bg_opacity` | number | Background opacity for watermark (0-1) | image_providers |

### Video Provider Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `auto_generate_videos` | boolean | Automatically generate videos for articles | video_providers |
| `video_provider` | string | Primary video provider (manus, openai, replicate, custom) | video_providers |
| `video_provider_replicate_api_key` | string | Replicate API key | video_providers |
| `video_provider_replicate_model` | string | Replicate model ID | video_providers |
| `video_provider_custom_api_url` | string | Custom API endpoint URL | video_providers |
| `video_provider_custom_api_key` | string | Custom API key | video_providers |
| `video_provider_fallback_enabled` | boolean | Fall back to Manus if primary provider fails | video_providers |
| `video_style_prompt` | text | Base style description for video generation | video_providers |
| `video_duration` | number | Video duration in seconds (5-60) | video_providers |
| `video_aspect_ratio` | string | Aspect ratio (16:9, 9:16, 1:1) | video_providers |

### Publishing Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `auto_publish` | boolean | Automatically publish articles after generation | publishing |
| `publish_delay_minutes` | number | Delay in minutes before auto-publishing | publishing |
| `articles_per_day_limit` | number | Maximum articles to publish per day | publishing |

### Social Media Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `auto_create_social_posts` | boolean | Automatically create social media posts for articles | social |
| `social_platforms` | string | Comma-separated list of platforms (x, facebook, instagram, linkedin, threads) | social |
| `feedhive_enabled` | boolean | Send posts to FeedHive | social |
| `feedhive_trigger_url` | string | Default FeedHive trigger URL (backup) | social |
| `feedhive_trigger_url_twitter` | string | FeedHive trigger URL for X/Twitter | social |
| `feedhive_trigger_url_facebook` | string | FeedHive trigger URL for Facebook | social |
| `feedhive_trigger_url_instagram` | string | FeedHive trigger URL for Instagram | social |
| `feedhive_trigger_url_linkedin` | string | FeedHive trigger URL for LinkedIn | social |
| `feedhive_trigger_url_threads` | string | FeedHive trigger URL for Threads | social |
| `feedhive_post_mode` | string | FeedHive post mode (draft or publish) | social |
| `feedhive_include_image` | boolean | Include featured image in FeedHive posts | social |
| `x_auto_queue_on_publish` | boolean | Automatically queue posts to X when article is published | social |
| `reddit_enabled` | boolean | Enable Reddit posting | social |
| `site_url` | string | Your custom domain URL | social |

### Schedule Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `workflow_enabled` | boolean | Enable automated workflow execution | schedule |
| `workflow_schedule_cron` | string | Cron expression for workflow schedule | schedule |
| `workflow_run_interval_minutes` | number | Interval in minutes between workflow runs | schedule |

### Category Balance Settings
| Variable | Type | Description | Category |
|----------|------|-------------|----------|
| `rebalance_trigger_count` | number | Number of articles before triggering auto-rebalance (default: 50) | category_balance |
| `fingerprint_window` | number | Number of recent articles per feed to analyze for category fingerprint (default: 200) | category_balance |
| `min_articles_threshold` | number | Minimum articles required before feed is included in optimization (default: 25) | category_balance |
| `cooldown_hours` | number | Hours to wait between rebalances (default: 6) | category_balance |
| `auto_rebalance_enabled` | boolean | Enable automatic weight rebalancing | category_balance |
| `max_weight_change_per_cycle` | number | Maximum weight change per rebalance cycle (default: 20) | category_balance |
| `target_distribution` | json | Target percentage distribution across categories | category_balance |
| `weight_locks` | json | Feeds whose weights should not be changed by auto-rebalance | category_balance |
| `articles_since_last_rebalance` | number | Counter tracking articles since last rebalance | category_balance |
| `last_rebalance_time` | string | Timestamp of last rebalance | category_balance |

---

## RSS Feed Weights (rss_feed_weights table)

**IMPORTANT: Feed weights are now EXCLUSIVELY managed by Category Balance system.**

| Field | Type | Description | Managed By |
|-------|------|-------------|------------|
| `id` | number | Unique feed identifier | System |
| `feedUrl` | string | RSS feed URL | Source Feeds (add/remove) |
| `weight` | number | Feed selection weight (0-100) | **Category Balance ONLY** |
| `enabled` | boolean | Whether feed is active | Source Feeds (enable/disable toggle) |
| `errorCount` | number | Number of consecutive fetch errors | System (auto-tracked) |
| `lastFetchTime` | timestamp | Last successful fetch | System (auto-tracked) |
| `lastError` | string | Most recent error message | System (auto-tracked) |

---

## Identified Overlaps & Conflicts

### ✅ RESOLVED: Feed Weight Management
**Status:** No longer a conflict - Category Balance is now the sole owner.

- **Source Feeds page** (`/admin/source-feeds` and `/admin/settings/sources`):
  - Shows weights as **READ-ONLY** progress bars
  - Displays "Managed by Category Balance" label
  - Shows "Locked" badge for feeds with weight locks
  - Links to Category Balance for weight changes
  - Manages: feed enable/disable, add/remove feeds, view health

- **Category Balance page** (`/admin/settings/category-balance`):
  - **WRITE ACCESS** to feed weights
  - Manages: weight optimization, weight locks, target distribution, auto-rebalance settings
  - Only code path that modifies weights: `categoryBalance.applyRebalance()`

**Resolution:** Direct weight edit endpoint (`admin.updateRssFeedWeight`) now throws FORBIDDEN error. All weight changes flow through Category Balance.

### ⚠️ POTENTIAL: Social Media Configuration
**Location:** Settings > Social

**Variables:**
- `feedhive_trigger_url` (default/backup)
- `feedhive_trigger_url_twitter`
- `feedhive_trigger_url_facebook`
- `feedhive_trigger_url_instagram`
- `feedhive_trigger_url_linkedin`
- `feedhive_trigger_url_threads`

**Concern:** Multiple trigger URLs for the same purpose. If platform-specific URL is empty, does it fall back to default? Or does it skip that platform?

**Recommendation:** Clarify fallback behavior in UI or consolidate to single URL if all platforms use the same trigger.

### ⚠️ POTENTIAL: Image/Video Provider Fallback
**Location:** Settings > Images, Settings > Videos

**Variables:**
- `image_provider_fallback_enabled`
- `video_provider_fallback_enabled`

**Concern:** If primary provider is set to "manus", what does "fallback to Manus" mean? Does it create a loop or no-op?

**Recommendation:** Disable fallback toggle when primary provider is already "manus", or clarify that fallback only applies to external providers.

### ⚠️ MINOR: Writing Style Randomization
**Location:** Settings > Generation

**Variables:**
- `writing_style` (specific style)
- `writing_style_randomize` (boolean)
- `writing_style_category` (category to randomize from)
- `excluded_writing_styles` (styles to exclude)

**Concern:** If `writing_style_randomize` is false, are `writing_style_category` and `excluded_writing_styles` ignored? Or do they still apply?

**Recommendation:** UI should gray out/disable category and exclusion fields when randomize is off.

### ✅ NO CONFLICT: Workflow Scheduling
**Location:** Settings > Schedule

**Variables:**
- `workflow_enabled` (master on/off)
- `workflow_schedule_cron` (cron expression)
- `workflow_run_interval_minutes` (interval in minutes)

**Note:** These are mutually exclusive - either use cron OR interval, not both. UI should clarify which mode is active.

---

## Summary

**Total Admin Pages:** 21 main pages + 11 settings pages = **32 pages**

**Total Settings Variables:** **~90 variables** across 8 categories

**Conflicts Resolved:** 1 (Feed Weight Management - Category Balance now sole owner)

**Potential Issues:** 3 (FeedHive fallback URLs, provider fallback logic, writing style randomization UI)

**Overall Assessment:** Admin section is well-organized with clear separation of concerns. The Category Balance / Source Feeds conflict has been resolved. Remaining issues are minor UI/UX clarifications rather than functional conflicts.
