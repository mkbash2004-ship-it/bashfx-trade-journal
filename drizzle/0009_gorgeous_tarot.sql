CREATE TABLE `backupReminderSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`timezone` varchar(64) NOT NULL DEFAULT 'WAT',
	`reminderTime` varchar(5) NOT NULL DEFAULT '09:00',
	`reminderTaskUid` varchar(65),
	`lastReminderSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backupReminderSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `backupReminderSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `encryptedBackupArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `encryptedBackupArchives_id` PRIMARY KEY(`id`)
);
