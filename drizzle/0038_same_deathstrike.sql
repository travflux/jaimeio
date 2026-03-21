ALTER TABLE `selector_candidates` ADD `score` float;--> statement-breakpoint
ALTER TABLE `selector_candidates` ADD `scored_at` timestamp;--> statement-breakpoint
ALTER TABLE `selector_candidates` ADD `score_breakdown` text;--> statement-breakpoint
ALTER TABLE `selector_candidates` ADD `article_potential` varchar(10);