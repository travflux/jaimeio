CREATE TABLE `x_standalone_tweets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`inspiredByHeadlines` text,
	`status` enum('pending','approved','posting','posted','rejected','failed') NOT NULL DEFAULT 'pending',
	`postedAt` timestamp,
	`tweetId` varchar(64),
	`tweetUrl` varchar(255),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `x_standalone_tweets_id` PRIMARY KEY(`id`)
);
