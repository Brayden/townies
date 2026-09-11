CREATE TABLE `chat_read_positions` (
	`town_id` text NOT NULL,
	`resident_id` text NOT NULL,
	`channel` text NOT NULL,
	`created` integer NOT NULL,
	`ids` text NOT NULL,
	PRIMARY KEY(`town_id`, `resident_id`, `channel`)
);
