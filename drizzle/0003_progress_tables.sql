CREATE TABLE IF NOT EXISTS `user_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL UNIQUE,
	`activeJourneyId` text,
	`currentDay` integer NOT NULL DEFAULT 1,
	`streakCount` integer NOT NULL DEFAULT 0,
	`lastSessionDate` text,
	`createdAt` integer NOT NULL DEFAULT (unixepoch()),
	`updatedAt` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journey_day_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`journeyId` text NOT NULL,
	`dayNumber` integer NOT NULL,
	`frequencyId` text NOT NULL,
	`completedAt` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `frequency_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`frequencyId` text NOT NULL,
	`mode` text NOT NULL,
	`durationSeconds` integer NOT NULL DEFAULT 0,
	`startedAt` integer NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
ALTER TABLE `authorized_emails` ADD COLUMN `accessType` text NOT NULL DEFAULT 'lifetime';
