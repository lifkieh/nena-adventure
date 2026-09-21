import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type NewUser, type User } from "../db/schema.js";

export function findByEmail(email: string): User | undefined {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function findById(id: string): User | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function listAll(): User[] {
  return db.select().from(users).all();
}

export function create(input: NewUser): User {
  return db.insert(users).values(input).returning().get();
}

export function updateRole(id: string, role: string): User | undefined {
  return db
    .update(users)
    .set({ role, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning()
    .get();
}

export function setActive(id: string, active: boolean): User | undefined {
  return db
    .update(users)
    .set({ active, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning()
    .get();
}

export function updatePasswordHash(id: string, passwordHash: string): void {
  db.update(users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .run();
}

/** Jumlah owner yang masih aktif — untuk menjaga owner terakhir. */
export function countActiveOwners(): number {
  const rows = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.active, true)))
    .all();
  return rows.length;
}
