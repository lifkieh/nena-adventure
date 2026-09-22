ALTER TABLE `booking_participants` ADD `phone` text;
--> statement-breakpoint
-- Backfill: tandai peserta PERTAMA tiap booking sebagai lead (perbaiki bug isLead selalu false).
UPDATE `booking_participants` SET `is_lead` = 1
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT `id`, ROW_NUMBER() OVER (
      PARTITION BY `booking_id` ORDER BY `created_at` ASC, `id` ASC
    ) AS rn
    FROM `booking_participants`
  ) WHERE rn = 1
);
--> statement-breakpoint
-- Backfill: isi phone lead dari bookings.customer_phone (mentah; dinormalisasi saat render/edit).
UPDATE `booking_participants` SET `phone` = (
  SELECT `customer_phone` FROM `bookings` WHERE `bookings`.`id` = `booking_participants`.`booking_id`
) WHERE `is_lead` = 1 AND (`phone` IS NULL OR `phone` = '');
