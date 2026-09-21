#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "apps/panel/dist");
const index = resolve(dist, "index.html");
const assets = resolve(dist, "assets");

const problems = [];
if (!existsSync(index)) problems.push("apps/panel/dist/index.html tidak ada");
if (!existsSync(assets)) {
  problems.push("apps/panel/dist/assets/ tidak ada");
} else if (!readdirSync(assets).some((f) => f.endsWith(".js"))) {
  problems.push("apps/panel/dist/assets/ tidak berisi berkas .js");
}

if (problems.length) {
  console.error("Verifikasi build panel GAGAL:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("Build panel OK:", index);
