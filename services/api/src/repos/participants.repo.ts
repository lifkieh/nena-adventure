import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookingParticipants } from "../db/schema.js";
import { encryptPII } from "../lib/crypto.js";

export function listByBooking(bookingId: string) {
  return db
    .select()
    .from(bookingParticipants)
    .where(eq(bookingParticipants.bookingId, bookingId))
    .all();
}

export interface ParticipantInput {
  name: string;
  birthDate?: string | null;
  idNumber?: string | null;
  isLead?: boolean;
}

export function addMany(bookingId: string, list: ParticipantInput[]): void {
  for (const p of list) {
    const idNumberPlain = p.idNumber ?? null;
    // NIK & tanggal lahir DIENKRIPSI at-rest; last4 tetap plaintext untuk tampilan.
    db.insert(bookingParticipants)
      .values({
        bookingId,
        name: p.name,
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
