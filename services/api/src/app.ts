import { resolve } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { env } from "./env.js";
import { repoRoot } from "./db/paths.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler, notFoundEnvelope } from "./lib/errors.js";

const SITE_DIR = resolve(repoRoot, "apps/site");

export interface RegisteredRoute {
  method: string;
  url: string;
  permission: string | null;
}

declare module "fastify" {
  interface FastifyInstance {
    registeredRoutes: RegisteredRoute[];
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: "warn" } });

  app.setErrorHandler(errorHandler);

  // Kumpulkan semua route terdaftar (untuk test route-permission).
  const registeredRoutes: RegisteredRoute[] = [];
  app.decorate("registeredRoutes", registeredRoutes);
  app.addHook("onRoute", (r) => {
    const methods = Array.isArray(r.method) ? r.method : [r.method];
    const permission =
      (r.config as { permission?: string } | undefined)?.permission ?? null;
    for (const m of methods) {
      registeredRoutes.push({ method: m, url: r.url, permission });
    }
  });

  // Cookie (untuk sesi httpOnly). Secret dipakai bila cookie ditandatangani.
  await app.register(fastifyCookie, { secret: env.SESSION_SECRET });

  // API di bawah /api (HTTP + validasi Zod saja di lapisan ini).
  await app.register(apiRoutes, { prefix: "/api" });

  // Situs publik statis (apps/site) di root — pengganti Live Server.
  // wildcard:true = lookup filesystem per-request (mendukung file & subfolder
  // apa pun: styles/, src/, src/data/) dengan MIME benar; file hilang jatuh ke
  // setNotFoundHandler (SPA fallback ke index.html).
  await app.register(fastifyStatic, {
    root: SITE_DIR,
    prefix: "/",
    wildcard: true,
  });

  // 404: /api/* -> JSON seragam; selain itu fallback ke index.html situs.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) {
      reply.status(404).send(notFoundEnvelope());
      return;
    }
    reply.sendFile("index.html");
  });

  return app;
}
