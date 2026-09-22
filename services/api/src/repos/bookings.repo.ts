import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookings, schedules, type Booking } from "../db/schema.js";

export function insert(values: typeof bookings.$inferInsert): Booking {
  return db.insert(bookings).values(values).returning().get();
}

export function findById(id: string): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.id, id)).get();
}

/** Booking terbaru (untuk contoh preview template). undefined bila belum ada. */
export function latest(): Booking | undefined {
  return db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(1).get();
}

/** ID booking dgn status tertentu (untuk job reminder pelunasan). */
export function idsByStatus(status: string): string[] {
  return db.select({ id: bookings.id }).from(bookings).where(eq(bookings.status, status)).all().map((r) => r.id);
}

export function findByCode(code: string): Booking | undefined {
  return db.select().from(bookings).where(eq(bookings.code, code)).get();
}

/** Booking untuk tanggal keberangkatan tertentu dengan status tertentu. */
export function listByDeparture(date: string, statuses: string[]): Booking[] {
  if (statuses.length === 0) return [];
  return db
    .select({ b: bookings })
    .from(bookings)
    .innerJoin(schedules, eq(schedules.id, bookings.scheduleId))
    .where(
      and(
        eq(schedules.date, date),
        inArray(bookings.status, statuses),
      ),
    )
    .all()
    .map((r) => r.b);
}

export function findByIdempotencyKey(key: string): Booking | undefined {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.idempotencyKey, key))
    .get();
}

export function codeExists(code: string): boolean {
  return !!db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.code, code))
    .get();
}

export function update(
  id: string,
  patch: Partial<typeof bookings.$inferInsert>,
): Booking {
  return db
    .update(bookings)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(bookings.id, id))
    .returning()
    .get();
}

/** Booking dengan holdExpiresAt sudah lewat & masih menunggu_bayar. */
export function findExpiredHolds(nowIso: string): Booking[] {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "menunggu_bayar"),
        sql`${bookings.holdExpiresAt} is not null`,
        lte(bookings.holdExpiresAt, nowIso),
      ),
    )
    .all();
}

export interface BookingListFilter {
  status?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export function list(f: BookingListFilter): {
  rows: (Booking & { scheduleDate: string })[];
  total: number;
} {
  const conds = [];
  if (f.status) conds.push(eq(bookings.status, f.status));
  if (f.source) conds.push(eq(bookings.source, f.source));
  if (f.dateFrom) conds.push(gte(schedules.date, f.dateFrom));
  if (f.dateTo) conds.push(lte(schedules.date, f.dateTo));
  if (f.search) {
    const q = `%${f.search}%`;
    conds.push(
      or(
        like(bookings.code, q),
        like(bookings.customerName, q),
        like(bookings.customerPhone, q),
      ),
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const total = db
    .select({ n: sql<number>`count(*)` })
    .from(bookings)
    .innerJoin(schedules, eq(schedules.id, bookings.scheduleId))
    .where(where)
    .get();

  const rows = db
    .select({ b: bookings, scheduleDate: schedules.date })
    .from(bookings)
    .innerJoin(schedules, eq(schedules.id, bookings.scheduleId))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize)
    .all();

  return {
    rows: rows.map((r) => ({ ...r.b, scheduleDate: r.scheduleDate })),
    total: total?.n ?? 0,
  };
}
