import { sqliteConn, db } from "./client.js";
import { packages } from "./schema.js";
import * as repo from "../repos/packages.repo.js";
import { hasValidPricePath, priceBaseline } from "./package-baseline.js";

/**
 * packages:verify — pemeriksaan runtime pada DB berjalan.
 * GAGAL (exit 1) bila:
 *   - ada paket AKTIF tanpa jalur harga sah (prices kosong DAN tanpa tier), atau
 *   - tier Private menyimpang dari baseline pre-1a.
 *   DB_PATH=services/api/data/nena.db npm run packages:verify
 */
let bad = 0;
const rows = db.select().from(packages).all();
for (const p of rows) {
  const prices = JSON.parse(p.prices) as Record<string, number>;
  const tiers = repo.tiersFor(p.id);
  const ok = hasValidPricePath({ prices, active: !!p.active }, tiers.length);
  console.log(
    `${ok ? "OK  " : "GAGAL"} ${p.key.padEnd(8)} aktif=${p.active ? "ya" : "tidak"} ` +
      `prices=${Object.keys(prices).length} tier=${tiers.length}`,
  );
  if (!ok) bad++;
}

// Tier Private harus persis baseline pre-1a (rentang + harga).
const priv = rows.find((r) => r.key === "private");
if (priv) {
  const want = priceBaseline().privateTiers;
  const got = repo.tiersFor(priv.id).map((t) => ({ minPax: t.minPax, maxPax: t.maxPax, price: t.price }));
  const same =
    got.length === want.length &&
    want.every((w) => got.some((g) => g.minPax === w.minPax && g.maxPax === w.maxPax && g.price === w.price));
  console.log(`${same ? "OK  " : "GAGAL"} private-tiers cocok baseline (${got.length}/${want.length})`);
  if (!same) bad++;
}

sqliteConn.close();
if (bad > 0) {
  console.error(`\npackages:verify GAGAL — ${bad} masalah harga paket.`);
  process.exit(1);
}
console.log("\npackages:verify OK — semua paket aktif punya jalur harga sah.");
