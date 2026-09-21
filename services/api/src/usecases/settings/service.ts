import type { OwnerSettingsInput } from "@nena/shared";
import { getSetting, setSetting } from "../../repos/settings.repo.js";
import { record, type ActorContext } from "../audit.js";

/** Pengaturan owner-only: rekening, biaya layanan, DP%, cutoff. */
export function getOwnerSettings() {
  return {
    bankAccount: getSetting<string>("payment.bca_account", ""),
    serviceFee: getSetting<number>("pricing.service_fee", 5000),
    dpPercent: getSetting<number>("pricing.dp_percent", 50),
    cutoffDays: getSetting<number>("booking.cutoff_days", 3),
    whatsapp: getSetting<string>("contact.whatsapp", "6281286133202"),
    mapUrl: getSetting<string>("contact.map_url", "https://www.google.com/maps/search/?api=1&query=Pantai+Pangaradan+Anyer+Banten"),
  };
}

/** Kontak publik (dibaca situs) — WA + URL peta. */
export function getPublicContact() {
  return {
    whatsapp: getSetting<string>("contact.whatsapp", "6281286133202"),
    mapUrl: getSetting<string>("contact.map_url", "https://www.google.com/maps/search/?api=1&query=Pantai+Pangaradan+Anyer+Banten"),
  };
}

export function setOwnerSettings(input: OwnerSettingsInput, ctx: ActorContext) {
  const before = getOwnerSettings();
  if (input.bankAccount !== undefined) setSetting("payment.bca_account", input.bankAccount);
  if (input.serviceFee !== undefined) setSetting("pricing.service_fee", input.serviceFee);
  if (input.dpPercent !== undefined) setSetting("pricing.dp_percent", input.dpPercent);
  if (input.cutoffDays !== undefined) setSetting("booking.cutoff_days", input.cutoffDays);
  if (input.whatsapp !== undefined) setSetting("contact.whatsapp", input.whatsapp);
  if (input.mapUrl !== undefined) setSetting("contact.map_url", input.mapUrl);
  const after = getOwnerSettings();
  record(ctx, {
    action: "settings_changed",
    entity: "settings",
    before,
    after,
  });
  return after;
}
