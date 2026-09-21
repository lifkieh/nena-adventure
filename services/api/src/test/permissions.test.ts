import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  permissionsFor,
  type Permission,
  type UserRole,
} from "@nena/shared";

/**
 * Matriks izin eksplisit (sumber kebenaran independen dari implementasi).
 * Kalau implementasi bergeser, test ini gagal.
 */
const EXPECTED: Record<UserRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [
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
    "participant:read_pii",
    "participant:export",
    "user:read",
    "settings:read",
    "report:read",
  ],
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
  viewer: [
    "booking:read",
    "schedule:read",
    "content:read",
    "user:read",
    "settings:read",
    "report:read",
  ],
};

describe("matriks izin per role", () => {
  for (const role of Object.keys(EXPECTED) as UserRole[]) {
    it(`role ${role} = daftar izin yang diharapkan`, () => {
      expect([...ROLE_PERMISSIONS[role]].sort()).toEqual(
        [...EXPECTED[role]].sort(),
      );
    });
  }

  it("penegasan kunci yang tidak boleh salah", () => {
    expect(can("viewer", "participant:read_pii")).toBe(false);
    expect(can("admin", "settings:write")).toBe(false);
    expect(can("admin", "user:manage")).toBe(false);
    expect(can("admin", "participant:read_pii")).toBe(true);
    expect(can("admin", "participant:export")).toBe(true);
    expect(can("admin", "payment:verify")).toBe(true);
    expect(can("operasional", "content:write")).toBe(false);
    expect(can("operasional", "content:publish")).toBe(false);
    expect(can("operasional", "content:read")).toBe(true);
    expect(can("owner", "user:manage")).toBe(true);
    expect(can("owner", "settings:write")).toBe(true);
    for (const p of PERMISSIONS) expect(can("owner", p)).toBe(true);
  });

  it("participant:read_pii & participant:export HANYA owner & admin", () => {
    for (const role of ["owner", "admin"] as UserRole[]) {
      expect(can(role, "participant:read_pii")).toBe(true);
      expect(can(role, "participant:export")).toBe(true);
    }
    for (const role of ["operasional", "keuangan", "viewer"] as UserRole[]) {
      expect(can(role, "participant:read_pii")).toBe(false);
      expect(can(role, "participant:export")).toBe(false);
    }
  });

  it("permissionsFor mengembalikan salinan array", () => {
    const a = permissionsFor("viewer");
    a.push("user:manage");
    expect(permissionsFor("viewer")).not.toContain("user:manage");
  });
});
