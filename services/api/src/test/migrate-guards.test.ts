import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { guardedDedupeTiers, assertLossWithinIntent } from "../db/migrate-guards.js";

/** DB minimal TANPA unique index -> bisa menyimpan duplikat untuk uji dedupe. */
function makeDbWithDupes(): Database.Database {
  const db = new Database(":memory:");
  db.exec(
    "CREATE TABLE package_tiers (id TEXT PRIMARY KEY, package_id TEXT, min_pax INT, max_pax INT, price INT)",
  );
  const ins = db.prepare("INSERT INTO package_tiers VALUES (?,?,?,?,?)");
  // 4 rentang unik + 2 duplikat (rentang sama, id beda).
  ins.run("a1", "p", 1, 6, 4500000);
  ins.run("a2", "p", 7, 9, 5500000);
  ins.run("a3", "p", 10, 11, 6300000);
  ins.run("a4", "p", 12, 14, 7300000);
  ins.run("d1", "p", 1, 6, 4500000); // dup
  ins.run("d2", "p", 7, 9, 9999999); // dup rentang, harga beda
  return db;
}

describe("guardedDedupeTiers (pengaman migrasi destruktif)", () => {
  it("membuang tepat jumlah duplikat, mencatat sebelum/sesudah", () => {
    const db = makeDbWithDupes();
    const stats = guardedDedupeTiers(db);
    expect(stats.before).toBe(6);
    expect(stats.after).toBe(4);
    expect(stats.intendedLoss).toBe(2);
    // Baris tersimpan = MIN(id) per rentang (id lexicographic terkecil).
    const kept = db.prepare("SELECT id FROM package_tiers ORDER BY id").all().map((r: any) => r.id);
    expect(kept).toEqual(["a1", "a2", "a3", "a4"]);
    db.close();
  });

  it("idempoten: dijalankan lagi tak membuang apa pun", () => {
    const db = makeDbWithDupes();
    guardedDedupeTiers(db);
    const second = guardedDedupeTiers(db);
    expect(second.intendedLoss).toBe(0);
    expect(second.after).toBe(4);
    db.close();
  });

  it("tabel belum ada -> skip aman", () => {
    const db = new Database(":memory:");
    expect(guardedDedupeTiers(db).skipped).toBe(true);
    db.close();
  });

  it("BERHENTI bila kehilangan melebihi yang diniatkan", () => {
    expect(() => assertLossWithinIntent("uji", 10, 3, 2)).toThrow(/melebihi yang diniatkan/i);
    expect(() => assertLossWithinIntent("uji", 10, 8, 2)).not.toThrow();
  });
});
