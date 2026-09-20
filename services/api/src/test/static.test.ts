import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

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
