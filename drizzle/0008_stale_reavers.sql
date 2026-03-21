CREATE TABLE `rss_feed_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedUrl` varchar(500) NOT NULL,
	`weight` int NOT NULL DEFAULT 50,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rss_feed_weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `rss_feed_weights_feedUrl_unique` UNIQUE(`feedUrl`)
);
