DROP INDEX `one_live_town_plan`;--> statement-breakpoint
CREATE UNIQUE INDEX `one_live_town_plan` ON `town_plans` (`town_id`) WHERE "town_plans"."status" IN ('voting','approved','ready');--> statement-breakpoint
ALTER TABLE `charter_institutions` ADD `x` real;--> statement-breakpoint
ALTER TABLE `charter_institutions` ADD `z` real;--> statement-breakpoint
ALTER TABLE `charter_institutions` ADD `rotation` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `parcel_buildings` ADD `x` real;--> statement-breakpoint
ALTER TABLE `parcel_buildings` ADD `z` real;--> statement-breakpoint
ALTER TABLE `parcel_buildings` ADD `rotation` integer DEFAULT 0 NOT NULL;