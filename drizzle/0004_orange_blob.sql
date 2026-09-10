CREATE TABLE `contributions` (
	`town_id` text NOT NULL,
	`resident_id` text NOT NULL,
	`day` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`mow` integer DEFAULT 0 NOT NULL,
	`paper` integer DEFAULT 0 NOT NULL,
	`clean` integer DEFAULT 0 NOT NULL,
	`garden` integer DEFAULT 0 NOT NULL,
	`deliver` integer DEFAULT 0 NOT NULL,
	`task` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`donated` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`town_id`, `resident_id`, `day`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
