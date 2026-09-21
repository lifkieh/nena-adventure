import { sqliteConn, db } from "../db/client.js";
import { bookingParticipants } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { record } from "./audit.js";

/**
 * Hapus NIK & tanggal lahir (BUKAN barisnya) 90 hari setelah keberangkatan.
 * Isi piiPurgedAt. Idempoten (hanya yang belum di-purge). Catat di audit.
 * idNumberLast4 tetap dipertahankan untuk tampilan.
 */
export function purgeOverduePii(now: Date = new Date()): number {
  const cutoffDate = new Date(now);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 90);
  const cutoff = cutoffDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = sqliteConn
    .prepare(
      `SELECT bp.id AS id, bp.booking_id AS bookingId
       FROM booking_participants bp
       JOIN bookings b ON b.id = bp.booking_id
       JOIN schedules s ON s.id = b.schedule_id
       WHERE s.date <= ? AND bp.pii_purged_at IS NULL`,
    )
    .all(cutoff) as { id: string; bookingId: string }[];

  const nowIso = now.toISOString();
  for (const r of rows) {
    db.update(bookingParticipants)
      .set({ idNumber: null, birthDate: null, piiPurgedAt: nowIso })
      .where(eq(bookingParticipants.id, r.id))
      .run();
  }

  if (rows.length > 0) {
    record(
      { userId: null, role: "system", ip: null, userAgent: null },
      {
        action: "pii_purged",
        entity: "participant",
        data: { count: rows.length, cutoff },
      },
    );
  }
  return rows.length;
}
