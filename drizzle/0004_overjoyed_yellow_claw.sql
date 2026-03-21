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
