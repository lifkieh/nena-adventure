import { z } from "zod";

/* ────────────────────────────────────────────────────────────
 * Konvensi lintas layanan (dipakai bersama api + panel).
 * Jangan definisikan ulang bentuk data ini di tempat lain.
 * ──────────────────────────────────────────────────────────── */

/** Kode error stabil (dipakai untuk logika klien; jangan diterjemahkan). */
export const ErrorCode = {
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SEAT_UNAVAILABLE: "SEAT_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Format error seragam untuk SEMUA response gagal. `message` = Bahasa Indonesia, layak tampil ke user. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/* ── Enum domain ─────────────────────────────────────────── */

export const userRoleSchema = z.enum(["owner", "admin", "staff"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const packageTypeSchema = z.enum(["reguler", "premium", "private"]);
export type PackageType = z.infer<typeof packageTypeSchema>;

export const paymentMethodSchema = z.enum(["transfer", "qris"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSchemeSchema = z.enum(["lunas", "dp"]);
export type PaymentScheme = z.infer<typeof paymentSchemeSchema>;

export const bookingStatusSchema = z.enum([
  "pending", // menunggu pembayaran
  "dp", // DP dibayar
  "paid", // lunas
  "cancelled", // dibatalkan
  "expired", // kadaluarsa (kursi dilepas)
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const scheduleStatusSchema = z.enum(["open", "closed", "cancelled"]);
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

/** Alasan mutasi seat_ledger (append-only). */
export const seatReasonSchema = z.enum([
  "hold", // kursi ditahan saat booking dibuat (delta > 0)
  "release", // kursi dilepas (delta < 0)
  "confirm", // konfirmasi tetap memakai kursi
  "cancel", // pembatalan melepas kursi (delta < 0)
  "adjust", // penyesuaian manual admin
]);
export type SeatReason = z.infer<typeof seatReasonSchema>;

/* ── Uang & waktu ────────────────────────────────────────── */

/** Uang selalu INTEGER rupiah (tidak ada pecahan/float). */
export const rupiahSchema = z.number().int().nonnegative();

/** Waktu selalu string ISO-8601 UTC di API & DB. */
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const TIMEZONE = "Asia/Jakarta" as const;

/** Format rupiah untuk tampilan, mis. 385000 -> "Rp385.000". */
export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

/** Format waktu UTC ISO ke zona Asia/Jakarta untuk tampilan. */
export function formatJakarta(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat("id-ID", {
    ...opts,
    timeZone: TIMEZONE,
  }).format(new Date(iso));
}

/* ── Health ──────────────────────────────────────────────── */

export const migrationStatusSchema = z.object({
  applied: z.number().int().nonnegative(),
  expected: z.number().int().nonnegative(),
  status: z.enum(["ok", "pending", "unknown"]),
});
export type MigrationStatus = z.infer<typeof migrationStatusSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  time: isoDateTimeSchema,
  migrations: migrationStatusSchema,
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
