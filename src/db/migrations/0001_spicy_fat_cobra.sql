CREATE TABLE `skill_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`description` text NOT NULL,
	`html_url` text NOT NULL,
	`clone_url` text NOT NULL,
	`ssh_url` text NOT NULL,
	`stars_count` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`topics` text NOT NULL,
	`meta` text,
	`subdirs` text NOT NULL,
	`author` text,
	`cached_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_cache_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_refresh_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text,
	`ip_address` text,
	`refreshed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_refresh_attempt_user_id_idx` ON `skill_refresh_attempt` (`user_id`);--> statement-breakpoint
CREATE INDEX `skill_refresh_attempt_refreshed_at_idx` ON `skill_refresh_attempt` (`refreshed_at`);