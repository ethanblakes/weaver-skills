CREATE TABLE `shared_link` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_name` text NOT NULL,
	`created_by` text NOT NULL,
	`access_key` text NOT NULL,
	`expires_at` integer,
	`max_accesses` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shared_link_skill_name_idx` ON `shared_link` (`skill_name`);--> statement-breakpoint
CREATE INDEX `shared_link_created_by_idx` ON `shared_link` (`created_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `shared_link_access_key_idx` ON `shared_link` (`access_key`);