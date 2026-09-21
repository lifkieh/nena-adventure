#!/usr/bin/env node
/**
 * Ekstraksi VERBATIM section CMS batch-1 (syarat + testimoni) dari baseline pre-1a.
 *   node scripts/extract-cms.mjs           # tulis syarat.pre-1a.json & testimoni.pre-1a.json
 *   node scripts/extract-cms.mjs --check    # exit 1 bila berkas tersimpan != pre-1a
 * Bukan salin tangan: sumber = `git show <ref>:apps/site/index.html`.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "services/api/src/db");
const REF = process.env.PARITY_BASELINE_REF || "pre-1a";

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function html() {
  return execSync(`git show ${REF}:apps/site/index.html`, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function extractSyarat(doc) {
  const sec = doc.match(/<section[^>]*id="syarat"[\s\S]*?<\/section>/)[0];
  const box = sec.match(/<div class="accord">([\s\S]*?)<\/div>\s*<\/div>/)[1];
  const groups = [];
  const re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<ul>([\s\S]*?)<\/ul>\s*<\/details>/g;
  let m;
  while ((m = re.exec(box)) !== null) {
    const items = [];
    const li = /<li>([\s\S]*?)<\/li>/g;
    let x;
    while ((x = li.exec(m[2])) !== null) items.push(decode(x[1].trim()));
    groups.push({ title: decode(m[1].trim()), items, active: true });
  }
  return groups;
}

function extractTestimoni(doc) {
  const sec = doc.match(/<section[^>]*id="ulasan"[\s\S]*?<\/section>/)[0];
  const items = [];
  const re = /<article class="rev">\s*<div class="stars"[^>]*aria-label="([^"]+)">([★☆]+)<\/div>\s*<blockquote>([\s\S]*?)<\/blockquote>\s*<div class="rev-who"><span class="ava"[^>]*>([^<]*)<\/span><span><b>([\s\S]*?)<\/b><small>([\s\S]*?)<\/small><\/span><\/div>\s*<\/article>/g;
  let m;
  while ((m = re.exec(sec)) !== null) {
    const rating = (m[2].match(/★/g) || []).length;
    items.push({ rating, quote: decode(m[3].trim()), name: decode(m[5].trim()), meta: decode(m[6].trim()), active: true });
  }
  return items;
}

function extractItinerary(doc) {
  const sec = doc.match(/<section[^>]*id="itinerary"[\s\S]*?<\/section>/)[0];
  const box = sec.match(/<div class="accord"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)[1];
  const trips = [];
  const re = /<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<ol[^>]*>([\s\S]*?)<\/ol>\s*<\/details>/g;
  let m;
  while ((m = re.exec(box)) !== null) {
    const steps = [];
    const li = /<li><time class="num">([\s\S]*?)<\/time><div><h4>([\s\S]*?)<\/h4><\/div><\/li>/g;
    let x;
    while ((x = li.exec(m[2])) !== null) steps.push({ time: decode(x[1].trim()), activity: decode(x[2].trim()) });
    trips.push({ title: decode(m[1].trim()), steps, active: true });
  }
  return trips;
}

function iconOf(svg) {
  if (svg.includes("<rect")) return "kalender";
  if (svg.includes('cy="8.4"')) return "pin";
  if (svg.includes("M4 5.5C4 12")) return "telepon";
  if (svg.includes('r="7.6"')) return "jam";
  return "pin";
}
function extractKontak(doc) {
  const inner = doc.match(/<ul class="addr">([\s\S]*?)<\/ul>/)[1];
  const points = [];
  const re = /<li>(<svg[\s\S]*?<\/svg>)\s*<div><b>([\s\S]*?)<\/b><p>([\s\S]*?)<\/p><\/div><\/li>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    points.push({ icon: iconOf(m[1]), title: decode(m[2].trim()), body: decode(m[3].trim()), active: true });
  }
  return points;
}

function extractGaleri(doc) {
  const inner = doc.match(/<div class="gal" id="gal">([\s\S]*?)<\/div>/)[1];
  const items = [];
  const re = /<button(?: class="([^"]*)")? data-type="(img|vid)"(?: data-src="([^"]*)")? data-cap="([^"]*)"><img loading="lazy" width="(\d+)" height="(\d+)" src="([^"]*)" alt="([^"]*)">([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const type = m[2];
    const it = { type, size: m[1] || "", cap: decode(m[4]), width: Number(m[5]), height: Number(m[6]), thumb: m[7], alt: decode(m[8]), active: true };
    if (type === "img") it.full = m[3] || "";
    else { const lbl = m[9].match(/<span class="lbl">([\s\S]*?)<\/span>/); it.videoLabel = lbl ? decode(lbl[1]) : ""; }
    items.push(it);
  }
  return items;
}

function extractPaket(doc) {
  const sec = doc.match(/<section class="sec" id="paket">([\s\S]*?)<\/section>\s*<!-- COMPARISON/)[1];
  const pkgs = sec.match(/<div class="pkgs pkgs--3">([\s\S]*?)<\/div>\s*<div class="card"/)[1];
  const cards = [];
  const re = /<div class="pkg( pkg--hi)?">([\s\S]*?)<\/div>(?=\s*<div class="pkg|\s*$)/g;
  let m;
  while ((m = re.exec(pkgs)) !== null) {
    const inner = m[2];
    const href = (inner.match(/href="#\/booking\?pkg=([a-z]+)"/) || [])[1];
    const tag = (inner.match(/<span class="pkg-tag">([\s\S]*?)<\/span>/) || [])[1] || null;
    const name = inner.match(/<h3>([\s\S]*?)<\/h3>/)[1];
    const sub = inner.match(/<p class="pkg-sub">([\s\S]*?)<\/p>/)[1];
    const unit = inner.match(/<div class="pkg-price">[\s\S]*?<span>([\s\S]*?)<\/span><\/div>/)[1];
    let note = inner.match(/<p class="pkg-note">([\s\S]*?)<\/p>/)[1];
    if (href === "reguler") note = note.replace(/Rp\d{1,3}(?:\.\d{3})*/, "{{harga_normal_reguler}}");
    const features = [];
    const li = /<li class="(yes|no)">[\s\S]*?<\/svg><span>([\s\S]*?)<\/span><\/li>/g;
    let x;
    while ((x = li.exec(inner)) !== null) features.push({ included: x[1] === "yes", html: x[2] }); // html VERBATIM (ada &amp; / <strong>)
    const cta = inner.match(/<a class="([^"]*)" href="([^"]*)">([\s\S]*?)<\/a>/);
    cards.push({ key: href, name: decode(name), sub: decode(sub), unit: decode(unit), note: decode(note), tag: tag ? decode(tag) : null, highlight: !!m[1], features, ctaClass: cta[1], ctaHref: cta[2], ctaText: decode(cta[3]) });
  }
  return { cards };
}

const doc = html();
const outputs = {
  "paket.pre-1a.json": extractPaket(doc),
  "galeri.pre-1a.json": extractGaleri(doc),
  "syarat.pre-1a.json": extractSyarat(doc),
  "testimoni.pre-1a.json": extractTestimoni(doc),
  "itinerary.pre-1a.json": extractItinerary(doc),
  "kontak.pre-1a.json": extractKontak(doc),
};
if (outputs["syarat.pre-1a.json"].length !== 3) throw new Error("syarat != 3 grup");
if (outputs["testimoni.pre-1a.json"].length !== 6) throw new Error("testimoni != 6 item");
if (outputs["itinerary.pre-1a.json"].length !== 3) throw new Error("itinerary != 3 trip");
if (outputs["kontak.pre-1a.json"].length !== 4) throw new Error("kontak != 4 poin");
if (outputs["galeri.pre-1a.json"].length !== 7) throw new Error("galeri != 7 item");

let bad = 0;
for (const [file, data] of Object.entries(outputs)) {
  const json = JSON.stringify(data, null, 2) + "\n";
  const path = resolve(DIR, file);
  if (process.argv.includes("--check")) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== json) { console.error(`GAGAL: ${file} != ${REF}`); bad++; }
    else console.log(`OK: ${file} cocok ${REF} (${data.length})`);
  } else {
    writeFileSync(path, json);
    console.log(`Ditulis ${file} (${data.length}) dari ${REF}`);
  }
}
if (bad > 0) process.exit(1);
