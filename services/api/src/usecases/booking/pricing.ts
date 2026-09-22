import { AppError } from "../../lib/errors.js";
import { getSetting } from "../../repos/settings.repo.js";
import * as packagesRepo from "../../repos/packages.repo.js";

export interface PriceBreakdown {
  packageKey: string;
  meetingPoint: string;
  pax: number;
  unit: number; // harga satuan (reguler/premium) atau harga tier (private)
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  dp: number; // nominal DP
}

function pricingSettings() {
  return {
    serviceFee: getSetting<number>("pricing.service_fee", 5000),
    dpPercent: getSetting<number>("pricing.dp_percent", 50),
    discountPercent: getSetting<number>("pricing.group_discount_percent", 5),
    discountMinPax: getSetting<number>("pricing.group_discount_min_pax", 10),
  };
}

/**
 * Hitung harga di SERVER (otoritatif). Klien tidak menentukan harga.
 * `meetingPoint` wajib valid untuk paket tsb.
 */
export function computePrice(input: {
  packageKey: string;
  meetingPoint: string;
  pax: number;
}): PriceBreakdown {
  const { packageKey, meetingPoint, pax } = input;
  if (pax < 1) throw AppError.validation("Jumlah peserta minimal 1.");

  const pkg = packagesRepo.getByKey(packageKey);
  if (!pkg || !pkg.active) {
    throw AppError.validation("Paket tidak dikenal.");
  }
  const { serviceFee, dpPercent, discountPercent, discountMinPax } =
    pricingSettings();

  if (packageKey === "private") {
    const tiers = packagesRepo.tiersFor(pkg.id);
    if (tiers.length === 0) throw AppError.validation("Tier paket tidak tersedia.");
    const tier =
      tiers.find((t) => pax >= t.minPax && pax <= t.maxPax) ??
      tiers[tiers.length - 1]!;
    const total = tier.price + serviceFee;
    return {
      packageKey,
      meetingPoint,
      pax,
      unit: tier.price,
      subtotal: tier.price,
      discount: 0,
      serviceFee,
      total,
      dp: Math.round((total * dpPercent) / 100),
    };
  }

  // reguler / premium — harga per meeting point.
  const allowed = Object.keys(pkg.prices);
  if (!allowed.includes(meetingPoint)) {
    throw AppError.validation("Meeting point tidak valid untuk paket ini.");
  }
  const unit = pkg.prices[meetingPoint]!;
  const subtotal = unit * pax;
  const discount =
    pax >= discountMinPax ? Math.round((subtotal * discountPercent) / 100) : 0;
  const total = subtotal - discount + serviceFee;
  return {
    packageKey,
    meetingPoint,
    pax,
    unit,
    subtotal,
    discount,
    serviceFee,
    total,
    dp: Math.round((total * dpPercent) / 100),
  };
}
