import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { promos } from "../db/schema.js";

export type PromoRow = typeof promos.$inferSelect;

export function listAll(): PromoRow[] {
  return db.select().from(promos).orderBy(desc(promos.createdAt)).all();
}
export function findById(id: string): PromoRow | undefined {
  return db.select().from(promos).where(eq(promos.id, id)).get();
}
export function findByCode(code: string): PromoRow | undefined {
  return db.select().from(promos).where(eq(promos.code, code)).get();
}
export function insert(values: typeof promos.$inferInsert): PromoRow {
  return db.insert(promos).values(values).returning().get();
}
export function update(id: string, patch: Partial<typeof promos.$inferInsert>): PromoRow {
  return db.update(promos).set(patch).where(eq(promos.id, id)).returning().get();
}
export function incrementUsed(id: string): void {
  db.update(promos).set({ usedCount: sql`${promos.usedCount} + 1` }).where(eq(promos.id, id)).run();
}
