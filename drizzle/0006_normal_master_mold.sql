ALTER TABLE `users` ADD `auth_issuer` text;--> statement-breakpoint
ALTER TABLE `users` ADD `auth_subject` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_identity` ON `users` (`auth_issuer`,`auth_subject`);
