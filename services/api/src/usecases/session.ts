import { permissionsFor, type Permission, type UserRole } from "@nena/shared";
import type { User } from "../db/schema.js";
import * as sessionsRepo from "../repos/sessions.repo.js";
import * as usersRepo from "../repos/users.repo.js";
import { sessionTimeouts } from "../repos/settings.repo.js";
import { hashSessionToken } from "../lib/session-token.js";

export interface ResolvedSession {
  user: User;
  sessionId: string;
  permissions: Permission[];
}

/**
 * Validasi token sesi: cek absolute + idle timeout, user masih ada & aktif.
 * Sesi yang tidak valid langsung dihapus. Mengembalikan null bila tidak valid.
 */
export function resolveSession(
  token: string,
  nowIso: string = new Date().toISOString(),
): ResolvedSession | null {
  const tokenHash = hashSessionToken(token);
  const session = sessionsRepo.findByTokenHash(tokenHash);
  if (!session) return null;

  const now = Date.parse(nowIso);
  const { idleSeconds } = sessionTimeouts();

  // Absolute timeout.
  if (now >= Date.parse(session.expiresAt)) {
    sessionsRepo.deleteById(session.id);
    return null;
  }
  // Idle timeout (sliding).
  if (now - Date.parse(session.lastSeenAt) > idleSeconds * 1000) {
    sessionsRepo.deleteById(session.id);
    return null;
  }

  const user = usersRepo.findById(session.userId);
  if (!user || !user.active) {
    // Akun nonaktif/terhapus -> sesi langsung tidak berlaku.
    sessionsRepo.deleteById(session.id);
    return null;
  }

  sessionsRepo.touchLastSeen(session.id, nowIso);
  return {
    user,
    sessionId: session.id,
    permissions: permissionsFor(user.role as UserRole),
  };
}
