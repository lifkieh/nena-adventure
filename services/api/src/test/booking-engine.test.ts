import { beforeAll, describe, expect, it } from "vitest";
import { BOOKING_STATUSES } from "@nena/shared";
import { seedPricing, makeSchedule } from "./helpers.js";
import { computePrice } from "../usecases/booking/pricing.js";
import {
  TRANSITIONS,
  assertTransition,
  computeRefund,
  type TransitionAction,
} from "../usecases/booking/transition.js";
import * as service from "../usecases/booking/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import * as schedulesRepo from "../repos/schedules.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: null, ip: null, userAgent: null };

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
}

const customer = { name: "Budi Uji", phone: "081234567890", email: "b@u.co" };
const participant = [{ name: "Budi Uji", birthDate: "1990-01-01", idNumber: "3200000000000001" }];

beforeAll(() => seedPricing());

describe("harga (server otoritatif)", () => {
  it("reguler anyer 2 pax = 775.000", () => {
    const p = computePrice({ packageKey: "reguler", meetingPoint: "anyer", pax: 2 });
    expect(p.total).toBe(775000);
    expect(p.dp).toBe(387500);
  });
  it("premium jakarta 2 pax = 1.705.000", () => {
    expect(
      computePrice({ packageKey: "premium", meetingPoint: "jakarta", pax: 2 }).total,
    ).toBe(1705000);
  });
  it("diskon rombongan reguler 10 pax", () => {
    const p = computePrice({ packageKey: "reguler", meetingPoint: "anyer", pax: 10 });
    expect(p.discount).toBe(192500);
    expect(p.total).toBe(3662500);
  });
  it("private pakai tier yang benar", () => {
    expect(computePrice({ packageKey: "private", meetingPoint: "anyer", pax: 8 }).total).toBe(5505000);
    expect(computePrice({ packageKey: "private", meetingPoint: "anyer", pax: 12 }).total).toBe(7305000);
  });
  it("meeting point invalid untuk reguler ditolak", () => {
    expect(() => computePrice({ packageKey: "reguler", meetingPoint: "jakarta", pax: 2 })).toThrow();
  });
});

describe("total palsu dari klien ditolak", () => {
  it("clientTotal salah -> error", () => {
    const s = makeSchedule({ date: futureDate(20), capacity: 10 });
    expect(() =>
      service.createWebBooking({
        scheduleId: s.id,
        packageKey: "reguler",
        meetingPoint: "anyer",
        pax: 2,
        paymentScheme: "lunas",
        customer,
        participants: participant,
        clientTotal: 1,
        ctx: CTX,
      }),
    ).toThrow(/tidak cocok/i);
  });
});

describe("tabel transisi", () => {
  it("semua transisi sah lulus, tak sah ditolak", () => {
    const actions = Object.keys(TRANSITIONS) as TransitionAction[];
    for (const action of actions) {
      const allowed = new Set(TRANSITIONS[action].from);
      for (const from of BOOKING_STATUSES) {
        if (allowed.has(from)) {
          expect(assertTransition(from, action)).toBe(TRANSITIONS[action].to);
        } else {
          expect(() => assertTransition(from, action)).toThrow();
        }
      }
    }
  });
});

describe("idempotency-key", () => {
  it("dua kali kirim kunci sama -> satu booking", () => {
    const s = makeSchedule({ date: futureDate(21), capacity: 10 });
    const input = {
      scheduleId: s.id,
      packageKey: "reguler" as const,
      meetingPoint: "anyer",
      pax: 1,
      paymentScheme: "lunas" as const,
      customer,
      participants: participant,
      idempotencyKey: "KEY-SAMA-123",
      ctx: CTX,
    };
    const a = service.createWebBooking(input);
    const b = service.createWebBooking(input);
    expect(a.code).toBe(b.code);
    const { total } = bookingsRepo.list({ page: 1, pageSize: 100 });
    const forSched = bookingsRepo
      .list({ page: 1, pageSize: 100 })
      .rows.filter((r) => r.scheduleId === s.id);
    expect(forSched.length).toBe(1);
    expect(total).toBeGreaterThan(0);
  });
});

describe("kedaluwarsa melepas kursi (tidak double)", () => {
  it("expire sekali lepas, dua kali tidak double", () => {
    const s = makeSchedule({ date: futureDate(22), capacity: 10 });
    const r = service.createWebBooking({
      scheduleId: s.id,
      packageKey: "reguler",
      meetingPoint: "anyer",
      pax: 3,
      paymentScheme: "lunas",
      customer,
      participants: participant,
      ctx: CTX,
    });
    expect(schedulesRepo.remainingSeats(s.id)).toBe(7);
    const booking = bookingsRepo.findByCode(r.code)!;
    bookingsRepo.update(booking.id, {
      holdExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(service.expireOverdueHolds()).toBeGreaterThanOrEqual(1);
    expect(bookingsRepo.findByCode(r.code)!.status).toBe("kadaluarsa");
    expect(schedulesRepo.remainingSeats(s.id)).toBe(10);
    // run kedua: tidak melepas lagi
    service.expireOverdueHolds();
    expect(schedulesRepo.remainingSeats(s.id)).toBe(10);
  });
});

describe("batal: refund 3 rentang kebijakan", () => {
  it("H-10=80%, H-5=50%, H-1=0%", () => {
    const cases: [number, number][] = [
      [10, 800000],
      [5, 500000],
      [1, 0],
    ];
    for (const [days, expected] of cases) {
      const s = makeSchedule({ date: futureDate(days), capacity: 10 });
      const r = service.createWebBooking({
        scheduleId: s.id,
        packageKey: "reguler",
        meetingPoint: "anyer",
        pax: 1,
        paymentScheme: "lunas",
        customer,
        participants: participant,
        ctx: CTX,
      });
      const b = bookingsRepo.findByCode(r.code)!;
      bookingsRepo.update(b.id, { amountPaid: 1000000, status: "siap_jalan" });
      const cancelled = service.applyTransition(b.id, "cancel", {
        reason: "uji refund",
        ctx: CTX,
      });
      expect(cancelled.status).toBe("batal");
      expect(cancelled.refundAmount).toBe(expected);
      expect(schedulesRepo.remainingSeats(s.id)).toBe(10); // kursi kembali
    }
  });

  it("computeRefund murni", () => {
    const dep = futureDate(10);
    expect(computeRefund(1000000, dep)).toBe(800000);
  });
});
