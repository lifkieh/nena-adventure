import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import { seedPricing } from "./helpers.js";
import { computePrice } from "../usecases/booking/pricing.js";
import { hasValidPricePath, priceBaseline, packageDefs } from "../db/package-baseline.js";

const ROOT = resolve(__dirname, "../../../..");

describe("harga Private Trip vs pre-1a", () => {
  beforeAll(() => seedPricing());

  it("berkas prices.pre-1a.json IDENTIK dengan ekstraksi langsung dari pre-1a", () => {
    // Verifikasi ulang terhadap tag, bukan ingatan.
    const out = execSync("node scripts/extract-prices.mjs --check", { cwd: ROOT, encoding: "utf8" });
    expect(out).toMatch(/OK: harga cocok pre-1a/);
  });

  it("tier private baseline = 1–6/7–9/10–11/12–14 @ 4.5/5.5/6.3/7.3 juta", () => {
    expect(priceBaseline().privateTiers).toEqual([
      { minPax: 1, maxPax: 6, price: 4500000 },
      { minPax: 7, maxPax: 9, price: 5500000 },
      { minPax: 10, maxPax: 11, price: 6300000 },
      { minPax: 12, maxPax: 14, price: 7300000 },
    ]);
  });

  it("2 peserta Private -> total 4.505.000 (tier 4.5jt + service fee 5rb)", () => {
    const p = computePrice({ packageKey: "private", meetingPoint: "anyer", pax: 2 });
    expect(p.unit).toBe(4500000);
    expect(p.total).toBe(4505000);
  });

  it("8 peserta Private -> tier 7–9 (5.5jt)", () => {
    expect(computePrice({ packageKey: "private", meetingPoint: "anyer", pax: 8 }).unit).toBe(5500000);
  });
});

describe("hasValidPricePath (jalur harga sah)", () => {
  it("private aktif TANPA tier -> tidak sah", () => {
    expect(hasValidPricePath({ prices: {}, active: true }, 0)).toBe(false);
  });
  it("private aktif dengan tier -> sah", () => {
    expect(hasValidPricePath({ prices: {}, active: true }, 4)).toBe(true);
  });
  it("reguler dengan harga meeting point -> sah", () => {
    expect(hasValidPricePath({ prices: { anyer: 385000 }, active: true }, 0)).toBe(true);
  });
  it("prices hanya berisi 0 -> tidak sah (Rp0 palsu)", () => {
    expect(hasValidPricePath({ prices: { anyer: 0 }, active: true }, 0)).toBe(false);
  });
  it("paket nonaktif dikecualikan", () => {
    expect(hasValidPricePath({ prices: {}, active: false }, 0)).toBe(true);
  });
  it("packageDefs private memuat 4 tier", () => {
    expect(packageDefs().find((d) => d.key === "private")!.tiers.length).toBe(4);
  });
});
