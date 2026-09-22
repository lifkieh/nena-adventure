import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

/**
 * Setiap route /api/admin/** WAJIB mendeklarasikan izin (config.permission +
 * requirePermission). Test ini gagal bila ada route admin tanpa izin.
 */
describe("proteksi route admin", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it("semua /api/admin/** punya requirePermission", () => {
    const adminRoutes = app.registeredRoutes.filter((r) =>
      r.url.startsWith("/api/admin"),
    );
    expect(adminRoutes.length).toBeGreaterThan(0);
    const missing = adminRoutes.filter((r) => r.permission === null);
    expect(
      missing.map((r) => `${r.method} ${r.url}`),
      "route admin tanpa requirePermission",
    ).toEqual([]);
  });
});
