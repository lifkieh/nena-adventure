import type { UserRole } from "@nena/shared";
import type { FastifyInstance } from "fastify";
import { hashPassword } from "../lib/password.js";
import * as usersRepo from "../repos/users.repo.js";
import type { User } from "../db/schema.js";

export function makeUser(input: {
  email: string;
  password: string;
  role: UserRole;
  active?: boolean;
  name?: string;
}): User {
  return usersRepo.create({
    email: input.email,
    name: input.name ?? input.email,
    role: input.role,
    passwordHash: hashPassword(input.password),
    active: input.active ?? true,
  });
}

/** Login via HTTP, kembalikan cookie sesi untuk request berikutnya. */
export async function loginCookie(
  app: FastifyInstance,
  email: string,
  password: string,
  ip = "10.0.0.1",
): Promise<string | null> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password },
    remoteAddress: ip,
  });
  if (res.statusCode !== 200) return null;
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) return null;
  return raw.split(";")[0] ?? null; // "nena_session=xxx"
}
