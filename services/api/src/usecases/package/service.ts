import type { PackageInput, TierInput } from "@nena/shared";
import { AppError } from "../../lib/errors.js";
import * as repo from "../../repos/packages.repo.js";
import { record, type ActorContext } from "../audit.js";

export function list() {
  return repo.listAll().map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    prices: JSON.parse(p.prices) as Record<string, number>,
    active: p.active,
    tiers: repo.tiersFor(p.id),
  }));
}

/** Harga publik untuk situs (kartu paket + tabel) — SUMBER TUNGGAL dari tabel. */
export function publicPrices() {
  const reguler = repo.getByKey("reguler");
  const premium = repo.getByKey("premium");
  const priv = repo.getByKey("private");
  return {
    reguler: reguler ? reguler.prices : {},
    premium: premium ? premium.prices : {},
    privateTiers: priv ? repo.tiersFor(priv.id).map((t) => ({ minPax: t.minPax, maxPax: t.maxPax, price: t.price })) : [],
  };
}

export function create(input: PackageInput, ctx: ActorContext) {
  if (repo.getByKey(input.key)) {
    throw AppError.conflict("Key paket sudah dipakai.");
  }
  const p = repo.create(input);
  record(ctx, {
    action: "package_created",
    entity: "package",
    entityId: p.id,
    data: { key: p.key, name: p.name },
  });
  return { id: p.id, key: p.key, name: p.name, prices: input.prices, active: p.active };
}

export function update(id: string, input: PackageInput, ctx: ActorContext) {
  const before = repo.findById(id);
  if (!before) throw AppError.notFound("Paket tidak ditemukan.");
  const oldPrices = JSON.parse(before.prices) as Record<string, number>;
  const after = repo.update(id, {
    name: input.name,
    prices: input.prices,
    active: input.active,
  });
  // Perubahan harga wajib tercatat lengkap old -> new (tidak mengubah booking lama).
  if (JSON.stringify(oldPrices) !== JSON.stringify(input.prices)) {
    record(ctx, {
      action: "price_changed",
      entity: "package",
      entityId: id,
      before: { prices: oldPrices },
      after: { prices: input.prices },
    });
  }
  record(ctx, {
    action: "package_updated",
    entity: "package",
    entityId: id,
    data: { name: input.name, active: input.active },
  });
  return { id, key: after.key, name: after.name, prices: input.prices, active: after.active };
}

export function remove(id: string, ctx: ActorContext): void {
  const p = repo.findById(id);
  if (!p) throw AppError.notFound("Paket tidak ditemukan.");
  repo.remove(id);
  record(ctx, { action: "package_deleted", entity: "package", entityId: id });
}

export function addTier(packageId: string, input: TierInput, ctx: ActorContext) {
  const t = repo.addTier(packageId, input);
  record(ctx, {
    action: "price_changed",
    entity: "package_tier",
    entityId: t.id,
    after: { minPax: t.minPax, maxPax: t.maxPax, price: t.price },
  });
  return t;
}

export function updateTier(id: string, input: TierInput, ctx: ActorContext) {
  const before = repo.findTierById(id);
  if (!before) throw AppError.notFound("Tier tidak ditemukan.");
  const after = repo.updateTier(id, input);
  record(ctx, {
    action: "price_changed",
    entity: "package_tier",
    entityId: id,
    before: { price: before.price, minPax: before.minPax, maxPax: before.maxPax },
    after: { price: after.price, minPax: after.minPax, maxPax: after.maxPax },
  });
  return after;
}

export function removeTier(id: string, ctx: ActorContext): void {
  if (!repo.findTierById(id)) throw AppError.notFound("Tier tidak ditemukan.");
  repo.removeTier(id);
  record(ctx, { action: "price_tier_deleted", entity: "package_tier", entityId: id });
}
