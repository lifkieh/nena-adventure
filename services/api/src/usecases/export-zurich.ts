import { AppError } from "../lib/errors.js";
import { decryptPII } from "../lib/crypto.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import * as participantsRepo from "../repos/participants.repo.js";
import { record, type ActorContext } from "./audit.js";

// Status yang dianggap "akan berangkat" -> wajib terdaftar asuransi.
const EXPORT_STATUSES = ["siap_jalan", "menunggu_pelunasan", "selesai"];

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

/**
 * Export CSV Zurich untuk satu tanggal keberangkatan. UTF-8 + BOM.
 * Menolak bila ada peserta dengan data tidak lengkap — sebut booking-nya.
 */
export function exportZurich(
  date: string,
  ctx: ActorContext,
): { csv: string; rowCount: number } {
  const bookings = bookingsRepo.listByDeparture(date, EXPORT_STATUSES);
  const rows: string[][] = [];
  const incomplete: string[] = [];

  for (const b of bookings) {
    const parts = participantsRepo.listByBooking(b.id);
    for (const p of parts) {
      const name = (p.name ?? "").trim();
      const birth = (decryptPII(p.birthDate) ?? "").trim();
      const idnum = p.piiPurgedAt ? "" : (decryptPII(p.idNumber) ?? "").trim();
      if (!name || !birth || !idnum) {
        if (!incomplete.includes(b.code)) incomplete.push(b.code);
        continue;
      }
      rows.push([name, birth, idnum, b.code, date]);
    }
  }

  if (incomplete.length > 0) {
    throw AppError.validation(
      `Data peserta belum lengkap pada booking: ${incomplete.join(", ")}. Lengkapi dulu sebelum export.`,
    );
  }

  const header = [
    "Nama Lengkap",
    "Tanggal Lahir",
    "Nomor Identitas",
    "Kode Booking",
    "Tanggal Keberangkatan",
  ];
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  const BOM = String.fromCharCode(0xfeff);
  const csv = BOM + lines.join("\r\n") + "\r\n"; // BOM + CRLF

  record(ctx, {
    action: "export_zurich",
    entity: "export",
    entityId: date,
    data: { date, rowCount: rows.length },
  });
  return { csv, rowCount: rows.length };
}
