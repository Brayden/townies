CREATE TABLE `direct_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`text` text NOT NULL,
	`created` integer NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sender`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dm_recipient_time` ON `direct_messages` (`recipient`,`created`);--> statement-breakpoint
CREATE INDEX `dm_sender_time` ON `direct_messages` (`sender`,`created`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`a` text NOT NULL,
	`b` text NOT NULL,
	`requester` text NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`a`, `b`),
	FOREIGN KEY (`a`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`b`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `friendships_b` ON `friendships` (`b`);--> statement-breakpoint
CREATE TABLE `home_invitations` (
	`host` text NOT NULL,
	`guest` text NOT NULL,
	`town_id` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`host`, `guest`),
	FOREIGN KEY (`host`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invitations_guest` ON `home_invitations` (`guest`);--> statement-breakpoint
ALTER TABLE `residents` ADD `home_access` text DEFAULT 'nobody' NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `visit_host` text;--> statement-breakpoint
ALTER TABLE `residents` ADD `indoor_x` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `indoor_z` real DEFAULT 2.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `indoor_level` integer DEFAULT 0 NOT NULL;