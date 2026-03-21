CREATE TABLE `sms_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`status` enum('active','opted_out','invalid','blocked') NOT NULL DEFAULT 'active',
	`opt_in_source` varchar(100),
	`opt_in_ip` varchar(45),
	`opt_in_at` timestamp,
	`opt_out_at` timestamp,
	`last_sent_at` timestamp,
	`weekly_count` int DEFAULT 0,
	`total_sent` int DEFAULT 0,
	`total_failed` int DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_subscribers_phone_unique` UNIQUE(`phone`)
);
