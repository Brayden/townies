CREATE TABLE `election_candidates` (
	`town_id` text NOT NULL,
	`cycle` text NOT NULL,
	`resident_id` text NOT NULL,
	`nominated_at` integer NOT NULL,
	PRIMARY KEY(`town_id`, `cycle`, `resident_id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resident_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `election_votes` (
	`town_id` text NOT NULL,
	`cycle` text NOT NULL,
	`voter_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`cast_at` integer NOT NULL,
	PRIMARY KEY(`town_id`, `cycle`, `voter_id`),
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voter_id`) REFERENCES `residents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`town_id`,`cycle`,`candidate_id`) REFERENCES `election_candidates`(`town_id`,`cycle`,`resident_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `election_vote_tally` ON `election_votes` (`town_id`,`cycle`,`candidate_id`);