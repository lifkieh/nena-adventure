import type { FastifyInstance } from "fastify";
import { publicBookingInputSchema } from "@nena/shared";
import { AppError } from "../lib/errors.js";
import { hit } from "../lib/req-limit.js";
import { actorFromReq } from "../plugins/auth.js";
import * as service from "../usecases/booking/service.js";
import { submitProof } from "../usecases/payment/service.js";
import { getPublicVoucher } from "../usecases/voucher/service.js";
import { publicContent } from "../usecases/content/service.js";

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/schedules", async () => service.listPublicSchedules());

  // Konten terbit untuk situs publik (snapshot; situs cache + fallback).
  app.get("/content", async () => publicContent());

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

  // Upload bukti transfer (multipart, 1 file). Token via header.
  app.post("/bookings/:code/proof", async (req, reply) => {
    const rl = hit(`proof:${req.ip}`, 10, 60_000);
    if (rl.limited) {
      reply.header("Retry-After", String(rl.retryAfterSeconds));
      throw new AppError("RATE_LIMITED", "Terlalu banyak upload. Coba lagi sebentar.", 429);
    }
    const { code } = req.params as { code: string };
    const raw = req.headers["x-booking-token"];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) throw AppError.validation("Token akses wajib.");

    const file = await req.file();
    if (!file) throw AppError.validation("File bukti wajib diunggah.");
    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      throw new AppError("VALIDATION", "Ukuran file melebihi 5MB.", 413);
    }
    if (file.file.truncated) {
      throw new AppError("VALIDATION", "Ukuran file melebihi 5MB.", 413);
    }
    return submitProof({ code, token, buffer, ctx: actorFromReq(req) });
  });

  // Halaman voucher publik (token via query — tautan yang bisa dibagikan/cetak).
  app.get("/vouchers/:code", async (req) => {
    const { code } = req.params as { code: string };
    const { token } = req.query as { token?: string };
    if (!token) throw AppError.validation("Token voucher wajib.");
    return getPublicVoucher(code, token);
  });
}
