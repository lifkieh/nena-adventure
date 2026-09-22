import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookings, payments, schedules } from "../db/schema.js";

export type PaymentRow = typeof payments.$inferSelect;

export function insert(values: typeof payments.$inferInsert): PaymentRow {
  return db.insert(payments).values(values).returning().get();
}

/** Total uang masuk-bersih booking = SUM(amount) baris VERIFIED (refund negatif). */
export function sumVerified(bookingId: string): number {
  const r = db
    .select({ s: sql<number>`coalesce(sum(${payments.amount}),0)` })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.status, "verified")))
    .get();
  return r?.s ?? 0;
}

export function findById(id: string): PaymentRow | undefined {
  return db.select().from(payments).where(eq(payments.id, id)).get();
}

export function listByBooking(bookingId: string): PaymentRow[] {
  return db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt))
    .all();
}

export function update(
  id: string,
  patch: Partial<typeof payments.$inferInsert>,
): PaymentRow {
  return db.update(payments).set(patch).where(eq(payments.id, id)).returning().get();
}

/** Antrian verifikasi: payment status pending + info booking. */
export function verificationQueue(): {
  payment: PaymentRow;
  bookingCode: string;
  customerName: string;
  scheduleDate: string;
}[] {
  const rows = db
    .select({
      payment: payments,
      bookingCode: bookings.code,
      customerName: bookings.customerName,
      scheduleDate: schedules.date,
    })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .innerJoin(schedules, eq(schedules.id, bookings.scheduleId))
    // Hanya booking AKTIF: batal/kadaluarsa/selesai tidak boleh muncul di antrean.
    .where(and(eq(payments.status, "pending"), notInArray(bookings.status, ["batal", "kadaluarsa", "selesai"])))
    .orderBy(desc(payments.createdAt))
    .all();
  return rows;
}
