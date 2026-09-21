import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { seedOperationalSchedules } from "../db/seed-schedules.js";
import { sqliteConn } from "../db/client.js";
import * as schedulesRepo from "../repos/schedules.repo.js";

/**
 * Integrasi: setelah seed jadwal pada DB kosong, GET /api/public/schedules
 * mengembalikan minimal 20 tanggal berstatus open. Seed idempoten.
 */
describe("seed jadwal operasional", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  it(">= 20 tanggal open, dan idempoten", async () => {
    const added = seedOperationalSchedules(3);
    expect(added).toBeGreaterThanOrEqual(20);

    const res = await app.inject({ method: "GET", url: "/api/public/schedules" });
    expect(res.statusCode).toBe(200);
    const list = res.json() as { date: string; remaining: number }[];
    expect(list.length).toBeGreaterThanOrEqual(20);
    for (const s of list) expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Idempoten: jalankan lagi -> tidak ada tanggal baru.
    expect(seedOperationalSchedules(3)).toBe(0);
  });

  it("jumlah tanggal terbit == jumlah yang di-seed (enum konsisten)", async () => {
    const terbitCount = (
      sqliteConn.prepare("SELECT COUNT(*) AS n FROM schedules WHERE status='terbit'").get() as { n: number }
    ).n;
    const res = await app.inject({ method: "GET", url: "/api/public/schedules" });
    const list = res.json() as unknown[];
    expect(terbitCount).toBeGreaterThanOrEqual(20);
    expect(list.length).toBe(terbitCount);
  });

  it("repo menolak status di luar enum", () => {
    expect(() =>
      schedulesRepo.insert({ date: "2099-01-01", capacity: 10, status: "open" as never }),
    ).toThrow(/tidak valid/i);
  });
});
