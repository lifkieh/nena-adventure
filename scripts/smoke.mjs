#!/usr/bin/env node
/**
 * Smoke di server dev hidup (nena.db): booking tiap paket, buka semua halaman
 * panel + detail booking di >=3 status, content:verify + packages:verify,
 * lalu bersihkan data uji lewat TRANSISI LEGAL (batal). Cetak hasil.
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3222;
const base = `http://127.0.0.1:${PORT}`;
// DB TERPISAH — smoke tidak boleh menulis ke database dev (nena.db).
const DB = "services/api/data/smoke.db";
const OWNER_EMAIL = "owner@nena-adventure.id";
const OWNER_PASSWORD = "smoke-owner-pass";
const env = { ...process.env, PORT: String(PORT), DB_PATH: DB, SESSION_SECRET: "smoke-secret-1234567890", ENCRYPTION_KEY: "0".repeat(64), OWNER_EMAIL, OWNER_PASSWORD };

let ok = true;
const fail = (m) => { ok = false; console.error("FAIL:", m); };
const log = (m) => console.log(m);

function killPort(port) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const l of out.split(/\r?\n/)) if (l.includes(":" + port + " ")) { const c = l.trim().split(/\s+/); const pid = c[c.length - 1]; if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid); }
    for (const pid of pids) try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" }); } catch {}
  } catch {}
}
async function waitHealth(ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if ((await fetch(base + "/api/health")).ok) return; } catch {} await new Promise((r) => setTimeout(r, 400)); }
  throw new Error("API smoke tidak siap.");
}

async function bookPkg(browser, pkg, pax, expectTotal) {
  const p = await (await browser.newContext()).newPage();
  await p.goto(base + "/#/booking?pkg=" + pkg, { waitUntil: "load" });
  await p.waitForSelector('#tanggal option[value]:not([value=""])', { state: "attached", timeout: 10000 });
  const anyer = await p.$('input[name="mp"][data-mp="anyer"]'); if (anyer) await anyer.check().catch(() => {});
  for (let i = 0; i < 6; i++) await p.click("#minus").catch(() => {});
  for (let i = 1; i < pax; i++) await p.click("#plus").catch(() => {});
  await p.selectOption("#tanggal", { index: 1 });
  await p.click("#to2");
  await p.fill("#nama", "SMOKE " + pkg); await p.fill("#hp", "081299990000"); await p.fill("#email", "smoke@x.co");
  const names = await p.$$(".pnama"), births = await p.$$(".plahir"), ids = await p.$$(".pid");
  for (let i = 0; i < names.length; i++) { await names[i].fill("Peserta " + i); await births[i].fill("1990-01-01"); await ids[i].fill("32000000000010" + i); }
  await p.click("#to3");
  await p.check("#setuju");
  await p.click("#bayar");
  await p.waitForFunction(() => { const t = document.getElementById("kode")?.textContent || ""; return /NA-\d{6}/.test(t) && t !== "NA-000000"; }, { timeout: 10000 }).catch(() => fail(`booking ${pkg} gagal`));
  const kode = await p.$eval("#kode", (e) => e.textContent);
  const recap = await p.$eval("#recap", (e) => e.textContent || "");
  if (!recap.includes(expectTotal)) fail(`total ${pkg} salah (harap ${expectTotal})`);
  await p.context().close();
  log(`  booking ${pkg}: ${kode} total ${expectTotal} OK`);
  return kode;
}

let child;
try {
  killPort(PORT);
  log("Siapkan smoke.db terisolasi (bukan nena.db)…");
  for (const ext of ["", "-wal", "-shm"]) rmSync(resolve(ROOT, DB + ext), { force: true });
  execSync("npm run migrate", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed", { cwd: ROOT, env, stdio: "ignore" });

  log("content:verify + packages:verify…");
  try { execSync("npm run content:verify", { cwd: ROOT, env, stdio: "inherit" }); } catch { fail("content:verify GAGAL"); }
  try { execSync("npm run packages:verify", { cwd: ROOT, env, stdio: "inherit" }); } catch { fail("packages:verify GAGAL"); }

  execSync("npm run build -w @nena/panel", { cwd: ROOT, stdio: "ignore" });
  child = spawn("npm", ["run", "start", "-w", "@nena/api"], { cwd: ROOT, env, shell: true, stdio: "ignore" });
  await waitHealth();

  const browser = await chromium.launch();
  log("Booking tiap paket lewat UI:");
  const codes = [];
  codes.push(await bookPkg(browser, "reguler", 1, "Rp390.000"));
  codes.push(await bookPkg(browser, "premium", 1, "Rp530.000"));
  codes.push(await bookPkg(browser, "private", 2, "Rp4.505.000"));

  // API owner: siapkan 3 status berbeda + kumpulkan id.
  const api = await request.newContext({ baseURL: base });
  await api.post("/api/auth/login", { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const idOf = async (code) => {
    const r = await (await api.get(`/api/admin/bookings?search=${code}`)).json();
    return r.items[0]?.id;
  };
  const ids = [];
  for (const c of codes) ids.push(await idOf(c));
  // status: A menunggu_bayar (biar), B verifikasi_bukti, C siap_jalan.
  await api.post(`/api/admin/bookings/${ids[1]}/transition`, { data: { action: "submit_proof" } });
  await api.post(`/api/admin/bookings/${ids[2]}/transition`, { data: { action: "submit_proof" } });
  await api.post(`/api/admin/bookings/${ids[2]}/transition`, { data: { action: "approve_full" } });
  log("  status disetel: menunggu_bayar / verifikasi_bukti / siap_jalan");

  // Panel: login + buka semua halaman + detail 3 status.
  const pg = await (await browser.newContext()).newPage();
  await pg.goto(base + "/panel/login", { waitUntil: "load" });
  await pg.fill("#email", OWNER_EMAIL); await pg.fill("#password", OWNER_PASSWORD);
  await pg.click('button[type="submit"]'); await pg.waitForSelector("aside nav", { timeout: 8000 });
  const pages = ["/panel/", "/panel/bookings", "/panel/verification", "/panel/schedules", "/panel/participants", "/panel/packages", "/panel/settings", "/panel/content", "/panel/media", "/panel/users", "/panel/audit"];
  for (const route of pages) {
    await pg.goto(base + route, { waitUntil: "load" });
    await pg.waitForTimeout(400);
    if (await pg.$('[data-testid="route-error"]')) fail("halaman error: " + route);
    if (!(await pg.$("h2, h1"))) fail("halaman kosong: " + route);
  }
  log(`  ${pages.length} halaman panel terbuka tanpa error`);
  const RAW = /baru_masuk|menunggu_bayar|verifikasi_bukti|menunggu_pelunasan|siap_jalan|kadaluarsa/;
  for (const id of ids) {
    await pg.goto(base + "/panel/bookings/" + id, { waitUntil: "load" });
    await pg.waitForSelector("[data-action]", { timeout: 8000 }).catch(() => fail("detail tak render: " + id));
    const txt = await pg.$eval("main", (e) => e.innerText || "");
    if (RAW.test(txt)) fail("enum mentah di detail " + id + ": " + (txt.match(RAW) || [])[0]);
  }
  log("  detail booking 3 status: tak ada enum mentah");

  // Kalender: buka Oktober 2026, pastikan 31 tampil dgn chip Terbit.
  await pg.goto(base + "/panel/schedules", { waitUntil: "load" });
  await pg.waitForTimeout(600);
  await pg.click('button:has-text("Tampilkan kalender")').catch(() => {});
  await pg.waitForTimeout(400);
  for (let i = 0; i < 6; i++) {
    const label = await pg.$$eval("b", (els) => els.map((e) => e.textContent || "").find((t) => /20\d\d/.test(t)) || "").catch(() => "");
    if (/Oktober 2026/.test(label)) break;
    await pg.click('button:has-text("›")'); await pg.waitForTimeout(400);
  }
  const cell31 = await pg.$('[data-testid="cal-2026-10-31"]');
  if (!cell31) fail("31 Oktober 2026 tidak ada di kalender");
  else {
    const t31 = await cell31.innerText();
    if (!/Terbit/i.test(t31)) fail("31 Okt 2026 tanpa chip Terbit: " + t31);
    else log("  kalender Oktober 2026: tanggal 31 tampil dengan chip Terbit");
  }

  // Bersihkan data uji lewat transisi legal (batal).
  for (let i = 0; i < ids.length; i++) {
    const res = await api.post(`/api/admin/bookings/${ids[i]}/cancel`, { data: { reason: "Pembersihan smoke test (transisi legal)." } });
    if (res.status() !== 200) fail(`cancel ${codes[i]} gagal: ${res.status()}`);
  }
  log(`  ${ids.length} booking uji dibatalkan via transisi legal`);
  await api.dispose();
  await browser.close();

  log(ok ? "\nSMOKE OK" : "\nSMOKE FAIL");
} catch (e) {
  fail(e.message || String(e));
} finally {
  try { execSync(`taskkill /pid ${child?.pid} /T /F`, { stdio: "ignore" }); } catch {}
  killPort(PORT);
}
process.exit(ok ? 0 : 1);
