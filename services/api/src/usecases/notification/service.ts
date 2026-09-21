import { AppError } from "../../lib/errors.js";
import { formatRupiah } from "@nena/shared";
import { getSetting, setSetting } from "../../repos/settings.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as schedulesRepo from "../../repos/schedules.repo.js";
import { getPublicContact } from "../settings/service.js";
import { record, type ActorContext } from "../audit.js";

/** Placeholder yang tersedia (didokumentasikan di UI). */
export const PLACEHOLDERS = ["{{kode}}", "{{nama}}", "{{tanggal}}", "{{paket}}", "{{total}}", "{{dibayar}}", "{{sisa}}", "{{alasan}}"];

interface Template { channel: "wa" | "email"; subject: string; body: string }

const DEFAULTS: Record<string, { label: string; tpl: Template }> = {
  booking_confirmation: { label: "Konfirmasi booking", tpl: { channel: "wa", subject: "Konfirmasi booking {{kode}}", body: "Halo {{nama}}, booking {{kode}} untuk {{paket}} tanggal {{tanggal}} kami terima. Total {{total}}. Silakan selesaikan pembayaran." } },
  invoice: { label: "Tagihan", tpl: { channel: "wa", subject: "Tagihan {{kode}}", body: "Halo {{nama}}, tagihan booking {{kode}}: {{total}}. Sudah dibayar {{dibayar}}, sisa {{sisa}}. Mohon transfer & kirim bukti." } },
  proof_rejected: { label: "Bukti ditolak", tpl: { channel: "wa", subject: "Bukti pembayaran {{kode}} ditolak", body: "Halo {{nama}}, bukti pembayaran {{kode}} belum bisa kami verifikasi: {{alasan}}. Mohon kirim ulang." } },
  settlement: { label: "Pelunasan", tpl: { channel: "wa", subject: "Pelunasan {{kode}}", body: "Halo {{nama}}, mohon lunasi sisa {{sisa}} untuk booking {{kode}} sebelum H-3." } },
  evoucher: { label: "E-voucher", tpl: { channel: "wa", subject: "E-voucher {{kode}}", body: "Halo {{nama}}, booking {{kode}} ({{paket}}, {{tanggal}}) siap jalan. Ini e-voucher Anda. Sampai jumpa di meeting point!" } },
  cancellation: { label: "Pembatalan", tpl: { channel: "wa", subject: "Pembatalan {{kode}}", body: "Halo {{nama}}, booking {{kode}} dibatalkan. {{alasan}}" } },
};

export function listTemplates() {
  return Object.entries(DEFAULTS).map(([key, d]) => {
    const saved = getSetting<Template | null>(`notif.${key}`, null);
    return { key, label: d.label, ...(saved ?? d.tpl) };
  });
}

export function updateTemplate(key: string, input: { channel?: string; subject: string; body: string }, ctx: ActorContext) {
  if (!DEFAULTS[key]) throw AppError.notFound("Template tidak dikenal.");
  const tpl: Template = { channel: (input.channel as Template["channel"]) ?? DEFAULTS[key].tpl.channel, subject: input.subject, body: input.body };
  setSetting(`notif.${key}`, tpl);
  record(ctx, { action: "notification_template_updated", entity: "settings", data: { key } });
  return { key, label: DEFAULTS[key].label, ...tpl };
}

function fill(text: string, map: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? "");
}

/**
 * Render notifikasi untuk booking + kembalikan kanal siap-kirim MANUAL.
 * Untuk WA: waLink (wa.me). Tidak mengirim otomatis; admin yang klik/kirim.
 */
export function renderForBooking(bookingId: string, key: string, ctx: ActorContext) {
  const d = DEFAULTS[key];
  if (!d) throw AppError.notFound("Template tidak dikenal.");
  const b = bookingsRepo.findById(bookingId);
  if (!b) throw AppError.notFound("Booking tidak ditemukan.");
  const sched = schedulesRepo.findById(b.scheduleId);
  const saved = getSetting<Template | null>(`notif.${key}`, null) ?? d.tpl;
  const map: Record<string, string> = {
    kode: b.code, nama: b.customerName, tanggal: sched?.date ?? "-",
    paket: b.packageType, total: formatRupiah(b.total), dibayar: formatRupiah(b.amountPaid),
    sisa: formatRupiah(b.total - b.amountPaid), alasan: b.cancelReason ?? "",
  };
  const subject = fill(saved.subject, map);
  const body = fill(saved.body, map);
  const contact = getPublicContact();
  const phone = String(b.customerPhone || "").replace(/\D/g, "");
  const waLink = saved.channel === "wa" && phone ? `https://wa.me/${phone}?text=${encodeURIComponent(body)}` : null;
  const mailto = saved.channel === "email" ? `mailto:${b.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
  record(ctx, { action: "notification_sent", entity: "booking", entityId: bookingId, data: { key, channel: saved.channel } });
  return { key, channel: saved.channel, subject, body, waLink, mailto, to: saved.channel === "wa" ? b.customerPhone : b.customerEmail, from: contact.whatsapp };
}
