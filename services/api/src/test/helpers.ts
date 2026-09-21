import type { UserRole } from "@nena/shared";
import type { FastifyInstance } from "fastify";
import { hashPassword } from "../lib/password.js";
import { db } from "../db/client.js";
import * as usersRepo from "../repos/users.repo.js";
import { setSetting } from "../repos/settings.repo.js";
import {
  packageTiers,
  packages,
  schedules,
  type User,
} from "../db/schema.js";
import { eq } from "drizzle-orm";

export function makeUser(input: {
  email: string;
  password: string;
  role: UserRole;
  active?: boolean;
  name?: string;
}): User {
  return usersRepo.create({
    email: input.email,
    name: input.name ?? input.email,
    role: input.role,
    passwordHash: hashPassword(input.password),
    active: input.active ?? true,
  });
}

/** Login via HTTP, kembalikan cookie sesi untuk request berikutnya. */
export async function loginCookie(
  app: FastifyInstance,
  email: string,
  password: string,
  ip = "10.0.0.1",
): Promise<string | null> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password },
    remoteAddress: ip,
  });
  if (res.statusCode !== 200) return null;
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) return null;
  return raw.split(";")[0] ?? null; // "nena_session=xxx"
}

/** Seed paket/tier/settings harga (mirror seed.ts) untuk test booking. */
export function seedPricing(): void {
  const pkgs = [
    { key: "reguler", name: "Open Trip Reguler", prices: { anyer: 385000 } },
    {
      key: "premium",
      name: "Open Trip Premium",
      prices: { anyer: 525000, serang: 650000, tangerang: 800000, jakarta: 850000 },
    },
    { key: "private", name: "Private Trip Premium", prices: { anyer: 0 } },
  ];
  for (const p of pkgs) {
    db.insert(packages)
      .values({ key: p.key, name: p.name, prices: JSON.stringify(p.prices) })
      .onConflictDoNothing({ target: packages.key })
      .run();
  }
  const priv = db.select().from(packages).where(eq(packages.key, "private")).get();
  if (priv) {
    const tiers = [
      { minPax: 1, maxPax: 6, price: 4500000 },
      { minPax: 7, maxPax: 9, price: 5500000 },
      { minPax: 10, maxPax: 11, price: 6300000 },
      { minPax: 12, maxPax: 14, price: 7300000 },
    ];
    for (const t of tiers)
      db.insert(packageTiers)
        .values({ packageId: priv.id, ...t })
        .onConflictDoNothing({
          target: [packageTiers.packageId, packageTiers.minPax, packageTiers.maxPax],
        })
        .run();
  }
  setSetting("pricing.service_fee", 5000);
  setSetting("pricing.dp_percent", 50);
  setSetting("pricing.group_discount_percent", 5);
  setSetting("pricing.group_discount_min_pax", 10);
  setSetting("booking.hold_minutes", 60);
  setSetting("booking.manual_hold_hours", 24);
}

export function makeSchedule(input: {
  date: string;
  capacity: number;
  status?: string;
  threshold?: number;
}): typeof schedules.$inferSelect {
  return db
    .insert(schedules)
    .values({
      date: input.date,
      capacity: input.capacity,
      status: input.status ?? "terbit",
      threshold: input.threshold ?? 6,
    })
    .returning()
    .get();
}
