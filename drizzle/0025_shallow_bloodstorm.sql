ALTER TABLE `merch_products` ADD `status` enum('pending','ready','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `merch_products` ADD `errorMessage` text;--> statement-breakpoint
ALTER TABLE `merch_products` ADD `upscaledImageUrl` text;