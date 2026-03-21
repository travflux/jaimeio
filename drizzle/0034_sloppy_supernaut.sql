CREATE TABLE `selector_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_type` enum('rss','google_news','manual','x','reddit','scraper','youtube','event_calendar') NOT NULL,
	`source_name` varchar(255) NOT NULL,
	`source_url` text,
	`feed_source_id` int,
	`title` varchar(1000) NOT NULL,
	`summary` text,
	`published_date` varchar(50),
	`status` enum('pending','selected','rejected','expired') NOT NULL DEFAULT 'pending',
	`priority` int NOT NULL DEFAULT 50,
	`batch_date` varchar(10),
	`article_id` int,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selector_candidates_id` PRIMARY KEY(`id`)
);
