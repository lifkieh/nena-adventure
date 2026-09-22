import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loginCookie, makeSchedule, makeUser, seedPricing } from "./helpers.js";
import { encryptPII, decryptPII } from "../lib/crypto.js";
import { purgeOverduePii } from "../usecases/pii-purge.js";
import * as bookingService from "../usecases/booking/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import * as participantsRepo from "../repos/participants.repo.js";
import * as auditRepo from "../repos/audit.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "admin", ip: null, userAgent: null };
const customer = { name: "Budi Uji", phone: "081234567890", email: "b@u.co" };

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
}

let app: FastifyInstance;
beforeAll(async () => {
  seedPricing();
  app = await buildApp();
  await app.ready();
});
afterAll(async () => app.close());

describe("enkripsi PII", () => {
  it("round-trip encrypt/decrypt", () => {
    const blob = encryptPII("3200000000009999");
    expect(blob).not.toBeNull();
    expect(blob).toContain("v1:");
    expect(blob).not.toContain("3200000000009999"); // ciphertext, bukan plaintext
    expect(decryptPII(blob)).toBe("3200000000009999");
  });
  it("null aman", () => {
    expect(encryptPII(null)).toBeNull();
    expect(decryptPII(null)).toBeNull();
  });
});

describe("buka PII (participant:read_pii + audit)", () => {
  it("viewer 403; owner 200 + NIK utuh + tercatat audit", async () => {
    const s = makeSchedule({ date: futureDate(15), capacity: 10 });
    const r = bookingService.createWebBooking({
      scheduleId: s.id,
      packageKey: "reguler",
      meetingPoint: "anyer",
      pax: 1,
      paymentScheme: "lunas",
      customer,
      participants: [{ name: "Budi Uji", birthDate: "1990-01-01", idNumber: "3200000000001234" }],
      ctx: CTX,
    });
    const booking = bookingsRepo.findByCode(r.code)!;

    makeUser({ email: "vw-pii@t.local", password: "Password123", role: "viewer" });
    makeUser({ email: "own-pii@t.local", password: "Password123", role: "owner" });
    const vw = await loginCookie(app, "vw-pii@t.local", "Password123", "10.6.0.1");
    const own = await loginCookie(app, "own-pii@t.local", "Password123", "10.6.0.2");

    const forbidden = await app.inject({
      method: "GET",
      url: `/api/admin/bookings/${booking.id}/pii`,
      headers: { cookie: vw! },
    });
    expect(forbidden.statusCode).toBe(403);

    const ok = await app.inject({
      method: "GET",
      url: `/api/admin/bookings/${booking.id}/pii`,
      headers: { cookie: own! },
    });
    expect(ok.statusCode).toBe(200);
    const body = ok.json() as { participants: { idNumber: string }[] };
    expect(body.participants[0]!.idNumber).toBe("3200000000001234");

    const { rows } = auditRepo.query({ entity: "booking", entityId: booking.id, page: 1, pageSize: 50 });
    expect(rows.some((r2) => r2.action === "pii_access")).toBe(true);
    // audit tidak memuat NIK
    expect(JSON.stringify(rows)).not.toContain("3200000000001234");
  });
});

describe("purge PII 90 hari", () => {
  it("mengosongkan NIK setelah 90 hari + idempoten", () => {
    // Jadwal & booking di masa lalu (>90 hari) — sisipkan langsung.
    const past = new Date(Date.now() - 100 * 86400_000).toISOString().slice(0, 10);
    const s = makeSchedule({ date: past, capacity: 10 });
    const booking = bookingsRepo.insert({
      code: "NA-PURGE1",
      scheduleId: s.id,
      packageType: "reguler",
      status: "selesai",
      source: "web",
      customerName: "X",
      customerPhone: "0812",
      customerEmail: "x@x.co",
      pax: 1,
      total: 0,
    });
    participantsRepo.addMany(booking.id, [
      { name: "X", birthDate: "1990-01-01", idNumber: "3200000000005555" },
    ]);

    const n = purgeOverduePii();
    expect(n).toBeGreaterThanOrEqual(1);
    const p = participantsRepo.listByBooking(booking.id)[0]!;
    expect(p.idNumber).toBeNull();
    expect(p.birthDate).toBeNull();
    expect(p.piiPurgedAt).toBeTruthy();
    expect(p.idNumberLast4).toBe("5555"); // last4 tetap

    // Idempoten: run kedua tidak menyentuh yang sudah di-purge.
    expect(purgeOverduePii()).toBe(0);
  });
});
