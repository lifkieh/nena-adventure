import type { FastifyInstance } from "fastify";
import { getHealth } from "../usecases/health.js";

/** Route HTTP saja — tanpa SQL, tanpa logika bisnis. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => getHealth());
}
