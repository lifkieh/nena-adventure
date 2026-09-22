import { beforeAll, describe, expect, it } from "vitest";
import { makeSchedule, seedPricing } from "./helpers.js";
import * as bookingService from "../usecases/booking/service.js";
import * as paymentService from "../usecases/payment/service.js";
import { exportZurich } from "../usecases/export-zurich.js";
import * as auditRepo from "../repos/audit.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "admin", ip: null, userAgent: null };
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const customer = { name: "Budi Uji", phone: "081234567890", email: "b@u.co" };

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
}

function makeSiapJalan(date: string, participants: { name: string; birthDate?: string; idNumber?: string }[]) {
  const s = makeSchedule({ date, capacity: 10 });
  const r = bookingService.createWebBooking({
    scheduleId: s.id,
    packageKey: "reguler",
    meetingPoint: "anyer",
    pax: participants.length,
    paymentScheme: "lunas",
    customer,
    participants,
    ctx: CTX,
  });
  const proof = paymentService.submitProof({ code: r.code, token: r.token, buffer: JPG, ctx: CTX });
  paymentService.approve(proof.paymentId, CTX); // -> siap_jalan
  return r.code;
}

beforeAll(() => seedPricing());

describe("export Zurich", () => {
  it("data lengkap -> CSV BOM + koma + audit tercatat", () => {
    const date = futureDate(30);
    makeSiapJalan(date, [
      { name: "Budi Uji", birthDate: "1990-01-01", idNumber: "3200000000001111" },
    ]);
    const { csv, rowCount } = exportZurich(date, CTX);
    expect(rowCount).toBe(1);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain("Nama Lengkap,Tanggal Lahir,Nomor Identitas,Kode Booking,Tanggal Keberangkatan");
    expect(csv).toContain("3200000000001111");
    expect(csv).toContain(date);

    const { rows } = auditRepo.query({ entity: "export", page: 1, pageSize: 20 });
    expect(rows.some((r) => r.action === "export_zurich")).toBe(true);
  });

  it("data tidak lengkap -> ditolak + sebut booking", () => {
    const date = futureDate(31);
    const code = makeSiapJalan(date, [{ name: "Tanpa NIK", birthDate: "1990-01-01" }]); // NIK kosong
    expect(() => exportZurich(date, CTX)).toThrow(new RegExp(code));
  });
});
