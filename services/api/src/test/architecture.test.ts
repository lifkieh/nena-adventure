import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "..");

function tsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && extname(e.name) === ".ts")
    .map((e) =>
      resolve(
        // Node >=20: parentPath (>=20.12) / path (lama)
        (e as unknown as { parentPath?: string; path?: string }).parentPath ??
          (e as unknown as { path: string }).path,
        e.name,
      ),
    );
}

function importSpecifiers(code: string): string[] {
  const specs: string[] = [];
  const re = /(?:import|export)[^;]*?from\s*["']([^"']+)["']/g;
  const reReq = /require\(\s*["']([^"']+)["']\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) if (m[1]) specs.push(m[1]);
  while ((m = reReq.exec(code))) if (m[1]) specs.push(m[1]);
  return specs;
}

/** Deteksi SQL mentah: template `sql` drizzle atau string SQL telanjang. */
function hasRawSql(code: string): boolean {
  if (/\bsql`/.test(code)) return true;
  if (/["'`]\s*(SELECT|INSERT|UPDATE|DELETE)\b/i.test(code)) return true;
  return false;
}

describe("aturan arsitektur berlapis", () => {
  it("routes/ tidak boleh menyentuh DB / SQL langsung", () => {
    const files = tsFiles(resolve(srcDir, "routes"));
    expect(files.length).toBeGreaterThan(0);
    const forbidden = ["drizzle-orm", "better-sqlite3"];
    for (const f of files) {
      const code = readFileSync(f, "utf8");
      const specs = importSpecifiers(code);
      for (const s of specs) {
        const bad =
          forbidden.some((x) => s === x || s.startsWith(x + "/")) ||
          /(^|\/)db\//.test(s) ||
          s.endsWith("/db/client.js") ||
          s.endsWith("/db/schema.js") ||
          /\.repo(\.js)?$/.test(s); // routes juga tidak boleh langsung ke repos
        expect(bad, `routes/ mengimpor terlarang "${s}" di ${f}`).toBe(false);
      }
      expect(hasRawSql(code), `routes/ mengandung SQL mentah di ${f}`).toBe(
        false,
      );
    }
  });

  it("usecases/ tidak boleh bergantung pada Fastify", () => {
    const files = tsFiles(resolve(srcDir, "usecases"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const code = readFileSync(f, "utf8");
      const specs = importSpecifiers(code);
      for (const s of specs) {
        const bad = s === "fastify" || s.startsWith("@fastify/");
        expect(bad, `usecases/ mengimpor Fastify "${s}" di ${f}`).toBe(false);
      }
    }
  });
});
