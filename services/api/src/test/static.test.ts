import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { repoRoot } from "../db/paths.js";

/**
 * Regression: bug wildcard:false pernah membuat SELURUH modul JS situs dilayani
 * sebagai text/html (jatuh ke SPA fallback) sehingga situs mati total, tanpa
 * tertangkap test apa pun. Test ini menjaga kontacт MIME + fallback SPA.
 */
describe("penyajian statis apps/site (via Fastify)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("modul JS dilayani 200 + content-type javascript", async () => {
    const res = await app.inject({ method: "GET", url: "/src/router.js" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
  });

  it("data modul di subfolder juga terlayani (bukan fallback)", async () => {
    const res = await app.inject({ method: "GET", url: "/src/data/harga.js" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
  });

  it("CSS dilayani 200 + content-type text/css", async () => {
    const res = await app.inject({ method: "GET", url: "/styles/01-base.css" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/css/);
  });

  it("halaman utama dilayani sebagai text/html", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
  });

  it("rute tak dikenal jatuh ke SPA fallback index.html (text/html)", async () => {
    const res = await app.inject({ method: "GET", url: "/rute-tidak-ada" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.body).toContain("<title>Nena Adventure");
  });

  it("endpoint /api tak dikenal tetap JSON error seragam (bukan SPA)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tidak-ada" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

/**
 * Regression Gate 2: panel disajikan API di /panel (HTML PANEL, bukan situs),
 * dengan SPA fallback panel sendiri. /panel/** & /api/** TIDAK boleh tertangkap
 * fallback situs publik. Test ini gagal bila urutan fallback lama dikembalikan.
 */
describe("penyajian panel /panel (via Fastify)", () => {
  let app: FastifyInstance;
  const PANEL_DIST = resolve(repoRoot, "apps/panel/dist");

  beforeAll(async () => {
    // Pastikan panel sudah di-build (buildApp menangkap status saat dipanggil).
    if (!existsSync(resolve(PANEL_DIST, "index.html"))) {
      execSync("npm run build -w @nena/panel", { cwd: repoRoot, stdio: "ignore" });
    }
    app = await buildApp();
    await app.ready();
  }, 180_000);

  afterAll(async () => {
    await app.close();
  });

  function firstPanelJs(): string {
    const assets = resolve(PANEL_DIST, "assets");
    const js = readdirSync(assets).find((f) => f.endsWith(".js"));
    if (!js) throw new Error("tidak ada bundel .js di dist/assets");
    return js;
  }

  it("/panel/login -> 200 HTML PANEL (bukan situs publik)", async () => {
    const res = await app.inject({ method: "GET", url: "/panel/login" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.body).toContain('id="root"'); // penanda unik panel
    expect(res.body).toContain("Panel Admin");
    expect(res.body).not.toContain("<title>Nena Adventure"); // bukan situs
  });

  it("/panel/assets/<file>.js -> 200 + MIME javascript", async () => {
    const js = firstPanelJs();
    const res = await app.inject({ method: "GET", url: `/panel/assets/${js}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/javascript/);
  });

  it("/panel/rute-ngawur -> 200 HTML panel (fallback panel, bukan situs)", async () => {
    const res = await app.inject({ method: "GET", url: "/panel/rute-ngawur" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.body).toContain('id="root"');
    expect(res.body).not.toContain("<title>Nena Adventure");
  });

  it("/ tetap HTML situs publik (bukan panel)", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>Nena Adventure");
    expect(res.body).not.toContain('id="root"');
  });

  it("/api/tidak-ada tetap 404 JSON", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tidak-ada" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
