import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

/* Path resolution di-inline agar drizzle-kit (loader CJS) tidak perlu
   mengimpor modul .ts lain. Logika sama dengan src/db/paths.ts. */
function findRepoRoot(start: string = process.cwd()): string {
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
        /* abaikan */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

const dbPath = resolve(
  findRepoRoot(),
  process.env.DB_PATH ?? "./services/api/data/nena.db",
);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: dbPath },
});
