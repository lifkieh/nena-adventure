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

// draft (belum terbit) | terbit (publik) | tutup (pendaftaran ditutup) | arsip
export const scheduleStatusSchema = z.enum(["draft", "terbit", "tutup", "arsip"]);
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

/* ── Kalender jadwal (pemilihan bulan default) ───────────── */

/**
 * Rentang tanggal satu bulan (offset dari bulan `base`), sebagai string LOKAL
 * "YYYY-MM-DD" — TANPA toISOString (yang menggeser tgl-1 ke bulan sebelumnya di
 * zona UTC+). Aman di zona mana pun. Dipakai kalender jadwal panel.
 */
export function monthRangeFor(
  base: Date,
  offset: number,
): { from: string; to: string; year: number; monthIndex0: number } {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based, sudah dinormalisasi oleh Date
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = new Date(y, m + 1, 0).getDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(days)}`, year: y, monthIndex0: m };
}

/**
 * Grid kalender satu bulan (TZ-safe). datedCells berisi SEMUA tanggal bulan itu
 * "YYYY-MM-DD" dari 1 s/d hari terakhir (inklusif) — hari terakhir wajib ikut.
 */
export function monthGrid(
  base: Date,
  offset: number,
): { from: string; to: string; daysInMonth: number; startDow: number; datedCells: string[] } {
  const r = monthRangeFor(base, offset);
  const daysInMonth = Number(r.to.slice(8, 10));
  const startDow = new Date(r.from + "T00:00:00Z").getUTCDay();
  const prefix = r.from.slice(0, 8);
  const datedCells = Array.from({ length: daysInMonth }, (_, i) => prefix + String(i + 1).padStart(2, "0"));
  return { from: r.from, to: r.to, daysInMonth, startDow, datedCells };
}

/** Selisih bulan antar kunci "YYYY-MM" (bisa negatif). */
export function monthKeyDiff(from: string, to: string): number {
  const [ay, am] = from.split("-").map(Number) as [number, number];
  const [by, bm] = to.split("-").map(Number) as [number, number];
  return (by - ay) * 12 + (bm - am);
}

/**
 * Offset bulan awal kalender jadwal dari bulan berjalan:
 *   - bulan berjalan punya jadwal  -> 0
 *   - bulan berjalan kosong        -> bulan pertama yang punya jadwal (>= sekarang;
 *                                     kalau semua sudah lewat, pakai yang paling awal)
 *   - tak ada jadwal sama sekali   -> 0
 * `monthsPresent`: daftar "YYYY-MM" yang punya jadwal. `currentKey`: "YYYY-MM" sekarang.
 */
export function pickScheduleMonthOffset(
  monthsPresent: string[],
  currentKey: string,
): number {
  if (monthsPresent.length === 0) return 0;
  if (monthsPresent.includes(currentKey)) return 0;
  const future = monthsPresent.filter((m) => m >= currentKey).sort();
  const target = future[0] ?? monthsPresent.slice().sort()[0]!;
  return monthKeyDiff(currentKey, target);
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

/* ── Booking publik ──────────────────────────────────────── */

export const publicBookingInputSchema = z.object({
  scheduleId: z.string().min(1),
  packageKey: packageTypeSchema,
  meetingPoint: z.string().min(1),
  pax: z.number().int().positive().max(30),
  paymentScheme: paymentSchemeSchema,
  customer: z.object({
    name: z.string().min(3, "Nama pemesan minimal 3 karakter."),
    phone: z.string().min(8, "Nomor HP tidak valid."),
    email: z.string().email("Email tidak valid."),
  }),
  participants: z
    .array(
      z.object({
        name: z.string().min(2),
        birthDate: z.string().optional(),
        idNumber: z.string().optional(),
      }),
    )
    .min(1, "Minimal 1 peserta."),
  clientTotal: z.number().int().optional(),
});
export type PublicBookingInput = z.infer<typeof publicBookingInputSchema>;

export interface PublicScheduleDto {
  id: string;
  date: string; // YYYY-MM-DD
  remaining: number;
  label: string; // "kursi masih banyak" | "sisa N kursi" | "kuota penuh"
  publicNote: string | null;
}

/* ── Admin: jadwal ───────────────────────────────────────── */

export const scheduleInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  capacity: z.number().int().min(0).max(200),
  threshold: z.number().int().min(0).max(200).default(6),
  departureTime: z.string().optional(),
  meetingPoint: z.string().optional(),
  publicNote: z.string().optional().nullable(),
  closedReason: z.string().optional().nullable(),
  status: scheduleStatusSchema.default("draft"),
  availablePackages: z.array(packageTypeSchema).optional(),
});
export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const scheduleGeneratorSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1), // 0=Min .. 6=Sab
  capacity: z.number().int().min(0).max(200).default(24),
  threshold: z.number().int().min(0).max(200).default(6),
  status: scheduleStatusSchema.default("terbit"),
});
export type ScheduleGeneratorInput = z.infer<typeof scheduleGeneratorSchema>;

export const bulkScheduleStatusSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: scheduleStatusSchema,
});

/* ── Admin: paket & harga ────────────────────────────────── */

export const packageInputSchema = z.object({
  key: z.string().min(2).max(40),
  name: z.string().min(2),
  prices: z.record(z.string(), z.number().int().nonnegative()),
  active: z.boolean().default(true),
});
export type PackageInput = z.infer<typeof packageInputSchema>;

export const tierInputSchema = z.object({
  minPax: z.number().int().positive(),
  maxPax: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});
export type TierInput = z.infer<typeof tierInputSchema>;

/* ── Admin: pengaturan owner-only ────────────────────────── */

export const ownerSettingsSchema = z.object({
  bankAccount: z.string().optional(),
  serviceFee: z.number().int().nonnegative().optional(),
  dpPercent: z.number().int().min(0).max(100).optional(),
  cutoffDays: z.number().int().min(0).optional(),
  // Nomor WhatsApp: angka saja (format internasional tanpa +), 8–15 digit.
  whatsapp: z.string().regex(/^\d{8,15}$/, "Nomor WhatsApp hanya angka (8–15 digit).").optional(),
  // URL peta harus https.
  mapUrl: z.string().url().refine((u) => u.startsWith("https://"), "URL peta harus https.").optional(),
});
export type OwnerSettingsInput = z.infer<typeof ownerSettingsSchema>;

/* ── CMS konten ──────────────────────────────────────────── */

export const contentSectionKeys = [
  "hero",
  "paket",
  "itinerary",
  "faq",
  "syarat",
  "testimoni",
  "kontak",
] as const;

export const saveDraftSchema = z.object({
  body: z.unknown(), // struktur per-tipe divalidasi di editor; JSON di DB
});

export interface ContentSectionDto {
  id: string;
  key: string;
  title: string;
  hasDraft: boolean;
  hasPublished: boolean;
  updatedAt: string;
}

// Label + warna status (di akhir agar tidak circular saat labels impor enum).
export * from "./labels.js";
