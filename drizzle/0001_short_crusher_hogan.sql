CREATE TABLE `tradeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(96) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`tradingDay` timestamp NOT NULL,
	`extractionStatus` varchar(24) NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tradeDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`tradingDay` timestamp NOT NULL,
	`pair` varchar(24) NOT NULL,
	`session` varchar(64) NOT NULL DEFAULT '',
	`direction` varchar(16) NOT NULL DEFAULT 'unknown',
	`entry` varchar(32) NOT NULL DEFAULT '',
	`exit` varchar(32) NOT NULL DEFAULT '',
	`pips` double,
	`profit` double,
	`currency` varchar(12) NOT NULL DEFAULT '',
	`result` varchar(16) NOT NULL DEFAULT 'unknown',
	`notes` text,
	`confidence` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklySummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeklySummaries_id` PRIMARY KEY(`id`)
);
