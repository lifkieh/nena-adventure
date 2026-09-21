import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookingParticipants } from "../db/schema.js";

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
    const idNumber = p.idNumber ?? null;
    db.insert(bookingParticipants)
      .values({
        bookingId,
        name: p.name,
        birthDate: p.birthDate ?? null,
        idNumber,
        idNumberLast4: idNumber ? idNumber.replace(/\s/g, "").slice(-4) : null,
        isLead: p.isLead ?? false,
      })
      .run();
  }
}
