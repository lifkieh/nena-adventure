import { describe, expect, it } from "vitest";
import { pickScheduleMonthOffset, monthKeyDiff } from "@nena/shared";

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
