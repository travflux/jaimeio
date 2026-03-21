CREATE TABLE `affiliate_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`articleSlug` varchar(200),
	`targetUrl` varchar(1000) NOT NULL,
	`referrer` varchar(500),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`articleSlug` varchar(200),
	`source` varchar(50),
	`medium` varchar(50),
	`referrer` varchar(500),
	`path` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
