import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loginCookie, makeSchedule, makeUser, seedPricing } from "./helpers.js";
import { _clearAll } from "../lib/rate-limit.js";
import * as bookingService from "../usecases/booking/service.js";
import * as paymentService from "../usecases/payment/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import * as paymentsRepo from "../repos/payments.repo.js";
import * as vouchersRepo from "../repos/vouchers.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "admin", ip: null, userAgent: null };
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const customer = { name: "Budi Uji", phone: "081234567890", email: "b@u.co" };
const participant = [{ name: "Budi Uji", birthDate: "1990-01-01", idNumber: "3200000000001234" }];

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
beforeEach(() => _clearAll());

function newBooking(scheme: "lunas" | "dp" = "lunas") {
  const s = makeSchedule({ date: futureDate(20), capacity: 10 });
  const r = bookingService.createWebBooking({
    scheduleId: s.id,
    packageKey: "reguler",
    meetingPoint: "anyer",
    pax: 1,
    paymentScheme: scheme,
    customer,
    participants: participant,
    ctx: CTX,
  });
  return { schedule: s, ...r };
}

describe("upload bukti", () => {
  it("file > 5MB ditolak", () => {
    const b = newBooking();
    const big = Buffer.alloc(6 * 1024 * 1024, 1);
    expect(() =>
      paymentService.submitProof({ code: b.code, token: b.token, buffer: big, ctx: CTX }),
    ).toThrow(/5MB/i);
  });

  it(".exe menyamar jpg ditolak lewat magic bytes", () => {
    const b = newBooking();
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // "MZ" (PE)
    expect(() =>
      paymentService.submitProof({ code: b.code, token: b.token, buffer: exe, ctx: CTX }),
    ).toThrow(/JPG|PNG|PDF/i);
  });

  it("token salah ditolak", () => {
    const b = newBooking();
    expect(() =>
      paymentService.submitProof({ code: b.code, token: "salah", buffer: JPG, ctx: CTX }),
    ).toThrow();
  });

  it("upload valid -> status verifikasi_bukti + payment pending", () => {
    const b = newBooking();
    const res = paymentService.submitProof({ code: b.code, token: b.token, buffer: JPG, ctx: CTX });
    expect(bookingsRepo.findByCode(b.code)!.status).toBe("verifikasi_bukti");
    const p = paymentsRepo.findById(res.paymentId)!;
    expect(p.status).toBe("pending");
    expect(p.proofMediaId).toBeTruthy();
  });
});

describe("akses media", () => {
  it("tanpa sesi -> 401; viewer tanpa payment:read -> 403", async () => {
    const b = newBooking();
    const res = paymentService.submitProof({ code: b.code, token: b.token, buffer: JPG, ctx: CTX });
    const mediaId = paymentsRepo.findById(res.paymentId)!.proofMediaId!;

    const noAuth = await app.inject({ method: "GET", url: `/api/admin/media/${mediaId}` });
    expect(noAuth.statusCode).toBe(401);

    makeUser({ email: "vw-media@t.local", password: "Password123", role: "viewer" });
    const cookie = await loginCookie(app, "vw-media@t.local", "Password123", "10.5.0.1");
    const forbidden = await app.inject({
      method: "GET",
      url: `/api/admin/media/${mediaId}`,
      headers: { cookie: cookie! },
    });
    expect(forbidden.statusCode).toBe(403);
  });
});

describe("verifikasi pembayaran (via state machine)", () => {
  it("approve lunas -> siap_jalan + voucher terbit", () => {
    const b = newBooking("lunas");
    const res = paymentService.submitProof({ code: b.code, token: b.token, buffer: JPG, ctx: CTX });
    const updated = paymentService.approve(res.paymentId, CTX);
    expect(updated.status).toBe("siap_jalan");
    expect(updated.amountPaid).toBe(updated.total);
    const bk = bookingsRepo.findByCode(b.code)!;
    expect(vouchersRepo.activeForBooking(bk.id).length).toBe(1);
  });

  it("approve DP -> menunggu_pelunasan + balanceDueAt (H-3)", () => {
    const b = newBooking("dp");
    const res = paymentService.submitProof({ code: b.code, token: b.token, buffer: JPG, ctx: CTX });
    const updated = paymentService.approve(res.paymentId, CTX);
    expect(updated.status).toBe("menunggu_pelunasan");
    expect(updated.balanceDueAt).toBeTruthy();
    const expected = new Date(Date.parse(b.schedule.date + "T00:00:00Z") - 3 * 86400_000)
      .toISOString();
    expect(updated.balanceDueAt).toBe(expected);
  });

  it("reject -> menunggu_bayar + hold baru + alasan tersimpan", () => {
    const b = newBooking("lunas");
    const res = paymentService.submitProof({ code: b.code, token: b.token, buffer: JPG, ctx: CTX });
    const updated = paymentService.reject(res.paymentId, "Nominal kurang", CTX);
    expect(updated.status).toBe("menunggu_bayar");
    expect(updated.holdExpiresAt).toBeTruthy();
    expect(paymentsRepo.findById(res.paymentId)!.rejectedReason).toBe("Nominal kurang");
  });
});
