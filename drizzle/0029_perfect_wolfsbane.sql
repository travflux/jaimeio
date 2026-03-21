CREATE TABLE `newsletter_send_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`recipientCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failCount` int NOT NULL DEFAULT 0,
	`subject` varchar(500),
	`articleCount` int NOT NULL DEFAULT 0,
	`isDryRun` boolean NOT NULL DEFAULT false,
	`triggeredBy` enum('cron','manual') NOT NULL DEFAULT 'manual',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletter_send_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(64) NOT NULL,
	`apiKey` text,
	`apiSecret` text,
	`extra` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_credentials_platform_unique` UNIQUE(`platform`)
);
