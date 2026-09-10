CREATE TABLE `basis_auth_sessions` (
    `session_id` text PRIMARY KEY NOT NULL,
    `user_id` integer NOT NULL,
    `encrypted_tokens` text NOT NULL,
    `expires_at` integer NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_basis_auth_sessions_user_id` ON `basis_auth_sessions` (`user_id`);
