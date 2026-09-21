import { z } from "zod";
import { userRoleSchema } from "./permissions.js";

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

// Role & permissions (userRoleSchema, UserRole, Permission, ROLE_PERMISSIONS, can).
export * from "./permissions.js";

export const packageTypeSchema = z.enum(["reguler", "premium", "private"]);
export type PackageType = z.infer<typeof packageTypeSchema>;

export const paymentMethodSchema = z.enum(["transfer", "qris"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSchemeSchema = z.enum(["lunas", "dp"]);
export type PaymentScheme = z.infer<typeof paymentSchemeSchema>;

/**
 * Status alur booking — urutan mengikuti alur nyata.
 * baru_masuk -> menunggu_bayar -> verifikasi_bukti -> menunggu_pelunasan ->
 * siap_jalan -> selesai ; cabang: kadaluarsa, batal.
 * CATATAN: paymentScheme (lunas|dp) TERPISAH, jangan dilebur ke status ini.
 */
export const BOOKING_STATUSES = [
  "baru_masuk",
  "menunggu_bayar",
  "verifikasi_bukti",
  "menunggu_pelunasan",
  "siap_jalan",
  "selesai",
  "kadaluarsa",
  "batal",
] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatusValue = z.infer<typeof bookingStatusSchema>;

// Tipe BRANDED: string mentah TIDAK bisa ditugaskan ke BookingStatus.
// Compiler yang menegakkan enum tunggal — pakai konstanta BookingStatus.* atau
// asBookingStatus() untuk memvalidasi input eksternal.
declare const bookingStatusBrand: unique symbol;
export type BookingStatus = BookingStatusValue & {
  readonly [bookingStatusBrand]: true;
};
export const BookingStatus = Object.freeze(
  Object.fromEntries(BOOKING_STATUSES.map((s) => [s, s])),
) as unknown as { readonly [K in BookingStatusValue]: BookingStatus };

/** Validasi + brand string dari sumber eksternal (DB, HTTP) menjadi BookingStatus. */
export function asBookingStatus(v: unknown): BookingStatus {
  return bookingStatusSchema.parse(v) as BookingStatus;
}

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

/* ── Auth ────────────────────────────────────────────────── */

export const loginInputSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi lama wajib diisi."),
  newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter."),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const userDtoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const meResponseSchema = z.object({
  user: userDtoSchema,
  permissions: z.array(z.string()),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/* ── Manajemen pengguna ──────────────────────────────────── */

export const createUserInputSchema = z.object({
  email: z.string().email("Email tidak valid."),
  name: z.string().min(2, "Nama minimal 2 karakter."),
  role: userRoleSchema,
  password: z.string().min(8, "Kata sandi awal minimal 8 karakter."),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserRoleInputSchema = z.object({ role: userRoleSchema });
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleInputSchema>;

export const setActiveInputSchema = z.object({ active: z.boolean() });
export type SetActiveInput = z.infer<typeof setActiveInputSchema>;

export const resetPasswordInputSchema = z.object({
  newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter."),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

/* ── Audit log ───────────────────────────────────────────── */

export const auditLogDtoSchema = z.object({
  id: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  details: z.unknown().nullable(),
  createdAt: isoDateTimeSchema,
});
export type AuditLogDto = z.infer<typeof auditLogDtoSchema>;

export const auditQuerySchema = z.object({
  entity: z.string().optional(),
  actorUserId: z.string().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
