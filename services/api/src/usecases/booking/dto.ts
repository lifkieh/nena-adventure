import type { Booking } from "../../db/schema.js";

/** Field rahasia yang TIDAK BOLEH pernah keluar dari API. */
export type BookingDto = Omit<Booking, "accessTokenHash" | "idempotencyKey">;

/** Mapper eksplisit: buang material rahasia dari baris booking. */
export function toBookingDto(b: Booking): BookingDto {
  // Destrukturisasi eksplisit — accessTokenHash & idempotencyKey dibuang.
  const { accessTokenHash: _a, idempotencyKey: _i, ...rest } = b;
  void _a;
  void _i;
  return rest;
}
