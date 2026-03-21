ALTER TABLE `distribution_queue` MODIFY COLUMN `articleId` int;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `max_attempts` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `priority` enum('high','normal','low') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `content_format` enum('link','text','image','carousel','reply') DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `image_url` varchar(2000);--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD `is_valid` boolean;--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD `last_tested_at` timestamp;--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD `last_error` text;--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `last_post_at` timestamp;--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `posts_today` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `posts_today_date` varchar(10);--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `daily_limit` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `total_posts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reddit_subreddit_map` ADD `total_removals` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `setup_checklist` ADD `check_type` enum('manual','credential','api_test') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `setup_checklist` ADD `check_config` text;--> statement-breakpoint
ALTER TABLE `setup_checklist` ADD `added_in_version` varchar(20);--> statement-breakpoint
ALTER TABLE `setup_checklist` ADD `setup_url` varchar(500);