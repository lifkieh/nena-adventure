-- Petakan kosakata status jadwal lama -> kanonik (draft|terbit|tutup|arsip).
UPDATE `schedules` SET `status` = 'terbit' WHERE `status` = 'open';--> statement-breakpoint
UPDATE `schedules` SET `status` = 'tutup' WHERE `status` = 'closed';--> statement-breakpoint
UPDATE `schedules` SET `status` = 'arsip' WHERE `status` = 'cancelled';
