import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { schedules, seatLedger } from "../db/schema.js";

export type ScheduleRow = typeof schedules.$inferSelect;

export function findById(id: string): ScheduleRow | undefined {
  return db.select().from(schedules).where(eq(schedules.id, id)).get();
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
    .where(and(eq(schedules.status, "open"), gte(schedules.date, todayIso)))
    .orderBy(schedules.date)
    .all();
}
