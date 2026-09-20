#!/usr/bin/env node
/**
 * Parity check (stub, Fase 1B).
 *
 * Nanti: bandingkan konten situs statis lama (apps/site/index.html) dengan
 * data yang tersimpan di DB (content_sections / content_versions) untuk
 * memastikan migrasi konten tidak menghilangkan/mengubah teks tanpa sengaja.
 *
 * Fase ini belum ada logika bisnis, jadi hanya memverifikasi fondasi ada.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const wajib = [
  "apps/site/index.html",
  "services/api/src/db/schema.ts",
  "packages/shared/src/index.ts",
];

let ok = true;
for (const rel of wajib) {
  const ada = existsSync(resolve(root, rel));
  console.log(`${ada ? "OK  " : "HILANG"} ${rel}`);
  if (!ada) ok = false;
}

if (!ok) {
  console.error("\nParity gagal: ada berkas fondasi yang hilang.");
  process.exit(1);
}
console.log("\nParity OK (stub Fase 1B — belum ada perbandingan konten).");
