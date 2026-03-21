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
