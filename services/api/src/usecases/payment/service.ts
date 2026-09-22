import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ulid } from "ulid";
import { AppError } from "../../lib/errors.js";
import { repoRoot } from "../../db/paths.js";
import { detectType } from "../../lib/upload.js";
import { getSetting } from "../../repos/settings.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as paymentsRepo from "../../repos/payments.repo.js";
import * as mediaRepo from "../../repos/media.repo.js";
import { record, type ActorContext } from "../audit.js";
import {
  applyTransition,
  hashAccessToken,
} from "../booking/service.js";
import { toBookingDto } from "../booking/dto.js";
import { canTransition } from "../booking/transition.js";
import { issueForBooking } from "../voucher/service.js";
import { providerFor } from "./provider.js";

// Direktori upload DI LUAR apps/site (tidak tersaji statis, tidak bisa di-listing).
const UPLOAD_DIR = resolve(repoRoot, "services/api/data/uploads");

// Booking non-aktif: tidak boleh terima/tolak/unggah bukti.
const INACTIVE_STATUSES = ["batal", "kadaluarsa", "selesai"];

function kindAmount(booking: {
  total: number;
  amountPaid: number;
  paymentScheme: string;
}): { kind: string; amount: number } {
  const dpPct = getSetting<number>("pricing.dp_percent", 50);
  if (booking.amountPaid > 0 && booking.paymentScheme === "dp") {
    return { kind: "pelunasan", amount: booking.total - booking.amountPaid };
  }
  if (booking.paymentScheme === "dp") {
    return { kind: "dp", amount: Math.round((booking.total * dpPct) / 100) };
  }
  return { kind: "full", amount: booking.total };
}

export interface SubmitProofInput {
  code: string;
  token: string;
  buffer: Buffer;
  ctx: ActorContext;
}

/** Upload bukti (publik). Validasi magic bytes, simpan aman, buat payment + media,
 *  pindahkan status ke verifikasi_bukti (state machine). */
export function submitProof(input: SubmitProofInput): {
  ok: true;
  paymentId: string;
} {
  const booking = bookingsRepo.findByCode(input.code);
  if (!booking || !booking.accessTokenHash) {
    throw AppError.notFound("Pesanan tidak ditemukan.");
  }
  if (booking.accessTokenHash !== hashAccessToken(input.token)) {
    throw AppError.forbidden("Token akses tidak valid.");
  }
  if (INACTIVE_STATUSES.includes(booking.status)) {
    throw AppError.conflict(`Booking sudah ${booking.status.replace(/_/g, " ")} — tidak menerima bukti pembayaran.`);
  }
  if (input.buffer.length > 5 * 1024 * 1024) {
    throw AppError.validation("Ukuran file melebihi 5MB.");
  }
  const detected = detectType(input.buffer);
  if (!detected) {
    throw AppError.validation("File harus JPG, PNG, atau PDF yang valid.");
  }
  // Boleh upload saat menunggu_bayar/menunggu_pelunasan, atau ulang saat verifikasi_bukti.
  const canSubmit =
    canTransition(booking.status as never, "submit_proof") ||
    booking.status === "verifikasi_bukti";
  if (!canSubmit) {
    throw AppError.conflict("Tidak bisa mengunggah bukti pada status ini.");
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = ulid() + "." + detected.ext; // nama di-generate ulang
  const path = resolve(UPLOAD_DIR, filename);
  writeFileSync(path, input.buffer);
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");

  const mediaRow = mediaRepo.insert({
    filename,
    mime: detected.mime,
    size: input.buffer.length,
    path,
    sha256,
  });

  const { kind, amount } = kindAmount(booking);
  const payment = paymentsRepo.insert({
    bookingId: booking.id,
    amount,
    method: "transfer",
    kind,
    status: "pending",
    provider: "manual",
    proofMediaId: mediaRow.id,
    paidAt: new Date().toISOString(),
  });

  // Versi lama tetap tersimpan (media & payment lama tidak dihapus).
  if (canTransition(booking.status as never, "submit_proof")) {
    applyTransition(booking.id, "submit_proof", { ctx: input.ctx });
  }
  record(input.ctx, {
    action: "proof_uploaded",
    entity: "booking",
    entityId: booking.id,
    data: { paymentId: payment.id, kind, size: input.buffer.length },
  });
  return { ok: true, paymentId: payment.id };
}

export function listQueue() {
  return paymentsRepo.verificationQueue().map((r) => ({
    id: r.payment.id,
    bookingId: r.payment.bookingId,
    bookingCode: r.bookingCode,
    customerName: r.customerName,
    scheduleDate: r.scheduleDate,
    amount: r.payment.amount,
    kind: r.payment.kind,
    method: r.payment.method,
    createdAt: r.payment.createdAt,
    proofMediaId: r.payment.proofMediaId,
  }));
}

export function getDetail(paymentId: string) {
  const payment = paymentsRepo.findById(paymentId);
  if (!payment) throw AppError.notFound("Pembayaran tidak ditemukan.");
  const booking = bookingsRepo.findById(payment.bookingId);
  return { payment, booking: booking ? toBookingDto(booking) : null };
}

export function approve(paymentId: string, ctx: ActorContext) {
  const payment = paymentsRepo.findById(paymentId);
  if (!payment) throw AppError.notFound("Pembayaran tidak ditemukan.");
  if (payment.status !== "pending") {
    throw AppError.conflict("Pembayaran sudah diproses.");
  }
  const booking = bookingsRepo.findById(payment.bookingId);
  if (!booking) throw AppError.notFound("Booking tidak ditemukan.");
  if (INACTIVE_STATUSES.includes(booking.status)) {
    throw AppError.conflict(`Booking sudah ${booking.status.replace(/_/g, " ")} — bukti tidak bisa diverifikasi.`);
  }

  providerFor(payment.provider).verify(payment); // manual: selalu ok

  // Verifikasi baris payment DULU supaya transisi menghitung uang dari ledger
  // (tanpa top-up ganda) — amountPaid diturunkan dari SUM payments verified.
  paymentsRepo.update(payment.id, {
    status: "verified",
    verifiedBy: ctx.userId,
    verifiedAt: new Date().toISOString(),
  });
  const action = payment.kind === "dp" ? "approve_dp" : "approve_full";
  const updated = applyTransition(booking.id, action, { ctx });
  record(ctx, {
    action: "payment_verified",
    entity: "payment",
    entityId: payment.id,
    data: { kind: payment.kind, amount: payment.amount },
  });
  // Voucher terbit otomatis saat siap_jalan.
  if (updated.status === "siap_jalan") {
    issueForBooking(booking.id, ctx);
  }
  return toBookingDto(updated);
}

export function reject(paymentId: string, reason: string, ctx: ActorContext) {
  if (!reason) throw AppError.validation("Alasan penolakan wajib diisi.");
  const payment = paymentsRepo.findById(paymentId);
  if (!payment) throw AppError.notFound("Pembayaran tidak ditemukan.");
  if (payment.status !== "pending") {
    throw AppError.conflict("Pembayaran sudah diproses.");
  }
  const rbooking = bookingsRepo.findById(payment.bookingId);
  if (rbooking && INACTIVE_STATUSES.includes(rbooking.status)) {
    throw AppError.conflict(`Booking sudah ${rbooking.status.replace(/_/g, " ")} — bukti tidak bisa diproses.`);
  }
  paymentsRepo.update(payment.id, {
    status: "rejected",
    rejectedReason: reason,
    rejectedAt: new Date().toISOString(),
  });
  const updated = applyTransition(payment.bookingId, "reject", { reason, ctx });
  record(ctx, {
    action: "payment_rejected",
    entity: "payment",
    entityId: payment.id,
    data: { reason },
  });
  return toBookingDto(updated);
}

export { UPLOAD_DIR };
