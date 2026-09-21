import { BOOKING_STATUSES, type BookingStatusValue } from "@nena/shared";
import { AppError } from "../../lib/errors.js";

/* ────────────────────────────────────────────────────────────
 * Mesin status booking — tabel transisi EKSPLISIT.
 * Transisi yang tidak terdaftar -> error (bukan lolos diam-diam).
 * ──────────────────────────────────────────────────────────── */

export type BookingStatus = BookingStatusValue;

export type TransitionAction =
  | "send_invoice" // baru_masuk -> menunggu_bayar (tenggat admin)
  | "submit_proof" // menunggu_bayar|menunggu_pelunasan -> verifikasi_bukti
  | "approve_dp" // verifikasi_bukti -> menunggu_pelunasan
  | "approve_full" // verifikasi_bukti -> siap_jalan
  | "reject" // verifikasi_bukti -> menunggu_bayar (hold baru)
  | "expire" // menunggu_bayar -> kadaluarsa (lepas kursi)
  | "complete" // siap_jalan -> selesai (H+1)
  | "cancel"; // apa pun kecuali selesai/batal -> batal (lepas kursi, refund)

/** Status yang MASIH menahan kursi (untuk cegah double-release). */
export const HOLDS_SEATS: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  "baru_masuk",
  "menunggu_bayar",
  "verifikasi_bukti",
  "menunggu_pelunasan",
  "siap_jalan",
]);

const CANCELLABLE_FROM = BOOKING_STATUSES.filter(
  (s) => s !== "selesai" && s !== "batal",
) as BookingStatus[];

interface TransitionDef {
  from: readonly BookingStatus[];
  to: BookingStatus;
}

export const TRANSITIONS: Record<TransitionAction, TransitionDef> = {
  send_invoice: { from: ["baru_masuk"], to: "menunggu_bayar" },
  submit_proof: {
    from: ["menunggu_bayar", "menunggu_pelunasan"],
    to: "verifikasi_bukti",
  },
  approve_dp: { from: ["verifikasi_bukti"], to: "menunggu_pelunasan" },
  approve_full: { from: ["verifikasi_bukti"], to: "siap_jalan" },
  reject: { from: ["verifikasi_bukti"], to: "menunggu_bayar" },
  expire: { from: ["menunggu_bayar"], to: "kadaluarsa" },
  complete: { from: ["siap_jalan"], to: "selesai" },
  cancel: { from: CANCELLABLE_FROM, to: "batal" },
};

/** Validasi transisi; kembalikan status tujuan atau lempar error. */
export function assertTransition(
  from: BookingStatus,
  action: TransitionAction,
): BookingStatus {
  const def = TRANSITIONS[action];
  if (!def) throw AppError.validation(`Aksi transisi tidak dikenal: ${action}`);
  if (!def.from.includes(from)) {
    throw AppError.conflict(
      `Transisi tidak valid: "${action}" dari status "${from}".`,
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
