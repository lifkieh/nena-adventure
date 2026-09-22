import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { schedules, seatLedger } from "../db/schema.js";

/**
 * Invariansi desain kursi: sisa kursi SELALU dihitung dari seat_ledger
 * (append-only), TIDAK pernah disimpan sebagai counter di schedules. Test ini
 * gagal kalau seseorang diam-diam menambah kolom counter kursi di schedules.
 */
describe("invariansi desain kursi", () => {
  it("schedules TIDAK punya kolom counter kursi", () => {
    const names = Object.values(getTableColumns(schedules)).map((c) => c.name);
    const offenders = names.filter((n) =>
      /seat|kursi|remaining|booked/i.test(n),
    );
    expect(
      offenders,
      `schedules tidak boleh menyimpan counter kursi (pakai seat_ledger): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("seat_ledger tetap sumber kebenaran kursi (schedule_id + delta)", () => {
    const names = Object.values(getTableColumns(seatLedger)).map((c) => c.name);
    expect(names).toContain("schedule_id");
    expect(names).toContain("delta");
  });
});
