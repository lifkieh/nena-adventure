import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";

/** Semua route publik/panel di-mount di bawah prefix /api. */
export async function apiRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  // Fase berikutnya: auth, bookings, schedules, content, dst.
}
