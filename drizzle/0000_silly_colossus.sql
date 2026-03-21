CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`headline` varchar(500) NOT NULL,
	`subheadline` varchar(500),
	`body` text NOT NULL,
	`slug` varchar(600) NOT NULL,
	`status` enum('draft','pending','approved','published','rejected') NOT NULL DEFAULT 'draft',
	`categoryId` int,
	`featuredImage` text,
	`videoUrl` text,
	`authorId` int,
	`batchDate` varchar(10),
	`sourceEvent` text,
	`sourceUrl` text,
	`views` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `client_deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`engineVersion` varchar(20) NOT NULL,
	`deploymentUrl` varchar(500),
	`status` enum('active','inactive','maintenance') NOT NULL DEFAULT 'active',
	`lastCheckIn` timestamp,
	`articlesGenerated` int NOT NULL DEFAULT 0,
	`lastArticleDate` timestamp,
	`deployedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`userId` int,
	`authorName` varchar(200),
	`content` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseKey` varchar(500) NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`tier` enum('starter','professional','enterprise') NOT NULL,
	`status` enum('active','expired','suspended','cancelled') NOT NULL DEFAULT 'active',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`lastValidated` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenses_licenseKey_unique` UNIQUE(`licenseKey`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`platform` enum('twitter','facebook','linkedin','instagram','threads') NOT NULL,
	`content` text NOT NULL,
	`videoUrl` text,
	`status` enum('draft','scheduled','posted','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`postedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `workflow_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchDate` varchar(10) NOT NULL,
	`status` enum('gathering','generating','pending_approval','approved','publishing','completed','failed') NOT NULL DEFAULT 'gathering',
	`totalEvents` int NOT NULL DEFAULT 0,
	`articlesGenerated` int NOT NULL DEFAULT 0,
	`articlesApproved` int NOT NULL DEFAULT 0,
	`articlesPublished` int NOT NULL DEFAULT 0,
	`articlesRejected` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(200),
	`description` text,
	`category` varchar(50) DEFAULT 'general',
	`type` enum('number','string','boolean','json','text') NOT NULL DEFAULT 'string',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflow_settings_key_unique` UNIQUE(`key`)
);
