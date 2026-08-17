ALTER TABLE `journalReminderSettings` ADD `dailyNotificationTitle` varchar(120) DEFAULT 'Bashfx VIP GOLD ROOM: complete today''s journal' NOT NULL;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `dailyNotificationContent` text;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `fridayNotificationTitle` varchar(120) DEFAULT 'Bashfx VIP GOLD ROOM: Friday weekly summary' NOT NULL;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `fridayNotificationContent` text;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `saturdayNotificationTitle` varchar(120) DEFAULT 'Bashfx VIP GOLD ROOM: Saturday follow-up' NOT NULL;--> statement-breakpoint
ALTER TABLE `journalReminderSettings` ADD `saturdayNotificationContent` text;