import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookingParticipants, bookings, packages, schedules } from "../db/schema.js";
import { encryptPII } from "../lib/crypto.js";

export function listByBooking(bookingId: string) {
  return db
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId))
    .all();
}

export function findById(id: string) {
  return db
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.id, id))
    .get();
}

export interface ParticipantInput {
  name: string;
  phone?: string | null;
  birthDate?: string | null;
  idNumber?: string | null;
  isLead?: boolean;
}

export function addMany(bookingId: string, list: ParticipantInput[]): void {
  for (const p of list) {
    const idNumberPlain = p.idNumber ?? null;
    // NIK & tanggal lahir DIENKRIPSI at-rest; last4 tetap plaintext untuk tampilan.
    // isLead TIDAK ditebak di sini — pemanggil menentukan berdasarkan kecocokan nama.
    db.insert(bookingParticipants)
      .values({
        bookingId,
        name: p.name,
        phone: p.phone ?? null,
        birthDate: encryptPII(p.birthDate ?? null),
        idNumber: encryptPII(idNumberPlain),
        idNumberLast4: idNumberPlain
          ? idNumberPlain.replace(/\s/g, "").slice(-4)
          : null,
        isLead: p.isLead ?? false,
      })
      .run();
  }
}

/** Ubah nomor peserta (dipakai admin panel). phone sudah ternormalisasi 62… oleh pemanggil. */
export function updatePhone(id: string, bookingId: string, phone: string | null): void {
  db.update(bookingParticipants)
    .set({ phone })
    .where(and(eq(bookingParticipants.id, id), eq(bookingParticipants.bookingId, bookingId)))
    .run();
}

export interface RosterRow {
  participantId: string;
  name: string;
  phone: string | null;
  isLead: boolean;
  packageKey: string;
  packageName: string | null;
  bookingCode: string;
  bookingStatus: string;
  scheduleId: string;
  scheduleDate: string;
}

/** Peserta lintas booking untuk daftar keberangkatan (kelompok per tanggal+paket).
 *  Filter opsional: scheduleId, dateFrom (>=), status. */
export function listRoster(opts: {
  scheduleId?: string;
  dateFrom?: string;
  statuses?: string[];
} = {}): RosterRow[] {
  const conds = [];
  if (opts.scheduleId) conds.push(eq(bookings.scheduleId, opts.scheduleId));
  if (opts.dateFrom) conds.push(gte(schedules.date, opts.dateFrom));
  if (opts.statuses && opts.statuses.length) conds.push(inArray(bookings.status, opts.statuses));

  const rows = db
    .select({
      participantId: bookingParticipants.id,
      name: bookingParticipants.name,
      phone: bookingParticipants.phone,
      isLead: bookingParticipants.isLead,
      packageKey: bookings.packageType,
      packageName: packages.name,
      bookingCode: bookings.code,
      bookingStatus: bookings.status,
      scheduleId: bookings.scheduleId,
      scheduleDate: schedules.date,
    })
    .from(bookingParticipants)
    .innerJoin(bookings, eq(bookings.id, bookingParticipants.bookingId))
    .innerJoin(schedules, eq(schedules.id, bookings.scheduleId))
    .leftJoin(packages, eq(packages.key, bookings.packageType))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(schedules.date), asc(bookings.packageType), asc(bookings.code), asc(bookingParticipants.createdAt))
    .all();
  return rows;
}
