CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`headline` varchar(500) NOT NULL,
	`subheadline` varchar(500),
	`body` text NOT NULL,
	`slug` varchar(600) NOT NULL,
	`status` enum('draft','pending','approved','published','rejected') NOT NULL DEFAULT 'draft',
	`categoryId` int,
	`featuredImage` text,
	`llmImagePrompt` text,
	`videoUrl` text,
	`authorId` int,
	`batchDate` varchar(10),
	`sourceEvent` text,
	`sourceUrl` text,
	`feedSourceId` int,
	`views` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blocked_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceName` varchar(255) NOT NULL,
	`sourceUrl` text,
	`reason` text,
	`blockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocked_sources_sourceName_unique` UNIQUE(`sourceName`)
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
CREATE TABLE `content_calendar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`horoscopeTheme` varchar(200),
	`crosswordDifficulty` enum('easy','medium','hard'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_calendar_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_calendar_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `crossword_solves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crosswordId` int NOT NULL,
	`userId` int,
	`userAnswers` text NOT NULL,
	`isComplete` boolean NOT NULL DEFAULT false,
	`timeSpent` int,
	`solvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crossword_solves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crosswords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`grid` text NOT NULL,
	`clues` text NOT NULL,
	`solution` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`styleId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crosswords_id` PRIMARY KEY(`id`),
	CONSTRAINT `crosswords_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `horoscopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`sign` enum('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces') NOT NULL,
	`content` text NOT NULL,
	`styleId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `horoscopes_id` PRIMARY KEY(`id`)
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
CREATE TABLE `mad_lib_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`madLibId` int NOT NULL,
	`userId` int,
	`userInputs` text NOT NULL,
	`completedStory` text NOT NULL,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mad_lib_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mad_libs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`story` text NOT NULL,
	`blanks` text NOT NULL,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mad_libs_id` PRIMARY KEY(`id`),
	CONSTRAINT `mad_libs_date_unique` UNIQUE(`date`)
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
CREATE TABLE `rebalance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`triggerType` enum('manual','auto','initial') NOT NULL DEFAULT 'manual',
	`articleCountSinceLastRebalance` int NOT NULL DEFAULT 0,
	`previousWeights` text,
	`newWeights` text,
	`projectedDistribution` text,
	`actualDistribution` text,
	`confidence` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rebalance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rss_feed_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedUrl` varchar(500) NOT NULL,
	`weight` int NOT NULL DEFAULT 50,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastFetchTime` timestamp,
	`errorCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rss_feed_weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `rss_feed_weights_feedUrl_unique` UNIQUE(`feedUrl`)
);
--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(500) NOT NULL,
	`resultsCount` int NOT NULL DEFAULT 0,
	`categoryFilter` int,
	`dateRangeFilter` varchar(50),
	`userId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`searchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
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
CREATE TABLE `trivia_quiz_solves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triviaQuizId` int NOT NULL,
	`userId` int,
	`userAnswers` text NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`totalQuestions` int NOT NULL,
	`timeSpent` int,
	`solvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trivia_quiz_solves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trivia_quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`questions` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trivia_quizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `trivia_quizzes_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `word_scramble_solves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wordScrambleId` int NOT NULL,
	`userId` int,
	`userAnswers` text NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`totalWords` int NOT NULL,
	`timeSpent` int,
	`solvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `word_scramble_solves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `word_scrambles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`words` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `word_scrambles_id` PRIMARY KEY(`id`),
	CONSTRAINT `word_scrambles_date_unique` UNIQUE(`date`)
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
