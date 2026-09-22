import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../lib/errors.js";
import { dateAtOffset } from "../../lib/date.js";
import { getSetting } from "../../repos/settings.repo.js";
import * as vouchersRepo from "../../repos/vouchers.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as schedulesRepo from "../../repos/schedules.repo.js";
import * as participantsRepo from "../../repos/participants.repo.js";
import { record, type ActorContext } from "../audit.js";

function token(): string {
  return randomBytes(24).toString("base64url");
}
function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}
function genCode(): string {
  for (let i = 0; i < 50; i++) {
    const c = "VC-" + String(Math.floor(100000 + Math.random() * 900000));
    if (!vouchersRepo.codeExists(c)) return c;
  }
  throw new AppError("INTERNAL", "Gagal membuat kode voucher.", 500);
}

export interface IssueResult {
  code: string;
  token: string;
  url: string;
}

/**
 * Terbitkan (atau terbitkan ulang) voucher untuk booking. Voucher lama dicabut,
 * tautan baru. Kedaluwarsa H+7 tanggal keberangkatan.
 */
export function issueForBooking(bookingId: string, ctx: ActorContext): IssueResult {
  const booking = bookingsRepo.findById(bookingId);
  if (!booking) throw AppError.notFound("Booking tidak ditemukan.");
  const sched = schedulesRepo.findById(booking.scheduleId);
  const nowIso = new Date().toISOString();

  // Cabut voucher aktif sebelumnya (reissue -> tautan lama tidak berlaku).
  for (const v of vouchersRepo.activeForBooking(bookingId)) {
    vouchersRepo.revoke(v.id, nowIso);
  }

  const code = genCode();
  const raw = token();
  const expiresAt = sched ? dateAtOffset(sched.date, 7) : null; // H+7
  vouchersRepo.insert({
    bookingId,
    code,
    status: "issued",
    accessTokenHash: hashToken(raw),
    expiresAt,
  });
  record(ctx, {
    action: "voucher_issued",
    entity: "voucher",
    entityId: bookingId,
    data: { code },
  });
  return { code, token: raw, url: `/voucher.html?code=${code}&token=${raw}` };
}

/** Data voucher publik (by code + token). Tanpa NIK. */
export function getPublicVoucher(code: string, tok: string) {
  const v = vouchersRepo.findByCode(code);
  if (!v || v.status !== "issued" || !v.accessTokenHash) {
    throw AppError.notFound("Voucher tidak ditemukan.");
  }
  if (v.accessTokenHash !== hashToken(tok)) {
    throw AppError.forbidden("Token voucher tidak valid.");
  }
  if (v.expiresAt && Date.now() > Date.parse(v.expiresAt)) {
    throw AppError.forbidden("Tautan voucher sudah kedaluwarsa.");
  }
  const booking = bookingsRepo.findById(v.bookingId);
  if (!booking) throw AppError.notFound("Booking tidak ditemukan.");
  const sched = schedulesRepo.findById(booking.scheduleId);
  const participants = participantsRepo
    .listByBooking(booking.id)
    .map((p) => ({ name: p.name })); // hanya nama, tanpa NIK

  return {
    voucherCode: v.code,
    bookingCode: booking.code,
    date: sched?.date ?? null,
    meetingPoint: booking.meetingPoint,
    departureTime: sched?.departureTime ?? "07:00",
    pax: booking.pax,
    participants,
    insurancePolicyNo: booking.insurancePolicyNo,
    emergencyContact: getSetting<string>("contact.whatsapp", "6281286133202"),
  };
}
