import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions } from "../db/schema.js";

export type SessionRow = typeof sessions.$inferSelect;

export function create(input: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  ip?: string | null;
  userAgent?: string | null;
}): SessionRow {
  const now = new Date().toISOString();
  return db
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      lastSeenAt: now,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    })
    .returning()
    .get();
}

export function findByTokenHash(tokenHash: string): SessionRow | undefined {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .get();
}

export function touchLastSeen(id: string, iso: string): void {
  db.update(sessions).set({ lastSeenAt: iso }).where(eq(sessions.id, id)).run();
}

export function deleteById(id: string): void {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function deleteByTokenHash(tokenHash: string): void {
  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
}

export function deleteAllForUser(userId: string): void {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

export function deleteOthersForUser(userId: string, keepSessionId: string): void {
  db.delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)))
    .run();
}
