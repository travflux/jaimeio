CREATE TABLE `article_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`categoryId` int,
	`promptTemplate` text,
	`headlineTemplate` varchar(500),
	`writingStyle` text,
	`createdAt` timestamp DEFAULT (now()),
	`license_id` int,
	`category_id` int,
	`headline_format` varchar(300),
	`tone` varchar(100) DEFAULT 'default',
	`target_word_count` int DEFAULT 800,
	`required_elements` text,
	`image_style_prompt` text,
	`image_provider` varchar(50),
	`image_aspect_ratio` varchar(10) DEFAULT '16:9',
	`seo_title_format` varchar(300),
	`seo_keyword_themes` text,
	`geo_faq_topics` text,
	`geo_key_takeaway_count` int DEFAULT 5,
	`geo_faq_count` int DEFAULT 5,
	`schedule_frequency` varchar(20) DEFAULT 'manual',
	`schedule_day_of_week` int,
	`schedule_hour` int DEFAULT 9,
	`schedule_color` varchar(7) DEFAULT '#6366f1',
	`is_active` int DEFAULT 1,
	`last_used_at` timestamp,
	`use_count` int DEFAULT 0,
	CONSTRAINT `article_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`title` varchar(1000),
	`source_url` varchar(2000),
	`source_name` varchar(255),
	`summary` text,
	`status` enum('pending','used','ignored') DEFAULT 'pending',
	`source_type` varchar(50) DEFAULT 'rss',
	`selector_candidate_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_domain_verification_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`custom_domain` varchar(255) NOT NULL,
	`verified` boolean NOT NULL,
	`checked_at` timestamp NOT NULL DEFAULT (now()),
	`error_message` text,
	CONSTRAINT `custom_domain_verification_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` varchar(100) NOT NULL,
	`custom_domain` varchar(255) NOT NULL,
	`publication_name` varchar(255) NOT NULL,
	`ssl_status` enum('pending','active','failed') NOT NULL DEFAULT 'pending',
	`verified_at` datetime,
	`created_at` datetime NOT NULL DEFAULT NOW(),
	CONSTRAINT `custom_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_domains_custom_domain_unique` UNIQUE(`custom_domain`)
);
--> statement-breakpoint
CREATE TABLE `generation_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`article_id` int,
	`license_id` int,
	`step` enum('image','seo','geo') NOT NULL,
	`status` enum('success','failed','skipped') NOT NULL,
	`error_message` text,
	`attempted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generation_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `impersonation_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`impersonator_user_id` varchar(255) NOT NULL,
	`impersonator_email` varchar(320) NOT NULL,
	`target_license_id` int NOT NULL,
	`target_subdomain` varchar(100) NOT NULL,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	CONSTRAINT `impersonation_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseUserId` int NOT NULL,
	`licenseId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `license_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`type` enum('number','string','boolean','json','text') NOT NULL DEFAULT 'string',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_license_setting_key` UNIQUE(`licenseId`,`key`)
);
--> statement-breakpoint
CREATE TABLE `license_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` varchar(200) NOT NULL,
	`role` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'viewer',
	`avatarUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`reset_token_hash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_license_user_email` UNIQUE(`licenseId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `network_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`logo_url` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `network_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_sends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`preview_text` varchar(255),
	`html_content` text,
	`article_ids` text,
	`recipient_count` int DEFAULT 0,
	`open_count` int DEFAULT 0,
	`click_count` int DEFAULT 0,
	`resend_broadcast_id` varchar(255),
	`status` enum('draft','sending','sent','failed') DEFAULT 'draft',
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `newsletter_sends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `publication_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`page_slug` varchar(100) NOT NULL,
	`title` varchar(500),
	`content` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publication_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_license_page` UNIQUE(`license_id`,`page_slug`)
);
--> statement-breakpoint
CREATE TABLE `reseller_network_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`logo_url` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reseller_network_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rss_feeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`name` varchar(255),
	`category` varchar(100),
	`is_active` boolean DEFAULT true,
	`last_fetched` timestamp,
	`error_count` int DEFAULT 0,
	`last_error` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rss_feeds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`template_text` text NOT NULL,
	`template_type` enum('newsletter_url','breaking_news','custom') DEFAULT 'custom',
	`is_active` boolean DEFAULT true,
	`send_delay_minutes` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsor_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`day_of_week` int NOT NULL,
	`sponsor_name` varchar(255) NOT NULL,
	`sponsor_url` varchar(500),
	`sponsor_tagline` text,
	`logo_url` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsor_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clerk_user_id` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200) NOT NULL,
	`role` enum('owner','admin') NOT NULL DEFAULT 'admin',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `staff_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_accounts_clerk_user_id_unique` UNIQUE(`clerk_user_id`)
);
--> statement-breakpoint
CREATE TABLE `support_articles` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'general',
	`is_public` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_id` int NOT NULL,
	`user_id` int,
	`subject` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`priority` enum('low','normal','high','urgent') DEFAULT 'normal',
	`category` varchar(100) DEFAULT 'general',
	`status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
	`reference_number` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_schedule_skips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`license_id` int NOT NULL,
	`skip_date` varchar(10) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `template_schedule_skips_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_skip` UNIQUE(`template_id`,`license_id`,`skip_date`)
);
--> statement-breakpoint
ALTER TABLE `platform_credentials` DROP INDEX `platform_credentials_platform_unique`;--> statement-breakpoint
ALTER TABLE `articles` MODIFY COLUMN `headline` text NOT NULL;--> statement-breakpoint
ALTER TABLE `affiliate_clicks` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `sourceName` varchar(255);--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_summary` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_faq` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_schema` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_speakable` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_score` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_generated_at` timestamp;--> statement-breakpoint
ALTER TABLE `articles` ADD `is_editors_pick` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `is_trending` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `seo_description` varchar(500);--> statement-breakpoint
ALTER TABLE `articles` ADD `focus_keyword` varchar(100);--> statement-breakpoint
ALTER TABLE `articles` ADD `seo_title` varchar(255);--> statement-breakpoint
ALTER TABLE `articles` ADD `alt_text` varchar(255);--> statement-breakpoint
ALTER TABLE `articles` ADD `is_featured` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `is_sponsored` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `is_breaking` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `word_count` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `reading_time_minutes` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `generation_model` varchar(100);--> statement-breakpoint
ALTER TABLE `articles` ADD `generation_style` varchar(100);--> statement-breakpoint
ALTER TABLE `articles` ADD `geo_status` enum('pending','generated','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `articles` ADD `seo_status` enum('pending','generated','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `articles` ADD `image_status` enum('pending','generated','failed','skipped') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `articles` ADD `quality_score` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `amazon_products` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `amazon_placement` enum('inline','sidebar','both','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `articles` ADD `template_id` int;--> statement-breakpoint
ALTER TABLE `blocked_sources` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `categories` ADD `target_percentage` int;--> statement-breakpoint
ALTER TABLE `categories` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `content_calendar` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `covered_topics` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `licenses` ADD `subdomain` varchar(100);--> statement-breakpoint
ALTER TABLE `licenses` ADD `maxUsers` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `licenses` ADD `features` json;--> statement-breakpoint
ALTER TABLE `licenses` ADD `logoUrl` text;--> statement-breakpoint
ALTER TABLE `licenses` ADD `primaryColor` varchar(7) DEFAULT '#0f2d5e';--> statement-breakpoint
ALTER TABLE `licenses` ADD `is_test` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `licenses` ADD `parent_license_id` int;--> statement-breakpoint
ALTER TABLE `licenses` ADD `base_article_commitment` int;--> statement-breakpoint
ALTER TABLE `licenses` ADD `per_article_rate` decimal(10,4);--> statement-breakpoint
ALTER TABLE `licenses` ADD `monthly_page_limit` int;--> statement-breakpoint
ALTER TABLE `licenses` ADD `billing_cycle_start_day` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `licenses` ADD `white_label_config` json;--> statement-breakpoint
ALTER TABLE `licenses` ADD `reseller_plan_config` json;--> statement-breakpoint
ALTER TABLE `licenses` ADD `reseller_defaults` json;--> statement-breakpoint
ALTER TABLE `licenses` ADD `custom_domain` varchar(255);--> statement-breakpoint
ALTER TABLE `licenses` ADD `custom_domain_verified` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `licenses` ADD `custom_domain_verified_at` timestamp;--> statement-breakpoint
ALTER TABLE `newsletter_subscribers` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `page_views` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `rebalance_logs` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `total_fetches` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `successful_fetches` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `candidates_generated` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `rss_feed_weights` ADD `auto_disabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `selector_candidates` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `social_posts` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `workflow_batches` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `x_replies` ADD `license_id` int;--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD CONSTRAINT `idx_platform_license` UNIQUE(`platform`,`license_id`);--> statement-breakpoint
CREATE INDEX `idx_license_status` ON `candidates` (`license_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cd_client` ON `custom_domains` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_cd_domain` ON `custom_domains` (`custom_domain`);--> statement-breakpoint
CREATE INDEX `idx_license` ON `support_tickets` (`license_id`);