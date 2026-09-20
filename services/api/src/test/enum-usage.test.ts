import { readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bookingStatusSchema } from "@nena/shared";
import { repoRoot } from "../db/paths.js";

/**
 * Enum status booking hidup di SATU tempat: packages/shared (bookingStatusSchema).
 * Test ini gagal kalau ada literal status booking ad-hoc/legacy diketik langsung
 * di services/api/src atau apps/panel/src — memaksa impor dari shared.
 */

// Literal status booking legacy/ad-hoc yang tidak boleh muncul di mana pun.
// (Canonical: pending | dp | paid | cancelled | expired — dari shared.)
const FORBIDDEN = [
  "menunggu_bayar",
  "menunggu_pembayaran",
  "dp_dibayar",
  "sudah_bayar",
  "dibatalkan",
  "kadaluarsa",
  "kedaluwarsa",
];

const SCAN_DIRS = ["services/api/src", "apps/panel/src"];
const SELF = "enum-usage.test.ts";

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && [".ts", ".tsx"].includes(extname(e.name)))
    .map((e) =>
      resolve(
        (e as unknown as { parentPath?: string; path?: string }).parentPath ??
          (e as unknown as { path: string }).path,
        e.name,
      ),
    );
}

describe("penegakan enum status booking (shared adalah satu-satunya sumber)", () => {
  it("tidak ada literal status booking legacy di api/panel", () => {
    const offenders: string[] = [];
    for (const rel of SCAN_DIRS) {
      const dir = resolve(repoRoot, rel);
      for (const file of sourceFiles(dir)) {
        if (file.endsWith(SELF)) continue;
        const lines = readFileSync(file, "utf8").split(/\r?\n/);
        lines.forEach((line, i) => {
          for (const bad of FORBIDDEN) {
            if (line.includes(bad)) {
              offenders.push(`${file}:${i + 1} -> "${bad}"`);
            }
          }
        });
      }
    }
    expect(
      offenders,
      `Status booking legacy ditemukan. Impor dari @nena/shared bookingStatusSchema:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("shared mengekspor enum status booking kanonik", () => {
    expect(bookingStatusSchema.options).toEqual([
      "pending",
      "dp",
      "paid",
      "cancelled",
      "expired",
    ]);
  });
});
