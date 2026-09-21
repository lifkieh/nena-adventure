import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { ulid } from "ulid";

/* ────────────────────────────────────────────────────────────
 * Skema DB v1 — Nena Adventure
 *
 * KONVENSI (tidak boleh dilanggar):
 *  - ID           = ULID (text, 26 char)          -> pk()
 *  - Uang         = INTEGER rupiah (tanpa float)  -> money()
 *  - Waktu        = TEXT ISO-8601 UTC             -> ts() / tsNow()
 *  - Boolean      = INTEGER 0/1 (mode boolean)
 *
 * DESAIN KURSI (kritis, jangan diubah):
 *  schedules TIDAK punya kolom counter kursi. seat_ledger bersifat
 *  APPEND-ONLY. Sisa kursi = capacity - SUM(seat_ledger.delta).
 *  delta > 0 = kursi terpakai, delta < 0 = kursi dilepas.
 *  Ini mencegah overbooking dan membuat riwayat bisa diaudit.
 * ──────────────────────────────────────────────────────────── */

/** Kolom primary key ULID. */
const pk = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => ulid());

/** Kolom uang rupiah (integer, default 0). */
const money = (name: string) => integer(name).notNull().default(0);

/** Kolom waktu ISO-8601 UTC (wajib diisi eksplisit). */
const ts = (name: string) => text(name);

/** Kolom created_at ISO-8601 UTC yang terisi otomatis. */
const tsNow = (name: string) =>
  text(name)
    .notNull()
    .$defaultFn(() => new Date().toISOString());

/* ── users ───────────────────────────────────────────────── */
export const users = sqliteTable(
  "users",
  {
    id: pk(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    // owner | admin | operasional | keuangan | viewer  (lihat shared permissions.ts)
    role: text("role").notNull().default("viewer"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: tsNow("created_at"),
    updatedAt: tsNow("updated_at"),
  },
  (t) => [uniqueIndex("ux_users_email").on(t.email)],
);

/* ── sessions ────────────────────────────────────────────── */
export const sessions = sqliteTable(
  "sessions",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(), // batas ABSOLUT (createdAt + absolute)
    lastSeenAt: tsNow("last_seen_at"), // untuk idle timeout (sliding)
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: tsNow("created_at"),
  },
  (t) => [
    uniqueIndex("ux_sessions_token").on(t.tokenHash),
    index("ix_sessions_user").on(t.userId),
  ],
);

/* ── audit_logs ──────────────────────────────────────────── */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: pk(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: text("details"), // JSON string (field sensitif sudah diredaksi)
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: tsNow("created_at"),
  },
  (t) => [
    index("ix_audit_entity").on(t.entity, t.entityId),
    index("ix_audit_created").on(t.createdAt),
  ],
);

/* ── settings ────────────────────────────────────────────── */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"), // JSON string
  updatedAt: tsNow("updated_at"),
});

/* ── boats ───────────────────────────────────────────────── */
export const boats = sqliteTable("boats", {
  id: pk(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(24),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: tsNow("created_at"),
});

/* ── crew ────────────────────────────────────────────────── */
export const crew = sqliteTable("crew", {
  id: pk(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("kapten"), // kapten | guide | crew
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: tsNow("created_at"),
});

/* ── schedules ───────────────────────────────────────────── */
/**
 * TIDAK ada kolom counter kursi di sini (lihat catatan seat_ledger).
 * `threshold` = ambang kursi tersisa untuk memicu status "hampir penuh"
 * (bukan counter kursi terpakai).
 */
export const schedules = sqliteTable(
  "schedules",
  {
    id: pk(),
    date: text("date").notNull(), // YYYY-MM-DD (tanggal keberangkatan)
    boatId: text("boat_id").references(() => boats.id, {
      onDelete: "set null",
    }),
    capacity: integer("capacity").notNull().default(24),
    threshold: integer("threshold").notNull().default(6),
    departureTime: text("departure_time"), // HH:MM waktu lokal Jakarta
    meetingPoint: text("meeting_point"),
    status: text("status").notNull().default("open"), // open | closed | cancelled
    publicNote: text("public_note"),
    closedReason: text("closed_reason"),
    notes: text("notes"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNow("updated_at"),
  },
  (t) => [index("ix_schedules_date").on(t.date)],
);

/* ── schedule_crew (join) ────────────────────────────────── */
export const scheduleCrew = sqliteTable(
  "schedule_crew",
  {
    id: pk(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    crewId: text("crew_id")
      .notNull()
      .references(() => crew.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("crew"),
  },
  (t) => [
    uniqueIndex("ux_schedule_crew").on(t.scheduleId, t.crewId),
    index("ix_schedule_crew_sched").on(t.scheduleId),
  ],
);

/* ── bookings ────────────────────────────────────────────── */
export const bookings = sqliteTable(
  "bookings",
  {
    id: pk(),
    code: text("code").notNull(), // NA-xxxxxx
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedules.id),
    packageType: text("package_type").notNull(), // reguler | premium | private
    // Status alur (shared bookingStatusSchema):
    // baru_masuk | menunggu_bayar | verifikasi_bukti | menunggu_pelunasan |
    // siap_jalan | selesai | kadaluarsa | batal
    status: text("status").notNull().default("baru_masuk"),
    source: text("source").notNull().default("web"), // web | manual
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    meetingPoint: text("meeting_point"),
    pax: integer("pax").notNull().default(1),
    subtotal: money("subtotal"),
    discount: money("discount"),
    serviceFee: money("service_fee"),
    total: money("total"),
    amountPaid: money("amount_paid"),
    // Skema pembayaran TERPISAH dari status alur — jangan dilebur.
    paymentScheme: text("payment_scheme").notNull().default("lunas"), // lunas | dp
    insurancePolicyNo: text("insurance_policy_no"), // nomor polis Zurich bila ada
    promoId: text("promo_id"),
    idempotencyKey: text("idempotency_key"), // dedup POST publik
    accessTokenHash: text("access_token_hash"), // token akses ringkasan (hash)
    refundAmount: money("refund_amount"),
    priceOverrideReason: text("price_override_reason"),
    cancelReason: text("cancel_reason"),
    cancelledBy: text("cancelled_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    holdExpiresAt: ts("hold_expires_at"), // batas tahan kursi (60 menit)
    balanceDueAt: ts("balance_due_at"), // batas pelunasan (H-3)
    statusChangedAt: ts("status_changed_at"),
    confirmedAt: ts("confirmed_at"),
    createdAt: tsNow("created_at"),
    updatedAt: tsNow("updated_at"),
  },
  (t) => [
    uniqueIndex("ux_bookings_code").on(t.code),
    uniqueIndex("ux_bookings_idempotency").on(t.idempotencyKey),
    index("ix_bookings_schedule").on(t.scheduleId),
    index("ix_bookings_status").on(t.status),
  ],
);

/* ── packages (sumber harga; klien tidak menentukan harga) ── */
export const packages = sqliteTable(
  "packages",
  {
    id: pk(),
    key: text("key").notNull(), // reguler | premium | private
    name: text("name").notNull(),
    prices: text("prices").notNull(), // JSON: { meetingPoint: rupiah }
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: tsNow("created_at"),
  },
  (t) => [uniqueIndex("ux_packages_key").on(t.key)],
);

/* ── package_tiers (harga rombongan Private Trip per rentang pax) ── */
export const packageTiers = sqliteTable(
  "package_tiers",
  {
    id: pk(),
    packageId: text("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    minPax: integer("min_pax").notNull(),
    maxPax: integer("max_pax").notNull(),
    price: integer("price").notNull(), // rupiah per rombongan
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_package_tiers_pkg").on(t.packageId)],
);

/* ── booking_participants ────────────────────────────────── */
export const bookingParticipants = sqliteTable(
  "booking_participants",
  {
    id: pk(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    birthDate: text("birth_date"), // YYYY-MM-DD
    idNumber: text("id_number"), // KTP/paspor/KIA (terenkripsi di lapisan aplikasi)
    idNumberLast4: text("id_number_last4"), // 4 digit terakhir, aman untuk tampilan
    piiPurgedAt: ts("pii_purged_at"), // waktu idNumber dihapus (retensi PII)
    isLead: integer("is_lead", { mode: "boolean" }).notNull().default(false),
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_participants_booking").on(t.bookingId)],
);

/* ── seat_ledger (APPEND-ONLY) ───────────────────────────── */
/**
 * Sumber kebenaran kursi. Jangan pernah UPDATE/DELETE baris di sini.
 * Sisa kursi schedule = capacity - SUM(delta) untuk schedule tsb.
 */
export const seatLedger = sqliteTable(
  "seat_ledger",
  {
    id: pk(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedules.id),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    delta: integer("delta").notNull(), // >0 pakai kursi, <0 lepas kursi
    reason: text("reason").notNull(), // hold|release|confirm|cancel|adjust
    createdAt: tsNow("created_at"),
  },
  (t) => [
    index("ix_seat_ledger_schedule").on(t.scheduleId),
    index("ix_seat_ledger_booking").on(t.bookingId),
  ],
);

/* ── payments ────────────────────────────────────────────── */
export const payments = sqliteTable(
  "payments",
  {
    id: pk(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    amount: money("amount"),
    method: text("method").notNull(), // transfer | qris
    kind: text("kind").notNull().default("full"), // dp | pelunasan | full
    status: text("status").notNull().default("pending"), // pending | verified | rejected
    provider: text("provider").notNull().default("manual"), // manual | midtrans | xendit
    providerRef: text("provider_ref"),
    proofMediaId: text("proof_media_id"),
    reference: text("reference"),
    paidAt: ts("paid_at"),
    verifiedBy: text("verified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    verifiedAt: ts("verified_at"),
    rejectedReason: text("rejected_reason"),
    rejectedAt: ts("rejected_at"),
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_payments_booking").on(t.bookingId)],
);

/* ── vouchers ────────────────────────────────────────────── */
export const vouchers = sqliteTable(
  "vouchers",
  {
    id: pk(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    status: text("status").notNull().default("issued"), // issued | revoked | void
    accessTokenHash: text("access_token_hash"), // token halaman voucher publik (hash)
    expiresAt: ts("expires_at"), // tautan kedaluwarsa H+7
    revokedAt: ts("revoked_at"),
    pdfMediaId: text("pdf_media_id"),
    issuedAt: tsNow("issued_at"),
  },
  (t) => [uniqueIndex("ux_vouchers_code").on(t.code)],
);

/* ── pickups ─────────────────────────────────────────────── */
export const pickups = sqliteTable(
  "pickups",
  {
    id: pk(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    location: text("location").notNull(),
    address: text("address"),
    time: text("time"), // HH:MM lokal
    notes: text("notes"),
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_pickups_schedule").on(t.scheduleId)],
);

/* ── promos ──────────────────────────────────────────────── */
export const promos = sqliteTable(
  "promos",
  {
    id: pk(),
    code: text("code").notNull(),
    type: text("type").notNull().default("percent"), // percent | amount
    value: integer("value").notNull().default(0), // percent (0-100) atau rupiah
    minPax: integer("min_pax").notNull().default(1),
    validFrom: ts("valid_from"),
    validUntil: ts("valid_until"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: tsNow("created_at"),
  },
  (t) => [uniqueIndex("ux_promos_code").on(t.code)],
);

/* ── content_sections ────────────────────────────────────── */
export const contentSections = sqliteTable(
  "content_sections",
  {
    id: pk(),
    key: text("key").notNull(), // hero, paket, faq, syarat, ...
    title: text("title").notNull(),
    draftVersionId: text("draft_version_id"),
    publishedVersionId: text("published_version_id"),
    updatedAt: tsNow("updated_at"),
  },
  (t) => [uniqueIndex("ux_content_sections_key").on(t.key)],
);

/* ── content_versions ────────────────────────────────────── */
export const contentVersions = sqliteTable(
  "content_versions",
  {
    id: pk(),
    sectionId: text("section_id")
      .notNull()
      .references(() => contentSections.id, { onDelete: "cascade" }),
    body: text("body").notNull(), // JSON string
    note: text("note"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_content_versions_section").on(t.sectionId)],
);

/* ── media ───────────────────────────────────────────────── */
export const media = sqliteTable(
  "media",
  {
    id: pk(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull().default(0), // byte
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    path: text("path").notNull(),
    sha256: text("sha256"),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: tsNow("created_at"),
  },
  (t) => [index("ix_media_sha").on(t.sha256)],
);

/* ── Tipe row (select/insert) untuk dipakai repos/usecases ── */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type SeatLedgerRow = typeof seatLedger.$inferSelect;
export type Payment = typeof payments.$inferSelect;

/** Keperluan drizzle: kumpulan semua tabel. */
export const schema = {
  users,
  sessions,
  auditLogs,
  settings,
  boats,
  crew,
  schedules,
  scheduleCrew,
  bookings,
  bookingParticipants,
  seatLedger,
  payments,
  vouchers,
  pickups,
  promos,
  contentSections,
  contentVersions,
  media,
  packages,
  packageTiers,
};
