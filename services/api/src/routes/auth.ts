import type { FastifyInstance } from "fastify";
import {
  changePasswordInputSchema,
  loginInputSchema,
  permissionsFor,
  type UserRole,
} from "@nena/shared";
import { env } from "../env.js";
import { AppError } from "../lib/errors.js";
import { toUserDto } from "../lib/dto.js";
import { SESSION_COOKIE } from "../lib/session-token.js";
import * as authUseCase from "../usecases/auth.js";
import { isLimited, recordFailure, reset } from "../lib/rate-limit.js";
import { actorFromReq, requireAuth } from "../plugins/auth.js";

function randomDelay(): Promise<void> {
  const ms = 100 + Math.floor(Math.random() * 200); // 100–300ms
  return new Promise((r) => setTimeout(r, ms));
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/login", async (req, reply) => {
    const { email, password } = loginInputSchema.parse(req.body);
    const ip = req.ip;

    await randomDelay(); // redam timing attack

    const rl = isLimited(ip, email);
    if (rl.limited) {
      reply.header("Retry-After", String(rl.retryAfterSeconds));
      throw new AppError(
        "RATE_LIMITED",
        "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.",
        429,
      );
    }

    try {
      const result = authUseCase.login({
        email,
        password,
        ctx: actorFromReq(req),
      });
      reset(ip, email);
      reply.setCookie(SESSION_COOKIE, result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.isProd,
        path: "/",
        maxAge: result.cookieMaxAge,
      });
      return {
        user: toUserDto(result.user),
        permissions: permissionsFor(result.user.role as UserRole),
      };
    } catch (err) {
      if (err instanceof AppError && err.httpStatus === 401) {
        recordFailure(ip, email);
      }
      throw err;
    }
  });

  app.post("/logout", { preHandler: [requireAuth] }, async (req, reply) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) authUseCase.logout(token, actorFromReq(req));
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const { user, permissions } = authUseCase.me(req.authUser!.id);
    return { user: toUserDto(user), permissions };
  });

  app.post(
    "/change-password",
    { preHandler: [requireAuth] },
    async (req) => {
      const body = changePasswordInputSchema.parse(req.body);
      authUseCase.changePassword({
        userId: req.authUser!.id,
        currentSessionId: req.authUser!.sessionId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        ctx: actorFromReq(req),
      });
      return { ok: true };
    },
  );
}
