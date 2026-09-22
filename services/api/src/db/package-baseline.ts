import { readFileSync } from "node:fs";

/**
 * Sumber kebenaran harga paket (baseline pre-1a, dari scripts/extract-prices.mjs).
 * Dipakai seedPackages (upsert) + packages:verify + test vs pre-1a.
 */

export interface TierDef {
  minPax: number;
  maxPax: number;
  price: number;
}
export interface PriceBaseline {
  reguler: Record<string, number>;
  premium: Record<string, number>;
  privateTiers: TierDef[];
}

export function priceBaseline(): PriceBaseline {
  return JSON.parse(
    readFileSync(new URL("./prices.pre-1a.json", import.meta.url), "utf8"),
  ) as PriceBaseline;
}

export interface PackageDef {
  key: string;
  name: string;
  prices: Record<string, number>;
  tiers: TierDef[];
}

/** Definisi paket kanonik: reguler/premium pakai harga per meeting point,
 *  private pakai tier per rombongan (prices kosong). */
export function packageDefs(): PackageDef[] {
  const p = priceBaseline();
  return [
    { key: "reguler", name: "Open Trip Reguler", prices: p.reguler, tiers: [] },
    { key: "premium", name: "Open Trip Premium", prices: p.premium, tiers: [] },
    { key: "private", name: "Private Trip Premium", prices: {}, tiers: p.privateTiers },
  ];
}

/**
 * Paket AKTIF wajib punya jalur harga sah: minimal satu harga meeting point
 * ATAU minimal satu tier. Paket nonaktif dikecualikan.
 */
export function hasValidPricePath(
  pkg: { prices: Record<string, number>; active: boolean },
  tierCount: number,
): boolean {
  if (!pkg.active) return true;
  const hasMeetingPrice = Object.values(pkg.prices).some((v) => v > 0);
  return hasMeetingPrice || tierCount > 0;
}
