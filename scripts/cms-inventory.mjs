#!/usr/bin/env node
/**
 * cms-inventory.mjs — MECHANICAL CMS-coverage audit for apps/site.
 *
 * Static analysis only (NO running server). Reads:
 *   - apps/site/index.html   (the rendered public markup)
 *   - apps/site/src/ui.js     (which DOM containers CMS overwrites)
 *
 * For every user-visible TEXT node and every IMAGE src in index.html it decides:
 *   (a) CMS-backed  — its container is filled from GET /api/public/content by ui.js
 *       (one of the 14 sections: hero, navbar, paket, destinasi, galeri,
 *        itinerary, faq, testimoni, keselamatan, kontak, syarat, registrasi,
 *        adventure, meta)  — vs  hardcoded in index.html.
 *   (b) parity-captured — inside #view-home or #view-booking (compared by
 *       scripts/parity.mjs as outerHTML) — vs global/head (uncaptured).
 *
 * Writes CMS-COVERAGE.md and prints totals.
 *
 * The classification is derived, not guessed: CMS ranges are computed from the
 * exact selectors ui.js touches; parity ranges from the two containers parity.mjs
 * captures. If ui.js changes selectors, update CMS_CONTAINERS / CMS_SINGLE below.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HTML_PATH = resolve(ROOT, "apps/site/index.html");
const UI_PATH = resolve(ROOT, "apps/site/src/ui.js");
const OUT_PATH = resolve(ROOT, "CMS-COVERAGE.md");

const html = readFileSync(HTML_PATH, "utf8");
const uiSrc = readFileSync(UI_PATH, "utf8");

/* ── Parity containers (from scripts/parity.mjs: captures #view-home & #view-booking outerHTML) ── */
const homeStart = html.indexOf('<div id="view-home">');
const bookingStart = html.indexOf('<div id="view-booking"');
if (homeStart < 0 || bookingStart < 0) throw new Error("view-home / view-booking not found");
// Everything at offset >= homeStart lives inside one of the two captured containers.
const parityCaptured = (off) => off >= homeStart;

/* ── Helpers: find a container's inner char-span by matching its tag depth ── */
function findOpen(str, re, from = 0) {
  re.lastIndex = from;
  const m = re.exec(str);
  return m ? m.index : -1;
}
function spanOf(openIdx, tag) {
  if (openIdx < 0) return null;
  const openEnd = html.indexOf(">", openIdx);
  if (openEnd < 0) return null;
  const re = new RegExp("<(/?)" + tag + "(?=[\\s>/])", "gi");
  re.lastIndex = openEnd + 1;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1] === "/") {
      depth--;
      if (depth === 0) {
        const closeEnd = html.indexOf(">", m.index) + 1;
        return { innerStart: openEnd + 1, innerEnd: m.index, outerEnd: closeEnd };
      }
    } else {
      depth++;
    }
  }
  return null;
}
// inner-text span of the FIRST <tag ...>text</tag> at/after `from`
function textElSpan(tagRe, from = 0) {
  const idx = findOpen(html, tagRe, from);
  if (idx < 0) return null;
  const openEnd = html.indexOf(">", idx);
  const closeIdx = html.indexOf("<", openEnd + 1);
  return { start: openEnd + 1, end: closeIdx, elStart: idx };
}

/* ── CMS container ranges (innerHTML fully replaced by ui.js) ──────────────── */
const CMS_CONTAINERS = []; // {start,end,section}
function pushContainer(section, openRe, tag, from = 0) {
  const idx = findOpen(html, openRe, from);
  const sp = spanOf(idx, tag);
  if (sp) CMS_CONTAINERS.push({ start: sp.innerStart, end: sp.innerEnd, section });
  return idx;
}
pushContainer("destinasi", /<ul class="dests">/g, "ul");
pushContainer("galeri", /<div class="gal" id="gal">/g, "div");
pushContainer("testimoni", /<div class="revs">/g, "div");
pushContainer("itinerary", /<div class="accord" id="itin-accord">/g, "div");
pushContainer("faq", /<div class="faq">/g, "div");
pushContainer("kontak", /<ul class="addr">/g, "ul");
pushContainer("adventure", /<ol class="feat2-steps">/g, "ol");
pushContainer("keselamatan", /<div class="safe">/g, "div");
pushContainer("keselamatan", /<div class="policy">/g, "div");
pushContainer("registrasi", /<ol class="tflow">/g, "ol");
pushContainer("paket", /<div class="pkgs pkgs--3">/g, "div");
pushContainer("testimoni", /<div class="feat2-chip feat2-chip--1">/g, "div");
pushContainer("testimoni", /<div class="feat2-chip feat2-chip--2">/g, "div");
// syarat: the .accord that lives inside #syarat
{
  const sy = html.indexOf('id="syarat"');
  pushContainer("syarat", /<div class="accord">/g, "div", sy);
}
// paket tables: the .card inside #paket (after the .pkgs block)
{
  const pk = html.indexOf('id="paket"');
  pushContainer("paket", /<div class="card"[^>]*>/g, "div", pk);
}

/* ── CMS single-text nodes (textContent replaced by ui.js) ────────────────── */
const CMS_SINGLE = []; // {start,end,section}
function pushSingle(section, tagRe, from = 0) {
  const sp = textElSpan(tagRe, from);
  if (sp) CMS_SINGLE.push({ start: sp.start, end: sp.end, section });
  return sp;
}
// hero title (h1) + subtitle (p) inside .hero2-copy
{
  const hc = html.indexOf('class="hero2-copy"');
  const h1 = pushSingle("hero", /<h1>/g, hc);
  pushSingle("hero", /<p>/g, h1 ? h1.end : hc);
}
// band: heading (h2), subtitle (p), ctaPrimary (a.btn--go), ctaSecondary (#waBand)
{
  const band = html.indexOf('class="sec--tight band"');
  pushSingle("hero", /<h2>/g, band);
  pushSingle("hero", /<p>/g, band);
  pushSingle("hero", /<a class="btn btn--go" href="#\/booking">/g, band);
  pushSingle("hero", /<a class="btn btn--out" id="waBand"[^>]*>/g, band);
}
// navbar links (data-page-link) — 6 of them — + booking CTA label in header
{
  const re = /<a href="#\/[a-z]+" data-page-link="[a-z]+">/g;
  let m;
  while ((m = re.exec(html))) {
    const openEnd = html.indexOf(">", m.index);
    const closeIdx = html.indexOf("<", openEnd + 1);
    CMS_SINGLE.push({ start: openEnd + 1, end: closeIdx, section: "navbar" });
  }
  const hdr = html.indexOf('<header class="hdr"');
  pushSingle("navbar", /<a class="btn btn--go btn--sm" href="#\/booking">/g, hdr);
}
// mobile menu (#mm): ui.js overlays textContent tiap <a> dari navbar.mobileLinks.
{
  const mmStart = html.indexOf('<div class="mm" id="mm"');
  const mmEnd = html.indexOf("</div>", mmStart);
  const re = /<a [^>]*>/g;
  re.lastIndex = mmStart;
  let m;
  while ((m = re.exec(html)) && m.index < mmEnd) {
    const openEnd = html.indexOf(">", m.index);
    const closeIdx = html.indexOf("<", openEnd + 1);
    CMS_SINGLE.push({ start: openEnd + 1, end: closeIdx, section: "navbar" });
  }
}
// meta: <title> text node (head)
pushSingle("meta", /<title>/g);

function cmsHit(off) {
  for (const c of CMS_CONTAINERS) if (off >= c.start && off < c.end) return c.section;
  for (const c of CMS_SINGLE) if (off >= c.start && off < c.end) return c.section;
  return null;
}

/* ── Area landmarks (document order); area = greatest landmark start <= offset ── */
const LANDMARKS = [
  ["Meta / head", 0],
  ["Navbar & header", html.indexOf('<a class="skip"')],
  ["Navbar & header", html.indexOf('<header class="hdr" id="hdr">')],
  ["Navbar & header (mobile menu)", html.indexOf('<div class="mm" id="mm"')],
  ["Beranda (home)", html.indexOf('id="page-beranda"')],
  ["Paket page", html.indexOf('id="page-paket"')],
  ["Itinerary page", html.indexOf('id="page-itinerary"')],
  ["Destinasi page", html.indexOf('id="page-destinasi"')],
  ["Keselamatan page", html.indexOf('id="page-keselamatan"')],
  ["Jadwal page", html.indexOf('id="page-jadwal"')],
  ["Lokasi page", html.indexOf('id="page-lokasi"')],
  ["Registrasi page", html.indexOf('id="page-registrasi"')],
  ["Syarat page", html.indexOf('id="page-syarat"')],
  ["FAQ page", html.indexOf('id="page-faq"')],
  ["Footer", html.indexOf("<footer>")],
  ["Floating / global", html.indexOf('<a class="wa" id="waFab"')],
  ["Floating / global", html.indexOf('<div class="mbar">')],
  ["Floating / global (lightbox)", html.indexOf('<div class="lb" id="lb"')],
  ["Booking wizard", bookingStart],
].filter(([, o]) => o >= 0).sort((a, b) => a[1] - b[1]);
function areaOf(off) {
  let area = "Meta / head";
  for (const [name, start] of LANDMARKS) {
    if (off >= start) area = name;
    else break;
  }
  return area;
}

/* ── Entity decode (minimal) + text cleanup ───────────────────────────────── */
function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&times;/g, "×")
    .replace(/&nbsp;/g, " ").replace(/&raquo;/g, "»").replace(/&laquo;/g, "«")
    .replace(/\s+/g, " ").trim();
}
// keep only strings that carry real words (drop pure punctuation / arrows / stars)
function isVisibleText(t) {
  if (!t) return false;
  if (!/[A-Za-z0-9À-ɏ]/.test(t)) return false; // needs a letter/digit
  if (/^[×‹›&\s·—–-]+$/.test(t)) return false;
  return true;
}

/* ── Single-pass scanner: text nodes + <img>/<iframe> src, skipping svg/script/style ── */
const texts = []; // {value, off}
const images = []; // {src, alt, off}
{
  const tagRe = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  let last = 0, m, skip = 0;
  const SKIP_TAGS = new Set(["svg", "script", "style"]);
  while ((m = tagRe.exec(html))) {
    const chunk = html.slice(last, m.index);
    if (skip === 0) {
      const dec = decode(chunk);
      if (isVisibleText(dec)) texts.push({ value: dec, off: last });
    }
    last = tagRe.lastIndex;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrs = m[3] || "";
    const self = m[4] === "/" || ["img", "br", "hr", "meta", "link", "input", "source"].includes(tag);
    if (SKIP_TAGS.has(tag)) {
      if (self) { /* self-closed svg/script: no depth change */ }
      else if (closing) skip = Math.max(0, skip - 1);
      else skip++;
    }
    if (skip === 0 && !closing) {
      if (tag === "img") {
        const src = (attrs.match(/\bsrc="([^"]*)"/) || [])[1];
        const alt = (attrs.match(/\balt="([^"]*)"/) || [])[1] || "";
        if (src) images.push({ src, alt: decode(alt), off: m.index });
      } else if (tag === "iframe") {
        const src = (attrs.match(/\bsrc="([^"]*)"/) || [])[1];
        if (src) images.push({ src, alt: "(iframe embed)", off: m.index });
      }
    }
  }
}

/* ── Head images / meta (attributes, not text nodes) — curated but derived from head ── */
const headEnd = html.indexOf("</head>");
const head = html.slice(0, headEnd);
function metaContent(sel) {
  const m = head.match(sel);
  return m ? m[1] : null;
}
const headEntries = [];
{
  const desc = metaContent(/<meta name="description" content="([^"]*)"/);
  const ogT = metaContent(/<meta property="og:title" content="([^"]*)"/);
  const ogD = metaContent(/<meta property="og:description" content="([^"]*)"/);
  const ogImg = metaContent(/<meta property="og:image" content="([^"]*)"/);
  const fav = metaContent(/<link rel="icon"[^>]*href="([^"]*)"/);
  if (desc) headEntries.push({ area: "Meta / head", kind: "text", value: desc, cms: "meta", parity: false });
  if (ogT) headEntries.push({ area: "Meta / head", kind: "text", value: ogT, cms: "meta", parity: false });
  if (ogD) headEntries.push({ area: "Meta / head", kind: "text", value: ogD, cms: "meta", parity: false });
  if (ogImg) headEntries.push({ area: "Meta / head", kind: "image", value: ogImg, cms: "meta", parity: false });
  if (fav) headEntries.push({ area: "Meta / head", kind: "image", value: fav, cms: null, parity: false });
  // hardcoded head meta (not CMS)
  for (const [label, re] of [
    ['theme-color', /<meta name="theme-color" content="([^"]*)"/],
    ['og:type', /<meta property="og:type" content="([^"]*)"/],
    ['og:locale', /<meta property="og:locale" content="([^"]*)"/],
    ['twitter:card', /<meta name="twitter:card" content="([^"]*)"/],
  ]) {
    const v = metaContent(re);
    if (v) headEntries.push({ area: "Meta / head", kind: "text", value: `${label}=${v}`, cms: null, parity: false });
  }
  headEntries.push({ area: "Meta / head", kind: "text", value: "JSON-LD structured data (TravelAgency schema)", cms: null, parity: false });
}

/* ── Assemble entries ─────────────────────────────────────────────────────── */
const entries = [];
for (const t of texts) {
  entries.push({ area: areaOf(t.off), kind: "text", value: t.value, cms: cmsHit(t.off), parity: parityCaptured(t.off) });
}
for (const im of images) {
  entries.push({
    area: areaOf(im.off), kind: "image",
    value: im.src + (im.alt ? `  [alt: ${im.alt}]` : ""),
    cms: cmsHit(im.off), parity: parityCaptured(im.off),
  });
}
entries.push(...headEntries);

/* ── Totals ───────────────────────────────────────────────────────────────── */
const textEntries = entries.filter((e) => e.kind === "text");
const imgEntries = entries.filter((e) => e.kind === "image");
const tCms = textEntries.filter((e) => e.cms).length;
const iCms = imgEntries.filter((e) => e.cms).length;

/* ── Report ───────────────────────────────────────────────────────────────── */
const AREA_ORDER = [
  "Meta / head", "Navbar & header", "Navbar & header (mobile menu)",
  "Beranda (home)", "Paket page", "Itinerary page", "Destinasi page",
  "Keselamatan page", "Jadwal page", "Lokasi page", "Registrasi page",
  "Syarat page", "FAQ page", "Footer", "Floating / global",
  "Floating / global (lightbox)", "Booking wizard",
];
const areas = [...new Set(entries.map((e) => e.area))].sort(
  (a, b) => (AREA_ORDER.indexOf(a) + 1 || 99) - (AREA_ORDER.indexOf(b) + 1 || 99)
);
const trunc = (s, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s).replace(/\|/g, "\\|");

let md = "";
md += "# CMS Coverage Audit — apps/site\n\n";
md += `_Generated mechanically by \`scripts/cms-inventory.mjs\` from \`apps/site/index.html\` + \`apps/site/src/ui.js\`. No server involved._\n\n`;
md += "## Summary\n\n";
md += "| Metric | Count |\n|---|---:|\n";
md += `| Total visible strings | ${textEntries.length} |\n`;
md += `| — CMS-backed | ${tCms} |\n`;
md += `| — Hardcoded | ${textEntries.length - tCms} |\n`;
md += `| Total images | ${imgEntries.length} |\n`;
md += `| — CMS-backed | ${iCms} |\n`;
md += `| — Hardcoded | ${imgEntries.length - iCms} |\n`;
md += `| **All entries** | **${entries.length}** |\n\n`;

md += "**Parity note.** `scripts/parity.mjs` compares the normalized *outerHTML* of `#view-home` and `#view-booking`. Every landmark in the `<body>` (navbar, footer, floating WhatsApp button, mobile bar, lightbox, all `Kembali ke beranda` links, all `.err` messages) is nested **inside** `#view-home` or `#view-booking`, so it **IS** parity-captured. Only `<head>` (title/meta/og/favicon/JSON-LD) is uncaptured. Migrating a parity-captured element to CMS changes captured DOM and therefore can break DOM parity.\n\n";

md += "## Counts by area\n\n";
md += "| Area | Strings (CMS/hardcoded) | Images (CMS/hardcoded) | Parity-captured |\n|---|---|---|---|\n";
for (const area of areas) {
  const es = entries.filter((e) => e.area === area);
  const ts = es.filter((e) => e.kind === "text");
  const is = es.filter((e) => e.kind === "image");
  const tc = ts.filter((e) => e.cms).length;
  const ic = is.filter((e) => e.cms).length;
  const par = es.some((e) => e.parity) ? (es.every((e) => e.parity) ? "yes" : "mixed") : "no";
  md += `| ${area} | ${ts.length} (${tc}/${ts.length - tc}) | ${is.length} (${ic}/${is.length - ic}) | ${par} |\n`;
}
md += "\n";

for (const area of areas) {
  const es = entries.filter((e) => e.area === area);
  if (!es.length) continue;
  md += `## ${area}\n\n`;
  md += "| # | Kind | Content | Status | CMS section | Parity |\n|---:|---|---|---|---|---|\n";
  es.forEach((e, i) => {
    md += `| ${i + 1} | ${e.kind} | ${trunc(e.value)} | ${e.cms ? "CMS" : "hardcoded"} | ${e.cms || "—"} | ${e.parity ? "yes" : "no"} |\n`;
  });
  md += "\n";
}

md += "## Notes on dynamically-injected strings (out of static scope)\n\n";
md += "These are NOT in index.html; they are written by JS at runtime into containers that live **inside** the parity-captured views. They are hardcoded (not CMS-backed) and not covered by the static tables above:\n\n";
md += "- `apps/site/src/jadwal.js` → into `#months` (inside #view-home): `Jadwal sedang dimuat…`, `Belum ada jadwal keberangkatan terdekat.`, neutral-fail `Jadwal belum bisa ditampilkan sekarang.` + `Muat ulang` / `Hubungi via WhatsApp`.\n";
md += "- `apps/site/src/booking.js` → into `#view-booking`: date-dropdown placeholders (`— memuat jadwal… —`, `— jadwal gagal dimuat, hubungi kami via WhatsApp —`, sold-out option), payment-box copy, recap, and the pay-error banner (`Silakan pilih tanggal keberangkatan lebih dulu.`, `Gagal membuat pesanan.`/API messages, `Gagal mengunggah bukti.`).\n";
md += "- The `.err` validation messages (`errTanggal`, `errNama`, `errHp`, `errEmail`, `errSetuju`) ARE static in index.html and appear in the Booking wizard table above.\n";

writeFileSync(OUT_PATH, md);

/* ── Console totals ───────────────────────────────────────────────────────── */
console.log("CMS INVENTORY — apps/site");
console.log("─".repeat(48));
console.log(`Total visible strings : ${textEntries.length}  (CMS ${tCms} / hardcoded ${textEntries.length - tCms})`);
console.log(`Total images          : ${imgEntries.length}  (CMS ${iCms} / hardcoded ${imgEntries.length - iCms})`);
console.log(`All entries           : ${entries.length}`);
console.log("─".repeat(48));
console.log("By area  [strings CMS/hc | images CMS/hc | parity]");
for (const area of areas) {
  const es = entries.filter((e) => e.area === area);
  const ts = es.filter((e) => e.kind === "text");
  const is = es.filter((e) => e.kind === "image");
  const tc = ts.filter((e) => e.cms).length;
  const ic = is.filter((e) => e.cms).length;
  const par = es.some((e) => e.parity) ? (es.every((e) => e.parity) ? "yes" : "mixed") : "no";
  console.log(`  ${area.padEnd(32)} ${String(ts.length).padStart(3)} ${tc}/${ts.length - tc}  | img ${is.length} ${ic}/${is.length - ic} | ${par}`);
}
console.log("─".repeat(48));
console.log(`Report written: ${OUT_PATH}`);
