import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { vouchers } from "../db/schema.js";

export type VoucherRow = typeof vouchers.$inferSelect;

export function insert(values: typeof vouchers.$inferInsert): VoucherRow {
  return db.insert(vouchers).values(values).returning().get();
}

export function findByCode(code: string): VoucherRow | undefined {
  return db.select().from(vouchers).where(eq(vouchers.code, code)).get();
}

export function activeForBooking(bookingId: string): VoucherRow[] {
  return db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.bookingId, bookingId), eq(vouchers.status, "issued")))
    .all();
}

export function revoke(id: string, nowIso: string): void {
  db.update(vouchers)
    .set({ status: "revoked", revokedAt: nowIso })
    .where(eq(vouchers.id, id))
    .run();
}

export function codeExists(code: string): boolean {
  return !!db
    .select({ id: vouchers.id })
    .from(vouchers)
    .where(eq(vouchers.code, code))
    .get();
}
