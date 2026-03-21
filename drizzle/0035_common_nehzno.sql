CREATE TABLE `article_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_id` int NOT NULL,
	`tag_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_article_tag` UNIQUE(`article_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`article_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `idx_article_tags_article` ON `article_tags` (`article_id`);--> statement-breakpoint
CREATE INDEX `idx_article_tags_tag` ON `article_tags` (`tag_id`);