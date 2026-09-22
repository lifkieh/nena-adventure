import { readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bookingStatusSchema } from "@nena/shared";
import { repoRoot } from "../db/paths.js";

/**
 * Enum status booking hidup di SATU tempat: packages/shared (bookingStatusSchema),
 * dan ditegakkan PRIMER oleh tipe branded `BookingStatus` — string mentah tidak
 * bisa ditugaskan tanpa asBookingStatus()/konstanta BookingStatus.*, jadi tsc
 * yang menegakkan. Test ini adalah JARING KEDUA (regex) untuk mencegah literal
 * status booking LAMA (pra-realignment) muncul lagi.
 *
 * Kanonik sekarang: baru_masuk | menunggu_bayar | verifikasi_bukti |
 * menunggu_pelunasan | siap_jalan | selesai | kadaluarsa | batal.
 */

// Literal booking-only yang tidak ambigu -> dilarang di mana pun (sebagai string).
const STRICT_FORBIDDEN = ["paid", "expired"];

// Ambigu dgn domain lain (pembayaran/jadwal/skema) -> hanya dilarang di KONTEKS
// booking, dan tidak jika baris menyebut domain lain.
//   'pending'   sah utk payments.status
//   'dp'        sah utk paymentScheme & payments.kind
//   'cancelled' sah utk schedules.status
const CONTEXTUAL_FORBIDDEN = ["pending", "dp", "cancelled"];
const OTHER_DOMAIN = /payment|schedule|scheme|kind|jadwal/i;
const BOOKING_CTX = /booking|BookingStatus|bookings\.status/;

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

function quoted(word: string): RegExp {
  return new RegExp(`["'\`]${word}["'\`]`);
}

describe("penegakan enum status booking (shared = satu sumber)", () => {
  it("tidak ada literal status booking LAMA di api/panel", () => {
    const offenders: string[] = [];
    for (const rel of SCAN_DIRS) {
      const dir = resolve(repoRoot, rel);
      for (const file of sourceFiles(dir)) {
        if (file.endsWith(SELF)) continue;
        const lines = readFileSync(file, "utf8").split(/\r?\n/);
        lines.forEach((line, i) => {
          for (const bad of STRICT_FORBIDDEN) {
            if (quoted(bad).test(line)) {
              offenders.push(`${file}:${i + 1} -> "${bad}" (booking-only)`);
            }
          }
          for (const bad of CONTEXTUAL_FORBIDDEN) {
            if (
              quoted(bad).test(line) &&
              BOOKING_CTX.test(line) &&
              !OTHER_DOMAIN.test(line)
            ) {
              offenders.push(`${file}:${i + 1} -> "${bad}" (booking context)`);
            }
          }
        });
      }
    }
    expect(
      offenders,
      `Literal status booking lama ditemukan. Pakai @nena/shared BookingStatus / asBookingStatus:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("shared mengekspor 8 status kanonik dalam urutan alur", () => {
    expect(bookingStatusSchema.options).toEqual([
      "baru_masuk",
      "menunggu_bayar",
      "verifikasi_bukti",
      "menunggu_pelunasan",
      "siap_jalan",
      "selesai",
      "kadaluarsa",
      "batal",
    ]);
  });
});
