#!/usr/bin/env node
/**
 * Ekstraksi FAQ VERBATIM dari baseline pre-1a (repeatable, bukan salin-tangan).
 *
 *   node scripts/extract-faq.mjs            # tulis services/api/src/db/faq.pre-1a.json
 *   node scripts/extract-faq.mjs --check    # bandingkan dgn file tersimpan, exit 1 bila beda
 *
 * Sumber: `git show <ref>:apps/site/index.html`, blok <div class="faq"> di #faq.
 * Entity HTML di-decode (&amp; -> &) supaya nilai tersimpan cocok dgn yang akan
 * di-esc ulang oleh render.js/faqHtml (parity 0.0000%).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "services/api/src/db/faq.pre-1a.json");
const REF = process.env.PARITY_BASELINE_REF || "pre-1a";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function extract() {
  const html = execSync(`git show ${REF}:apps/site/index.html`, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  // Ambil section #faq lalu blok <div class="faq"> ... </div>.
  const sec = html.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/);
  if (!sec) throw new Error(`Section #faq tidak ditemukan di ${REF}:apps/site/index.html`);
  const box = sec[0].match(/<div class="faq">([\s\S]*?)<\/div>/);
  if (!box) throw new Error("Blok <div class=\"faq\"> tidak ditemukan.");
  const items = [];
  const re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g;
  let m;
  while ((m = re.exec(box[1])) !== null) {
    items.push({
      q: decodeEntities(m[1].trim()),
      a: decodeEntities(m[2].trim()),
      active: true,
    });
  }
  if (items.length === 0) throw new Error("Tidak ada item FAQ terbaca.");
  return items;
}

const items = extract();
const json = JSON.stringify(items, null, 2) + "\n";

if (process.argv.includes("--check")) {
  if (!existsSync(OUT)) {
    console.error(`GAGAL: ${OUT} belum ada. Jalankan tanpa --check dulu.`);
    process.exit(1);
  }
  const cur = readFileSync(OUT, "utf8");
  if (cur !== json) {
    console.error(`GAGAL: ${OUT} tidak cocok dengan hasil ekstraksi ${REF}.`);
    process.exit(1);
  }
  console.log(`OK: ${items.length} item FAQ cocok dgn ${REF}.`);
} else {
  writeFileSync(OUT, json);
  console.log(`Ditulis ${items.length} item FAQ dari ${REF} -> ${OUT}`);
}
