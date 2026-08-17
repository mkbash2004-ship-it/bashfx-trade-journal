CREATE TABLE `monthlySummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthlySummaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthlySummaries_userId_monthKey_unique` UNIQUE(`userId`,`monthKey`)
);
--> statement-breakpoint
CREATE TABLE `monthlySummaryAutomation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlySummaryAutomation_id` PRIMARY KEY(`id`)
);
