import type { UserRole } from "@nena/shared";
import type { User } from "../db/schema.js";
import * as usersRepo from "../repos/users.repo.js";
import * as sessionsRepo from "../repos/sessions.repo.js";
import { hashPassword } from "../lib/password.js";
import { AppError } from "../lib/errors.js";
import { record, type ActorContext } from "./audit.js";

export function list(): User[] {
  return usersRepo.listAll();
}

export function create(
  input: { email: string; name: string; role: UserRole; password: string },
  ctx: ActorContext,
): User {
  if (usersRepo.findByEmail(input.email)) {
    throw AppError.conflict("Email sudah terdaftar.");
  }
  const user = usersRepo.create({
    email: input.email,
    name: input.name,
    role: input.role,
    passwordHash: hashPassword(input.password),
    active: true,
  });
  record(ctx, {
    action: "user_created",
    entity: "user",
    entityId: user.id,
    data: { email: user.email, name: user.name, role: user.role },
  });
  return user;
}

function requireTarget(id: string): User {
  const u = usersRepo.findById(id);
  if (!u) throw AppError.notFound("Pengguna tidak ditemukan.");
  return u;
}

export function updateRole(
  id: string,
  role: UserRole,
  ctx: ActorContext,
): User {
  const target = requireTarget(id);
  if (
    target.role === "owner" &&
    target.active &&
    role !== "owner" &&
    usersRepo.countActiveOwners() <= 1
  ) {
    throw AppError.conflict(
      "Owner aktif terakhir tidak bisa diturunkan rolenya.",
    );
  }
  const updated = usersRepo.updateRole(id, role) ?? target;
  record(ctx, {
    action: "role_changed",
    entity: "user",
    entityId: id,
    before: { role: target.role },
    after: { role: updated.role },
  });
  return updated;
}

export function setActive(
  id: string,
  active: boolean,
  ctx: ActorContext,
): User {
  const target = requireTarget(id);
  if (
    !active &&
    target.role === "owner" &&
    target.active &&
    usersRepo.countActiveOwners() <= 1
  ) {
    throw AppError.conflict("Owner aktif terakhir tidak bisa dinonaktifkan.");
  }
  const updated = usersRepo.setActive(id, active) ?? target;
  if (!active) {
    // Nonaktif -> cabut semua sesi user tsb.
    sessionsRepo.deleteAllForUser(id);
  }
  record(ctx, {
    action: active ? "user_activated" : "user_deactivated",
    entity: "user",
    entityId: id,
    before: { active: target.active },
    after: { active: updated.active },
  });
  return updated;
}

export function resetPassword(
  id: string,
  newPassword: string,
  ctx: ActorContext,
): void {
  const target = requireTarget(id);
  usersRepo.updatePasswordHash(target.id, hashPassword(newPassword));
  sessionsRepo.deleteAllForUser(target.id); // paksa login ulang
  record(ctx, {
    action: "password_reset",
    entity: "user",
    entityId: target.id,
  });
}

export function revokeSessions(id: string, ctx: ActorContext): void {
  const target = requireTarget(id);
  sessionsRepo.deleteAllForUser(target.id);
  record(ctx, {
    action: "sessions_revoked",
    entity: "user",
    entityId: target.id,
  });
}
