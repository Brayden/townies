CREATE TABLE `world_work` (
	`key` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`object_id` text NOT NULL,
	`target_id` text NOT NULL,
	`completed` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `world_work_town` ON `world_work` (`town_id`);--> statement-breakpoint
ALTER TABLE `residents` ADD `shift` text;--> statement-breakpoint
ALTER TABLE `residents` ADD `papers` integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `parcels` integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `water` integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `bag` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `action_target` text;--> statement-breakpoint
ALTER TABLE `residents` ADD `action_started` integer DEFAULT 0 NOT NULL;