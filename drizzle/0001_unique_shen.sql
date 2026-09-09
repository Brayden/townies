CREATE TABLE `lawn_cells` (
	`key` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`cell` text NOT NULL,
	`cut_at` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lawn_town` ON `lawn_cells` (`town_id`);--> statement-breakpoint
ALTER TABLE `residents` ADD `mowing` integer DEFAULT 0 NOT NULL;