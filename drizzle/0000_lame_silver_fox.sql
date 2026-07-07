CREATE TABLE `ballot_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ballot_id` integer NOT NULL,
	`project_id` integer NOT NULL,
	`score` integer,
	CONSTRAINT "ballot_scores_score_check" CHECK("ballot_scores"."score" IN (NULL, 1, 2, 3, 4, 5))
);
--> statement-breakpoint
CREATE INDEX `idx_ballot_scores_project_id` ON `ballot_scores` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_ballot_scores_ballot_id` ON `ballot_scores` (`ballot_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_ballot_project` ON `ballot_scores` (`ballot_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `ballots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`reasoning` text,
	`submitted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ballots_user_id` ON `ballots` (`user_id`);--> statement-breakpoint
CREATE TABLE `hackathon` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`voting_enabled` integer DEFAULT 0 NOT NULL,
	`results_published` integer DEFAULT 0 NOT NULL,
	`submitted_count` integer DEFAULT 0 NOT NULL,
	`max_votes_per_user` integer DEFAULT 0 NOT NULL,
	`judging_open` integer DEFAULT 0 NOT NULL,
	`schedule_start` text,
	`schedule_end` text,
	`start_timestamp` integer NOT NULL,
	`end_timestamp` integer NOT NULL,
	`voting_start_timestamp` integer NOT NULL,
	`voting_end_timestamp` integer NOT NULL,
	`results_open_timestamp` integer NOT NULL,
	`theme_name` text,
	`theme_description` text,
	CONSTRAINT "hackathon_id_check" CHECK("hackathon"."id" = 1),
	CONSTRAINT "hackathon_status_check" CHECK("hackathon"."status" IN ('not_started', 'in_progress', 'voting', 'finished', 'paused'))
);
--> statement-breakpoint
CREATE TABLE `oauth2_applications` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret` text NOT NULL,
	`permissions` text,
	`redirect_uris` text,
	`name` text NOT NULL,
	`description` text,
	`proxy_microsoft` integer DEFAULT 0 NOT NULL,
	`type` text,
	`profile_picture` text,
	`owner_id` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth2_applications_client_id_unique` ON `oauth2_applications` (`client_id`);--> statement-breakpoint
CREATE TABLE `peer_voting_scores` (
	`user_id` integer NOT NULL,
	`score` text NOT NULL,
	`reasoning` text
);
--> statement-breakpoint
CREATE TABLE `sc_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`vote` text,
	`submitted_at` integer
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "seasons_is_active_check" CHECK("seasons"."is_active" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_name_unique` ON `seasons` (`name`);--> statement-breakpoint
CREATE TABLE `team_awards` (
	`team_id` integer NOT NULL,
	`award` text NOT NULL,
	`meta` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_scores` (
	`team_id` integer NOT NULL,
	`judge_user_id` integer NOT NULL,
	`scores` text NOT NULL,
	`reasoning` text DEFAULT '<no reasoning provided>' NOT NULL,
	`season_id` integer,
	PRIMARY KEY(`team_id`, `judge_user_id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pathway` text,
	`score` integer,
	`rank` integer,
	`project_name` text DEFAULT '' NOT NULL,
	`project_description` text DEFAULT '' NOT NULL,
	`project_demo_url` text,
	`project_repo_url` text,
	`project_submitted` integer DEFAULT 0 NOT NULL,
	`sourcing` text DEFAULT '' NOT NULL,
	`season_id` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "teams_pathway_check" CHECK("teams"."pathway" IN (NULL, 'junior', 'senior'))
);
--> statement-breakpoint
CREATE INDEX `teams_score` ON `teams` (`score`);--> statement-breakpoint
CREATE INDEX `teams_rank` ON `teams` (`rank`);--> statement-breakpoint
CREATE INDEX `teams_season` ON `teams` (`season_id`);--> statement-breakpoint
CREATE TABLE `user_past_teams` (
	`user_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `team_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`name` text,
	`team_id` integer,
	`login_code` text,
	`login_expiry` integer,
	`profile_theme` text,
	`profile_picture` text,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('participant', 'judge', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_lower_email` ON `users` (lower("email"));--> statement-breakpoint
CREATE INDEX `idx_users_team_id` ON `users` (`team_id`);