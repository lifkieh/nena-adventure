import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  bookingStatusMeta,
  scheduleStatusMeta,
  scheduleStatusSchema,
} from "@nena/shared";

describe("label status lengkap (tidak ada enum mentah tanpa label)", () => {
  it("setiap status booking punya label + warna", () => {
    for (const s of BOOKING_STATUSES) {
      const m = bookingStatusMeta[s];
      expect(m, `status booking "${s}" tanpa label`).toBeTruthy();
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.color).toBeTruthy();
    }
  });
  it("setiap status jadwal punya label + warna", () => {
    for (const s of scheduleStatusSchema.options) {
      const m = scheduleStatusMeta[s];
      expect(m, `status jadwal "${s}" tanpa label`).toBeTruthy();
      expect(m.label.length).toBeGreaterThan(0);
    }
  });
});
