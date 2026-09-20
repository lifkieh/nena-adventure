import { resolve } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { repoRoot } from "./db/paths.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler, notFoundEnvelope } from "./lib/errors.js";

const SITE_DIR = resolve(repoRoot, "apps/site");

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { transport: undefined },
    disableRequestLogging: false,
  });

  app.setErrorHandler(errorHandler);

  // API di bawah /api (HTTP + validasi Zod saja di lapisan ini).
  await app.register(apiRoutes, { prefix: "/api" });

  // Situs publik statis (apps/site) di root — pengganti Live Server.
  await app.register(fastifyStatic, {
    root: SITE_DIR,
    prefix: "/",
    wildcard: false,
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
