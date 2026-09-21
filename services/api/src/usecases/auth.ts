import { permissionsFor, type UserRole } from "@nena/shared";
import type { User } from "../db/schema.js";
import * as usersRepo from "../repos/users.repo.js";
import * as sessionsRepo from "../repos/sessions.repo.js";
import { sessionTimeouts } from "../repos/settings.repo.js";
import {
  dummyVerify,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../lib/password.js";
import { generateSessionToken, hashSessionToken } from "../lib/session-token.js";
import { AppError } from "../lib/errors.js";
import { record, type ActorContext } from "./audit.js";

const UNIFORM_FAIL = "Email atau kata sandi salah.";

export interface LoginResult {
  token: string;
  user: User;
  sessionId: string;
  cookieMaxAge: number;
}

/**
 * Login. Pesan gagal SERAGAM (tidak membocorkan email ada/tidak). Selalu
 * melakukan verifikasi (dummy bila user tidak ada) untuk menyamakan timing.
 */
export function login(input: {
  email: string;
  password: string;
  ctx: ActorContext;
}): LoginResult {
  const { email, password, ctx } = input;
  const user = usersRepo.findByEmail(email);

  const fail = (reason: string, actorUserId: string | null): never => {
    record(
      { ...ctx, userId: actorUserId },
      { action: "login_failed", entity: "auth", data: { email, reason } },
    );
    throw new AppError("UNAUTHORIZED", UNIFORM_FAIL, 401);
  };

  if (!user) {
    dummyVerify(password); // samakan timing
    return fail("user_not_found", null);
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return fail("wrong_password", user.id);
  }
  if (!user.active) {
    return fail("inactive", user.id);
  }

  // Rehash oportunistik bila parameter scrypt sudah dinaikkan.
  if (needsRehash(user.passwordHash)) {
    usersRepo.updatePasswordHash(user.id, hashPassword(password));
  }

  // Rotasi sesi: token baru tiap login.
  const token = generateSessionToken();
  const { absoluteSeconds } = sessionTimeouts();
  const expiresAt = new Date(Date.now() + absoluteSeconds * 1000).toISOString();
  const session = sessionsRepo.create({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  record(
    { ...ctx, userId: user.id, role: user.role },
    { action: "login_success", entity: "auth", entityId: user.id },
  );

  return { token, user, sessionId: session.id, cookieMaxAge: absoluteSeconds };
}

export function logout(token: string, ctx: ActorContext): void {
  const tokenHash = hashSessionToken(token);
  const session = sessionsRepo.findByTokenHash(tokenHash);
  sessionsRepo.deleteByTokenHash(tokenHash);
  record(ctx, {
    action: "logout",
    entity: "auth",
    entityId: session?.userId ?? ctx.userId,
  });
}

export function me(userId: string): {
  user: User;
  permissions: string[];
} {
  const user = usersRepo.findById(userId);
  if (!user) throw AppError.unauthorized();
  return { user, permissions: permissionsFor(user.role as UserRole) };
}

export function changePassword(input: {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
  ctx: ActorContext;
}): void {
  const { userId, currentSessionId, currentPassword, newPassword, ctx } = input;
  const user = usersRepo.findById(userId);
  if (!user) throw AppError.unauthorized();
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw AppError.validation("Kata sandi lama salah.");
  }
  usersRepo.updatePasswordHash(user.id, hashPassword(newPassword));
  // Cabut semua sesi LAIN milik user ini (sesi saat ini tetap).
  sessionsRepo.deleteOthersForUser(user.id, currentSessionId);
  record(
    { ...ctx, userId: user.id, role: user.role },
    { action: "password_changed", entity: "user", entityId: user.id },
  );
}
