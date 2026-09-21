/**
 * Sumber kebenaran TUNGGAL untuk rute situs & kunci capture parity.
 *
 * Dipakai oleh:
 *   - scripts/parity.mjs        (harness yang menangkap & membandingkan)
 *   - scripts/parity-audit.mjs  (cetak tabel capture vs rute)
 *   - test coverage parity      (gagal bila rute router tak ter-capture)
 *
 * Dengan satu sumber ini, mustahil harness diam-diam meng-capture lebih sedikit
 * rute daripada yang benar-benar ada di router tanpa test ikut merah.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Sub-halaman #view-home yang di-capture, [nama, hash]. Urutan = router PAGES. */
export const SUBPAGES = [
  ["beranda", "#/"],
  ["paket", "#/paket"],
  ["itinerary", "#/itinerary"],
  ["destinasi", "#/destinasi"],
  ["keselamatan", "#/keselamatan"],
  ["jadwal", "#/jadwal"],
  ["lokasi", "#/lokasi"],
  ["registrasi", "#/registrasi"],
  ["syarat", "#/syarat"],
  ["faq", "#/faq"],
];

/** Langkah alur booking yang di-capture (view-booking). */
export const BOOKING_LABELS = ["booking-s1", "booking-s2", "booking-s3", "booking-s4"];

export const VIEWPORTS = ["1440", "390"];

/** Baca daftar rute konten yang BENAR-BENAR ada di router situs. */
export function routerRoutes() {
  const src = readFileSync(resolve(ROOT, "apps/site/src/router.js"), "utf8");
  const m = src.match(/var\s+PAGES\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error("Tidak menemukan array PAGES di apps/site/src/router.js");
  const pages = m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  // VIEWS.booking adalah view konten terpisah (#view-booking) — rute nyata.
  return [...pages, "booking"];
}

/** Rute router -> daftar kunci capture (tanpa prefix viewport) yang mewakilinya. */
export function capturesForRoute(route) {
  if (route === "booking") return [...BOOKING_LABELS];
  const names = SUBPAGES.map(([n]) => n);
  return names.includes(route) ? [route] : [];
}

/** Semua kunci capture dasar (tanpa prefix viewport). */
export function baseCaptureKeys() {
  return [...SUBPAGES.map(([n]) => n), ...BOOKING_LABELS];
}
