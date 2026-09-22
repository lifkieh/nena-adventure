import type Database from "better-sqlite3";
import { normalizeWa } from "@nena/shared";

/** Lempar bila kehilangan baris melebihi yang diniatkan (pengaman migrasi destruktif). */
export function assertLossWithinIntent(
  label: string,
  before: number,
  after: number,
  intendedLoss: number,
): void {
  const actualLoss = before - after;
  if (actualLoss > intendedLoss) {
    throw new Error(
      `Migrasi "${label}" dihentikan: kehilangan ${actualLoss} baris melebihi yang diniatkan (${intendedLoss}). ` +
        `sebelum=${before} sesudah=${after}.`,
    );
  }
}

/**
 * Dedupe package_tiers dengan pengaman: catat jumlah baris sebelum & sesudah,
 * dan BERHENTI bila kehilangan melebihi jumlah duplikat yang diniatkan.
 * Idempoten & aman dipanggil sebelum migrasi drizzle (skip bila tabel belum ada).
 * Mengembalikan statistik untuk logging/test.
 */
export function guardedDedupeTiers(sqlite: Database.Database): {
  skipped: boolean;
  before: number;
  after: number;
  intendedLoss: number;
} {
  const tbl = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='package_tiers'")
    .get();
  if (!tbl) return { skipped: true, before: 0, after: 0, intendedLoss: 0 };

  const before = (sqlite.prepare("SELECT COUNT(*) c FROM package_tiers").get() as { c: number }).c;
  const distinct = (
    sqlite
      .prepare("SELECT COUNT(*) c FROM (SELECT 1 FROM package_tiers GROUP BY package_id, min_pax, max_pax)")
      .get() as { c: number }
  ).c;
  const intendedLoss = before - distinct;
  if (intendedLoss <= 0) return { skipped: false, before, after: before, intendedLoss: 0 };

  sqlite
    .prepare(
      "DELETE FROM package_tiers WHERE id NOT IN (SELECT MIN(id) FROM package_tiers GROUP BY package_id, min_pax, max_pax)",
    )
    .run();
  const after = (sqlite.prepare("SELECT COUNT(*) c FROM package_tiers").get() as { c: number }).c;

  console.log(
    `[migrasi] dedupe package_tiers: sebelum=${before} sesudah=${after} (buang ${before - after}, niat ${intendedLoss})`,
  );
  assertLossWithinIntent("dedupe package_tiers", before, after, intendedLoss);
  return { skipped: false, before, after, intendedLoss };
}

/**
 * Normalisasi nomor HP peserta ke format 62… (idempoten — normalizeWa("62..")="62..").
 * Dipanggil SESUDAH migrasi. Aman dipanggil berulang. Skip bila kolom belum ada.
 */
export function normalizeParticipantPhones(sqlite: Database.Database): number {
  const col = sqlite
    .prepare("SELECT 1 FROM pragma_table_info('booking_participants') WHERE name='phone'")
    .get();
  if (!col) return 0;
  const rows = sqlite
    .prepare("SELECT id, phone FROM booking_participants WHERE phone IS NOT NULL AND phone <> ''")
    .all() as { id: string; phone: string }[];
  const upd = sqlite.prepare("UPDATE booking_participants SET phone = ? WHERE id = ?");
  let changed = 0;
  for (const r of rows) {
    const norm = normalizeWa(r.phone);
    if (norm !== r.phone) { upd.run(norm, r.id); changed++; }
  }
  if (changed > 0) console.log(`[migrasi] normalisasi nomor HP peserta: ${changed} baris`);
  return changed;
}
