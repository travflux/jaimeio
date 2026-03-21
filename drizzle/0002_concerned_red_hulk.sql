CREATE TABLE `workflow_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(200),
	`description` text,
	`category` varchar(50) DEFAULT 'general',
	`type` enum('number','string','boolean','json','text') NOT NULL DEFAULT 'string',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflow_settings_key_unique` UNIQUE(`key`)
);
