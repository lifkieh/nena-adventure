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
  };
}

export function setOwnerSettings(input: OwnerSettingsInput, ctx: ActorContext) {
  const before = getOwnerSettings();
  if (input.bankAccount !== undefined) setSetting("payment.bca_account", input.bankAccount);
  if (input.serviceFee !== undefined) setSetting("pricing.service_fee", input.serviceFee);
  if (input.dpPercent !== undefined) setSetting("pricing.dp_percent", input.dpPercent);
  if (input.cutoffDays !== undefined) setSetting("booking.cutoff_days", input.cutoffDays);
  const after = getOwnerSettings();
  record(ctx, {
    action: "settings_changed",
    entity: "settings",
    before,
    after,
  });
  return after;
}
