ALTER TABLE `media` ADD `scope` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedules` ADD `available_packages` text;