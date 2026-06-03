CREATE TABLE `skill_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`skill_name` text NOT NULL,
	`user_id` text NOT NULL,
	`granted_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `skill_permission_skill_name_idx` ON `skill_permission` (`skill_name`);--> statement-breakpoint
CREATE INDEX `skill_permission_user_id_idx` ON `skill_permission` (`user_id`);--> statement-breakpoint
CREATE INDEX `skill_permission_skill_name_user_id_idx` ON `skill_permission` (`skill_name`,`user_id`);