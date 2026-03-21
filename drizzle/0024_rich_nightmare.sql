CREATE TABLE `merch_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`articleId` int NOT NULL,
	`productType` varchar(50) NOT NULL,
	`newsletterOptIn` boolean NOT NULL DEFAULT true,
	`converted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merch_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merch_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`productType` enum('mug','shirt','poster','case','digital') NOT NULL,
	`printifyProductId` varchar(255),
	`printifyShopId` varchar(255),
	`blueprintId` int,
	`mockupUrls` json,
	`basePrice` decimal(10,2),
	`sellPrice` decimal(10,2) NOT NULL,
	`variantData` json,
	`cachedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `merch_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_merch_article_product` UNIQUE(`articleId`,`productType`)
);
