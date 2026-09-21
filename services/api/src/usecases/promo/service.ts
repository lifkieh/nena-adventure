import { AppError } from "../../lib/errors.js";
import * as repo from "../../repos/promos.repo.js";
import { record, type ActorContext } from "../audit.js";

export interface PromoInput {
  code: string;
  type: "percent" | "amount";
  value: number;
  minPax?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  packages?: string[] | null; // key paket berlaku; null/[] = semua
  active?: boolean;
}

function toDto(p: repo.PromoRow) {
  return {
    id: p.id, code: p.code, type: p.type, value: p.value, minPax: p.minPax,
    validFrom: p.validFrom, validUntil: p.validUntil, maxUses: p.maxUses,
    usedCount: p.usedCount, active: !!p.active,
    packages: p.packages ? (JSON.parse(p.packages) as string[]) : null,
  };
}

export function list() {
  return repo.listAll().map(toDto);
}

export function create(input: PromoInput, ctx: ActorContext) {
  if (repo.findByCode(input.code)) throw AppError.conflict("Kode promo sudah dipakai.");
  if (input.type === "percent" && (input.value < 1 || input.value > 100)) {
    throw AppError.validation("Diskon persen harus 1–100.");
  }
  if (input.value < 0) throw AppError.validation("Nilai diskon tidak valid.");
  const p = repo.insert({
    code: input.code.trim(), type: input.type, value: input.value,
    minPax: input.minPax ?? 1, validFrom: input.validFrom ?? null, validUntil: input.validUntil ?? null,
    maxUses: input.maxUses ?? null, active: input.active ?? true,
    packages: input.packages && input.packages.length ? JSON.stringify(input.packages) : null,
  });
  record(ctx, { action: "promo_created", entity: "promo", entityId: p.id, data: { code: p.code } });
  return toDto(p);
}

export function update(id: string, input: PromoInput, ctx: ActorContext) {
  const before = repo.findById(id);
  if (!before) throw AppError.notFound("Promo tidak ditemukan.");
  const p = repo.update(id, {
    code: input.code.trim(), type: input.type, value: input.value,
    minPax: input.minPax ?? 1, validFrom: input.validFrom ?? null, validUntil: input.validUntil ?? null,
    maxUses: input.maxUses ?? null, active: input.active ?? true,
    packages: input.packages && input.packages.length ? JSON.stringify(input.packages) : null,
  });
  record(ctx, { action: "promo_updated", entity: "promo", entityId: id, data: { code: p.code } });
  return toDto(p);
}

/**
 * Validasi promo di SERVER + hitung diskon (rupiah). Lempar bila tak valid.
 * Dipakai saat pembuatan booking. `subtotal` = harga sebelum diskon.
 */
export function validateAndCompute(code: string, packageKey: string, pax: number, subtotal: string | number): {
  promoId: string; discount: number;
} {
  const p = repo.findByCode(String(code).trim());
  if (!p || !p.active) throw AppError.validation("Kode promo tidak berlaku.");
  const now = new Date().toISOString();
  if (p.validFrom && now < p.validFrom) throw AppError.validation("Promo belum berlaku.");
  if (p.validUntil && now > p.validUntil) throw AppError.validation("Promo sudah kedaluwarsa.");
  if (p.maxUses != null && p.usedCount >= p.maxUses) throw AppError.validation("Kuota promo habis.");
  if (pax < p.minPax) throw AppError.validation(`Promo butuh minimal ${p.minPax} peserta.`);
  if (p.packages) {
    const allowed = JSON.parse(p.packages) as string[];
    if (allowed.length && !allowed.includes(packageKey)) throw AppError.validation("Promo tak berlaku untuk paket ini.");
  }
  const sub = Number(subtotal);
  const discount = p.type === "percent" ? Math.round((sub * p.value) / 100) : Math.min(p.value, sub);
  return { promoId: p.id, discount };
}

export function markUsed(promoId: string): void {
  repo.incrementUsed(promoId);
}

/** Lepas kuota (booking batal/kadaluarsa). Clamp >=0. Catat audit. */
export function releaseUse(promoId: string, ctx: ActorContext): void {
  repo.decrementUsed(promoId);
  record(ctx, { action: "promo_released", entity: "promo", entityId: promoId });
}
