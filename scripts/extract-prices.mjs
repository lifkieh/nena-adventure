#!/usr/bin/env node
/**
 * Ekstraksi harga paket VERBATIM dari baseline pre-1a (repeatable, bukan ingatan).
 *   node scripts/extract-prices.mjs          # tulis services/api/src/db/prices.pre-1a.json
 *   node scripts/extract-prices.mjs --check   # exit 1 bila file tersimpan != pre-1a
 *
 * Sumber: `git show <ref>:apps/site/index.html`.
 *   - reguler: harga .pkg-price Open Trip Reguler (anyer).
 *   - premium: tabel meeting point (kolom "Harga promo").
 *   - private: tabel tier "jumlah peserta" -> rentang + harga per rombongan.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "services/api/src/db/prices.pre-1a.json");
const REF = process.env.PARITY_BASELINE_REF || "pre-1a";

const rupiah = (s) => Number(s.replace(/[^\d]/g, "")); // "Rp4.500.000" -> 4500000

function extract() {
  const html = execSync(`git show ${REF}:apps/site/index.html`, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  // Premium: baris tabel meeting point <td>Kota</td><td normal></td><td promo></td>.
  const mpMap = { Jakarta: "jakarta", Tangerang: "tangerang", "Stasiun Serang": "serang", "Pantai Pangaradan, Anyer": "anyer" };
  const premium = {};
  const mpRe = /<tr><td>([^<]+)<\/td><td class="num">[^<]*<\/td><td class="num"><strong>(Rp[\d.]+)<\/strong><\/td><\/tr>/g;
  let m;
  while ((m = mpRe.exec(html)) !== null) {
    const key = mpMap[m[1].trim()];
    if (key) premium[key] = rupiah(m[2]);
  }

  // Reguler: hint menyebut "Rp385.000".
  const regM = html.match(/Open Trip Reguler hanya berangkat[^.]*?\((Rp[\d.]+)\)/);
  const reguler = { anyer: regM ? rupiah(regM[1]) : NaN };

  // Private: tabel tier "<td>1–6 peserta</td><td...><strong>Rp...</strong>".
  const tiers = [];
  const tierRe = /<tr><td>(\d+)[–-](\d+) peserta<\/td><td class="num"><strong>(Rp[\d.]+)<\/strong><\/td><\/tr>/g;
  while ((m = tierRe.exec(html)) !== null) {
    tiers.push({ minPax: Number(m[1]), maxPax: Number(m[2]), price: rupiah(m[3]) });
  }

  return { reguler, premium, privateTiers: tiers };
}

const data = extract();
// Validasi hasil ekstraksi masuk akal sebelum dipakai.
if (data.reguler.anyer !== 385000) throw new Error("reguler anyer tak terbaca benar: " + data.reguler.anyer);
if (Object.keys(data.premium).length !== 4) throw new Error("premium meeting point != 4: " + JSON.stringify(data.premium));
if (data.privateTiers.length !== 4) throw new Error("private tier != 4: " + data.privateTiers.length);

const json = JSON.stringify(data, null, 2) + "\n";

if (process.argv.includes("--check")) {
  if (!existsSync(OUT)) { console.error(`GAGAL: ${OUT} belum ada.`); process.exit(1); }
  if (readFileSync(OUT, "utf8") !== json) { console.error(`GAGAL: ${OUT} != hasil ekstraksi ${REF}.`); process.exit(1); }
  console.log(`OK: harga cocok ${REF}.`);
} else {
  writeFileSync(OUT, json);
  console.log(`Ditulis harga dari ${REF} -> ${OUT}`);
  console.log(JSON.stringify(data));
}
