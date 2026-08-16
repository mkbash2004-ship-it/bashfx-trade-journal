CREATE TABLE `journalReminderSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC+1',
	`dailyReminderTaskUid` varchar(65),
	`fridayReminderTaskUid` varchar(65),
	`saturdayReminderTaskUid` varchar(65),
	`lastDailyReminderSentAt` timestamp,
	`lastFridayReminderSentAt` timestamp,
	`lastSaturdayReminderSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journalReminderSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `journalReminderSettings_userId_unique` UNIQUE(`userId`)
);
