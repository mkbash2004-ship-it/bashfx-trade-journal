ALTER TABLE `journalReminderSettings` ADD `dailyReminderTime` varchar(5) DEFAULT '20:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `fridayReminderTime` varchar(5) DEFAULT '18:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `saturdayReminderTime` varchar(5) DEFAULT '09:00' NOT NULL;