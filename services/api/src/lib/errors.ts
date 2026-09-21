import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ErrorCode, type ErrorEnvelope } from "@nena/shared";

/** Error aplikasi dengan kode stabil + pesan Bahasa Indonesia siap tampil. */
export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    httpStatus = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION, message, 400, details);
  }
  static unauthorized(message = "Anda harus masuk terlebih dahulu."): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }
  static forbidden(message = "Anda tidak punya akses ke sumber daya ini."): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }
  static notFound(message = "Data yang diminta tidak ditemukan."): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }
  static conflict(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409, details);
  }
}

function envelope(
  code: string,
  message: string,
  details?: unknown,
): ErrorEnvelope {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** Error handler global Fastify — SEMUA error keluar dengan format seragam. */
export function errorHandler(
  err: unknown,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  if (err instanceof AppError) {
    reply.status(err.httpStatus).send(envelope(err.code, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    reply
      .status(400)
      .send(
        envelope(
          ErrorCode.VALIDATION,
          "Data yang dikirim tidak valid.",
          err.flatten(),
        ),
      );
    return;
  }

  // Error Fastify bawaan (mis. body JSON kosong) sudah punya statusCode 4xx —
  // hormati itu supaya tidak salah lapor 500.
  const fe = err as { statusCode?: number; code?: string; message?: string };
  if (typeof fe.statusCode === "number" && fe.statusCode >= 400 && fe.statusCode < 500) {
    reply.status(fe.statusCode).send(envelope(fe.code ?? ErrorCode.VALIDATION, "Permintaan tidak valid."));
    return;
  }

  // Error tak terduga: jangan bocorkan detail internal ke user.
  req.log.error({ err }, "Unhandled error");
  reply
    .status(500)
    .send(
      envelope(
        ErrorCode.INTERNAL,
        "Terjadi kesalahan pada server. Silakan coba lagi.",
      ),
    );
}

/** Handler 404 — untuk /api/* balikan JSON, selain itu serahkan ke SPA fallback. */
export function notFoundEnvelope(): ErrorEnvelope {
  return envelope(ErrorCode.NOT_FOUND, "Endpoint tidak ditemukan.");
}
