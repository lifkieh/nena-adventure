#!/usr/bin/env node
/**
 * E2E situs publik (lewat UI): alur booking 4 langkah -> kode terbit -> upload
 * bukti lewat form -> status verifikasi_bukti + antrian verifikasi +1 ->
 * refresh -> "menunggu verifikasi" (timer berhenti). Plus penolakan 6MB/.exe
 * dengan pesan di layar, dan halaman jadwal saat schedules 500.
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3212;
const DB = "services/api/data/e2e.db";
const base = `http://127.0.0.1:${PORT}`;
const OWNER_EMAIL = "owner@nena-adventure.id";
const OWNER_PASSWORD = "e2e-owner-pass";

// PNG 1x1 valid (magic 89 50 4E 47 …).
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f9f0000000049454e44ae426082",
  "hex",
);

function killPort(port) {
  try {
    const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
    const pids = new Set();
    for (const l of out.split(/\r?\n/)) {
      if (l.includes(":" + port + " ")) {
        const c = l.trim().split(/\s+/);
        const pid = c[c.length - 1];
        if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
    }
    for (const pid of pids) try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" }); } catch {}
  } catch {}
}

async function waitHealth(ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(base + "/api/health")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("API e2e tidak siap.");
}

const env = {
  ...process.env,
  PORT: String(PORT),
  DB_PATH: DB,
  SESSION_SECRET: "e2e-secret-abcdef-1234567890",
  ENCRYPTION_KEY: "0".repeat(64),
  OWNER_EMAIL,
  OWNER_PASSWORD,
};

let child;
let ok = true;
const fail = (m) => { ok = false; console.error("FAIL:", m); };

async function queueCount() {
  const api = await request.newContext({ baseURL: base });
  await api.post("/api/auth/login", { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const res = await api.get("/api/admin/payments/queue");
  const arr = await res.json();
  await api.dispose();
  return Array.isArray(arr) ? arr.length : -1;
}

async function bukti(page) {
  return page.$eval("#buktiHint", (el) => el.textContent || "").catch(() => "");
}

try {
  killPort(PORT);
  for (const ext of ["", "-wal", "-shm"]) rmSync(resolve(ROOT, DB + ext), { force: true });
  execSync("npm run migrate", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed:parity", { cwd: ROOT, env, stdio: "ignore" });
  child = spawn("npm", ["run", "start", "-w", "@nena/api"], { cwd: ROOT, env, shell: true, stdio: "ignore" });
  await waitHealth();

  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  // ── Alur booking 4 langkah ──
  await page.goto(base + "/#/booking", { waitUntil: "load" });
  await page.waitForSelector('#tanggal option[value]:not([value=""])', { state: "attached", timeout: 10000 });
  await page.click("#minus");
  await page.selectOption("#tanggal", { index: 1 });
  await page.click("#to2");
  await page.fill("#nama", "Nena QA");
  await page.fill("#hp", "081234567890");
  await page.fill("#email", "qa@nena.co");
  await page.fill(".pnama", "Nena QA");
  await page.fill(".plahir", "1990-01-01");
  await page.fill(".pid", "3200000000000001");
  await page.click("#to3");
  await page.check("#setuju");
  await page.click("#bayar");
  await page.waitForFunction(() => {
    const t = document.getElementById("kode")?.textContent || "";
    return /NA-\d{6}/.test(t) && t !== "NA-000000";
  }, { timeout: 10000 }).catch(() => fail("kode tidak terbit"));
  const kode = await page.$eval("#kode", (el) => el.textContent);

  const qBefore = await queueCount();

  // ── Tolak 6MB (validasi klien, tampil di layar) ──
  await page.setInputFiles("#buktiUpload", { name: "besar.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(6 * 1024 * 1024, 1) });
  await page.waitForTimeout(400);
  if (!/5MB/i.test(await bukti(page))) fail("6MB tidak ditolak di layar");
  if ((await page.$eval("#kode", (e) => e.textContent)) !== kode) fail("kode hilang setelah gagal 6MB");

  // ── Tolak .exe menyamar .jpg (magic bytes server) ──
  await page.setInputFiles("#buktiUpload", { name: "virus.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]) });
  await page.waitForTimeout(800);
  const exeMsg = await bukti(page);
  if (!/JPG|PNG|PDF|coba lagi|valid/i.test(exeMsg)) fail("exe-as-jpg tidak ditolak di layar: " + exeMsg);
  if ((await page.$eval("#kode", (e) => e.textContent)) !== kode) fail("kode hilang setelah gagal exe");

  // ── Upload PNG valid ──
  await page.setInputFiles("#buktiUpload", { name: "bukti.png", mimeType: "image/png", buffer: PNG });
  await page.waitForFunction(() => /Menunggu verifikasi/i.test(document.getElementById("buktiHint")?.textContent || ""), { timeout: 10000 })
    .catch(() => fail("upload PNG: pesan menunggu verifikasi tidak muncul"));

  // Antrian verifikasi bertambah 1 (bukti masuk -> payment pending).
  const qAfter = await queueCount();
  if (qAfter !== qBefore + 1) fail(`antrian verifikasi tidak +1 (before=${qBefore}, after=${qAfter})`);

  // ── Refresh -> menunggu verifikasi, timer berhenti ──
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => /Menunggu verifikasi/i.test(document.getElementById("buktiHint")?.textContent || ""), { timeout: 10000 })
    .catch(() => fail("refresh: tidak menampilkan menunggu verifikasi"));
  const timerTxt = await page.$eval("#timer", (el) => el.textContent || "").catch(() => "");
  if (/\d{2}:\d{2}/.test(timerTxt)) fail("refresh: timer masih berjalan (" + timerTxt + ")");
  const kodeAfter = await page.$eval("#kode", (e) => e.textContent).catch(() => "");
  if (kodeAfter !== kode) fail("refresh: kode hilang");

  // ── Jadwal saat schedules 500 -> netral + WhatsApp ──
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.route("**/api/public/schedules", (r) =>
    r.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"INTERNAL","message":"x"}}' }));
  await page2.goto(base + "/#/jadwal", { waitUntil: "load" });
  await page2.waitForTimeout(1000);
  const monthsText = await page2.$eval("#months", (el) => el.textContent || "").catch(() => "");
  if (!/whatsapp/i.test(monthsText)) fail("jadwal 500: tidak ada WhatsApp");
  if (/penuh/i.test(monthsText)) fail("jadwal 500: menampilkan 'penuh'");

  console.log("kode:", kode, "| queue:", qBefore, "->", qAfter, "| timer refresh:", JSON.stringify(timerTxt));
  console.log(ok ? "\nE2E OK" : "\nE2E FAIL");
  await browser.close();
} catch (e) {
  fail(e.message || String(e));
} finally {
  try { execSync(`taskkill /pid ${child?.pid} /T /F`, { stdio: "ignore" }); } catch {}
  killPort(PORT);
}
process.exit(ok ? 0 : 1);
