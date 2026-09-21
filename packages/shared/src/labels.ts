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
