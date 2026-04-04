CREATE TABLE `custom_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` varchar(100) NOT NULL,
	`custom_domain` varchar(255) NOT NULL,
	`publication_name` varchar(255) NOT NULL,
	`ssl_status` enum("pending","active","failed") NOT NULL DEFAULT "pending",
	`verified_at` datetime,
	`created_at` datetime NOT NULL DEFAULT NOW(),
	CONSTRAINT `custom_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_domains_custom_domain_unique` UNIQUE(`custom_domain`)
);
--> statement-breakpoint
CREATE INDEX `idx_cd_client` ON `custom_domains` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_cd_domain` ON `custom_domains` (`custom_domain`);
