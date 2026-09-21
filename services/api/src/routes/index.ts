import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { adminRoutes } from "./admin.js";

/** Semua route publik/panel di-mount di bawah prefix /api. */
export async function apiRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(adminRoutes, { prefix: "/admin" });
}
