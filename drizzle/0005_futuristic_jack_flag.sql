CREATE TABLE `civic_history` (
	`id` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`project` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `civic_history_town_time` ON `civic_history` (`town_id`,`created`);--> statement-breakpoint
CREATE TABLE `town_projects` (
	`town_id` text NOT NULL,
	`id` text NOT NULL,
	`funded` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`mayor_id` text,
	PRIMARY KEY(`town_id`, `id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mayor_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `election_candidates` ADD `platform` text;--> statement-breakpoint
ALTER TABLE `election_candidates` ADD `tax` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `towns` ADD `tax` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `towns` ADD `term` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `towns` ADD `featured` text;