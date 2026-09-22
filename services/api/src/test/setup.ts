/**
 * Setup vitest: DB terisolasi per worker (test-<pid>.db), migrasi segar.
 * Env di-set SEBELUM import apa pun yang membaca env/DB (pakai dynamic import).
 */
process.env.DB_PATH = `services/api/data/test-${process.pid}.db`;
process.env.SESSION_SECRET ??= "test-secret-abcdef-1234567890";
process.env.ENCRYPTION_KEY ??= "0".repeat(64);
process.env.NODE_ENV = "test";

const { rmSync, mkdirSync } = await import("node:fs");
const { dirname } = await import("node:path");
const { default: Database } = await import("better-sqlite3");
const { drizzle } = await import("drizzle-orm/better-sqlite3");
const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
const { resolveDbPath, migrationsFolder } = await import("../db/paths.js");

const dbPath = resolveDbPath();
for (const ext of ["", "-wal", "-shm"]) {
  rmSync(dbPath + ext, { force: true });
}
mkdirSync(dirname(dbPath), { recursive: true });

const sq = new Database(dbPath);
sq.pragma("foreign_keys = ON");
migrate(drizzle(sq), { migrationsFolder: migrationsFolder() });
sq.close();

export {};
