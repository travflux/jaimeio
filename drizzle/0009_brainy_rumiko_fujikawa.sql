ALTER TABLE `rss_feed_weights` ADD `lastFetchTime` timestamp;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `errorCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `lastError` text;