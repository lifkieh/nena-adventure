-- Perbaiki pemesan (lead) yang salah ditebak oleh backfill 0010 (urutan baris).
-- 1) Reset semua penanda lead.
UPDATE `booking_participants` SET `is_lead` = 0;
--> statement-breakpoint
-- 2) Tandai lead HANYA bila nama peserta cocok dengan bookings.customer_name.
--    Satu lead per booking (MIN(id) bila ada beberapa yang cocok); kalau tak ada
--    yang cocok, tak ada yang ditandai (subquery menghasilkan NULL, diabaikan IN).
UPDATE `booking_participants` SET `is_lead` = 1
WHERE `id` IN (
  SELECT (
    SELECT MIN(p2.id) FROM `booking_participants` p2
    WHERE p2.booking_id = b.id
      AND LOWER(TRIM(p2.name)) = LOWER(TRIM(b.customer_name))
  )
  FROM `bookings` b
);
--> statement-breakpoint
-- 3) Kosongkan phone yang salah tempel: peserta BUKAN lead tapi phone-nya sama
--    persis dengan customer_phone booking (artinya hasil auto-paste, bukan input).
UPDATE `booking_participants` SET `phone` = NULL
WHERE `is_lead` = 0
  AND `phone` IS NOT NULL
  AND `phone` = (SELECT `customer_phone` FROM `bookings` WHERE `bookings`.`id` = `booking_participants`.`booking_id`);
