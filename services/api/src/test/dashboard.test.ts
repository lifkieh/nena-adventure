import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/client.js";
import { bookings, payments, schedules, seatLedger } from "../db/schema.js";
import { seedPricing } from "./helpers.js";
import { dashboard } from "../usecases/reports.js";
import * as bookingService from "../usecases/booking/service.js";
import { applyTransition } from "../usecases/booking/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import * as paymentsRepo from "../repos/payments.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "owner", ip: null, userAgent: null };
const customer = { name: "Dash QA", phone: "081200000000", email: "d@q.co" };
const parts = (n: number) => Array.from({ length: n }, (_, i) => ({ name: "P" + i, idNumber: "320000000000000" + i }));
const WIB = 7 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

function wibDatePlus(days: number): string {
  const jk = new Date(Date.now() + WIB);
  const d = new Date(Date.UTC(jk.getUTCFullYear(), jk.getUTCMonth(), jk.getUTCDate() + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function book(scheduleId: string, pax: number) {
  return bookingService.createWebBooking({
    scheduleId, packageKey: "reguler", meetingPoint: "anyer", pax,
    paymentScheme: "lunas", customer, participants: parts(pax), ctx: CTX,
  });
}
function idOf(code: string) { return bookingsRepo.findByCode(code)!.id; }

describe("dashboard ringkasan (angka dari query)", () => {
  beforeEach(() => {
    db.delete(seatLedger).run();
    db.delete(payments).run();
    db.delete(bookings).run();
    db.delete(schedules).run();
    seedPricing();
  });

  it("enam metrik terhitung benar dari data nyata", () => {
    const sNear = makeSched(wibDatePlus(2), 10, 3);
    const sOther = makeSched(wibDatePlus(3), 10, 6);

    book(sNear.id, 8); // sisa 2 <= threshold 3 -> hampir penuh, kursi terjual +8

    const bProof = idOf(book(sOther.id, 1).code); // web booking -> menunggu_bayar
    applyTransition(bProof, "submit_proof", { ctx: CTX }); // -> verifikasi_bukti

    const bSettle = idOf(book(sOther.id, 1).code);
    applyTransition(bSettle, "submit_proof", { ctx: CTX });
    applyTransition(bSettle, "approve_dp", { ctx: CTX }); // -> menunggu_pelunasan

    paymentsRepo.insert({
      bookingId: bProof, amount: 1_000_000, method: "transfer",
      status: "verified", verifiedAt: new Date().toISOString(),
    });

    const d = dashboard(new Date());
    expect(d.bookingsToday).toBeGreaterThanOrEqual(3);
    expect(d.awaitingProof).toBe(1);
    expect(d.awaitingSettlement).toBe(1);
    expect(d.seatsSoldNext7Days).toBe(10); // 8 + 1 + 1
    expect(d.verifiedRevenueThisMonth).toBe(1_000_000);
    expect(d.nearestNearlyFull?.id).toBe(sNear.id);
    expect(d.nearestNearlyFull?.remaining).toBe(2);
  });

  it("empty state: tak ada data -> nol & nearestNearlyFull null", () => {
    const d = dashboard(new Date());
    expect(d.bookingsToday).toBe(0);
    expect(d.awaitingProof).toBe(0);
    expect(d.awaitingSettlement).toBe(0);
    expect(d.seatsSoldNext7Days).toBe(0);
    expect(d.verifiedRevenueThisMonth).toBe(0);
    expect(d.nearestNearlyFull).toBeNull();
  });
});

function makeSched(date: string, capacity: number, threshold: number) {
  return db.insert(schedules).values({ date, capacity, threshold, status: "terbit" }).returning().get();
}
