CREATE TABLE `ceo_directives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`directive_date` varchar(20) NOT NULL,
	`from_name` varchar(100) NOT NULL DEFAULT 'Claude, CEO',
	`priority` enum('Critical','High','Medium','Low') NOT NULL DEFAULT 'Medium',
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`status` enum('Pending','In Progress','Complete','Cancelled') NOT NULL DEFAULT 'Pending',
	`completed_date` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ceo_directives_id` PRIMARY KEY(`id`)
);
