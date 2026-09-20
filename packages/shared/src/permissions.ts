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
  "user:read",
  "user:manage",
  "settings:read",
  "settings:write",
  "report:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Pemetaan role -> permission. Owner penuh; viewer read-only. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((p) => p !== "user:manage"),
  operasional: [
    "booking:read",
    "booking:write",
    "booking:cancel",
    "schedule:read",
    "schedule:write",
    "content:read",
    "content:write",
    "content:publish",
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
  viewer: PERMISSIONS.filter((p) => p.endsWith(":read")),
};

/** Apakah role punya permission tertentu. */
export function can(role: UserRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}
