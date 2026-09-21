#!/usr/bin/env node
/**
 * Backup SQLite konsisten (online, aman saat server jalan) memakai API .backup().
 *   node scripts/backup-db.mjs                 # backup DB default (services/api/data/nena.db)
 *   DB_PATH=... node scripts/backup-db.mjs      # backup DB lain
 * Hasil: services/api/data/backups/nena-YYYYMMDD-HHMMSS.db
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(ROOT, process.env.DB_PATH || "services/api/data/nena.db");
if (!existsSync(src)) { console.error("DB tidak ditemukan:", src); process.exit(1); }

// YYYYMMDD-HHMMSS (buang milidetik & zona; pisahkan tanggal-jam dgn '-').
const stamp = new Date().toISOString().replace(/\.\d+Z$/, "").replace(/[-:]/g, "").replace("T", "-");
const dir = resolve(ROOT, "services/api/data/backups");
mkdirSync(dir, { recursive: true });
const dest = resolve(dir, basename(src, ".db") + "-" + stamp + ".db");

const db = new Database(src, { readonly: true });
await db.backup(dest);
db.close();
console.log("Backup selesai ->", dest);
