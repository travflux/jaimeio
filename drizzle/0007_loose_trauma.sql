CREATE TABLE `blocked_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceName` varchar(255) NOT NULL,
	`sourceUrl` text,
	`reason` text,
	`blockedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocked_sources_sourceName_unique` UNIQUE(`sourceName`)
);
