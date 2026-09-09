CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`name` text NOT NULL,
	`text` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_town_time` ON `events` (`town_id`,`created`);--> statement-breakpoint
CREATE TABLE `residents` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`town_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`home` integer,
	`job` text,
	`coins` integer DEFAULT 150 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`education` integer DEFAULT 0 NOT NULL,
	`last_study` text,
	`x` real DEFAULT 0 NOT NULL,
	`z` real DEFAULT 6 NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`seen` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `residents_token_hash_unique` ON `residents` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_town_home` ON `residents` (`town_id`,`home`);--> statement-breakpoint
CREATE INDEX `resident_town` ON `residents` (`town_id`);--> statement-breakpoint
CREATE TABLE `towns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite` text,
	`private` integer DEFAULT 0 NOT NULL,
	`treasury` integer DEFAULT 0 NOT NULL,
	`project` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `towns_invite_unique` ON `towns` (`invite`);--> statement-breakpoint
CREATE TABLE `work` (
	`key` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`task` text NOT NULL,
	`resident_id` text NOT NULL,
	`started` integer NOT NULL,
	`last_step` integer DEFAULT 0 NOT NULL,
	`steps` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `work_town` ON `work` (`town_id`);