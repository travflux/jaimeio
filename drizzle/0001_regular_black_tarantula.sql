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
