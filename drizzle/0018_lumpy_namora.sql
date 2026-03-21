CREATE TABLE `covered_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic` varchar(255) NOT NULL,
	`batch_date` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `covered_topics_id` PRIMARY KEY(`id`)
);
