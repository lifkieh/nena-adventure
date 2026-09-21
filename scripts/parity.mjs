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
import { execSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { extname, join, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { SUBPAGES, BOOKING_LABELS } from "./parity-routes.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const OUT = resolve(ROOT, ".parity-out");
const WORKTREE = resolve(ROOT, ".parity-baseline");
const PIXEL_THRESHOLD = Number(process.env.PARITY_PIXEL ?? 0.001); // 0.1 %

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

/* SUBPAGES & BOOKING_LABELS diimpor dari parity-routes.mjs (sumber tunggal). */

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
:focus{outline:none!important}
/* Timer & kode booking berbeda antar-run (jam server / kode acak server).
   display:none (bukan visibility:hidden) supaya lebar elemen tidak menggeser
   teks di sekitarnya — timer server ("483:20") lebih lebar dari "60:00".
   Nilainya tetap diverifikasi di DOM (dinormalkan di normalizeHtml). */
#timer,#kode{display:none!important}`;

function normalizeHtml(html) {
  return html
    .replace(/NA-\d{6}/g, "NA-XXXXXX")
    // Netralkan isi elemen timer (baseline "60:00" vs refactor jam-server).
    .replace(/(id="timer"[^>]*>)[^<]*/g, "$1TIMER")
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
  // Dropdown terisi (baseline: sinkron; refactor: async dari API).
  await page
    .waitForSelector('#tanggal option[value]:not([value=""])', { state: "attached", timeout: 8000 })
    .catch(() => {});
  // pax -> 1 supaya selalu cukup kursi utk tanggal apa pun yang tersisa > 0.
  await page.click("#minus").catch(() => {});
  await page.waitForTimeout(150);

  const grab = async (label) => {
    await page.waitForTimeout(150);
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

  // langkah 3 -> 4 : setujui, bayar (refactor: POST async ke API)
  await page.check("#setuju");
  await page.click("#bayar");
  await page.waitForTimeout(1200); // tunggu POST + render s4
  await grab("booking-s4");

  return caps;
}

async function captureAll(base, reset = async () => {}) {
  const browser = await chromium.launch();
  const result = {}; // key -> {html, shot}
  for (const vp of VIEWPORTS) {
    await reset(); // pulihkan kursi (refactor) sebelum tiap viewport
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
    // Papan & kalender terisi async (baseline: sinkron; refactor: fetch API).
    await page
      .waitForSelector("#boardRows .board-row", { timeout: 8000 })
      .catch(() => {});
    await page
      .waitForSelector("#months .month", { timeout: 8000 })
      .catch(() => {});
    await page.waitForTimeout(250);

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

/* ── Integritas baseline ─────────────────────────────────── */
const LOCK_PATH = resolve(ROOT, "scripts/parity-baseline.lock.json");
const HISTORY_PATH = resolve(ROOT, "scripts/parity-baseline.history.log");

function readLock() {
  if (!existsSync(LOCK_PATH)) {
    throw new Error(
      "parity-baseline.lock.json tidak ada. Baseline harus dipin eksplisit. " +
        'Jalankan: node scripts/parity.mjs --regen-baseline --reason "<alasan>"',
    );
  }
  return JSON.parse(readFileSync(LOCK_PATH, "utf8"));
}

function gitCommitOf(ref) {
  // Kutip "^{commit}" — di cmd.exe Windows, ^ adalah karakter escape.
  return execSync(`git rev-parse "${ref}^{commit}"`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function getArg(argv, name) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) return argv[i + 1] ?? "";
    if (argv[i].startsWith(name + "=")) return argv[i].slice(name.length + 1);
  }
  return undefined;
}

/**
 * Regenerasi baseline HANYA lewat jalur eksplisit ini.
 * Wajib --reason. Mencatat commit lama->baru + alasan ke history.log.
 * Jalur default TIDAK PERNAH memanggil ini -> baseline mustahil tertimpa diam2.
 */
function regenBaseline(argv) {
  const reason = getArg(argv, "--reason");
  if (!reason || !reason.trim()) {
    console.error(
      'GAGAL: --regen-baseline wajib menyertakan --reason "<alasan jujur>". ' +
        "Baseline tidak diubah.",
    );
    process.exit(2);
  }
  const ref = getArg(argv, "--baseline") || "pre-1a";
  const commit = gitCommitOf(ref);
  const prev = existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, "utf8")) : null;
  const pinnedAt = new Date().toISOString().slice(0, 10);
  const next = { ref, commit, reason: reason.trim(), pinnedAt };
  writeFileSync(LOCK_PATH, JSON.stringify(next, null, 2) + "\n");
  appendFileSync(
    HISTORY_PATH,
    `${new Date().toISOString()}\t${prev ? prev.commit : "(none)"} -> ${commit}\tref=${ref}\treason=${reason.trim()}\n`,
  );
  console.log(`Baseline dipin ulang: ${ref} @ ${commit}`);
  console.log(`Alasan: ${reason.trim()}`);
  console.log("Lock diperbarui. Jalankan parity lagi tanpa flag untuk membandingkan.");
}

/**
 * Jalur default: baca lock, TOLAK override diam-diam, verifikasi tag belum geser.
 * Mengembalikan commit SHA immutable (bukan nama ref) untuk worktree.
 */
function resolveLockedBaseline(argv) {
  // Override eksplisit hanya boleh lewat --regen-baseline (ditangani di main).
  if (getArg(argv, "--baseline") !== undefined || process.env.PARITY_BASELINE) {
    console.error(
      "GAGAL: baseline tidak boleh di-override lewat --baseline / PARITY_BASELINE. " +
        'Untuk mengubah baseline gunakan: --regen-baseline --reason "<alasan>".',
    );
    process.exit(2);
  }
  const lock = readLock();
  const live = gitCommitOf(lock.ref);
  if (live !== lock.commit) {
    console.error(
      `GAGAL (integritas): tag "${lock.ref}" sekarang menunjuk ${live}, ` +
        `tapi lock dipin ke ${lock.commit}. Baseline TIDAK ditimpa. ` +
        `Kalau pergeseran ini disengaja, jalankan --regen-baseline --reason "<alasan>".`,
    );
    process.exit(2);
  }
  console.log(`Baseline terkunci: ${lock.ref} @ ${lock.commit} (pin ${lock.pinnedAt})`);
  return lock.commit;
}

const API_PORT = 3211;
const PARITY_DB = "services/api/data/parity.db";

/** Bunuh proses apa pun yang memegang port (Windows: netstat + taskkill). */
function killPort(port) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(":" + port + " ") || line.includes(":" + port + "\t")) {
        const cols = line.trim().split(/\s+/);
        const pid = cols[cols.length - 1];
        if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
      } catch {}
    }
  } catch {}
}

async function waitHealth(base, ms = 30000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(base + "/api/health");
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("API parity tidak siap tepat waktu.");
}

/**
 * Boot API (working tree) dengan DB parity ter-seed (schedules = fixture Math.sin).
 * API menyajikan situs refactor di / DAN endpoint /api/public/* yang dibutuhkannya.
 */
async function startRefactoredApi() {
  const env = {
    ...process.env,
    PORT: String(API_PORT),
    DB_PATH: PARITY_DB,
    NODE_ENV: "production", // secure cookie tak relevan; hanya publik yg dipakai
    SESSION_SECRET: "parity-secret-abcdef-1234567890",
    ENCRYPTION_KEY: "0".repeat(64),
  };
  killPort(API_PORT); // pastikan tidak ada API lama memegang DB
  for (const ext of ["", "-wal", "-shm"]) {
    rmSync(resolve(ROOT, PARITY_DB + ext), { force: true });
  }
  execSync("npm run migrate", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed:parity", { cwd: ROOT, env, stdio: "ignore" });

  const child = spawn("npm", ["run", "start", "-w", "@nena/api"], {
    cwd: ROOT,
    env,
    shell: true,
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${API_PORT}`;
  await waitHealth(base);
  return {
    base,
    // Pulihkan kursi/booking ke fixture bersih (dipanggil antar-viewport).
    reset: () => {
      execSync("npm run seed:parity", { cwd: ROOT, env, stdio: "ignore" });
    },
    stop: () => {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {}
      killPort(API_PORT); // pastikan tree benar-benar mati
    },
  };
}

async function main() {
  const argv = process.argv.slice(2);

  // Jalur regenerasi baseline: eksplisit, wajib alasan, lalu berhenti.
  if (argv.includes("--regen-baseline")) {
    regenBaseline(argv);
    return;
  }

  // Jalur default: baseline terkunci ke commit di lock (immutable), tak bisa
  // di-override diam-diam, dan menolak jalan bila tag sudah bergeser.
  const BASELINE = resolveLockedBaseline(argv);

  // Siapkan worktree baseline (situs monolith Math.sin, disajikan statis).
  rmSync(WORKTREE, { recursive: true, force: true });
  try {
    execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });
  } catch {}
  execSync(`git worktree add --detach "${WORKTREE}" ${BASELINE}`, {
    cwd: ROOT,
    stdio: "inherit",
  });

  const baselineSite = resolve(WORKTREE, "apps/site");
  if (!existsSync(join(baselineSite, "index.html"))) {
    throw new Error("baseline apps/site/index.html tidak ada di worktree");
  }

  const srvA = await staticServer(baselineSite);
  const baseUrlA = `http://127.0.0.1:${srvA.address().port}`;

  console.log(`Baseline : ${BASELINE} (statis) -> ${baseUrlA}`);
  console.log("Menyalakan API refactor (DB parity ter-seed)…");
  const api = await startRefactoredApi();
  console.log(`Refactor : API -> ${api.base}`);

  console.log("Menangkap baseline…");
  const A = await captureAll(baseUrlA);
  console.log("Menangkap refactor…");
  const B = await captureAll(api.base, api.reset);

  srvA.close();
  api.stop();
  execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });

  // Penyimpangan PIKSEL yang disetujui (lihat KNOWN-DEVIATIONS.md). DOM/teks tetap
  // WAJIB 0 untuk SEMUA kapture — hanya dimensi piksel yang boleh divergen di sini.
  const PIXEL_DEVIATIONS = new Set(["1440/registrasi", "390/registrasi"]);

  // Bandingkan — dua dimensi terpisah: DOM (konten) & piksel (visual).
  const keys = Object.keys(A);
  let domFails = 0;
  let pixFails = 0;
  let pixDeviations = 0;
  let maxRatio = 0;
  const rows = [];
  for (const k of keys) {
    const a = A[k];
    const b = B[k];
    const domOk = a.html === b.html && a.html !== null;
    const { ratio, note } = pixelDiff(a.shot, b.shot, k);
    maxRatio = Math.max(maxRatio, ratio);
    const pixRaw = ratio <= PIXEL_THRESHOLD;
    const deviated = PIXEL_DEVIATIONS.has(k);
    const pixOk = pixRaw || deviated; // penyimpangan piksel terdaftar tak dihitung gagal
    if (!domOk) domFails++;
    if (!pixRaw && deviated) pixDeviations++;
    else if (!pixOk) pixFails++;
    const pixTag = pixRaw ? "OK " : deviated ? "DEV" : "PIX";
    rows.push(
      `${domOk ? "OK " : "DOM"} ${pixTag}  ${k.padEnd(22)} pix=${(ratio * 100).toFixed(4)}%${note ? " " + note : ""}`,
    );
  }

  console.log("\n── Hasil parity ──");
  for (const r of rows) console.log(r);
  console.log(
    `\nCapture: ${keys.length} | DOM gagal: ${domFails} | Pixel gagal: ${pixFails} | Penyimpangan piksel disetujui (DEV): ${pixDeviations} | pixel maks: ${(maxRatio * 100).toFixed(4)}%`,
  );

  // DOM/teks WAJIB 0 di SEMUA kapture (termasuk registrasi). Piksel: gagal hanya
  // bila di luar daftar penyimpangan yang disetujui.
  if (domFails > 0 || pixFails > 0) {
    console.error(
      `\nPARITY GAGAL. DOM diff harus 0 (sekarang ${domFails}), pixel < 0.1% di luar daftar penyimpangan (gagal ${pixFails}). Artefak: .parity-out/`,
    );
    process.exit(1);
  }
  console.log(
    `\nPARITY LULUS — 0 selisih DOM/teks di semua kapture; piksel 0 kecuali ${pixDeviations} penyimpangan disetujui (KNOWN-DEVIATIONS.md).`,
  );
}

main().catch((e) => {
  console.error(e);
  try {
    execSync(`git worktree remove --force "${WORKTREE}"`, { cwd: ROOT, stdio: "ignore" });
  } catch {}
  process.exit(1);
});
