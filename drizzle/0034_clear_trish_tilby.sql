CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`userId` int,
	`authorName` varchar(200),
	`content` text,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
