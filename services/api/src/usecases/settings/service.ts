import type { OwnerSettingsInput } from "@nena/shared";
import { getSetting, setSetting } from "../../repos/settings.repo.js";
import { record, type ActorContext } from "../audit.js";

/** Pengaturan owner-only: rekening, biaya layanan, DP%, cutoff. */
export function getOwnerSettings() {
  return {
    bankAccount: getSetting<string>("payment.bca_account", ""),
    qrisUrl: getSetting<string>("payment.qris_url", ""),
    serviceFee: getSetting<number>("pricing.service_fee", 5000),
    dpPercent: getSetting<number>("pricing.dp_percent", 50),
    cutoffDays: getSetting<number>("booking.cutoff_days", 3),
    whatsapp: getSetting<string>("contact.whatsapp", "6281286133202"),
    whatsappSecondary: getSetting<string>("contact.whatsapp_secondary", "6281387128350"),
    mapUrl: getSetting<string>("contact.map_url", "https://www.google.com/maps/search/?api=1&query=Pantai+Pangaradan+Anyer+Banten"),
  };
}

/** Kontak publik (dibaca situs) — WA, peta, rekening & QRIS untuk halaman booking. */
export function getPublicContact() {
  return {
    whatsapp: getSetting<string>("contact.whatsapp", "6281286133202"),
    whatsappSecondary: getSetting<string>("contact.whatsapp_secondary", "6281387128350"),
    mapUrl: getSetting<string>("contact.map_url", "https://www.google.com/maps/search/?api=1&query=Pantai+Pangaradan+Anyer+Banten"),
    bankAccount: getSetting<string>("payment.bca_account", ""),
    qrisUrl: getSetting<string>("payment.qris_url", ""),
  };
}

export function setOwnerSettings(input: OwnerSettingsInput, ctx: ActorContext) {
  const before = getOwnerSettings();
  if (input.bankAccount !== undefined) setSetting("payment.bca_account", input.bankAccount);
  if (input.qrisUrl !== undefined) setSetting("payment.qris_url", input.qrisUrl);
  if (input.serviceFee !== undefined) setSetting("pricing.service_fee", input.serviceFee);
  if (input.dpPercent !== undefined) setSetting("pricing.dp_percent", input.dpPercent);
  if (input.cutoffDays !== undefined) setSetting("booking.cutoff_days", input.cutoffDays);
  if (input.whatsapp !== undefined) setSetting("contact.whatsapp", input.whatsapp);
  if (input.whatsappSecondary !== undefined) setSetting("contact.whatsapp_secondary", input.whatsappSecondary);
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
