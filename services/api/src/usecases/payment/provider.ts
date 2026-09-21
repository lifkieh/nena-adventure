import type { PaymentRow } from "../../repos/payments.repo.js";

/**
 * Antarmuka penyedia pembayaran — supaya Midtrans/Xendit bisa masuk nanti
 * tanpa mengubah usecase. Untuk sekarang hanya implementasi 'manual'.
 */
export interface PaymentProvider {
  readonly name: string;
  verify(payment: PaymentRow): { ok: boolean; reference?: string };
}

export const manualProvider: PaymentProvider = {
  name: "manual",
  verify: () => ({ ok: true }), // verifikasi manual oleh admin
};

export function providerFor(_name: string): PaymentProvider {
  return manualProvider; // hanya manual saat ini
}
