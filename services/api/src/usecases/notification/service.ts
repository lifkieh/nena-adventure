import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors.js";
import { formatRupiah } from "@nena/shared";
import { env } from "../../env.js";
import { getSetting, setSetting } from "../../repos/settings.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as schedulesRepo from "../../repos/schedules.repo.js";
import type { Booking } from "../../db/schema.js";
import * as outboxRepo from "../../repos/email-outbox.repo.js";
import { record, type ActorContext } from "../audit.js";
import { isSmtpConfigured, sendMail } from "../../lib/mailer.js";

/**
 * Notifikasi = EMAIL SAJA. Kanal WhatsApp otomatis DIHILANGKAN (lihat NOTIFICATIONS.md).
 * WhatsApp tetap ada sebagai kontak manual (click-to-chat) di panel, bukan kanal ini.
 */

/** Placeholder yang dikenal (dipakai validasi + chip di editor). */
export const PLACEHOLDERS = [
  "{{kode}}", "{{nama}}", "{{tanggal}}", "{{paket}}", "{{total}}", "{{dibayar}}",
  "{{sisa}}", "{{alasan}}", "{{refund}}", "{{titik_kumpul}}", "{{jam_kumpul}}",
];
const KNOWN = new Set(PLACEHOLDERS.map((p) => p.replace(/[{}]/g, "")));
const MAX_RETRY = 3;

interface Template { subject: string; body: string }

const DEFAULTS: Record<string, { label: string; tpl: Template }> = {
  booking_confirmation: { label: "Konfirmasi booking", tpl: { subject: "Konfirmasi booking {{kode}}", body: "Halo {{nama}},\n\nBooking {{kode}} untuk {{paket}} tanggal {{tanggal}} kami terima. Total {{total}}.\nTitik kumpul: {{titik_kumpul}} pukul {{jam_kumpul}}.\nSilakan selesaikan pembayaran ya.\n\nTerima kasih,\nNena Adventure" } },
  invoice: { label: "Tagihan", tpl: { subject: "Tagihan {{kode}}", body: "Halo {{nama}},\n\nTagihan booking {{kode}}: {{total}}. Sudah dibayar {{dibayar}}, sisa {{sisa}}.\nMohon transfer & kirim bukti.\n\nTerima kasih,\nNena Adventure" } },
  proof_rejected: { label: "Bukti ditolak", tpl: { subject: "Bukti pembayaran {{kode}} ditolak", body: "Halo {{nama}},\n\nBukti pembayaran {{kode}} belum bisa kami verifikasi: {{alasan}}.\nMohon kirim ulang.\n\nTerima kasih,\nNena Adventure" } },
  settlement: { label: "Reminder pelunasan", tpl: { subject: "Pelunasan {{kode}}", body: "Halo {{nama}},\n\nMohon lunasi sisa {{sisa}} untuk booking {{kode}} sebelum tenggat.\n\nTerima kasih,\nNena Adventure" } },
  evoucher: { label: "E-voucher", tpl: { subject: "E-voucher {{kode}}", body: "Halo {{nama}},\n\nBooking {{kode}} ({{paket}}, {{tanggal}}) siap jalan. Ini e-voucher Anda.\nTitik kumpul: {{titik_kumpul}} pukul {{jam_kumpul}}.\nSampai jumpa!\n\nNena Adventure" } },
  cancellation: { label: "Pembatalan / refund", tpl: { subject: "Pembatalan {{kode}}", body: "Halo {{nama}},\n\nBooking {{kode}} dibatalkan. {{alasan}}\nRefund: {{refund}}.\n\nNena Adventure" } },
};

function getTpl(key: string): Template {
  const d = DEFAULTS[key];
  if (!d) throw AppError.notFound("Template tidak dikenal.");
  return getSetting<Template | null>(`notif.${key}`, null) ?? d.tpl;
}

export function listTemplates() {
  return Object.entries(DEFAULTS).map(([key, d]) => {
    const t = getSetting<Template | null>(`notif.${key}`, null) ?? d.tpl;
    return { key, label: d.label, channel: "email", subject: t.subject, body: t.body };
  });
}

/** Placeholder tak dikenal -> tolak simpan. */
function assertPlaceholders(text: string): void {
  const bad: string[] = [];
  text.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!KNOWN.has(k)) bad.push(k); return _; });
  if (bad.length) {
    throw AppError.validation(`Placeholder tak dikenal: ${[...new Set(bad)].map((b) => `{{${b}}}`).join(", ")}`);
  }
}

export function updateTemplate(key: string, input: { subject: string; body: string }, ctx: ActorContext) {
  if (!DEFAULTS[key]) throw AppError.notFound("Template tidak dikenal.");
  assertPlaceholders(input.subject);
  assertPlaceholders(input.body);
  const tpl: Template = { subject: input.subject, body: input.body };
  setSetting(`notif.${key}`, tpl);
  record(ctx, { action: "notification_template_updated", entity: "settings", data: { key } });
  return { key, label: DEFAULTS[key].label, channel: "email", ...tpl };
}

function fill(text: string, map: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? "");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** Bungkus body plain-text jadi HTML sederhana (paragraf + <br>). */
function toHtml(text: string): string {
  const paras = text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
  return `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">${paras}</div>`;
}

function mapForBooking(b: Booking): Record<string, string> {
  const sched = schedulesRepo.findById(b.scheduleId);
  return {
    kode: b.code, nama: b.customerName, tanggal: sched?.date ?? "-",
    paket: b.packageType, total: formatRupiah(b.total), dibayar: formatRupiah(b.amountPaid),
    sisa: formatRupiah(b.total - b.amountPaid), alasan: b.cancelReason ?? "",
    refund: formatRupiah(b.refundAmount ?? 0),
    titik_kumpul: b.meetingPoint ?? sched?.meetingPoint ?? "-",
    jam_kumpul: sched?.departureTime ?? "07:00",
  };
}

function render(key: string, map: Record<string, string>): { subject: string; text: string; html: string } {
  const t = getTpl(key);
  const subject = fill(t.subject, map);
  const text = fill(t.body, map);
  return { subject, text, html: toHtml(text) };
}

export function smtpConfigured(): boolean {
  return isSmtpConfigured();
}

/** Mode efektif: is_test SELALU dipaksa dryrun; selain itu ikut NOTIFY_MODE. */
function effectiveMode(isTest: boolean): "off" | "dryrun" | "live" {
  if (isTest) return "dryrun";
  return env.NOTIFY_MODE;
}

/** Batas kirim per jam terlampaui? (hanya relevan untuk live) */
function hourlyLimitHit(): boolean {
  const since = new Date(Date.now() - 3600_000).toISOString();
  return outboxRepo.sentSince(since) >= env.NOTIFY_MAX_PER_HOUR;
}

interface EnqueueOpts {
  bookingId: string;
  templateKey: string;
  stateTransition: string;
  ctx: ActorContext;
  /** Variabel tambahan untuk placeholder yang tak ada di booking (mis. alasan tolak). */
  extraVars?: Record<string, string>;
}

/**
 * Enqueue + (untuk live) kirim satu email notifikasi. Idempoten pada
 * (bookingId, templateKey, stateTransition). Menghormati NOTIFY_MODE, is_test,
 * NOTIFY_REDIRECT_TO, dan batas per jam. Tak pernah melempar ke pemanggil trigger.
 */
export async function enqueueAndSend(opts: EnqueueOpts): Promise<outboxRepo.OutboxRow | null> {
  const { bookingId, templateKey, stateTransition, ctx, extraVars } = opts;
  if (!DEFAULTS[templateKey]) return null;
  const existing = outboxRepo.findByIdem(bookingId, templateKey, stateTransition);
  if (existing) return existing; // idempoten: sudah pernah diproses

  const b = bookingsRepo.findById(bookingId);
  if (!b) return null;
  const mode = effectiveMode(!!b.isTest);
  const origTo = b.customerEmail;

  const map = { ...mapForBooking(b), ...(extraVars ?? {}) };
  let { subject } = render(templateKey, map);
  const { text, html } = render(templateKey, map);

  // Redirect uji: alihkan penerima, tandai subject + header.
  const redirect = env.NOTIFY_REDIRECT_TO;
  const to = redirect || origTo;
  const headers: Record<string, string> = {};
  if (redirect) { subject = `[REDIRECT] ${subject}`; headers["X-Original-To"] = origTo ?? ""; }

  if (!to) {
    return outboxRepo.insert({
      bookingId, templateKey, stateTransition, toEmail: origTo ?? "-", subject,
      bodyHtml: html, bodyText: text, status: "skipped", mode, attemptCount: 0,
      lastError: "Tidak ada alamat email penerima",
    });
  }

  // off / dryrun / is_test -> catat baris tapi TIDAK kirim.
  if (mode === "off" || mode === "dryrun") {
    const row = outboxRepo.insert({
      bookingId, templateKey, stateTransition, toEmail: to, subject,
      bodyHtml: html, bodyText: text, status: "skipped", mode, attemptCount: 0,
      lastError: mode === "off" ? "NOTIFY_MODE=off" : "dryrun (tidak dikirim)",
    });
    record(ctx, { action: "notification_email_skipped", entity: "booking", entityId: bookingId, data: { key: templateKey, mode, stateTransition } });
    return row;
  }

  // live
  if (!isSmtpConfigured()) {
    return outboxRepo.insert({
      bookingId, templateKey, stateTransition, toEmail: to, subject,
      bodyHtml: html, bodyText: text, status: "failed", mode, attemptCount: 0,
      lastError: "SMTP belum dikonfigurasi",
    });
  }
  if (hourlyLimitHit()) {
    return outboxRepo.insert({
      bookingId, templateKey, stateTransition, toEmail: to, subject,
      bodyHtml: html, bodyText: text, status: "queued", mode, attemptCount: 0,
      lastError: "Batas kirim per jam tercapai; menunggu retry",
    });
  }
  const row = outboxRepo.insert({
    bookingId, templateKey, stateTransition, toEmail: to, subject,
    bodyHtml: html, bodyText: text, status: "queued", mode, attemptCount: 0,
  });
  await attemptSend(row.id, to, subject, text, html, headers, ctx, bookingId, templateKey);
  return outboxRepo.findById(row.id) ?? row;
}

async function attemptSend(
  rowId: string, to: string, subject: string, text: string, html: string,
  headers: Record<string, string>, ctx: ActorContext, bookingId: string | null, templateKey: string,
): Promise<void> {
  const row = outboxRepo.findById(rowId);
  if (!row) return;
  const attempt = row.attemptCount + 1;
  try {
    const { messageId } = await sendMail({ to, subject, text, html, headers });
    outboxRepo.update(rowId, { status: "sent", attemptCount: attempt, sentAt: new Date().toISOString(), lastError: null });
    record(ctx, { action: "notification_email_sent", entity: "booking", entityId: bookingId ?? undefined, data: { key: templateKey, to, subject, status: "success", messageId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = attempt >= MAX_RETRY ? "failed" : "queued";
    outboxRepo.update(rowId, { status, attemptCount: attempt, lastError: message });
    record(ctx, { action: "notification_email_failed", entity: "booking", entityId: bookingId ?? undefined, data: { key: templateKey, to, subject, attempt, error: message } });
  }
}

/** Retry baris live yang masih queued (backoff = dijalankan job berkala). */
export async function retryOutbox(ctx: ActorContext = SYSTEM_NOTIF_CTX): Promise<number> {
  if (!isSmtpConfigured() || env.NOTIFY_MODE !== "live") return 0;
  const rows = outboxRepo.retryable(MAX_RETRY);
  let n = 0;
  for (const r of rows) {
    if (hourlyLimitHit()) break;
    await attemptSend(r.id, r.toEmail, r.subject, r.bodyText, r.bodyHtml, {}, ctx, r.bookingId, r.templateKey);
    n++;
  }
  return n;
}

const SYSTEM_NOTIF_CTX: ActorContext = { userId: null, role: "system", ip: null, userAgent: "notify-job" };

/** Job terjadwal: reminder pelunasan untuk booking menunggu_pelunasan. Idempoten
 *  (satu email "settlement" per booking via stateTransition tetap). */
export async function runSettlementReminders(): Promise<number> {
  const ids = bookingsRepo.idsByStatus("menunggu_pelunasan");
  let n = 0;
  for (const id of ids) {
    const r = await enqueueAndSend({ bookingId: id, templateKey: "settlement", stateTransition: "settlement", ctx: SYSTEM_NOTIF_CTX });
    if (r) n++;
  }
  return n;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Menunggu kirim", sent: "Terkirim", failed: "Gagal", skipped: "Dilewati",
};

function toOutboxDto(r: outboxRepo.OutboxRow) {
  return {
    id: r.id, bookingId: r.bookingId, templateKey: r.templateKey,
    label: DEFAULTS[r.templateKey]?.label ?? r.templateKey,
    to: r.toEmail, subject: r.subject, bodyText: r.bodyText, bodyHtml: r.bodyHtml,
    status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
    mode: r.mode, attemptCount: r.attemptCount, lastError: r.lastError,
    createdAt: r.createdAt, sentAt: r.sentAt,
  };
}

/** Daftar outbox untuk halaman "Riwayat notifikasi". */
export function listOutbox(filter: { status?: string } = {}) {
  return { items: outboxRepo.list(filter).map(toOutboxDto) };
}

/** Riwayat email satu booking (untuk kartu di detail booking). */
export function listEmailHistory(bookingId: string) {
  const items = outboxRepo.list().filter((r) => r.bookingId === bookingId).map(toOutboxDto);
  return { items };
}

/** Kirim ulang satu email (aksi admin, konfirmasi di UI). Bypass idempotensi via nonce. */
export async function resend(outboxId: string, ctx: ActorContext) {
  const row = outboxRepo.findById(outboxId);
  if (!row) throw AppError.notFound("Email tidak ditemukan.");
  if (!row.bookingId) throw AppError.validation("Email uji tidak bisa dikirim ulang dari sini.");
  const res = await enqueueAndSend({
    bookingId: row.bookingId, templateKey: row.templateKey,
    stateTransition: `manual:${randomUUID()}`, ctx,
  });
  return res ? toOutboxDto(res) : null;
}

/** Aksi admin manual: kirim template ke booking (mis. Tagihan). Konfirmasi di UI. */
export async function sendManual(bookingId: string, templateKey: string, ctx: ActorContext) {
  const res = await enqueueAndSend({ bookingId, templateKey, stateTransition: `manual:${randomUUID()}`, ctx });
  return res ? toOutboxDto(res) : null;
}

/** Preview editor: render template pakai booking contoh nyata (terbaru) atau data dummy. */
export function previewTemplate(key: string, draft?: { subject: string; body: string }) {
  if (!DEFAULTS[key]) throw AppError.notFound("Template tidak dikenal.");
  const sample = bookingsRepo.latest() ?? null;
  const map = sample
    ? mapForBooking(sample)
    : { kode: "NA-000000", nama: "Budi Contoh", tanggal: "2026-09-26", paket: "reguler", total: "Rp775.000", dibayar: "Rp387.500", sisa: "Rp387.500", alasan: "(alasan)", refund: "Rp0", titik_kumpul: "Anyer", jam_kumpul: "07:00" };
  const subjT = draft?.subject ?? getTpl(key).subject;
  const bodyT = draft?.body ?? getTpl(key).body;
  if (draft) { assertPlaceholders(subjT); assertPlaceholders(bodyT); }
  const subject = fill(subjT, map);
  const text = fill(bodyT, map);
  return { subject, text, html: toHtml(text), usedSample: !!sample };
}

/** Tombol "Kirim email uji" (owner-only): kirim template ke email owner. */
export async function sendTest(key: string, ctx: ActorContext) {
  if (!DEFAULTS[key]) throw AppError.notFound("Template tidak dikenal.");
  const to = env.OWNER_EMAIL;
  const pv = previewTemplate(key);
  const mode = env.NOTIFY_MODE; // uji tidak terikat booking; ikut mode env
  if (mode === "off") return { status: "skipped" as const, mode, to, note: "NOTIFY_MODE=off" };
  if (mode === "dryrun") {
    outboxRepo.insert({ bookingId: null, templateKey: key, stateTransition: `test:${randomUUID()}`, toEmail: to, subject: `[UJI] ${pv.subject}`, bodyHtml: pv.html, bodyText: pv.text, status: "skipped", mode, attemptCount: 0, lastError: "dryrun (tidak dikirim)" });
    return { status: "skipped" as const, mode, to, note: "dryrun — cek Riwayat notifikasi" };
  }
  if (!isSmtpConfigured()) throw AppError.validation("SMTP belum dikonfigurasi.");
  const row = outboxRepo.insert({ bookingId: null, templateKey: key, stateTransition: `test:${randomUUID()}`, toEmail: to, subject: `[UJI] ${pv.subject}`, bodyHtml: pv.html, bodyText: pv.text, status: "queued", mode, attemptCount: 0 });
  await attemptSend(row.id, to, `[UJI] ${pv.subject}`, pv.text, pv.html, {}, ctx, null, key);
  const done = outboxRepo.findById(row.id);
  if (done?.status === "failed") throw new AppError("EMAIL_SEND_FAILED", `Gagal kirim uji: ${done.lastError ?? ""}`, 502);
  return { status: "sent" as const, mode, to };
}
