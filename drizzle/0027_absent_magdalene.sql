CREATE TABLE `ad_spend` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channel` enum('google','meta','x','bing','reddit','other') NOT NULL,
	`date` varchar(10) NOT NULL,
	`spendCents` int NOT NULL DEFAULT 0,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`campaignName` varchar(255),
	`campaignId` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_spend_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversion_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`visitorId` varchar(64),
	`eventType` enum('page_view','newsletter_signup','merch_lead','affiliate_click','sponsor_click','stripe_checkout_start','stripe_payment_complete','ad_impression','custom') NOT NULL,
	`articleId` int,
	`articleSlug` varchar(255),
	`eventValueCents` int DEFAULT 0,
	`eventMetadata` json,
	`channel` enum('google_paid','google_organic','meta_paid','meta_organic','x_paid','x_organic','bing_paid','bing_organic','reddit','newsletter','direct','referral','other') NOT NULL DEFAULT 'direct',
	`utmSource` varchar(100),
	`utmCampaign` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversion_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeEventId` varchar(255) NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`revenueType` enum('subscription','one_time','merch','sponsorship','adsense','other') NOT NULL,
	`description` varchar(500),
	`sessionId` varchar(64),
	`visitorId` varchar(64),
	`channel` enum('google_paid','google_organic','meta_paid','meta_organic','x_paid','x_organic','bing_paid','bing_organic','reddit','newsletter','direct','referral','other'),
	`utmSource` varchar(100),
	`utmCampaign` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_events_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
CREATE TABLE `visitor_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`visitorId` varchar(64),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(255),
	`utmTerm` varchar(255),
	`utmContent` varchar(255),
	`channel` enum('google_paid','google_organic','meta_paid','meta_organic','x_paid','x_organic','bing_paid','bing_organic','reddit','newsletter','direct','referral','other') NOT NULL DEFAULT 'direct',
	`landingPage` varchar(500) NOT NULL,
	`referrer` varchar(500),
	`userAgent` text,
	`ipHash` varchar(64),
	`pageViews` int NOT NULL DEFAULT 1,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`maxScrollDepth` int NOT NULL DEFAULT 0,
	`newsletterSignup` boolean NOT NULL DEFAULT false,
	`merchLead` boolean NOT NULL DEFAULT false,
	`affiliateClick` boolean NOT NULL DEFAULT false,
	`stripePurchase` boolean NOT NULL DEFAULT false,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_sessions_id` PRIMARY KEY(`id`)
);
