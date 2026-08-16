CREATE TABLE `dailyJournals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`journalDate` timestamp NOT NULL,
	`plannedSessions` varchar(80) NOT NULL DEFAULT '',
	`marketBias` varchar(32) NOT NULL DEFAULT 'neutral',
	`marketContext` varchar(64) NOT NULL DEFAULT '',
	`scheduledEvents` varchar(255) NOT NULL DEFAULT '',
	`newsTiming` varchar(32) NOT NULL DEFAULT '',
	`dailyRiskLimit` double,
	`dailyRiskUnit` varchar(16) NOT NULL DEFAULT '',
	`maxTrades` int,
	`preMarketMood` varchar(48) NOT NULL DEFAULT '',
	`riskLimitFollowed` varchar(24) NOT NULL DEFAULT '',
	`tradeLimitFollowed` varchar(24) NOT NULL DEFAULT '',
	`newsImpact` varchar(80) NOT NULL DEFAULT '',
	`dailyStrength` text,
	`dailyLesson` text,
	`dailyGrade` varchar(4) NOT NULL DEFAULT '',
	`tomorrowRule` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyJournals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trades` MODIFY COLUMN `documentId` int;--> statement-breakpoint
ALTER TABLE `trades` ADD `timeframe` varchar(12) DEFAULT 'M5' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `tradeType` varchar(32) DEFAULT 'intraday' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `setup` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `entryConfirmation` varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `higherTimeframeAlignment` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `riskAmount` double;--> statement-breakpoint
ALTER TABLE `trades` ADD `riskUnit` varchar(16) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `plannedRr` double;--> statement-breakpoint
ALTER TABLE `trades` ADD `stopManagement` varchar(40) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `partialProfit` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `exitReason` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `planAdherence` varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `discipline` varchar(24) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `emotion` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `wouldTakeAgain` varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trades` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `trades` ADD `improvement` text;