CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text,
	`template_key` text NOT NULL,
	`state_transition` text NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`body_html` text NOT NULL,
	`body_text` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`mode` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_outbox_idem` ON `email_outbox` (`booking_id`,`template_key`,`state_transition`);--> statement-breakpoint
CREATE INDEX `ix_outbox_status` ON `email_outbox` (`status`);