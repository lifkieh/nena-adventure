#!/usr/bin/env node
/**
 * Restore SQLite dari file backup. WAJIB server berhenti dulu.
 *   node scripts/restore-db.mjs <file-backup> --yes
 * DB tujuan = DB_PATH atau services/api/data/nena.db. DB lama disalin ke .bak dulu.
 */
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("Pakai: node scripts/restore-db.mjs <file-backup> --yes"); process.exit(1); }
if (!args.includes("--yes")) { console.error("Tambah --yes untuk konfirmasi menimpa DB."); process.exit(2); }

const backup = resolve(ROOT, file);
if (!existsSync(backup)) { console.error("File backup tidak ada:", backup); process.exit(1); }
const dest = resolve(ROOT, process.env.DB_PATH || "services/api/data/nena.db");

if (existsSync(dest)) {
  const bak = dest + ".pre-restore.bak";
  copyFileSync(dest, bak);
  console.log("DB lama diamankan ke", bak);
}
// Bersihkan sidecar WAL/SHM agar tak bentrok dengan file yang dipulihkan.
for (const ext of ["-wal", "-shm"]) rmSync(dest + ext, { force: true });
copyFileSync(backup, dest);
console.log("Restore selesai <-", backup, "\nJalankan server lagi.");
