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
