CREATE TABLE `package_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`min_pax` integer NOT NULL,
	`max_pax` integer NOT NULL,
	`price` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_package_tiers_pkg` ON `package_tiers` (`package_id`);--> statement-breakpoint
CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`prices` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_packages_key` ON `packages` (`key`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `access_token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bookings_idempotency` ON `bookings` (`idempotency_key`);