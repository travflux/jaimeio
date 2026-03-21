ALTER TABLE `x_replies` ADD `tweetFollowers` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `x_replies` ADD `tweetVerifiedType` varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `x_replies` ADD `replyMode` varchar(20) DEFAULT 'quote_tweet';