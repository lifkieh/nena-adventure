#!/usr/bin/env node
/**
 * Parity harness (Fase 1A).
 *
 * Bandingkan situs SEBELUM refactor (baseline dari commit, via git worktree)
 * dengan situs SESUDAH refactor (working tree apps/site). Untuk tiap
 * sub-halaman + langkah booking, pada viewport 1440 & 390:
 *   - outerHTML ternormalisasi  -> harus 0 selisih
 *   - screenshot full-page      -> diff piksel harus < 0.1%
 *
 * Determinisme dipaksa (Math.random + Date + setInterval dibekukan, jaringan
 * eksternal diblok) supaya kedua build dirender pada kondisi identik.
 */
import { execSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const OUT = resolve(ROOT, ".parity-out");
const WORKTREE = resolve(ROOT, ".parity-baseline");
const PIXEL_THRESHOLD = 0.001; // 0.1 %

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

const SUBPAGES = [
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

/* ── util ────────────────────────────────────────────────── */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

function staticServer(rootDir) {
  return new Promise((res) => {
    const srv = createServer((req, rep) => {
      let p = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
      if (p === "/" || p === "") p = "/index.html";
      const full = normalize(join(rootDir, p));
      if (!full.startsWith(normalize(rootDir)) || !existsSync(full)) {
        rep.statusCode = 404;
        rep.end("not found");
        return;
      }
      rep.setHeader("Content-Type", MIME[extname(full)] || "application/octet-stream");
      rep.end(readFileSync(full));
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

const INIT = `
(() => {
  // Math.random deterministik (LCG)
  let s = 123456789;
  Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  // Date beku ke instan tetap (new Date() & Date.now())
  const OD = Date;
  const FIXED = OD.parse('2026-09-21T00:00:00');
  class FD extends OD {
    constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
    static now() { return FIXED; }
  }
  globalThis.Date = FD;
  // Bekukan timer supaya countdown tidak berjalan
  globalThis.setInterval = () => 0;
  // Scroll selalu instan & ke atas — cegah posisi sticky (ringkasan booking)
  // berbeda antar-run akibat animasi smooth-scroll yang belum selesai.
  window.scrollTo = () => {};
  window.scrollBy = () => {};
  if (window.Element) Element.prototype.scrollIntoView = () => {};
})();
`;

const NORM_CSS = `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
html{scroll-behavior:auto!important}
:focus{outline:none!important}`;

function normalizeHtml(html) {
  return html
    .replace(/NA-\d{6}/g, "NA-XXXXXX")
    .replace(/\d{2}:\d{2}(?!\d)/g, "TT:TT");
}

async function gotoHash(page, hash) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await page.waitForTimeout(200);
}

async function captureView(page, hash, selector) {
  await gotoHash(page, hash);
  const html = await page.$eval(selector, (el) => el.outerHTML).catch(() => null);
  const shot = await page.screenshot({ fullPage: true, animations: "disabled" });
  return { html: html ? normalizeHtml(html) : null, shot };
}

async function driveBooking(page) {
  const caps = [];
  await gotoHash(page, "#/booking");
  const grab = async (label) => {
    await page.waitForTimeout(120);
    const html = await page.$eval("#view-booking", (el) => el.outerHTML);
    const shot = await page.screenshot({ fullPage: true, animations: "disabled" });
    caps.push({ label, html: normalizeHtml(html), shot });
  };

  await grab("booking-s1");
  // langkah 1 -> 2 : pilih tanggal pertama, lanjut
  await page.selectOption("#tanggal", { index: 1 });
  await page.click("#to2");
  await grab("booking-s2");

  // langkah 2 -> 3 : isi pemesan + peserta
  await page.fill("#nama", "Budi Parity");
  await page.fill("#hp", "081234567890");
  await page.fill("#email", "budi@example.com");
  const names = await page.$$(".pnama");
  const births = await page.$$(".plahir");
  const ids = await page.$$(".pid");
  for (let i = 0; i < names.length; i++) {
    await names[i].fill("Peserta " + (i + 1));
    await births[i].fill("1990-01-01");
    await ids[i].fill("3200000000000000");
  }
  await page.click("#to3");
  await grab("booking-s3");

  // langkah 3 -> 4 : setujui, bayar
  await page.check("#setuju");
  await page.click("#bayar");
  await grab("booking-s4");

  return caps;
}

async function captureAll(base) {
  const browser = await chromium.launch();
  const result = {}; // key -> {html, shot}
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(INIT);
    await ctx.route("**/*", (route) => {
      const u = route.request().url();
      if (u.startsWith("http") && !u.includes("127.0.0.1") && !u.includes("localhost")) {
        return route.abort();
      }
      return route.continue();
    });
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "load" });
    await page.addStyleTag({ content: NORM_CSS });
    await page.waitForTimeout(200);

    for (const [name, hash] of SUBPAGES) {
      const cap = await captureView(page, hash, "#view-home");
      result[`${vp.name}/${name}`] = cap;
    }
    const bookingCaps = await driveBooking(page);
    for (const c of bookingCaps) result[`${vp.name}/${c.label}`] = c;

    await ctx.close();
  }
  await browser.close();
  return result;
}

function pixelDiff(aBuf, bBuf, key) {
  const a = PNG.sync.read(aBuf);
  const b = PNG.sync.read(bBuf);
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, note: `dimensi beda ${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
  });
  const ratio = mismatched / (a.width * a.height);
  if (ratio > PIXEL_THRESHOLD) {
    mkdirSync(OUT, { recursive: true });
    const safe = key.replace(/[\\/]/g, "_");
    writeFileSync(resolve(OUT, `${safe}.baseline.png`), aBuf);
    writeFileSync(resolve(OUT, `${safe}.refactor.png`), bBuf);
    writeFileSync(resolve(OUT, `${safe}.diff.png`), PNG.sync.write(diff));
  }
  return { ratio, note: "" };
}

/* ── main ────────────────────────────────────────────────── */
function parseBaseline(argv) {
  // Prioritas: --baseline <ref> / --baseline=<ref>  >  env  >  default tag pre-1a
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--baseline") return argv[i + 1];
    if (a.startsWith("--baseline=")) return a.slice("--baseline=".length);
  }
  return process.env.PARITY_BASELINE || "pre-1a";
}

async function main() {
  // Baseline = ref git pembanding (tag/branch/sha). Default: tag `pre-1a`
  // (monolith beku sebelum modularisasi). Fase 5 memakai harness sama untuk
  // membandingkan situs-baca-API vs situs-baca-file: `npm run parity -- --baseline <ref>`.
  const BASELINE = parseBaseline(process.argv.slice(2));

  // Siapkan worktree baseline
  rmSync(WORKTREE, { recursive: true, force: true });
  try {
    execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });
  } catch {}
  execSync(`git worktree add --detach "${WORKTREE}" ${BASELINE}`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  const baselineSite = resolve(WORKTREE, "apps/site");
  const refactorSite = resolve(ROOT, "apps/site");
  if (!existsSync(join(baselineSite, "index.html"))) {
    throw new Error("baseline apps/site/index.html tidak ada di worktree");
  }

  const srvA = await staticServer(baselineSite);
  const srvB = await staticServer(refactorSite);
  const baseUrlA = `http://127.0.0.1:${srvA.address().port}`;
  const baseUrlB = `http://127.0.0.1:${srvB.address().port}`;

  console.log(`Baseline : ${BASELINE}  -> ${baseUrlA}`);
  console.log(`Refactor : working tree -> ${baseUrlB}`);
  console.log("Menangkap baseline…");
  const A = await captureAll(baseUrlA);
  console.log("Menangkap refactor…");
  const B = await captureAll(baseUrlB);

  srvA.close();
  srvB.close();
  execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });

  // Bandingkan
  const keys = Object.keys(A);
  let domFails = 0;
  let pixFails = 0;
  let maxRatio = 0;
  const rows = [];
  for (const k of keys) {
    const a = A[k];
    const b = B[k];
    const domOk = a.html === b.html && a.html !== null;
    const { ratio, note } = pixelDiff(a.shot, b.shot, k);
    maxRatio = Math.max(maxRatio, ratio);
    const pixOk = ratio <= PIXEL_THRESHOLD;
    if (!domOk) domFails++;
    if (!pixOk) pixFails++;
    rows.push(
      `${domOk ? "OK " : "DOM"} ${pixOk ? "OK " : "PIX"}  ${k.padEnd(22)} pix=${(ratio * 100).toFixed(4)}%${note ? " " + note : ""}`,
    );
  }

  console.log("\n── Hasil parity ──");
  for (const r of rows) console.log(r);
  console.log(
    `\nCapture: ${keys.length} | DOM gagal: ${domFails} | Pixel gagal: ${pixFails} | pixel maks: ${(maxRatio * 100).toFixed(4)}%`,
  );

  if (domFails > 0 || pixFails > 0) {
    console.error(
      `\nPARITY GAGAL. DOM diff harus 0 (sekarang ${domFails}), pixel < 0.1% (gagal ${pixFails}). Artefak: .parity-out/`,
    );
    process.exit(1);
  }
  console.log("\nPARITY LULUS — 0 selisih DOM, semua pixel < 0.1%.");
}

main().catch((e) => {
  console.error(e);
  try {
    execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });
  } catch {}
  process.exit(1);
});
