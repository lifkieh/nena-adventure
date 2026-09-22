import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loginCookie, makeSchedule, makeUser, seedPricing } from "./helpers.js";
import * as bookingService from "../usecases/booking/service.js";
import * as bookingsRepo from "../repos/bookings.repo.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "admin", ip: null, userAgent: null };
const SECRETS = [
  "accessTokenHash",
  "access_token_hash",
  "idempotencyKey",
  "idempotency_key",
];

function assertNoSecret(label: string, text: string) {
  for (const s of SECRETS) {
    expect(text.includes(s), `${label} membocorkan "${s}"`).toBe(false);
  }
}

let app: FastifyInstance;
let cookie: string;
let code: string;
let token: string;
let bookingId: string;

beforeAll(async () => {
  seedPricing();
  app = await buildApp();
  await app.ready();
  const s = makeSchedule({ date: new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10), capacity: 10 });
  const r = bookingService.createWebBooking({
    scheduleId: s.id,
    packageKey: "reguler",
    meetingPoint: "anyer",
    pax: 1,
    paymentScheme: "lunas",
    customer: { name: "Budi Uji", phone: "081234567890", email: "b@u.co" },
    participants: [{ name: "Budi Uji", idNumber: "3200000000001234" }],
    idempotencyKey: "LEAK-KEY-1",
    ctx: CTX,
  });
  code = r.code;
  token = r.token;
  bookingId = bookingsRepo.findByCode(code)!.id;
  makeUser({ email: "own-dto@t.local", password: "Password123", role: "owner" });
  cookie = (await loginCookie(app, "own-dto@t.local", "Password123", "10.7.0.1"))!;
});
afterAll(async () => app.close());

describe("respons tidak membocorkan material rahasia", () => {
  it("baris DB mentah MEMANG punya secret (test bermakna)", () => {
    const raw = bookingsRepo.findByCode(code)!;
    expect(raw.accessTokenHash).toBeTruthy();
    expect(raw.idempotencyKey).toBe("LEAK-KEY-1");
  });

  it("GET /api/public/bookings/:code bersih", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/public/bookings/${code}`,
      headers: { "x-booking-token": token },
    });
    expect(res.statusCode).toBe(200);
    assertNoSecret("public summary", res.body);
  });

  it("GET /api/admin/bookings (list) bersih", async () => {
    const res = await app.inject({ method: "GET", url: "/api/admin/bookings", headers: { cookie } });
    expect(res.statusCode).toBe(200);
    assertNoSecret("admin list", res.body);
  });

  it("GET /api/admin/bookings/:id (detail) bersih", async () => {
    const res = await app.inject({ method: "GET", url: `/api/admin/bookings/${bookingId}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    assertNoSecret("admin detail", res.body);
  });
});
