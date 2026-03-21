CREATE TABLE `daily_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`unique_visitors` int NOT NULL DEFAULT 0,
	`page_views` int NOT NULL DEFAULT 0,
	`source` varchar(255) NOT NULL DEFAULT 'all',
	CONSTRAINT `daily_analytics_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_date_source` UNIQUE(`date`,`source`)
);
--> statement-breakpoint
CREATE TABLE `js_page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(2000) NOT NULL,
	`referrer` varchar(2000),
	`source` varchar(255),
	`session_id` varchar(64) NOT NULL,
	`screen_width` int,
	`ip` varchar(45),
	`viewed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `js_page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_daily_analytics_date` ON `daily_analytics` (`date`);--> statement-breakpoint
CREATE INDEX `idx_js_pv_viewed_at` ON `js_page_views` (`viewed_at`);--> statement-breakpoint
CREATE INDEX `idx_js_pv_session` ON `js_page_views` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_js_pv_source` ON `js_page_views` (`source`);--> statement-breakpoint
CREATE INDEX `idx_js_pv_path` ON `js_page_views` (`path`);