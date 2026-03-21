CREATE TABLE `mad_lib_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`madLibId` int NOT NULL,
	`userId` int,
	`userInputs` text NOT NULL,
	`completedStory` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mad_lib_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mad_libs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`story` text NOT NULL,
	`blanks` text NOT NULL,
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mad_libs_id` PRIMARY KEY(`id`),
	CONSTRAINT `mad_libs_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `trivia_quiz_solves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triviaQuizId` int NOT NULL,
	`userId` int,
	`userAnswers` text NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`totalQuestions` int NOT NULL,
	`timeSpent` int,
	`solvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trivia_quiz_solves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trivia_quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`questions` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trivia_quizzes_id` PRIMARY KEY(`id`),
	CONSTRAINT `trivia_quizzes_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `word_scramble_solves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wordScrambleId` int NOT NULL,
	`userId` int,
	`userAnswers` text NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`totalWords` int NOT NULL,
	`timeSpent` int,
	`solvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `word_scramble_solves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `word_scrambles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(200) NOT NULL,
	`words` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `word_scrambles_id` PRIMARY KEY(`id`),
	CONSTRAINT `word_scrambles_date_unique` UNIQUE(`date`)
);
