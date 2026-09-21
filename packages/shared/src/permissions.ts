import { z } from "zod";

/* ────────────────────────────────────────────────────────────
 * Role & permission — sumber tunggal untuk otorisasi panel/API.
 * ──────────────────────────────────────────────────────────── */

export const userRoleSchema = z.enum([
  "owner",
  "admin",
  "operasional",
  "keuangan",
  "viewer",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Semua permission granular yang dikenal sistem. */
export const PERMISSIONS = [
  "booking:read",
  "booking:write",
  "booking:cancel",
  "booking:refund",
  "payment:read",
  "payment:verify",
  "payment:refund",
  "schedule:read",
  "schedule:write",
  "content:read",
  "content:write",
  "content:publish",
  // Data pribadi peserta (NIK/tanggal lahir utuh) — sangat sensitif.
  "participant:read_pii",
  "participant:export",
  "user:read",
  "user:manage",
  "settings:read",
  "settings:write",
  "report:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Pemetaan role -> permission (eksplisit, TIDAK di-generate dari pola nama).
 *
 * Aturan penting:
 *  - Rekening, biaya layanan, DP, cutoff = settings:write -> HANYA owner.
 *  - participant:read_pii & participant:export -> HANYA owner & admin.
 *  - user:manage -> HANYA owner.
 *  - viewer read-only TAPI tidak boleh membuka PII peserta.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [...PERMISSIONS],

  // Semua KECUALI user:manage dan settings:write. admin tetap boleh payment:verify
  // dan participant:read_pii/export.
  admin: PERMISSIONS.filter(
    (p) => p !== "user:manage" && p !== "settings:write",
  ),

  operasional: [
    "booking:read",
    "booking:write",
    "booking:cancel",
    "schedule:read",
    "schedule:write",
    "content:read",
    "payment:read",
    "report:read",
  ],

  keuangan: [
    "booking:read",
    "booking:refund",
    "payment:read",
    "payment:verify",
    "payment:refund",
    "report:read",
  ],

  // Read-only, TAPI tanpa participant:read_pii (jangan pakai p.endsWith(":read")).
  viewer: [
    "booking:read",
    "payment:read",
    "schedule:read",
    "content:read",
    "user:read",
    "settings:read",
    "report:read",
  ],
};

/** Apakah role punya permission tertentu. */
export function can(role: UserRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

/** Daftar izin efektif untuk sebuah role (untuk dikirim ke panel). */
export function permissionsFor(role: UserRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
