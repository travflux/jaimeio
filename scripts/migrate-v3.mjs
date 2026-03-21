/**
 * v3.0.0 Migration Script
 * Applies all missing tables and columns from migrations 0019-0033
 * Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS guards
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function exec(sql, label) {
  try {
    await conn.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR' || e.message.includes('already exists')) {
      console.log(`  ~ ${label} (already exists, skipped)`);
    } else {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }
}

console.log('Running v3.0.0 migrations...\n');

// --- 0019: page_views (affiliate_clicks already exists) ---
await exec(`CREATE TABLE IF NOT EXISTS \`page_views\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`articleId\` int,
  \`articleSlug\` varchar(200),
  \`source\` varchar(50),
  \`medium\` varchar(50),
  \`referrer\` varchar(500),
  \`path\` varchar(500),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`page_views_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE page_views');

// --- 0020: merch_leads, merch_products (may already exist) ---
await exec(`CREATE TABLE IF NOT EXISTS \`merch_leads\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`articleId\` int,
  \`articleSlug\` varchar(200),
  \`email\` varchar(255),
  \`phone\` varchar(50),
  \`name\` varchar(255),
  \`productId\` int,
  \`source\` varchar(100),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`merch_leads_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE merch_leads');

// merch_products columns (may already exist)
await exec(`ALTER TABLE \`merch_products\` ADD \`errorMessage\` text`, 'ADD merch_products.errorMessage');
await exec(`ALTER TABLE \`merch_products\` ADD \`upscaledImageUrl\` text`, 'ADD merch_products.upscaledImageUrl');

// --- 0021: ad_spend ---
await exec(`CREATE TABLE IF NOT EXISTS \`ad_spend\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`platform\` varchar(50) NOT NULL,
  \`campaign\` varchar(255),
  \`spend_cents\` int NOT NULL DEFAULT 0,
  \`impressions\` int NOT NULL DEFAULT 0,
  \`clicks\` int NOT NULL DEFAULT 0,
  \`date\` varchar(10) NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`ad_spend_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE ad_spend');

// --- 0022: conversion_events ---
await exec(`CREATE TABLE IF NOT EXISTS \`conversion_events\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`sessionId\` varchar(100),
  \`event\` varchar(100) NOT NULL,
  \`value_cents\` int,
  \`source\` varchar(100),
  \`medium\` varchar(100),
  \`campaign\` varchar(255),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`conversion_events_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE conversion_events');

// --- 0023: revenue_events ---
await exec(`CREATE TABLE IF NOT EXISTS \`revenue_events\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`source\` varchar(100) NOT NULL,
  \`amount_cents\` int NOT NULL,
  \`currency\` varchar(10) DEFAULT 'usd',
  \`description\` text,
  \`metadata\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`revenue_events_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE revenue_events');

// --- 0024: visitor_sessions ---
await exec(`CREATE TABLE IF NOT EXISTS \`visitor_sessions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`sessionId\` varchar(100) NOT NULL,
  \`userId\` int,
  \`source\` varchar(100),
  \`medium\` varchar(100),
  \`campaign\` varchar(255),
  \`landingPage\` varchar(500),
  \`userAgent\` varchar(500),
  \`ip\` varchar(50),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`visitor_sessions_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE visitor_sessions');

// --- 0026: search_engine_performance ---
await exec(`CREATE TABLE IF NOT EXISTS \`search_engine_performance\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`date\` varchar(10) NOT NULL,
  \`query\` varchar(500),
  \`page\` varchar(500),
  \`clicks\` int DEFAULT 0,
  \`impressions\` int DEFAULT 0,
  \`ctr\` float DEFAULT 0,
  \`position\` float DEFAULT 0,
  \`source\` varchar(50),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`search_engine_performance_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE search_engine_performance');

// --- 0027: newsletter_send_history ---
await exec(`CREATE TABLE IF NOT EXISTS \`newsletter_send_history\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`sentAt\` timestamp NOT NULL DEFAULT (now()),
  \`recipientCount\` int DEFAULT 0,
  \`subject\` varchar(500),
  \`status\` varchar(50),
  \`errorMessage\` text,
  \`metadata\` text,
  CONSTRAINT \`newsletter_send_history_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE newsletter_send_history');

// --- 0028: platform_credentials ---
await exec(`CREATE TABLE IF NOT EXISTS \`platform_credentials\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`platform\` varchar(50) NOT NULL,
  \`apiKey\` text,
  \`apiSecret\` text,
  \`extra\` text,
  \`isActive\` boolean DEFAULT true,
  \`is_valid\` boolean,
  \`last_tested_at\` timestamp,
  \`last_error\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`platform_credentials_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`platform_credentials_platform_unique\` UNIQUE(\`platform\`)
)`, 'CREATE platform_credentials');

// --- 0029: distribution_queue ---
await exec(`CREATE TABLE IF NOT EXISTS \`distribution_queue\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`articleId\` int,
  \`platform\` varchar(32) NOT NULL,
  \`status\` varchar(20) DEFAULT 'pending' NOT NULL,
  \`subreddit\` varchar(100),
  \`content\` text,
  \`scheduledAt\` timestamp,
  \`sentAt\` timestamp,
  \`errorMessage\` text,
  \`retryCount\` int DEFAULT 0 NOT NULL,
  \`triggeredBy\` varchar(50),
  \`max_attempts\` int DEFAULT 3 NOT NULL,
  \`priority\` enum('high','normal','low') DEFAULT 'normal' NOT NULL,
  \`content_format\` enum('link','text','image','carousel','reply') DEFAULT 'link' NOT NULL,
  \`image_url\` varchar(2000),
  \`likes\` int DEFAULT 0,
  \`comments\` int DEFAULT 0,
  \`shares\` int DEFAULT 0,
  \`clicks\` int DEFAULT 0,
  \`checked_at\` timestamp,
  \`removed_at\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`distribution_queue_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE distribution_queue');

// --- 0030: reddit_subreddit_map ---
await exec(`CREATE TABLE IF NOT EXISTS \`reddit_subreddit_map\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`categorySlug\` varchar(100) NOT NULL,
  \`subreddit\` varchar(100) NOT NULL,
  \`isActive\` boolean DEFAULT true,
  \`weight\` int DEFAULT 1,
  \`notes\` text,
  \`minKarma\` int DEFAULT 0,
  \`flairRequired\` varchar(100),
  \`last_post_at\` timestamp,
  \`posts_today\` int DEFAULT 0 NOT NULL,
  \`posts_today_date\` varchar(10),
  \`daily_limit\` int DEFAULT 2 NOT NULL,
  \`total_posts\` int DEFAULT 0 NOT NULL,
  \`total_removals\` int DEFAULT 0 NOT NULL,
  CONSTRAINT \`reddit_subreddit_map_id\` PRIMARY KEY(\`id\`)
)`, 'CREATE reddit_subreddit_map');

// --- 0030: setup_checklist ---
await exec(`CREATE TABLE IF NOT EXISTS \`setup_checklist\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`key\` varchar(100) NOT NULL,
  \`label\` varchar(255) NOT NULL,
  \`description\` text,
  \`section\` varchar(100),
  \`sortOrder\` int DEFAULT 0,
  \`isRequired\` boolean DEFAULT false,
  \`completedAt\` timestamp,
  \`completedBy\` varchar(100),
  \`check_type\` enum('manual','credential','api_test') DEFAULT 'manual' NOT NULL,
  \`check_config\` text,
  \`added_in_version\` varchar(20),
  \`setup_url\` varchar(500),
  CONSTRAINT \`setup_checklist_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`setup_checklist_key_unique\` UNIQUE(\`key\`)
)`, 'CREATE setup_checklist');

// --- 0031: sms_subscribers ---
await exec(`CREATE TABLE IF NOT EXISTS \`sms_subscribers\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`phone\` varchar(20) NOT NULL,
  \`status\` enum('active','opted_out','invalid','blocked') DEFAULT 'active' NOT NULL,
  \`opt_in_source\` varchar(100),
  \`opt_in_ip\` varchar(50),
  \`last_sent_at\` timestamp,
  \`weekly_count\` int DEFAULT 0,
  \`total_sent\` int DEFAULT 0,
  \`total_failed\` int DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`sms_subscribers_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`sms_subscribers_phone_unique\` UNIQUE(\`phone\`)
)`, 'CREATE sms_subscribers');

// --- 0033: Add missing columns to existing tables ---
// platform_credentials
await exec(`ALTER TABLE \`platform_credentials\` ADD \`is_valid\` boolean`, 'ADD platform_credentials.is_valid');
await exec(`ALTER TABLE \`platform_credentials\` ADD \`last_tested_at\` timestamp`, 'ADD platform_credentials.last_tested_at');
await exec(`ALTER TABLE \`platform_credentials\` ADD \`last_error\` text`, 'ADD platform_credentials.last_error');

// distribution_queue
await exec(`ALTER TABLE \`distribution_queue\` MODIFY COLUMN \`articleId\` int`, 'MODIFY distribution_queue.articleId nullable');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`max_attempts\` int DEFAULT 3 NOT NULL`, 'ADD distribution_queue.max_attempts');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`priority\` enum('high','normal','low') DEFAULT 'normal' NOT NULL`, 'ADD distribution_queue.priority');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`content_format\` enum('link','text','image','carousel','reply') DEFAULT 'link' NOT NULL`, 'ADD distribution_queue.content_format');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`image_url\` varchar(2000)`, 'ADD distribution_queue.image_url');

// reddit_subreddit_map
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`last_post_at\` timestamp`, 'ADD reddit_subreddit_map.last_post_at');
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`posts_today\` int DEFAULT 0 NOT NULL`, 'ADD reddit_subreddit_map.posts_today');
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`posts_today_date\` varchar(10)`, 'ADD reddit_subreddit_map.posts_today_date');
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`daily_limit\` int DEFAULT 2 NOT NULL`, 'ADD reddit_subreddit_map.daily_limit');
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`total_posts\` int DEFAULT 0 NOT NULL`, 'ADD reddit_subreddit_map.total_posts');
await exec(`ALTER TABLE \`reddit_subreddit_map\` ADD \`total_removals\` int DEFAULT 0 NOT NULL`, 'ADD reddit_subreddit_map.total_removals');

// setup_checklist
await exec(`ALTER TABLE \`setup_checklist\` ADD \`check_type\` enum('manual','credential','api_test') DEFAULT 'manual' NOT NULL`, 'ADD setup_checklist.check_type');
await exec(`ALTER TABLE \`setup_checklist\` ADD \`check_config\` text`, 'ADD setup_checklist.check_config');
await exec(`ALTER TABLE \`setup_checklist\` ADD \`added_in_version\` varchar(20)`, 'ADD setup_checklist.added_in_version');
await exec(`ALTER TABLE \`setup_checklist\` ADD \`setup_url\` varchar(500)`, 'ADD setup_checklist.setup_url');

// distribution_queue engagement columns (0032)
await exec(`ALTER TABLE \`distribution_queue\` ADD \`likes\` int DEFAULT 0`, 'ADD distribution_queue.likes');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`comments\` int DEFAULT 0`, 'ADD distribution_queue.comments');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`shares\` int DEFAULT 0`, 'ADD distribution_queue.shares');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`clicks\` int DEFAULT 0`, 'ADD distribution_queue.clicks');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`checked_at\` timestamp`, 'ADD distribution_queue.checked_at');
await exec(`ALTER TABLE \`distribution_queue\` ADD \`removed_at\` timestamp`, 'ADD distribution_queue.removed_at');

console.log('\nMigration complete.');
await conn.end();
