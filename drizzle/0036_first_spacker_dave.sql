CREATE TABLE `image_licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_id` int NOT NULL,
	`source` varchar(50) NOT NULL,
	`source_url` varchar(2000) NOT NULL,
	`source_image_id` varchar(255),
	`license_type` varchar(100) NOT NULL,
	`photographer` varchar(255),
	`attribution_text` varchar(500) NOT NULL,
	`commercial_use` boolean DEFAULT true,
	`modification_ok` boolean DEFAULT true,
	`cdn_url` varchar(2000),
	`embed_html` text,
	`relevance_score` float,
	`date_sourced` timestamp NOT NULL DEFAULT (now()),
	`date_last_verified` timestamp,
	CONSTRAINT `image_licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `known_account_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(20) NOT NULL,
	`handle` varchar(255) NOT NULL,
	`tag` varchar(255) NOT NULL,
	`hit_count` int NOT NULL DEFAULT 1,
	`avg_relevance` float DEFAULT 0.5,
	`last_hit` timestamp,
	CONSTRAINT `known_account_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_account_tag` UNIQUE(`platform`,`handle`,`tag`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `featuredEmbed` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `imageAttribution` text;--> statement-breakpoint
CREATE INDEX `idx_image_source` ON `image_licenses` (`source`);--> statement-breakpoint
CREATE INDEX `idx_image_article` ON `image_licenses` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_tag_lookup` ON `known_account_scores` (`tag`);