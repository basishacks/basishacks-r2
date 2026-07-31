CREATE TABLE `awards` (
	`namespace` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`color` text DEFAULT 'gold' NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `awards` (`namespace`, `name`, `description`, `icon`, `color`) VALUES
	('perfect_score', 'Flawless', 'Achieve a perfect score from all judges.', 'i-lucide-gem', 'gold');
