-- Dedupe package_tiers: simpan satu baris per (package_id, min_pax, max_pax),
-- yaitu id paling awal (ULID lexicographic = terlama). Sisanya dibuang.
DELETE FROM package_tiers
WHERE id NOT IN (
  SELECT MIN(id) FROM package_tiers GROUP BY package_id, min_pax, max_pax
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_package_tiers_range` ON `package_tiers` (`package_id`,`min_pax`,`max_pax`);
