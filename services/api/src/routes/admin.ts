import type { FastifyInstance } from "fastify";
import {
  auditQuerySchema,
  createUserInputSchema,
  resetPasswordInputSchema,
  setActiveInputSchema,
  updateUserRoleInputSchema,
} from "@nena/shared";
import { toUserDto } from "../lib/dto.js";
import { actorFromReq, requireAuth, requirePermission } from "../plugins/auth.js";
import * as usersUseCase from "../usecases/users.js";
import { queryLogs } from "../usecases/audit.js";

/**
 * Semua route /api/admin/** wajib sesi valid (requireAuth) DAN mendeklarasikan
 * izin lewat config.permission + requirePermission. Test route-permission
 * gagal bila ada route admin tanpa deklarasi izin.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  /* ── Pengguna & peran (user:manage) ─────────────────────── */
  app.get(
    "/users",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async () => usersUseCase.list().map(toUserDto),
  );

  app.post(
    "/users",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req, reply) => {
      const input = createUserInputSchema.parse(req.body);
      const user = usersUseCase.create(input, actorFromReq(req));
      reply.status(201);
      return toUserDto(user);
    },
  );

  app.patch(
    "/users/:id/role",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { role } = updateUserRoleInputSchema.parse(req.body);
      return toUserDto(usersUseCase.updateRole(id, role, actorFromReq(req)));
    },
  );

  app.patch(
    "/users/:id/active",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { active } = setActiveInputSchema.parse(req.body);
      return toUserDto(usersUseCase.setActive(id, active, actorFromReq(req)));
    },
  );

  app.post(
    "/users/:id/reset-password",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { newPassword } = resetPasswordInputSchema.parse(req.body);
      usersUseCase.resetPassword(id, newPassword, actorFromReq(req));
      return { ok: true };
    },
  );

  app.post(
    "/users/:id/revoke-sessions",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      usersUseCase.revokeSessions(id, actorFromReq(req));
      return { ok: true };
    },
  );

  /* ── Audit log (user:read) ──────────────────────────────── */
  app.get(
    "/audit-logs",
    { config: { permission: "user:read" }, preHandler: [requirePermission("user:read")] },
    async (req) => queryLogs(auditQuerySchema.parse(req.query)),
  );
}
