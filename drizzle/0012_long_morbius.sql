CREATE TABLE `community_baskets` (
	`town_id` text NOT NULL,
	`day` text NOT NULL,
	`completed` integer NOT NULL,
	PRIMARY KEY(`town_id`, `day`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `farm_pantry` (
	`town_id` text NOT NULL,
	`crop` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`town_id`, `crop`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `farm_plots` (
	`town_id` text NOT NULL,
	`plot_id` text NOT NULL,
	`crop` text,
	`planted` integer DEFAULT 0 NOT NULL,
	`watered` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`town_id`, `plot_id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `picnic_visits` (
	`town_id` text NOT NULL,
	`day` text NOT NULL,
	`resident_id` text NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`town_id`, `day`, `resident_id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `residents` ADD `emote` text;--> statement-breakpoint
ALTER TABLE `residents` ADD `emote_until` integer DEFAULT 0 NOT NULL;