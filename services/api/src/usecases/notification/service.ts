import { AppError } from "../../lib/errors.js";
import { formatRupiah, normalizeWa } from "@nena/shared";
import { getSetting, setSetting } from "../../repos/settings.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as schedulesRepo from "../../repos/schedules.repo.js";
import * as auditRepo from "../../repos/audit.repo.js";
import { getPublicContact } from "../settings/service.js";
import { record, type ActorContext } from "../audit.js";
import { isSmtpConfigured, sendMail } from "../../lib/mailer.js";

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

/** True kalau SMTP siap dipakai (untuk mengaktifkan tombol "Kirim email"). */
export function smtpConfigured(): boolean {
  return isSmtpConfigured();
}

/** Bangun subjek+isi+link untuk sebuah booking (TANPA audit, TANPA kirim). */
function buildRender(bookingId: string, key: string) {
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
  const phone = normalizeWa(b.customerPhone || "");
  const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(body)}` : null;
  return { b, saved, subject, body, waLink };
}

/**
 * Pratinjau notifikasi (untuk dialog konfirmasi). TIDAK mengirim & TIDAK mengaudit.
 * Menyediakan email tujuan, subjek, isi, link WA (aksi sekunder manual), status SMTP.
 */
export function previewForBooking(bookingId: string, key: string) {
  const { b, saved, subject, body, waLink } = buildRender(bookingId, key);
  return {
    key,
    channel: saved.channel,
    subject,
    body,
    waLink, // WA = aksi manual sekunder (dibuka di browser)
    emailTo: b.customerEmail,
    smtpConfigured: isSmtpConfigured(),
  };
}

/** Kirim email notifikasi via SMTP. Konfirmasi di UI dulu. Sukses/gagal diaudit. */
export async function sendEmailForBooking(bookingId: string, key: string, ctx: ActorContext) {
  if (!isSmtpConfigured()) {
    throw AppError.validation("SMTP belum dikonfigurasi. Atur SMTP dulu di environment.");
  }
  const { b, subject, body } = buildRender(bookingId, key);
  const to = b.customerEmail;
  if (!to) throw AppError.validation("Booking ini tidak punya alamat email.");
  try {
    const { messageId } = await sendMail({ to, subject, text: body });
    record(ctx, {
      action: "notification_email_sent",
      entity: "booking",
      entityId: bookingId,
      data: { key, to, subject, status: "success", messageId },
    });
    return { ok: true as const, to, subject };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    record(ctx, {
      action: "notification_email_sent",
      entity: "booking",
      entityId: bookingId,
      data: { key, to, subject, status: "failed", error: message },
    });
    throw new AppError("EMAIL_SEND_FAILED", `Gagal mengirim email: ${message}`, 502);
  }
}

/** Riwayat email terkirim untuk sebuah booking (dari audit log). */
export function listEmailHistory(bookingId: string) {
  const { rows } = auditRepo.query({ entity: "booking", entityId: bookingId, page: 1, pageSize: 100 });
  const items = rows
    .filter((r) => r.action === "notification_email_sent")
    .map((r) => {
      // details tersimpan sebagai JSON string: { role, change: {...} }
      let change: { key?: string; to?: string; subject?: string; status?: string; error?: string } = {};
      try {
        const parsed = r.details ? (JSON.parse(r.details) as { change?: typeof change }) : null;
        change = parsed?.change ?? {};
      } catch {
        change = {};
      }
      return {
        id: r.id,
        key: change.key ?? null,
        to: change.to ?? null,
        subject: change.subject ?? null,
        status: change.status ?? null,
        error: change.error ?? null,
        actorEmail: r.actorEmail,
        createdAt: r.createdAt,
      };
    });
  return { items };
}
