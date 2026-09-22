import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Database from "better-sqlite3";
import type { MigrationStatus } from "@nena/shared";
import { migrationsFolder } from "./paths.js";

/** Jumlah migrasi yang diharapkan menurut journal drizzle. */
function expectedCount(): number {
  const journal = resolve(migrationsFolder(), "meta", "_journal.json");
  if (!existsSync(journal)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(journal, "utf8")) as {
      entries?: unknown[];
    };
    return Array.isArray(parsed.entries) ? parsed.entries.length : 0;
  } catch {
    return 0;
  }
}

/** Jumlah migrasi yang sudah diterapkan (tabel bawaan drizzle). */
function appliedCount(conn: Database.Database): number {
  const row = conn
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
    )
    .get() as { name?: string } | undefined;
  if (!row) return 0;
  const count = conn
    .prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations")
    .get() as { n: number };
  return count.n;
}

export function getMigrationStatus(conn: Database.Database): MigrationStatus {
  const expected = expectedCount();
  const applied = appliedCount(conn);
  const status: MigrationStatus["status"] =
    expected === 0 ? "unknown" : applied >= expected ? "ok" : "pending";
  return { applied, expected, status };
}
