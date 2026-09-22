import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { emailOutbox } from "../db/schema.js";

export type OutboxRow = typeof emailOutbox.$inferSelect;

export function findByIdem(bookingId: string | null, templateKey: string, stateTransition: string): OutboxRow | undefined {
  return db
    .select()
    .from(emailOutbox)
    .where(
      and(
        bookingId == null ? isNull(emailOutbox.bookingId) : eq(emailOutbox.bookingId, bookingId),
        eq(emailOutbox.templateKey, templateKey),
        eq(emailOutbox.stateTransition, stateTransition),
      ),
    )
    .get();
}

export function insert(values: typeof emailOutbox.$inferInsert): OutboxRow {
  return db.insert(emailOutbox).values(values).returning().get();
}

export function update(id: string, patch: Partial<typeof emailOutbox.$inferInsert>): OutboxRow {
  return db.update(emailOutbox).set(patch).where(eq(emailOutbox.id, id)).returning().get();
}

export function findById(id: string): OutboxRow | undefined {
  return db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).get();
}

export function list(filter: { status?: string } = {}): OutboxRow[] {
  const conds = [];
  if (filter.status) conds.push(eq(emailOutbox.status, filter.status));
  return db
    .select()
    .from(emailOutbox)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(emailOutbox.createdAt))
    .limit(200)
    .all();
}

/** Baris live yang masih boleh di-retry (queued, attempt < max). */
export function retryable(maxAttempts: number): OutboxRow[] {
  return db
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.status, "queued"), eq(emailOutbox.mode, "live"), lt(emailOutbox.attemptCount, maxAttempts)))
    .all();
}

/** Baris terakhir utk (booking, template) sejak `sinceIso` (untuk cooldown kirim manual). */
export function recentByBookingTemplate(bookingId: string, templateKey: string, sinceIso: string): OutboxRow | undefined {
  return db
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.bookingId, bookingId), eq(emailOutbox.templateKey, templateKey), sql`${emailOutbox.createdAt} >= ${sinceIso}`))
    .orderBy(desc(emailOutbox.createdAt))
    .get();
}

/** Jumlah email TERKIRIM (live) dalam `sinceIso`..sekarang (untuk rate limit per jam). */
export function sentSince(sinceIso: string): number {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(emailOutbox)
    .where(and(eq(emailOutbox.status, "sent"), sql`${emailOutbox.sentAt} >= ${sinceIso}`))
    .get();
  return r?.c ?? 0;
}
