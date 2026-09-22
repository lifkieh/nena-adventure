import {
  BOOKING_TRANSITIONS,
  type BookingAction,
  type BookingStatusValue,
} from "@nena/shared";
import { AppError } from "../../lib/errors.js";

/* ────────────────────────────────────────────────────────────
 * Mesin status booking — tabel transisi EKSPLISIT.
 * Transisi yang tidak terdaftar -> error (bukan lolos diam-diam).
 * ──────────────────────────────────────────────────────────── */

export type BookingStatus = BookingStatusValue;
// Tabel transisi tunggal ada di @nena/shared (dipakai panel + test juga).
export type TransitionAction = BookingAction;
export const TRANSITIONS = BOOKING_TRANSITIONS;

/** Status yang MASIH menahan kursi (untuk cegah double-release). */
export const HOLDS_SEATS: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  "baru_masuk",
  "menunggu_bayar",
  "verifikasi_bukti",
  "menunggu_pelunasan",
  "siap_jalan",
]);

/** Validasi transisi; kembalikan status tujuan atau lempar error.
 *  Pesan galat TIDAK memuat nama enum/aksi internal (aman ditampilkan ke admin). */
export function assertTransition(
  from: BookingStatus,
  action: TransitionAction,
): BookingStatus {
  const def = TRANSITIONS[action];
  if (!def) throw AppError.validation("Aksi tidak dikenal.");
  if (!def.from.includes(from)) {
    throw AppError.conflict(
      "Aksi ini tidak bisa dilakukan pada status pesanan saat ini.",
    );
  }
  return def.to;
}

export function canTransition(
  from: BookingStatus,
  action: TransitionAction,
): boolean {
  return TRANSITIONS[action]?.from.includes(from) ?? false;
}

/** Aksi yang melepas kursi (bila status saat ini masih menahan kursi). */
export const SEAT_RELEASE_ACTIONS: ReadonlySet<TransitionAction> = new Set([
  "expire",
  "cancel",
]);

/**
 * Kebijakan refund berdasar jarak ke keberangkatan:
 *   H-7 ke atas: 80% ; H-3 s/d H-6: 50% ; di bawah itu: 0%.
 * Mengembalikan nominal rupiah (integer) dari amountPaid.
 */
export function computeRefund(
  amountPaid: number,
  departureDateIso: string, // YYYY-MM-DD
  nowIso: string = new Date().toISOString(),
): number {
  const dep = Date.parse(departureDateIso + "T00:00:00Z");
  const now = Date.parse(nowIso.slice(0, 10) + "T00:00:00Z");
  const days = Math.round((dep - now) / (24 * 60 * 60 * 1000));
  let pct = 0;
  if (days >= 7) pct = 80;
  else if (days >= 3) pct = 50;
  else pct = 0;
  return Math.round((amountPaid * pct) / 100);
}
