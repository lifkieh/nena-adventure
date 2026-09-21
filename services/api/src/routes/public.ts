import type { FastifyInstance } from "fastify";
import { publicBookingInputSchema } from "@nena/shared";
import { AppError } from "../lib/errors.js";
import { hit } from "../lib/req-limit.js";
import { actorFromReq } from "../plugins/auth.js";
import * as service from "../usecases/booking/service.js";

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/schedules", async () => service.listPublicSchedules());

  app.post("/bookings", async (req, reply) => {
    const rl = hit(`booking:${req.ip}`, 10, 60_000);
    if (rl.limited) {
      reply.header("Retry-After", String(rl.retryAfterSeconds));
      throw new AppError(
        "RATE_LIMITED",
        "Terlalu banyak permintaan. Coba lagi sebentar.",
        429,
      );
    }
    const body = publicBookingInputSchema.parse(req.body);
    const idem = req.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(idem) ? idem[0] : idem;

    const result = service.createWebBooking({
      ...body,
      idempotencyKey: idempotencyKey ?? null,
      ctx: actorFromReq(req),
    });
    reply.status(201);
    return result;
  });

  app.get("/bookings/:code", async (req) => {
    service.expireOverdueHolds();
    const { code } = req.params as { code: string };
    // Token via header X-Booking-Token (bukan query string, agar tak bocor di log/URL).
    const raw = req.headers["x-booking-token"];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) throw AppError.validation("Token akses wajib.");
    return service.getPublicSummary(code, token);
  });
}
