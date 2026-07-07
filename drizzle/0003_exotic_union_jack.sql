DROP INDEX `idx_sc_votes_user_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `sc_votes_user_id_unique` ON `sc_votes` (`user_id`);