import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { packageTiers, packages } from "../db/schema.js";

export interface PackageWithPrices {
  id: string;
  key: string;
  name: string;
  prices: Record<string, number>;
  active: boolean;
}

export function getByKey(key: string): PackageWithPrices | undefined {
  const row = db.select().from(packages).where(eq(packages.key, key)).get();
  if (!row) return undefined;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    prices: JSON.parse(row.prices) as Record<string, number>,
    active: row.active,
  };
}

export function tiersFor(packageId: string) {
  return db
    .select()
    .from(packageTiers)
    .where(eq(packageTiers.packageId, packageId))
    .orderBy(asc(packageTiers.minPax))
    .all();
}

export function listAll() {
  return db.select().from(packages).orderBy(asc(packages.key)).all();
}

export function findById(id: string) {
  return db.select().from(packages).where(eq(packages.id, id)).get();
}

export function create(input: { key: string; name: string; prices: Record<string, number>; active: boolean }) {
  return db
    .insert(packages)
    .values({ key: input.key, name: input.name, prices: JSON.stringify(input.prices), active: input.active })
    .returning()
    .get();
}

export function update(
  id: string,
  input: { name: string; prices: Record<string, number>; active: boolean },
) {
  return db
    .update(packages)
    .set({ name: input.name, prices: JSON.stringify(input.prices), active: input.active })
    .where(eq(packages.id, id))
    .returning()
    .get();
}

export function remove(id: string): void {
  db.delete(packages).where(eq(packages.id, id)).run();
}

export function addTier(packageId: string, t: { minPax: number; maxPax: number; price: number }) {
  return db.insert(packageTiers).values({ packageId, ...t }).returning().get();
}

export function updateTier(id: string, t: { minPax: number; maxPax: number; price: number }) {
  return db.update(packageTiers).set(t).where(eq(packageTiers.id, id)).returning().get();
}

export function removeTier(id: string): void {
  db.delete(packageTiers).where(eq(packageTiers.id, id)).run();
}

export function findTierById(id: string) {
  return db.select().from(packageTiers).where(eq(packageTiers.id, id)).get();
}
