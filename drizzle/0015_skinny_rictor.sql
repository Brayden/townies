ALTER TABLE `residents` ADD `move_owner` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `move_epoch` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `move_updated` integer DEFAULT 0 NOT NULL;