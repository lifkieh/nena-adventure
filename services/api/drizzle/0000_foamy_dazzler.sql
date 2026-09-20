CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_audit_entity` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `ix_audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `boats` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`capacity` integer DEFAULT 24 NOT NULL,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`name` text NOT NULL,
	`birth_date` text,
	`id_number` text,
	`id_number_last4` text,
	`pii_purged_at` text,
	`is_lead` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_participants_booking` ON `booking_participants` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`schedule_id` text NOT NULL,
	`package_type` text NOT NULL,
	`status` text DEFAULT 'baru_masuk' NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_email` text NOT NULL,
	`meeting_point` text,
	`pax` integer DEFAULT 1 NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`service_fee` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`payment_scheme` text DEFAULT 'lunas' NOT NULL,
	`promo_id` text,
	`refund_amount` integer DEFAULT 0 NOT NULL,
	`price_override_reason` text,
	`cancel_reason` text,
	`cancelled_by` text,
	`created_by_user_id` text,
	`notes` text,
	`hold_expires_at` text,
	`balance_due_at` text,
	`status_changed_at` text,
	`confirmed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bookings_code` ON `bookings` (`code`);--> statement-breakpoint
CREATE INDEX `ix_bookings_schedule` ON `bookings` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ix_bookings_status` ON `bookings` (`status`);--> statement-breakpoint
CREATE TABLE `content_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`draft_version_id` text,
	`published_version_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_content_sections_key` ON `content_sections` (`key`);--> statement-breakpoint
CREATE TABLE `content_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`body` text NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `content_sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_content_versions_section` ON `content_versions` (`section_id`);--> statement-breakpoint
CREATE TABLE `crew` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`role` text DEFAULT 'kapten' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text,
	`path` text NOT NULL,
	`sha256` text,
	`uploaded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_media_sha` ON `media` (`sha256`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`method` text NOT NULL,
	`kind` text DEFAULT 'full' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`provider_ref` text,
	`proof_media_id` text,
	`reference` text,
	`paid_at` text,
	`verified_by` text,
	`verified_at` text,
	`rejected_reason` text,
	`rejected_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_payments_booking` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE TABLE `pickups` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`booking_id` text,
	`location` text NOT NULL,
	`address` text,
	`time` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_pickups_schedule` ON `pickups` (`schedule_id`);--> statement-breakpoint
CREATE TABLE `promos` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`type` text DEFAULT 'percent' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`min_pax` integer DEFAULT 1 NOT NULL,
	`valid_from` text,
	`valid_until` text,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_promos_code` ON `promos` (`code`);--> statement-breakpoint
CREATE TABLE `schedule_crew` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`crew_id` text NOT NULL,
	`role` text DEFAULT 'crew' NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`crew_id`) REFERENCES `crew`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_schedule_crew` ON `schedule_crew` (`schedule_id`,`crew_id`);--> statement-breakpoint
CREATE INDEX `ix_schedule_crew_sched` ON `schedule_crew` (`schedule_id`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`boat_id` text,
	`capacity` integer DEFAULT 24 NOT NULL,
	`threshold` integer DEFAULT 6 NOT NULL,
	`departure_time` text,
	`meeting_point` text,
	`status` text DEFAULT 'open' NOT NULL,
	`public_note` text,
	`closed_reason` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`boat_id`) REFERENCES `boats`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_schedules_date` ON `schedules` (`date`);--> statement-breakpoint
CREATE TABLE `seat_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`booking_id` text,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ix_seat_ledger_schedule` ON `seat_ledger` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ix_seat_ledger_booking` ON `seat_ledger` (`booking_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sessions_token` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `ix_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`pdf_media_id` text,
	`issued_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_vouchers_code` ON `vouchers` (`code`);