ALTER TABLE `residents` ADD `inside` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `interior` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `interior_revision` integer DEFAULT 0 NOT NULL;