CREATE TABLE `charter_institutions` (
	`town_id` text NOT NULL,
	`id` text NOT NULL,
	`node` text NOT NULL,
	`plot` text NOT NULL,
	PRIMARY KEY(`town_id`, `id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `charter_institution_plot` ON `charter_institutions` (`town_id`,`plot`);--> statement-breakpoint
CREATE TABLE `parcel_buildings` (
	`town_id` text NOT NULL,
	`plot` text NOT NULL,
	`kind` text NOT NULL,
	PRIMARY KEY(`town_id`, `plot`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plan_voters` (
	`plan_id` text NOT NULL,
	`resident_id` text NOT NULL,
	`vote` integer,
	PRIMARY KEY(`plan_id`, `resident_id`),
	FOREIGN KEY (`plan_id`) REFERENCES `town_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `town_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`town_id` text NOT NULL,
	`kind` text NOT NULL,
	`institution` text,
	`option` text NOT NULL,
	`from_node` text,
	`from_plot` text,
	`cost` integer NOT NULL,
	`funded` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'voting' NOT NULL,
	`created` integer NOT NULL,
	`closes` integer NOT NULL,
	`electorate` integer NOT NULL,
	`quorum` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `town_plan_history` ON `town_plans` (`town_id`,`created`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_live_town_plan` ON `town_plans` (`town_id`) WHERE "town_plans"."status" IN ('voting','approved');--> statement-breakpoint
CREATE TABLE `town_territories` (
	`town_id` text NOT NULL,
	`id` text NOT NULL,
	PRIMARY KEY(`town_id`, `id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action
);
