CREATE TABLE `horoscopes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`sign` enum('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces') NOT NULL,
	`content` text NOT NULL,
	`styleId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `horoscopes_id` PRIMARY KEY(`id`)
);
