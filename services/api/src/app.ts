import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import { env } from "./env.js";
import { repoRoot } from "./db/paths.js";
import { apiRoutes } from "./routes/index.js";
import { errorHandler, notFoundEnvelope } from "./lib/errors.js";

const SITE_DIR = resolve(repoRoot, "apps/site");
const PANEL_DIR = resolve(repoRoot, "apps/panel/dist");
const PANEL_INDEX = resolve(PANEL_DIR, "index.html");

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
  const panelBuilt = existsSync(PANEL_INDEX);

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

  await app.register(fastifyCookie, { secret: env.SESSION_SECRET });
  // Upload bukti: 1 file, maks 5MB.
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  /* ── Urutan registrasi EKSPLISIT (bukan kebetulan) ──────────
   * 1. /api  -> route API (paling utama)
   * 2. /panel -> panel admin statis (dist), bila sudah di-build
   * 3. /      -> situs publik statis
   * Radix router memilih prefix terpanjang, jadi /panel/** & /api/**
   * TIDAK akan tertangkap fallback situs publik. notFoundHandler
   * mengarahkan sisa path ke fallback yang benar per-prefix.
   * ──────────────────────────────────────────────────────────── */

  // 1. API
  await app.register(apiRoutes, { prefix: "/api" });

  // 3-decorate: situs publik didaftar lebih dulu supaya reply.sendFile ada.
  //
  // Cache-busting (#10): media (nama file ULID = konten unik) boleh di-cache lama
  // & immutable; HTML/CSS/JS di-set `no-cache` supaya browser SELALU revalidasi
  // (ETag → 304 kalau tak berubah, file baru langsung terpakai setelah deploy).
  // Ini mencegah "style basi" tanpa perlu build/hash aset.
  await app.register(fastifyStatic, {
    root: SITE_DIR,
    prefix: "/",
    wildcard: true,
    cacheControl: false,
    setHeaders: (res, path) => {
      const p = path.replace(/\\/g, "/");
      if (p.includes("/media/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  });

  // 2. Panel admin statis (hanya bila dist ada). decorateReply:false karena
  //    reply.sendFile sudah didekorasi oleh registrasi situs di atas.
  if (panelBuilt) {
    await app.register(fastifyStatic, {
      root: PANEL_DIR,
      prefix: "/panel/",
      wildcard: true,
      decorateReply: false,
    });
  }

  // 404 / fallback SPA per-prefix.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api")) {
      reply.status(404).send(notFoundEnvelope());
      return;
    }
    if (req.url === "/panel" || req.url.startsWith("/panel/") || req.url.startsWith("/panel?")) {
      if (!panelBuilt) {
        reply.status(503).send({
          error: {
            code: "PANEL_NOT_BUILT",
            message:
              "Panel belum di-build. Jalankan `npm run build` lalu mulai ulang server.",
          },
        });
        return;
      }
      reply.type("text/html").sendFile("index.html", PANEL_DIR);
      return;
    }
    // Situs publik (SPA hash-routing).
    reply.sendFile("index.html");
  });

  return app;
}
