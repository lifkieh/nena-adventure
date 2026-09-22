import type { Booking } from "../../db/schema.js";

/**
 * Field rahasia yang TIDAK BOLEH pernah keluar dari API. Kolom `amountPaid` (neto,
 * SUM verified incl. refund negatif) diekspos sebagai `amountPaidNet` supaya nama
 * tidak bertabrakan makna dengan `breakdown.amountPaidGross`.
 */
export type BookingDto = Omit<
  Booking,
  "accessTokenHash" | "idempotencyKey" | "amountPaid"
> & { amountPaidNet: number };

/** Mapper eksplisit: buang material rahasia dari baris booking. */
export function toBookingDto(b: Booking): BookingDto {
  // Destrukturisasi eksplisit — accessTokenHash & idempotencyKey dibuang;
  // amountPaid (kolom neto) di-rename jadi amountPaidNet.
  const { accessTokenHash: _a, idempotencyKey: _i, amountPaid, ...rest } = b;
  void _a;
  void _i;
  return { ...rest, amountPaidNet: amountPaid };
}
