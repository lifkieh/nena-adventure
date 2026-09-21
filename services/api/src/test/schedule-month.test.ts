import { describe, expect, it } from "vitest";
import { pickScheduleMonthOffset, monthKeyDiff, monthRangeFor, monthGrid } from "@nena/shared";

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

describe("monthGrid (hari terakhir bulan wajib ikut)", () => {
  const last = (base: Date, off: number) => monthGrid(base, off).datedCells.slice(-1)[0];

  it("31 Oktober 2026 ada di grid", () => {
    const g = monthGrid(new Date(2026, 9, 10), 0);
    expect(g.datedCells).toContain("2026-10-31");
    expect(g.daysInMonth).toBe(31);
  });
  it("30 September 2026 ada di grid", () => {
    expect(last(new Date(2026, 8, 10), 0)).toBe("2026-09-30");
  });
  it("31 Desember 2026 ada di grid", () => {
    expect(last(new Date(2026, 11, 10), 0)).toBe("2026-12-31");
  });
  it("29 Februari 2028 (kabisat) ada di grid", () => {
    const g = monthGrid(new Date(2028, 1, 10), 0);
    expect(g.datedCells).toContain("2028-02-29");
    expect(g.daysInMonth).toBe(29);
  });
  it("28 Februari 2027 (bukan kabisat) — tak ada 29", () => {
    const g = monthGrid(new Date(2027, 1, 10), 0);
    expect(g.datedCells).toContain("2027-02-28");
    expect(g.datedCells).not.toContain("2027-02-29");
  });

  it("jumlah sel bertanggal == jumlah hari kalender, 12 bulan berturut-turut", () => {
    const base = new Date(2026, 0, 15);
    for (let off = 0; off < 12; off++) {
      const g = monthGrid(base, off);
      const y = Number(g.from.slice(0, 4));
      const m = Number(g.from.slice(5, 7)); // 1-based
      const expected = new Date(Date.UTC(y, m, 0)).getUTCDate();
      expect(g.datedCells.length, `${g.from}`).toBe(expected);
      expect(g.datedCells.slice(-1)[0]).toBe(`${g.from.slice(0, 8)}${String(expected).padStart(2, "0")}`);
    }
  });
});
