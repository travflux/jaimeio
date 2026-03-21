CREATE TABLE `affiliate_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`article_slug` varchar(500),
	`click_type` varchar(50) NOT NULL DEFAULT 'amazon',
	`url` text,
	`user_agent` text,
	`referer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merch_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_slug` varchar(500) NOT NULL,
	`article_headline` text,
	`email` varchar(255) NOT NULL,
	`product_type` varchar(100),
	`newsletter_opt_in` boolean NOT NULL DEFAULT false,
	`converted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merch_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merch_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`article_slug` varchar(500) NOT NULL,
	`article_headline` text NOT NULL,
	`provider` varchar(50) NOT NULL DEFAULT 'printify',
	`provider_product_id` varchar(255),
	`product_type` varchar(100) NOT NULL DEFAULT 't-shirt',
	`title` varchar(500) NOT NULL,
	`description` text,
	`base_price_cents` int NOT NULL DEFAULT 0,
	`sell_price_cents` int NOT NULL DEFAULT 0,
	`digital_price` varchar(20),
	`image_url` text,
	`checkout_url` text,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merch_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `social_posts` ADD CONSTRAINT `idx_article_platform` UNIQUE(`articleId`,`platform`);