CREATE TABLE `distribution_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`platform` varchar(32) NOT NULL,
	`subreddit` varchar(128),
	`status` enum('pending','sending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`content` text,
	`postUrl` varchar(1000),
	`scheduledAt` timestamp,
	`attemptedAt` timestamp,
	`sentAt` timestamp,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`triggeredBy` enum('auto','manual') NOT NULL DEFAULT 'auto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reddit_subreddit_map` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categorySlug` varchar(120),
	`subreddit` varchar(128) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`weight` int NOT NULL DEFAULT 1,
	`minKarma` int NOT NULL DEFAULT 0,
	`flairRequired` varchar(128),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reddit_subreddit_map_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `setup_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`label` varchar(300) NOT NULL,
	`description` text,
	`section` varchar(64),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`completedAt` timestamp,
	`completedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `setup_checklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `setup_checklist_key_unique` UNIQUE(`key`)
);
