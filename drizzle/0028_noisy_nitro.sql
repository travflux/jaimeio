CREATE TABLE `search_engine_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engine` enum('google','bing') NOT NULL,
	`date` varchar(10) NOT NULL,
	`query` varchar(500),
	`pageUrl` varchar(1000),
	`clicks` int NOT NULL DEFAULT 0,
	`impressions` int NOT NULL DEFAULT 0,
	`ctr` float NOT NULL DEFAULT 0,
	`position` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `search_engine_performance_id` PRIMARY KEY(`id`)
);
