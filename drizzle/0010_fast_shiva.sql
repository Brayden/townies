ALTER TABLE `election_candidates` ADD `withdrawn_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `residents` ADD `town_joined_at` integer DEFAULT 0 NOT NULL;