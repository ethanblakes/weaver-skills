DROP INDEX `skill_permission_skill_name_user_id_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `skill_permission_skill_name_user_id_idx` ON `skill_permission` (`skill_name`,`user_id`);