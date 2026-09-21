#!/usr/bin/env node
/**
 * E2E situs publik: jalankan alur booking 4 langkah sampai kode terbit,
 * lalu refresh dan pastikan kode + timer masih ada (persistensi sessionStorage).
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3212;
const DB = "services/api/data/e2e.db";
const base = `http://127.0.0.1:${PORT}`;

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
};

let child;
let ok = true;
const fail = (m) => { ok = false; console.error("FAIL:", m); };

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

  await page.goto(base + "/#/booking", { waitUntil: "load" });
  await page.waitForSelector('#tanggal option[value]:not([value=""])', { state: "attached", timeout: 10000 });
  await page.click("#minus"); // pax -> 1
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

  // Kode terbit dari server (bukan placeholder "NA-000000").
  await page.waitForFunction(() => {
    const t = document.getElementById("kode")?.textContent || "";
    return /NA-\d{6}/.test(t) && t !== "NA-000000";
  }, { timeout: 10000 }).catch(() => fail("kode tidak terbit"));
  const kode = await page.$eval("#kode", (el) => el.textContent);
  if (!/NA-\d{6}/.test(kode || "")) fail("format kode salah: " + kode);

  const saved = await page.evaluate(() => sessionStorage.getItem("nena_booking"));
  if (!saved || !saved.includes(kode)) fail("sessionStorage tidak menyimpan kode");
  // Tidak boleh menyimpan NIK/peserta di sessionStorage.
  if (saved && (saved.includes("3200000000000001") || saved.toLowerCase().includes("nik"))) {
    fail("sessionStorage menyimpan NIK (dilarang)");
  }

  // REFRESH -> kode + timer harus bertahan.
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction((k) => document.getElementById("kode")?.textContent === k, kode, { timeout: 10000 })
    .catch(() => fail("kode hilang setelah refresh"));
  const s4visible = await page.evaluate(() => {
    const s4 = document.getElementById("s4");
    return s4 && !s4.classList.contains("hidden");
  });
  if (!s4visible) fail("langkah 4 tidak tampil setelah refresh");
  const timer = await page.$eval("#timer", (el) => el.textContent || "");
  if (!/\d{2}:\d{2}|kedaluwarsa/.test(timer)) fail("timer kosong setelah refresh: " + timer);

  console.log("kode:", kode, "| timer:", timer);

  // Skenario schedules 500 -> halaman jadwal keadaan netral + WhatsApp, bukan "penuh".
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.route("**/api/public/schedules", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"INTERNAL","message":"x"}}' }),
  );
  await page2.goto(base + "/#/jadwal", { waitUntil: "load" });
  await page2.waitForTimeout(1000);
  const monthsText = await page2.$eval("#months", (el) => el.textContent || "").catch(() => "");
  if (!/whatsapp/i.test(monthsText)) fail("jadwal 500: tidak ada tautan WhatsApp netral");
  if (/penuh/i.test(monthsText)) fail("jadwal 500: menampilkan 'penuh' (dilarang)");
  const waLink = await page2.$("#months a[href*='wa.me']");
  if (!waLink) fail("jadwal 500: tautan wa.me tidak ada");

  console.log(ok ? "\nE2E OK" : "\nE2E FAIL");
  await browser.close();
} catch (e) {
  fail(e.message);
} finally {
  try { execSync(`taskkill /pid ${child?.pid} /T /F`, { stdio: "ignore" }); } catch {}
  killPort(PORT);
}
process.exit(ok ? 0 : 1);
