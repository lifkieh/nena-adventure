import { db } from "../db/client.js";
import { seatLedger } from "../db/schema.js";
import type { SeatReason } from "@nena/shared";

/** Tambah baris ledger (APPEND-ONLY). Panggil di dalam txImmediate. */
export function add(input: {
  scheduleId: string;
  bookingId: string | null;
  delta: number;
  reason: SeatReason;
}): void {
  db.insert(seatLedger)
    .values({
      scheduleId: input.scheduleId,
      bookingId: input.bookingId,
      delta: input.delta,
      reason: input.reason,
    })
    .run();
}
