import { resolve } from "node:path";
import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { z } from "zod";
import { repoRoot, resolveDbPath } from "./db/paths.js";

/* Muat .env dari root repo (bukan cwd workspace). */
const envFile = resolve(repoRoot, ".env");
if (existsSync(envFile)) dotenv.config({ path: envFile });

const rawSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().default("./services/api/data/nena.db"),
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET minimal 16 karakter")
    .default("dev-session-secret-ganti-di-produksi"),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY harus 64 karakter hex (32 byte)")
    .default("0".repeat(64)),
  OWNER_EMAIL: z.string().email().default("owner@nena-adventure.id"),
  OWNER_PASSWORD: z.string().min(6).default("ubah-password-ini"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = rawSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Konfigurasi environment tidak valid:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  /** Path absolut file SQLite. */
  dbPath: resolveDbPath(),
  isProd: parsed.data.NODE_ENV === "production",
} as const;

export type Env = typeof env;
