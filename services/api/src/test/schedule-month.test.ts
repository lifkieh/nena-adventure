import { describe, expect, it } from "vitest";
import { pickScheduleMonthOffset, monthKeyDiff, monthRangeFor } from "@nena/shared";

describe("pickScheduleMonthOffset (default bulan kalender jadwal)", () => {
  it("bulan berjalan punya jadwal -> offset 0", () => {
    expect(pickScheduleMonthOffset(["2026-09", "2026-10"], "2026-09")).toBe(0);
  });

  it("bulan berjalan kosong -> lompat ke bulan pertama yang punya jadwal", () => {
    expect(pickScheduleMonthOffset(["2026-11", "2026-12"], "2026-09")).toBe(2);
  });

  it("bulan berjalan kosong, ada jadwal lebih awal & lebih akhir -> yang terdekat >= sekarang", () => {
    expect(pickScheduleMonthOffset(["2026-07", "2026-10"], "2026-09")).toBe(1);
  });

  it("semua jadwal sudah lewat -> pakai yang paling awal (negatif)", () => {
    expect(pickScheduleMonthOffset(["2026-06", "2026-07"], "2026-09")).toBe(-3);
  });

  it("tak ada jadwal -> offset 0", () => {
    expect(pickScheduleMonthOffset([], "2026-09")).toBe(0);
  });

  it("lintas tahun dihitung benar", () => {
    expect(monthKeyDiff("2026-11", "2027-02")).toBe(3);
    expect(pickScheduleMonthOffset(["2027-01"], "2026-11")).toBe(2);
  });
});

describe("monthRangeFor (kalender buka bulan yang benar, bukan geser UTC)", () => {
  it("offset 0 di September 2026 -> 2026-09-01..2026-09-30 (bukan Agustus)", () => {
    const r = monthRangeFor(new Date(2026, 8, 21), 0); // 21 Sep 2026 lokal
    expect(r.from).toBe("2026-09-01");
    expect(r.to).toBe("2026-09-30");
    expect(r.monthIndex0).toBe(8);
  });

  it("tgl-1 tetap bulan yang sama (regresi bug toISOString UTC+)", () => {
    const r = monthRangeFor(new Date(2026, 8, 1), 0);
    expect(r.from.slice(0, 7)).toBe("2026-09");
  });

  it("offset maju & mundur", () => {
    expect(monthRangeFor(new Date(2026, 8, 15), 1).from).toBe("2026-10-01");
    expect(monthRangeFor(new Date(2026, 8, 15), -1).from).toBe("2026-08-01");
  });

  it("lintas tahun Des -> Jan", () => {
    const r = monthRangeFor(new Date(2026, 11, 15), 1);
    expect(r.from).toBe("2027-01-01");
    expect(r.to).toBe("2027-01-31");
  });
});
