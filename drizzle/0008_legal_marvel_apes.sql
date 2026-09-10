CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`resident_id` text NOT NULL,
	`channel` text NOT NULL,
	`text` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chat_town_channel_time` ON `chat_messages` (`town_id`,`channel`,`created`);--> statement-breakpoint
CREATE INDEX `chat_resident_time` ON `chat_messages` (`resident_id`,`created`);--> statement-breakpoint
ALTER TABLE `residents` ADD `house` text DEFAULT 'meadow-1' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `upkeep_due` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `upkeep_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `riding` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `outfit` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `hat` text DEFAULT 'hat-straw' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `accessory` text DEFAULT 'accessory-none' NOT NULL;