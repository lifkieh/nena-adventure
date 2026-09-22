#!/usr/bin/env node
/**
 * Audit integritas cakupan harness parity (cepat, tanpa render).
 * Cetak: daftar rute router situs <-> kunci capture harness, + selisih apa adanya.
 * Exit 1 bila ada rute router tanpa capture (kekurangan cakupan).
 */
import {
  SUBPAGES,
  BOOKING_LABELS,
  VIEWPORTS,
  routerRoutes,
  capturesForRoute,
  baseCaptureKeys,
} from "./parity-routes.mjs";

const routes = routerRoutes();
const base = baseCaptureKeys();
const totalCaptures = base.length * VIEWPORTS.length;

console.log("== AUDIT CAKUPAN HARNESS PARITY ==\n");
console.log(`Viewport      : ${VIEWPORTS.join(", ")} (${VIEWPORTS.length})`);
console.log(`Kunci capture : ${base.length} per viewport -> ${totalCaptures} total\n`);

console.log("Rute router situs -> capture yang mewakili:");
let missing = 0;
for (const r of routes) {
  const caps = capturesForRoute(r);
  if (caps.length === 0) {
    missing++;
    console.log(`  [KURANG] ${r.padEnd(14)} -> (tidak ada capture)`);
  } else {
    console.log(`  [ ok  ] ${r.padEnd(14)} -> ${caps.join(", ")}`);
  }
}

// Capture yang tidak memetakan ke rute router mana pun (capture yatim).
const routeCapture = new Set(routes.flatMap(capturesForRoute));
const orphan = base.filter((k) => !routeCapture.has(k));

console.log(`\nRute router      : ${routes.length}  (${routes.join(", ")})`);
console.log(`Rute tanpa capture (KURANG): ${missing}`);
console.log(`Capture yatim (tak ada rutenya): ${orphan.length}${orphan.length ? " -> " + orphan.join(", ") : ""}`);

console.log("\nDaftar 28 kunci capture (per viewport x " + VIEWPORTS.length + "):");
for (const vp of VIEWPORTS) for (const k of base) console.log(`  ${vp}/${k}`);

if (missing > 0) {
  console.error("\nAUDIT GAGAL: ada rute router tanpa capture.");
  process.exit(1);
}
console.log("\nAUDIT OK: setiap rute router punya minimal satu capture.");
