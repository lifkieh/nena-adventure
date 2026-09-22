import { beforeAll, describe, expect, it } from "vitest";
import { makeSchedule, seedPricing } from "./helpers.js";
import * as service from "../usecases/booking/service.js";
import * as schedulesRepo from "../repos/schedules.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: null, ip: null, userAgent: null };

beforeAll(() => seedPricing());

describe("konkurensi kursi (BEGIN IMMEDIATE)", () => {
  it("20 permintaan berebut 10 kursi -> tepat 10 sukses, 10 gagal (20 iterasi)", async () => {
    for (let iter = 0; iter < 20; iter++) {
      const s = makeSchedule({ date: "2027-06-05", capacity: 10 });
      const attempts = Array.from({ length: 20 }, () =>
        Promise.resolve().then(() => {
          try {
            service.createWebBooking({
              scheduleId: s.id,
              packageKey: "reguler",
              meetingPoint: "anyer",
              pax: 1,
              paymentScheme: "lunas",
              customer: { name: "Uji Konkuren", phone: "081200000000", email: "k@u.co" },
              participants: [{ name: "Uji Konkuren" }],
              ctx: CTX,
            });
            return true;
          } catch {
            return false;
          }
        }),
      );
      const results = await Promise.all(attempts);
      const ok = results.filter(Boolean).length;
      const fail = results.length - ok;
      const remaining = schedulesRepo.remainingSeats(s.id);

      expect(ok, `iterasi ${iter}: sukses`).toBe(10);
      expect(fail, `iterasi ${iter}: gagal`).toBe(10);
      expect(remaining, `iterasi ${iter}: sisa`).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0); // SUM(delta) tak pernah > capacity
    }
  });
});
