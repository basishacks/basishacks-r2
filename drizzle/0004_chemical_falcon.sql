DROP INDEX `idx_peer_voting_user_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `peer_voting_scores_user_id_unique` ON `peer_voting_scores` (`user_id`);