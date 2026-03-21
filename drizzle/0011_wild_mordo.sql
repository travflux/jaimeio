CREATE TABLE `rebalance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`triggerType` enum('manual','auto','initial') NOT NULL DEFAULT 'manual',
	`articleCountSinceLastRebalance` int NOT NULL DEFAULT 0,
	`previousWeights` text,
	`newWeights` text,
	`projectedDistribution` text,
	`actualDistribution` text,
	`confidence` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rebalance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `feedSourceId` int;