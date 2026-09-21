import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { packageTiers, packages } from "../db/schema.js";
import { seedPackages } from "../db/seed.js";
import * as packageService from "../usecases/package/service.js";
import * as repo from "../repos/packages.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "owner", ip: null, userAgent: null };

function privateId(): string {
  return db.select().from(packages).where(eq(packages.key, "private")).get()!.id;
}
function tierCount(pkgId: string): number {
  return repo.tiersFor(pkgId).length;
}

describe("dedupe & idempotensi tier", () => {
  beforeEach(() => {
    db.delete(packageTiers).run();
    db.delete(packages).run();
  });

  it("seeder dijalankan dua kali TIDAK menambah baris tier", () => {
    seedPackages();
    const first = tierCount(privateId());
    expect(first).toBe(4);
    seedPackages(); // idempoten via unique (package_id,min_pax,max_pax)
    expect(tierCount(privateId())).toBe(first);
  });

  it("unique constraint menolak tier rentang ganda", () => {
    seedPackages();
    const pid = privateId();
    expect(() =>
      db.insert(packageTiers).values({ packageId: pid, minPax: 1, maxPax: 6, price: 9 }).run(),
    ).toThrow(/UNIQUE|constraint/i);
  });

  it("perubahan harga tier mengenai TEPAT satu baris", () => {
    seedPackages();
    const pid = privateId();
    const before = repo.tiersFor(pid);
    const target = before.find((t) => t.minPax === 7 && t.maxPax === 9)!;
    packageService.updateTier(target.id, { minPax: 7, maxPax: 9, price: 5999999 }, CTX);

    const after = repo.tiersFor(pid);
    expect(after.length).toBe(before.length); // tidak ada baris tambah/hilang
    const changed = after.filter((t) => t.price !== before.find((b) => b.id === t.id)!.price);
    expect(changed.length).toBe(1);
    expect(changed[0]!.id).toBe(target.id);
    expect(changed[0]!.price).toBe(5999999);
  });
});
