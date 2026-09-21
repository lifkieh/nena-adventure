import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loginCookie, makeSchedule, makeUser, seedPricing } from "./helpers.js";
import * as scheduleService from "../usecases/schedule/service.js";
import * as packageService from "../usecases/package/service.js";
import * as bookingService from "../usecases/booking/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "admin", ip: null, userAgent: null };
const customer = { name: "Budi Uji", phone: "081234567890", email: "b@u.co" };
const participant = [{ name: "Budi Uji", idNumber: "3200000000001234" }];
const futureDate = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);

let app: FastifyInstance;
beforeAll(async () => {
  seedPricing();
  app = await buildApp();
  await app.ready();
});
afterAll(async () => app.close());

function book(scheduleId: string, pax: number) {
  return bookingService.createWebBooking({
    scheduleId, packageKey: "reguler", meetingPoint: "anyer", pax,
    paymentScheme: "lunas", customer, participants: participant, ctx: CTX,
  });
}

describe("jadwal admin", () => {
  it("kapasitas tidak bisa turun di bawah kursi terjual", () => {
    const s = makeSchedule({ date: futureDate(40), capacity: 10 });
    book(s.id, 3); // used = 3
    expect(() =>
      scheduleService.update(s.id, { date: s.date, capacity: 2, threshold: 6, status: "terbit" }, CTX),
    ).toThrow(/terjual/i);
    // capacity 3 boleh (== terjual)
    expect(scheduleService.update(s.id, { date: s.date, capacity: 3, threshold: 6, status: "terbit" }, CTX).capacity).toBe(3);
  });

  it("hapus jadwal ber-booking ditolak", () => {
    const s = makeSchedule({ date: futureDate(41), capacity: 10 });
    book(s.id, 1);
    expect(() => scheduleService.remove(s.id, CTX)).toThrow(/booking aktif/i);
  });

  it("generator idempoten", () => {
    const input = { from: futureDate(300), to: futureDate(320), weekdays: [6], capacity: 24, threshold: 6, status: "terbit" as const };
    const first = scheduleService.generateCommit(input, CTX);
    expect(first.created).toBeGreaterThan(0);
    const second = scheduleService.generateCommit(input, CTX);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(first.created);
  });
});

describe("harga", () => {
  it("perubahan harga tidak mengubah total booking lama", () => {
    const s = makeSchedule({ date: futureDate(42), capacity: 10 });
    const r = book(s.id, 1);
    const before = bookingsRepo.findByCode(r.code)!.total;
    const reg = packageService.list().find((p) => p.key === "reguler")!;
    packageService.update(reg.id, { key: "reguler", name: reg.name, prices: { anyer: 999999 }, active: true }, CTX);
    expect(bookingsRepo.findByCode(r.code)!.total).toBe(before);
  });
});

describe("state machine dari HTTP panel", () => {
  it("transisi ilegal ditolak (approve_full dari menunggu_bayar)", async () => {
    const s = makeSchedule({ date: futureDate(43), capacity: 10 });
    const r = book(s.id, 1);
    const id = bookingsRepo.findByCode(r.code)!.id;
    makeUser({ email: "own-ops@t.local", password: "Password123", role: "owner" });
    const cookie = await loginCookie(app, "own-ops@t.local", "Password123", "10.8.0.1");
    const res = await app.inject({
      method: "POST", url: `/api/admin/bookings/${id}/transition`,
      headers: { cookie: cookie! }, payload: { action: "approve_full" },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("RBAC operasional", () => {
  it("operasional tidak bisa tulis konten (403) & tidak bisa verifikasi (403)", async () => {
    makeUser({ email: "ops@t.local", password: "Password123", role: "operasional" });
    const cookie = await loginCookie(app, "ops@t.local", "Password123", "10.8.0.2");
    const content = await app.inject({
      method: "PUT", url: "/api/admin/content/hero/draft",
      headers: { cookie: cookie! }, payload: { body: { heading: "x" } },
    });
    expect(content.statusCode).toBe(403);
    const verify = await app.inject({
      method: "POST", url: "/api/admin/payments/some-id/approve",
      headers: { cookie: cookie! },
    });
    expect(verify.statusCode).toBe(403);
  });
});
