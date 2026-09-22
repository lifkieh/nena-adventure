import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Resolusi path bebas-validasi (dipakai env.ts, migrate.ts, drizzle.config.ts).
 * Tidak boleh mengimpor zod / env supaya aman dipanggil drizzle-kit.
 */

/** Cari root repo: direktori terdekat ke atas yang package.json-nya punya "workspaces". */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    const pkg = resolve(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        const json = JSON.parse(readFileSync(pkg, "utf8")) as {
          workspaces?: unknown;
        };
        if (json.workspaces) return dir;
      } catch {
        /* abaikan package.json rusak, lanjut ke atas */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return resolve(start); // fallback: cwd
    dir = parent;
  }
}

export const repoRoot = findRepoRoot();

/** Path absolut file DB. DB_PATH di .env relatif terhadap root repo. */
export function resolveDbPath(): string {
  const raw = process.env.DB_PATH ?? "./services/api/data/nena.db";
  return resolve(repoRoot, raw);
}

/** Folder migrasi drizzle (SQL hasil generate). */
export function migrationsFolder(): string {
  return resolve(repoRoot, "services/api/drizzle");
}
