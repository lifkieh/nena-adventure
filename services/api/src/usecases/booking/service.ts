import { createHash, randomBytes } from "node:crypto";
import type { PublicScheduleDto, UserRole } from "@nena/shared";
import { AppError } from "../../lib/errors.js";
import { txImmediate } from "../../lib/tx.js";
import { dateAtOffset, todayJakarta } from "../../lib/date.js";
import { getSetting } from "../../repos/settings.repo.js";
import * as bookingsRepo from "../../repos/bookings.repo.js";
import * as schedulesRepo from "../../repos/schedules.repo.js";
import * as seatRepo from "../../repos/seat-ledger.repo.js";
import * as participantsRepo from "../../repos/participants.repo.js";
import * as auditRepo from "../../repos/audit.repo.js";
import type { Booking } from "../../db/schema.js";
import { record, type ActorContext } from "../audit.js";
import { computePrice } from "./pricing.js";
import {
  assertTransition,
  computeRefund,
  HOLDS_SEATS,
  SEAT_RELEASE_ACTIONS,
  type BookingStatus,
  type TransitionAction,
} from "./transition.js";

const SYSTEM_CTX: ActorContext = {
  userId: null,
  role: "system",
  ip: null,
  userAgent: null,
};

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}
export function hashAccessToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}
function genCodeCandidate(): string {
  return "NA-" + String(Math.floor(100000 + Math.random() * 900000));
}
function generateUniqueCode(): string {
  for (let i = 0; i < 50; i++) {
    const c = genCodeCandidate();
    if (!bookingsRepo.codeExists(c)) return c;
  }
  throw new AppError("INTERNAL", "Gagal membuat kode booking.", 500);
}

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
}
export interface ParticipantIn {
  name: string;
  birthDate?: string;
  idNumber?: string;
}
export interface CreateWebInput {
  scheduleId: string;
  packageKey: string;
  meetingPoint: string;
  pax: number;
  paymentScheme: "lunas" | "dp";
  customer: CustomerInput;
  participants: ParticipantIn[];
  clientTotal?: number;
  idempotencyKey?: string | null;
  ctx: ActorContext;
}

export interface CreateResult {
  code: string;
  holdExpiresAt: string | null;
  token: string;
  total: number;
  dp: number;
  status: BookingStatus;
}

function priceAndValidate(input: {
  packageKey: string;
  meetingPoint: string;
  pax: number;
  clientTotal?: number;
}) {
  const price = computePrice(input);
  if (input.clientTotal != null && input.clientTotal !== price.total) {
    throw AppError.validation(
      "Total pesanan tidak cocok dengan perhitungan server. Muat ulang harga.",
    );
  }
  return price;
}

/** Booking dari situs publik: langsung menunggu_bayar + hold kursi. Idempoten. */
export function createWebBooking(input: CreateWebInput): CreateResult {
  const price = priceAndValidate(input);

  return txImmediate((): CreateResult => {
    // Idempotency replay.
    if (input.idempotencyKey) {
      const existing = bookingsRepo.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const token = newAccessToken();
        bookingsRepo.update(existing.id, {
          accessTokenHash: hashAccessToken(token),
        });
        return {
          code: existing.code,
          holdExpiresAt: existing.holdExpiresAt,
          token,
          total: existing.total,
          dp: price.dp,
          status: existing.status as BookingStatus,
        };
      }
    }

    const sched = schedulesRepo.findById(input.scheduleId);
    if (!sched || sched.status !== "open") {
      throw AppError.validation("Jadwal tidak tersedia.");
    }
    if (sched.date < todayJakarta()) {
      throw AppError.validation("Tanggal keberangkatan sudah lewat.");
    }
    const remaining = schedulesRepo.remainingSeats(input.scheduleId);
    if (remaining < input.pax) {
      throw new AppError(
        "SEAT_UNAVAILABLE",
        remaining <= 0
          ? "Kuota tanggal ini sudah penuh."
          : `Kursi tersisa hanya ${remaining}, tidak cukup untuk ${input.pax} peserta.`,
        409,
      );
    }

    const code = generateUniqueCode();
    const token = newAccessToken();
    const holdMinutes = getSetting<number>("booking.hold_minutes", 60);
    const now = Date.now();
    const holdExpiresAt = new Date(now + holdMinutes * 60_000).toISOString();
    const nowIso = new Date(now).toISOString();

    const booking = bookingsRepo.insert({
      code,
      scheduleId: input.scheduleId,
      packageType: input.packageKey,
      status: "menunggu_bayar",
      source: "web",
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      customerEmail: input.customer.email,
      meetingPoint: input.meetingPoint,
      pax: input.pax,
      subtotal: price.subtotal,
      discount: price.discount,
      serviceFee: price.serviceFee,
      total: price.total,
      amountPaid: 0,
      paymentScheme: input.paymentScheme,
      idempotencyKey: input.idempotencyKey ?? null,
      accessTokenHash: hashAccessToken(token),
      holdExpiresAt,
      statusChangedAt: nowIso,
    });

    participantsRepo.addMany(booking.id, input.participants);
    seatRepo.add({
      scheduleId: input.scheduleId,
      bookingId: booking.id,
      delta: input.pax,
      reason: "hold",
    });

    record(input.ctx, {
      action: "booking_created",
      entity: "booking",
      entityId: booking.id,
      data: { code, source: "web", pax: input.pax, total: price.total },
    });

    return {
      code,
      holdExpiresAt,
      token,
      total: price.total,
      dp: price.dp,
      status: "menunggu_bayar",
    };
  });
}

/** Booking manual oleh admin: baru_masuk (tanpa timer) + hold kursi. */
export function createManualBooking(input: {
  scheduleId: string;
  packageKey: string;
  meetingPoint: string;
  pax: number;
  paymentScheme: "lunas" | "dp";
  customer: CustomerInput;
  participants: ParticipantIn[];
  priceOverride?: number;
  priceOverrideReason?: string;
  ctx: ActorContext;
}): Booking {
  const price = computePrice(input);
  if (input.priceOverride != null && !input.priceOverrideReason) {
    throw AppError.validation("Override harga wajib menyertakan alasan.");
  }
  const total = input.priceOverride ?? price.total;

  return txImmediate((): Booking => {
    const sched = schedulesRepo.findById(input.scheduleId);
    if (!sched) throw AppError.validation("Jadwal tidak ditemukan.");
    const remaining = schedulesRepo.remainingSeats(input.scheduleId);
    if (remaining < input.pax) {
      throw new AppError("SEAT_UNAVAILABLE", "Kuota tidak cukup.", 409);
    }
    const code = generateUniqueCode();
    const nowIso = new Date().toISOString();
    const booking = bookingsRepo.insert({
      code,
      scheduleId: input.scheduleId,
      packageType: input.packageKey,
      status: "baru_masuk",
      source: "manual",
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      customerEmail: input.customer.email,
      meetingPoint: input.meetingPoint,
      pax: input.pax,
      subtotal: price.subtotal,
      discount: price.discount,
      serviceFee: price.serviceFee,
      total,
      amountPaid: 0,
      paymentScheme: input.paymentScheme,
      priceOverrideReason: input.priceOverrideReason ?? null,
      createdByUserId: input.ctx.userId,
      statusChangedAt: nowIso,
    });
    participantsRepo.addMany(booking.id, input.participants);
    seatRepo.add({
      scheduleId: input.scheduleId,
      bookingId: booking.id,
      delta: input.pax,
      reason: "hold",
    });
    record(input.ctx, {
      action: "booking_created",
      entity: "booking",
      entityId: booking.id,
      data: {
        code,
        source: "manual",
        pax: input.pax,
        total,
        priceOverride: input.priceOverride ?? null,
        reason: input.priceOverrideReason ?? null,
      },
    });
    return booking;
  });
}

export interface TransitionOptions {
  reason?: string;
  dueAt?: string; // untuk send_invoice
  ctx: ActorContext;
}

/**
 * Terapkan transisi status + efek kursi + audit, dalam SATU transaksi.
 * Re-fetch booking di dalam tx supaya aman dijalankan bersamaan.
 */
export function applyTransition(
  bookingId: string,
  action: TransitionAction,
  opts: TransitionOptions,
): Booking {
  return txImmediate((): Booking => {
    const booking = bookingsRepo.findById(bookingId);
    if (!booking) throw AppError.notFound("Booking tidak ditemukan.");
    const from = booking.status as BookingStatus;
    const to = assertTransition(from, action);

    if ((action === "cancel" || action === "reject") && !opts.reason) {
      throw AppError.validation("Alasan wajib diisi untuk aksi ini.");
    }

    const nowIso = new Date().toISOString();
    const patch: Partial<Booking> = { status: to, statusChangedAt: nowIso };

    // Efek kursi (lepas) — hanya bila status saat ini masih menahan kursi.
    if (SEAT_RELEASE_ACTIONS.has(action) && HOLDS_SEATS.has(from)) {
      seatRepo.add({
        scheduleId: booking.scheduleId,
        bookingId: booking.id,
        delta: -booking.pax,
        reason: action === "cancel" ? "cancel" : "release",
      });
    }

    const sched = schedulesRepo.findById(booking.scheduleId);
    const dpPercent = getSetting<number>("pricing.dp_percent", 50);

    switch (action) {
      case "send_invoice": {
        const hours = getSetting<number>("booking.manual_hold_hours", 24);
        patch.holdExpiresAt =
          opts.dueAt ?? new Date(Date.now() + hours * 3600_000).toISOString();
        break;
      }
      case "submit_proof":
        patch.holdExpiresAt = null;
        break;
      case "approve_dp":
        patch.balanceDueAt = sched ? dateAtOffset(sched.date, -3) : null;
        patch.amountPaid = Math.round((booking.total * dpPercent) / 100);
        break;
      case "approve_full":
        patch.confirmedAt = nowIso;
        patch.amountPaid = booking.total;
        break;
      case "reject": {
        const holdMinutes = getSetting<number>("booking.hold_minutes", 60);
        patch.holdExpiresAt = new Date(
          Date.now() + holdMinutes * 60_000,
        ).toISOString();
        break;
      }
      case "cancel":
        patch.refundAmount = sched
          ? computeRefund(booking.amountPaid, sched.date, nowIso)
          : 0;
        patch.cancelReason = opts.reason ?? null;
        patch.cancelledBy = opts.ctx.userId;
        break;
      default:
        break;
    }

    const updated = bookingsRepo.update(booking.id, patch);
    record(opts.ctx, {
      action: `booking_${action}`,
      entity: "booking",
      entityId: booking.id,
      before: { status: from },
      after: { status: to, reason: opts.reason ?? null },
    });
    return updated;
  });
}

/** Ringkasan publik by code + token (untuk halaman langkah 4 yang bertahan refresh). */
export function getPublicSummary(code: string, token: string) {
  const booking = bookingsRepo.findByCode(code);
  if (!booking || !booking.accessTokenHash) {
    throw AppError.notFound("Pesanan tidak ditemukan.");
  }
  if (booking.accessTokenHash !== hashAccessToken(token)) {
    throw AppError.forbidden("Token akses tidak valid.");
  }
  const now = Date.now();
  const holdMsLeft = booking.holdExpiresAt
    ? Math.max(0, Date.parse(booking.holdExpiresAt) - now)
    : null;
  return {
    code: booking.code,
    status: booking.status,
    total: booking.total,
    amountPaid: booking.amountPaid,
    paymentScheme: booking.paymentScheme,
    holdExpiresAt: booking.holdExpiresAt,
    holdSecondsLeft: holdMsLeft == null ? null : Math.floor(holdMsLeft / 1000),
    pax: booking.pax,
    packageType: booking.packageType,
    meetingPoint: booking.meetingPoint,
  };
}

function seatLabel(remaining: number, threshold: number): string {
  if (remaining <= 0) return "kuota penuh";
  if (remaining <= threshold) return `sisa ${remaining} kursi`;
  return "kursi masih banyak";
}

/** Jadwal publik: open + belum lewat, dengan sisa kursi & label. */
export function listPublicSchedules(): PublicScheduleDto[] {
  expireOverdueHolds(); // evaluasi lazy
  const today = todayJakarta();
  return schedulesRepo.listOpenUpcoming(today).map((s) => {
    const remaining = schedulesRepo.remainingSeats(s.id);
    return {
      id: s.id,
      date: s.date,
      remaining,
      label: seatLabel(remaining, s.threshold),
      publicNote: s.publicNote,
    };
  });
}

/** Ekspirasi hold yang lewat. Aman dijalankan berulang/berbarengan. */
export function expireOverdueHolds(nowIso: string = new Date().toISOString()): number {
  const expired = bookingsRepo.findExpiredHolds(nowIso);
  let n = 0;
  for (const b of expired) {
    try {
      applyTransition(b.id, "expire", { ctx: SYSTEM_CTX });
      n++;
    } catch {
      // Sudah berubah status (mis. run job lain) -> lewati (tidak double release).
    }
  }
  return n;
}

/* ── Query untuk admin (lapisan usecase; routes tidak sentuh repo) ── */

export function listBookings(filter: bookingsRepo.BookingListFilter) {
  const { rows, total } = bookingsRepo.list(filter);
  return { items: rows, page: filter.page, pageSize: filter.pageSize, total };
}

export function getBookingDetail(id: string, canReadPii: boolean) {
  const booking = bookingsRepo.findById(id);
  if (!booking) throw AppError.notFound("Booking tidak ditemukan.");
  const participants = participantsRepo.listByBooking(id).map((p) => ({
    name: p.name,
    birthDate: p.birthDate,
    idNumberLast4: p.idNumberLast4,
    idNumber: canReadPii ? p.idNumber : null, // NIK utuh hanya bila berizin
    isLead: p.isLead,
  }));
  return { booking, participants };
}

export function getBookingHistory(id: string) {
  const { rows } = auditRepo.query({
    entity: "booking",
    entityId: id,
    page: 1,
    pageSize: 100,
  });
  return { items: rows };
}

export { SYSTEM_CTX };
export type { UserRole };
