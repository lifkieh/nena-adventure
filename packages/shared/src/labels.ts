// Import TYPE-only agar tidak ada siklus runtime dengan index.ts.
import type { BookingStatusValue, ScheduleStatus } from "./index.js";

export interface StatusMeta {
  label: string; // Bahasa Indonesia, tampil ke admin (bukan enum mentah)
  color: "slate" | "amber" | "blue" | "emerald" | "green" | "red";
}

export const bookingStatusMeta: Record<BookingStatusValue, StatusMeta> = {
  baru_masuk: { label: "Baru masuk", color: "slate" },
  menunggu_bayar: { label: "Menunggu bayar", color: "amber" },
  verifikasi_bukti: { label: "Verifikasi bukti", color: "blue" },
  menunggu_pelunasan: { label: "Menunggu pelunasan", color: "amber" },
  siap_jalan: { label: "Siap jalan", color: "emerald" },
  selesai: { label: "Selesai", color: "green" },
  kadaluarsa: { label: "Kadaluarsa", color: "slate" },
  batal: { label: "Batal", color: "red" },
};

export const scheduleStatusMeta: Record<ScheduleStatus, StatusMeta> = {
  draft: { label: "Draf", color: "slate" },
  terbit: { label: "Terbit", color: "emerald" },
  tutup: { label: "Ditutup", color: "amber" },
  arsip: { label: "Arsip", color: "slate" },
};

export function bookingStatusLabel(v: string): string {
  return (bookingStatusMeta as Record<string, StatusMeta>)[v]?.label ?? v;
}
export function scheduleStatusLabel(v: string): string {
  return (scheduleStatusMeta as Record<string, StatusMeta>)[v]?.label ?? v;
}

/* ── Mesin status booking (tabel transisi tunggal, dipakai server + panel) ── */

export type BookingAction =
  | "send_invoice"
  | "submit_proof"
  | "approve_dp"
  | "approve_full"
  | "reject"
  | "expire"
  | "complete"
  | "cancel";

const ALL_STATUSES: BookingStatusValue[] = [
  "baru_masuk", "menunggu_bayar", "verifikasi_bukti", "menunggu_pelunasan",
  "siap_jalan", "selesai", "kadaluarsa", "batal",
];
const CANCELLABLE = ALL_STATUSES.filter((s) => s !== "selesai" && s !== "batal");

export const BOOKING_TRANSITIONS: Record<
  BookingAction,
  { from: BookingStatusValue[]; to: BookingStatusValue }
> = {
  send_invoice: { from: ["baru_masuk"], to: "menunggu_bayar" },
  submit_proof: { from: ["menunggu_bayar", "menunggu_pelunasan"], to: "verifikasi_bukti" },
  approve_dp: { from: ["verifikasi_bukti"], to: "menunggu_pelunasan" },
  approve_full: { from: ["verifikasi_bukti"], to: "siap_jalan" },
  reject: { from: ["verifikasi_bukti"], to: "menunggu_bayar" },
  expire: { from: ["menunggu_bayar"], to: "kadaluarsa" },
  complete: { from: ["siap_jalan"], to: "selesai" },
  cancel: { from: CANCELLABLE, to: "batal" },
};

/** Label aksi Bahasa Indonesia (TANPA nama enum/aksi internal ke admin). */
export const bookingActionMeta: Record<BookingAction, { label: string; requiresReason?: boolean; danger?: boolean }> = {
  send_invoice: { label: "Kirim tagihan" },
  submit_proof: { label: "Tandai bukti masuk" },
  approve_dp: { label: "Setujui DP" },
  approve_full: { label: "Setujui pelunasan" },
  reject: { label: "Tolak bukti", requiresReason: true },
  expire: { label: "Tandai kedaluwarsa" },
  complete: { label: "Selesaikan perjalanan" },
  cancel: { label: "Batalkan booking", requiresReason: true, danger: true },
};

export const BOOKING_ACTIONS = Object.keys(BOOKING_TRANSITIONS) as BookingAction[];

/** Daftar aksi yang LEGAL dari status tertentu. */
export function legalActionsFor(status: string): BookingAction[] {
  return BOOKING_ACTIONS.filter((a) => BOOKING_TRANSITIONS[a].from.includes(status as BookingStatusValue));
}

export function bookingActionLabel(a: string): string {
  return (bookingActionMeta as Record<string, { label: string }>)[a]?.label ?? a;
}
