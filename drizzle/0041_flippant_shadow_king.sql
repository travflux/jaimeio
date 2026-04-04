CREATE TABLE `image_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cdn_url` varchar(2000) NOT NULL,
	`cdn_url_social` varchar(2000),
	`cdn_url_thumb` varchar(2000),
	`phash` varchar(64),
	`source_domain` varchar(255) NOT NULL,
	`source_url` varchar(2000) NOT NULL,
	`source_page_url` varchar(2000),
	`photographer` varchar(255),
	`tags` json NOT NULL,
	`entities` json NOT NULL,
	`ai_description` text,
	`relevance_score` float,
	`validation_result` json,
	`times_used` int NOT NULL DEFAULT 0,
	`first_used_article_id` int,
	`last_used_at` datetime,
	`width` int,
	`height` int,
	`file_size` int,
	`created_at` datetime NOT NULL DEFAULT NOW(),
	CONSTRAINT `image_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image_source_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`status` enum('whitelisted','blacklisted','unknown','pending_review') NOT NULL DEFAULT 'unknown',
	`category` varchar(100),
	`license_type` varchar(100),
	`notes` text,
	`images_sourced` int NOT NULL DEFAULT 0,
	`images_rejected` int NOT NULL DEFAULT 0,
	`last_sourced_at` datetime,
	`reviewed_at` datetime,
	`reviewed_by` varchar(255),
	`created_at` datetime NOT NULL DEFAULT NOW(),
	CONSTRAINT `image_source_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `image_source_domains_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE INDEX `idx_il_phash` ON `image_library` (`phash`);--> statement-breakpoint
CREATE INDEX `idx_il_domain` ON `image_library` (`source_domain`);--> statement-breakpoint
CREATE INDEX `idx_il_created` ON `image_library` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_isd_status` ON `image_source_domains` (`status`);--> statement-breakpoint
CREATE INDEX `idx_isd_domain` ON `image_source_domains` (`domain`);