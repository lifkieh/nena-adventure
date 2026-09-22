import type { FastifyReply, FastifyRequest } from "fastify";
import type { Permission } from "@nena/shared";
import { AppError } from "../lib/errors.js";
import { SESSION_COOKIE } from "../lib/session-token.js";
import { resolveSession } from "../usecases/session.js";
import type { ActorContext } from "../usecases/audit.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Permission[];
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
  interface FastifyContextConfig {
    permission?: Permission;
  }
}

/** Konteks aktor untuk audit dari request (works pre- & post-auth). */
export function actorFromReq(req: FastifyRequest): ActorContext {
  return {
    userId: req.authUser?.id ?? null,
    role: req.authUser?.role ?? null,
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

/** preHandler: wajib sesi valid. 401 bila tidak. Mengisi req.authUser. */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw AppError.unauthorized();
  const resolved = resolveSession(token);
  if (!resolved) {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    throw AppError.unauthorized("Sesi tidak valid atau sudah berakhir.");
  }
  req.authUser = {
    id: resolved.user.id,
    email: resolved.user.email,
    name: resolved.user.name,
    role: resolved.user.role,
    permissions: resolved.permissions,
    sessionId: resolved.sessionId,
  };
}

/** preHandler factory: wajib punya permission. 403 bila tidak. */
export function requirePermission(perm: Permission) {
  return async function (req: FastifyRequest): Promise<void> {
    if (!req.authUser) throw AppError.unauthorized();
    if (!req.authUser.permissions.includes(perm)) {
      throw AppError.forbidden("Anda tidak punya izin untuk aksi ini.");
    }
  };
}
