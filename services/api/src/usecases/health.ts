import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { HealthResponse } from "@nena/shared";
import { repoRoot } from "../db/paths.js";
import { migrationStatus } from "../repos/health.repo.js";

function appVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(repoRoot, "services/api/package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const VERSION = appVersion();

/** Logika bisnis health: rakit versi, uptime, waktu, status migrasi. */
export function getHealth(): HealthResponse {
  return {
    status: "ok",
    version: VERSION,
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
    migrations: migrationStatus(),
  };
}
