import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "../env.js";
import { migrationsFolder } from "./paths.js";
import { guardedDedupeTiers, normalizeParticipantPhones } from "./migrate-guards.js";

/** Terapkan semua migrasi SQL yang belum dijalankan. */
function main(): void {
  mkdirSync(dirname(env.dbPath), { recursive: true });
  const sqlite = new Database(env.dbPath);
  sqlite.pragma("foreign_keys = ON");
  // Pengaman destruktif: dedupe tier ter-catat & ter-batasi SEBELUM index unik dibuat.
  guardedDedupeTiers(sqlite);
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: migrationsFolder() });
  // Sesudah migrasi: normalisasi nomor HP peserta lama ke 62… (idempoten).
  normalizeParticipantPhones(sqlite);
  sqlite.close();
  console.log(`Migrasi selesai. DB: ${env.dbPath}`);
}

main();
