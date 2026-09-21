import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES, BOOKING_ACTIONS, bookingActionMeta, bookingStatusMeta,
  legalActionsFor,
} from "@nena/shared";

const EXPECTED: Record<string, string[]> = {
  baru_masuk: ["send_invoice", "cancel"],
  menunggu_bayar: ["submit_proof", "expire", "cancel"],
  verifikasi_bukti: ["approve_dp", "approve_full", "reject", "cancel"],
  menunggu_pelunasan: ["submit_proof", "cancel"],
  siap_jalan: ["complete", "cancel"],
  selesai: [],
  kadaluarsa: ["cancel"],
  batal: [],
};

describe("mesin status: aksi legal per status", () => {
  for (const status of BOOKING_STATUSES) {
    it(`${status} -> aksi legal sama persis daftar transisi`, () => {
      expect(legalActionsFor(status).slice().sort()).toEqual(EXPECTED[status]!.slice().sort());
    });
  }
});

describe("label lengkap (tak ada enum mentah bocor)", () => {
  it("setiap aksi punya label Bahasa Indonesia bukan nama aksi mentah", () => {
    for (const a of BOOKING_ACTIONS) {
      const label = bookingActionMeta[a].label;
      expect(label, a).toBeTruthy();
      expect(label).not.toBe(a); // bukan string enum mentah
    }
  });
  it("setiap status booking punya label — GAGAL bila ada yang tak berlabel", () => {
    for (const s of BOOKING_STATUSES) {
      expect(bookingStatusMeta[s]?.label, s).toBeTruthy();
      expect(bookingStatusMeta[s].label).not.toBe(s);
    }
  });
});
