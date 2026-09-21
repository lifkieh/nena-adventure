#!/usr/bin/env node
/**
 * E2E panel (UI): CMS publish -> situs publik berubah -> revert kembali;
 * operasional tidak bisa tulis konten; viewer tidak bisa buka PII.
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, request } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3213;
const DB = "services/api/data/e2e-panel.db";
const base = `http://127.0.0.1:${PORT}`;
const OWNER_EMAIL = "owner@nena-adventure.id";
const OWNER_PASSWORD = "panel-owner-pass";
const PW = "Panel123xyz";
const HERO_ORIG = "Jelajahi Pulau Sangiang dan nikmati keindahannya";
const HERO_NEW = "UJI KONTEN CMS BERUBAH";

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
  throw new Error("API tidak siap.");
}
const env = { ...process.env, PORT: String(PORT), DB_PATH: DB, SESSION_SECRET: "e2e-panel-secret-123456", ENCRYPTION_KEY: "0".repeat(64), OWNER_EMAIL, OWNER_PASSWORD };

let child, ok = true;
const fail = (m) => { ok = false; console.error("FAIL:", m); };

async function loginUI(page, email, password) {
  await page.goto(base + "/panel/login", { waitUntil: "load" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForSelector("aside nav", { timeout: 8000 });
}

try {
  killPort(PORT);
  for (const ext of ["", "-wal", "-shm"]) rmSync(resolve(ROOT, DB + ext), { force: true });
  execSync("npm run build -w @nena/panel", { cwd: ROOT, stdio: "ignore" });
  execSync("npm run migrate", { cwd: ROOT, env, stdio: "ignore" });
  execSync("npm run seed", { cwd: ROOT, env, stdio: "ignore" });
  child = spawn("npm", ["run", "start", "-w", "@nena/api"], { cwd: ROOT, env, shell: true, stdio: "ignore" });
  await waitHealth();

  // Setup data via API (owner).
  const api = await request.newContext({ baseURL: base });
  await api.post("/api/auth/login", { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  await api.post("/api/admin/users", { data: { email: "ops@t.local", name: "Ops", role: "operasional", password: PW } });
  await api.post("/api/admin/users", { data: { email: "vw@t.local", name: "Vw", role: "viewer", password: PW } });
  const sch = await (await api.get("/api/admin/schedules?status=terbit")).json();
  const schedId = sch[0]?.id;
  const schedDate = sch[0]?.date;
  if (!schedId) fail("tidak ada jadwal terbit untuk booking manual");
  await api.post("/api/admin/bookings", { data: { scheduleId: schedId, packageKey: "reguler", meetingPoint: "anyer", pax: 1, paymentScheme: "lunas", customer: { name: "Peserta Uji", phone: "081200000000", email: "p@u.co" }, participants: [{ name: "Peserta Uji", idNumber: "3200000000009999" }] } });
  await api.dispose();

  const browser = await chromium.launch();

  // ── A. Owner: publish konten -> situs berubah -> revert ──
  const owner = await (await browser.newContext()).newPage();
  await loginUI(owner, OWNER_EMAIL, OWNER_PASSWORD);
  await owner.click('button:has-text("Konten")');
  await owner.click('a:has-text("Konten situs")');
  await owner.waitForSelector('[data-testid="hero-heading"]');
  // #3 terbitkan jujur: ketik lalu LANGSUNG Terbitkan (tanpa Save) -> tersimpan+terbit.
  await owner.fill('[data-testid="hero-heading"]', HERO_NEW);
  await owner.click('[data-testid="publish"]');
  await owner.waitForTimeout(700);

  const site = await (await browser.newContext()).newPage();
  await site.goto(base + "/#/", { waitUntil: "load" });
  await site.waitForFunction((t) => (document.querySelector("#view-home .hero2-copy h1")?.textContent || "") === t, HERO_NEW, { timeout: 8000 })
    .catch(() => fail("situs tidak menampilkan konten baru setelah publish"));

  // revert
  await owner.click('[data-testid="revert"]');
  await owner.waitForTimeout(600);
  const site2 = await (await browser.newContext()).newPage();
  await site2.goto(base + "/#/", { waitUntil: "load" });
  await site2.waitForFunction((t) => (document.querySelector("#view-home .hero2-copy h1")?.textContent || "") === t, HERO_ORIG, { timeout: 8000 })
    .catch(() => fail("revert tidak mengembalikan konten situs"));

  // ── FAQ slice: ubah 1 pertanyaan -> tampil di situs -> kembalikan ──
  const FAQ_ORIG = "Bagaimana cara membayar?";
  const FAQ_NEW = "UJI FAQ BERUBAH?";
  await owner.click('button:has-text("FAQ")');
  await owner.waitForSelector('[data-testid="faq-q-0"]', { timeout: 8000 });
  await owner.fill('[data-testid="faq-q-0"]', FAQ_NEW);
  await owner.click('[data-testid="publish"]');
  await owner.waitForTimeout(700);
  const faqSite = await (await browser.newContext()).newPage();
  await faqSite.goto(base + "/#/faq", { waitUntil: "load" });
  await faqSite.waitForFunction((t) => /UJI FAQ BERUBAH/.test(document.querySelector("#faq .faq summary")?.textContent || ""), FAQ_NEW, { timeout: 8000 })
    .catch(() => fail("FAQ baru tidak tampil di situs setelah publish"));
  // kembalikan
  await owner.fill('[data-testid="faq-q-0"]', FAQ_ORIG);
  await owner.click('[data-testid="publish"]');
  await owner.waitForTimeout(700);
  const faqSite2 = await (await browser.newContext()).newPage();
  await faqSite2.goto(base + "/#/faq", { waitUntil: "load" });
  await faqSite2.waitForFunction((t) => (document.querySelector("#faq .faq summary")?.textContent || "") === t, FAQ_ORIG, { timeout: 8000 })
    .catch(() => fail("FAQ tidak kembali ke pertanyaan asli"));

  // ── #4 Hapus jadwal ber-booking aktif -> ditolak lewat modal ──
  await owner.click('button:has-text("Operasional")');
  await owner.goto(base + "/panel/schedules", { waitUntil: "load" });
  await owner.waitForTimeout(600);
  let foundDel = false;
  for (let i = 0; i < 4; i++) {
    if (await owner.$(`[data-testid="del-${schedDate}"]`)) { foundDel = true; break; }
    await owner.click('button:has-text("›")'); await owner.waitForTimeout(400);
  }
  if (!foundDel) fail("jadwal ber-booking tak ketemu di kalender bulan mana pun");
  else {
    await owner.click(`[data-testid="del-${schedDate}"]`);
    await owner.waitForSelector('[data-testid="confirm-modal"]', { timeout: 5000 });
    await owner.click('[data-testid="confirm-ok"]');
    await owner.waitForTimeout(600);
    const schedErr = await owner.$eval('[data-testid="sched-error"]', (e) => e.textContent || "").catch(() => "");
    if (!/booking aktif/i.test(schedErr)) fail("hapus jadwal ber-booking tidak ditolak: " + schedErr);
  }

  // ── B. Operasional tidak bisa tulis konten ──
  const ops = await (await browser.newContext()).newPage();
  await loginUI(ops, "ops@t.local", PW);
  await ops.goto(base + "/panel/content", { waitUntil: "load" });
  await ops.waitForTimeout(500);
  const saveDisabled = await ops.getAttribute('[data-testid="save-draft"]', "disabled").catch(() => null);
  const headingDisabled = await ops.getAttribute('[data-testid="hero-heading"]', "disabled").catch(() => null);
  if (saveDisabled === null && headingDisabled === null) fail("operasional bisa menulis konten (harus read-only)");

  // ── C. Viewer tidak bisa buka PII ──
  const vw = await (await browser.newContext()).newPage();
  await loginUI(vw, "vw@t.local", PW);
  await vw.goto(base + "/panel/participants", { waitUntil: "load" });
  await vw.waitForSelector('[data-testid="lihat-peserta"]', { timeout: 8000 }).catch(() => fail("viewer tak lihat daftar peserta"));
  await vw.click('[data-testid="lihat-peserta"]');
  await vw.waitForTimeout(500);
  const bukaNik = await vw.$('[data-testid="buka-nik"]');
  const locked = await vw.$('[data-testid="pii-locked"]');
  if (bukaNik) fail("viewer melihat tombol Buka NIK (dilarang)");
  if (!locked) fail("viewer tidak melihat status PII terkunci");

  console.log(ok ? "\nE2E PANEL OK" : "\nE2E PANEL FAIL");
  await browser.close();
} catch (e) {
  fail(e.message || String(e));
} finally {
  try { execSync(`taskkill /pid ${child?.pid} /T /F`, { stdio: "ignore" }); } catch {}
  killPort(PORT);
}
process.exit(ok ? 0 : 1);
