import { beforeAll, describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { repoRoot } from "../db/paths.js";

/**
 * Unit render kalender/papan situs (apps/site/src/render.js).
 * Respons [] (tidak ada jadwal) TIDAK boleh memunculkan "penuh".
 */
let render: {
  calendarHtml: (m: Record<string, number>, now: Date) => string;
  boardHtml: (m: Record<string, number>, now: Date) => string;
};

function nextWeekendIso(now: Date): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 14; i++) {
    const w = d.getDay();
    if (w === 0 || w === 6) {
      const p = (n: number) => (n < 10 ? "0" + n : "" + n);
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }
    d.setDate(d.getDate() + 1);
  }
  throw new Error("no weekend");
}

beforeAll(async () => {
  render = (await import(
    pathToFileURL(resolve(repoRoot, "apps/site/src/render.js")).href
  )) as typeof render;
});

describe("render ketiadaan data situs", () => {
  const now = new Date();

  it("kalender dengan map kosong: TIDAK ada 'penuh'", () => {
    const html = render.calendarHtml({}, now);
    expect(html.toLowerCase()).not.toContain("penuh");
    // Tetap merender kerangka bulan (kosong), bukan status penuh.
    expect(html).toContain("month");
  });

  it("papan dengan map kosong: kosong, tanpa 'penuh'", () => {
    const html = render.boardHtml({}, now);
    expect(html.toLowerCase()).not.toContain("penuh");
    expect(html).toBe("");
  });

  it("jadwal ADA dengan sisa 0: barulah 'penuh' muncul", () => {
    const iso = nextWeekendIso(now);
    const html = render.calendarHtml({ [iso]: 0 }, now);
    expect(html.toLowerCase()).toContain("penuh");
  });

  it("jadwal ADA dengan sisa >0: link tersedia, bukan 'penuh'", () => {
    const iso = nextWeekendIso(now);
    const html = render.boardHtml({ [iso]: 12 }, now);
    expect(html).toContain("12 kursi tersedia");
    expect(html.toLowerCase()).not.toContain("kuota penuh");
  });
});
