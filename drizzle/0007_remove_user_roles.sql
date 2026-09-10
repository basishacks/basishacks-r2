PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `users__new` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `email` text NOT NULL,
    `name` text,
    `team_id` integer,
    `profile_theme` text,
    `profile_picture` text,
    `auth_issuer` text,
    `auth_subject` text
);
--> statement-breakpoint
INSERT INTO `users__new` (`id`, `email`, `name`, `team_id`, `profile_theme`, `profile_picture`, `auth_issuer`, `auth_subject`)
SELECT `id`, `email`, `name`, `team_id`, `profile_theme`, `profile_picture`, `auth_issuer`, `auth_subject` FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `users__new` RENAME TO `users`;
--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_lower_email` ON `users` (lower(`email`));
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_identity` ON `users` (`auth_issuer`, `auth_subject`);
--> statement-breakpoint
CREATE INDEX `idx_users_team_id` ON `users` (`team_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
