ALTER TABLE `distribution_queue` ADD `platform_post_id` varchar(255);--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `engagement_likes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `engagement_comments` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `engagement_shares` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `engagement_clicks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `engagement_checked_at` timestamp;--> statement-breakpoint
ALTER TABLE `distribution_queue` ADD `removed_at` timestamp;