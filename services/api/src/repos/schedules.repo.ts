import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { scheduleStatusSchema } from "@nena/shared";
import { db } from "../db/client.js";
import { bookings, schedules, seatLedger } from "../db/schema.js";

export type ScheduleRow = typeof schedules.$inferSelect;

/** Guard lapisan repo: tolak status di luar enum kanonik. */
function assertStatus(status: string | undefined | null): void {
  if (status == null) return;
  if (!scheduleStatusSchema.safeParse(status).success) {
    throw new Error(`Status jadwal tidak valid: "${status}"`);
  }
}

export function findById(id: string): ScheduleRow | undefined {
  return db.select().from(schedules).where(eq(schedules.id, id)).get();
}

export function insert(values: typeof schedules.$inferInsert): ScheduleRow {
  assertStatus(values.status);
  return db.insert(schedules).values(values).returning().get();
}

export function update(
  id: string,
  patch: Partial<typeof schedules.$inferInsert>,
): ScheduleRow {
  assertStatus(patch.status);
  return db
    .update(schedules)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(schedules.id, id))
    .returning()
    .get();
}

export function remove(id: string): void {
  db.delete(schedules).where(eq(schedules.id, id)).run();
}

/** Kursi terpakai = SUM(delta) (>=0), independen dari kolom kapasitas. */
export function usedSeats(scheduleId: string): number {
  const row = db
    .select({ used: sql<number>`coalesce(sum(${seatLedger.delta}), 0)` })
    .from(seatLedger)
    .where(eq(seatLedger.scheduleId, scheduleId))
    .get();
  return row?.used ?? 0;
}

/** Jumlah booking AKTIF (bukan batal/kadaluarsa) di jadwal ini. */
export function activeBookingCount(scheduleId: string): number {
  const rows = db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.scheduleId, scheduleId),
        sql`${bookings.status} not in ('batal','kadaluarsa')`,
      ),
    )
    .all();
  return rows.length;
}

export function existsByDate(date: string): boolean {
  return !!db.select({ id: schedules.id }).from(schedules).where(eq(schedules.date, date)).get();
}

export function listAdmin(filter: {
  monthFrom?: string;
  monthTo?: string;
  status?: string;
}): ScheduleRow[] {
  const conds = [];
  if (filter.monthFrom) conds.push(gte(schedules.date, filter.monthFrom));
  if (filter.monthTo) conds.push(lte(schedules.date, filter.monthTo));
  if (filter.status) conds.push(eq(schedules.status, filter.status));
  const where = conds.length ? and(...conds) : undefined;
  return db.select().from(schedules).where(where).orderBy(asc(schedules.date)).all();
}

export function findManyByIds(ids: string[]): ScheduleRow[] {
  if (ids.length === 0) return [];
  return db.select().from(schedules).where(inArray(schedules.id, ids)).all();
}

/** Sisa kursi = capacity - SUM(delta). TIDAK ada counter. */
export function remainingSeats(scheduleId: string): number {
  const sched = findById(scheduleId);
  if (!sched) return 0;
  const row = db
    .select({ used: sql<number>`coalesce(sum(${seatLedger.delta}), 0)` })
    .from(seatLedger)
    .where(eq(seatLedger.scheduleId, scheduleId))
    .get();
  return sched.capacity - (row?.used ?? 0);
}

/** Jadwal open & belum lewat (tanggal >= hari ini), diurut tanggal. */
export function listOpenUpcoming(todayIso: string): ScheduleRow[] {
  return db
    .select()
    .from(schedules)
    .where(and(eq(schedules.status, "terbit"), gte(schedules.date, todayIso)))
    .orderBy(schedules.date)
    .all();
}
