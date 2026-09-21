import { env } from "../env.js";
import { hashPassword } from "../lib/password.js";
import { db, sqliteConn } from "./client.js";
import { eq } from "drizzle-orm";
import {
  boats,
  contentSections,
  packageTiers,
  packages,
  settings,
  users,
} from "./schema.js";
import { seedOperationalSchedules } from "./seed-schedules.js";
import { seedContent } from "./seed-content.js";

/** Isi data awal minimal (idempoten). Fase 1B: owner, settings, kapal, seksi konten. */
function main(): void {
  // Owner pertama — upsert supaya kredensial selalu selaras dengan .env
  // (dan hash ikut ter-refresh bila parameter/format hashing berubah).
  db.insert(users)
    .values({
      email: env.OWNER_EMAIL,
      passwordHash: hashPassword(env.OWNER_PASSWORD),
      name: "Owner Nena Adventure",
      role: "owner",
      active: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: hashPassword(env.OWNER_PASSWORD),
        role: "owner",
        active: true,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();

  // Pengaturan default.
  const defaultSettings: { key: string; value: string }[] = [
    { key: "brand.name", value: JSON.stringify("Nena Adventure") },
    { key: "brand.timezone", value: JSON.stringify("Asia/Jakarta") },
    { key: "payment.bca_account", value: JSON.stringify("6510693653") },
    { key: "contact.whatsapp", value: JSON.stringify("6281286133202") },
    // Timeout sesi (detik): idle 8 jam, absolute 7 hari.
    { key: "session.idle_seconds", value: JSON.stringify(8 * 60 * 60) },
    { key: "session.absolute_seconds", value: JSON.stringify(7 * 24 * 60 * 60) },
    // Harga & booking (server otoritatif). Nilai dari apps/site/src/data.
    { key: "pricing.service_fee", value: JSON.stringify(5000) },
    { key: "pricing.dp_percent", value: JSON.stringify(50) },
    { key: "pricing.group_discount_percent", value: JSON.stringify(5) },
    { key: "pricing.group_discount_min_pax", value: JSON.stringify(10) },
    { key: "booking.hold_minutes", value: JSON.stringify(60) },
    { key: "booking.manual_hold_hours", value: JSON.stringify(24) },
    // Ambang cuaca (placeholder untuk auto-close nanti).
    { key: "weather.max_wind_knots", value: JSON.stringify(25) },
    { key: "weather.max_wave_meters", value: JSON.stringify(2) },
  ];
  for (const s of defaultSettings) {
    db.insert(settings)
      .values(s)
      .onConflictDoNothing({ target: settings.key })
      .run();
  }

  // Satu kapal default.
  const boatCount = sqliteConn
    .prepare("SELECT COUNT(*) AS n FROM boats")
    .get() as { n: number };
  if (boatCount.n === 0) {
    db.insert(boats)
      .values({ name: "Speedboat 1", capacity: 24 })
      .run();
  }

  // Kerangka seksi konten (kunci saja).
  const sections: { key: string; title: string }[] = [
    { key: "hero", title: "Hero Beranda" },
    { key: "paket", title: "Paket & Harga" },
    { key: "itinerary", title: "Itinerary" },
    { key: "faq", title: "FAQ" },
    { key: "syarat", title: "Syarat & Ketentuan" },
  ];
  for (const sec of sections) {
    db.insert(contentSections)
      .values({ key: sec.key, title: sec.title })
      .onConflictDoNothing({ target: contentSections.key })
      .run();
  }

  // Paket & harga (nilai PERSIS dari apps/site/src/data/harga.js).
  const pkgs: { key: string; name: string; prices: Record<string, number> }[] = [
    { key: "reguler", name: "Open Trip Reguler", prices: { anyer: 385000 } },
    {
      key: "premium",
      name: "Open Trip Premium",
      prices: { anyer: 525000, serang: 650000, tangerang: 800000, jakarta: 850000 },
    },
    // Private: harga per rombongan lewat tier (bukan per meeting point) -> prices {}.
    { key: "private", name: "Private Trip Premium", prices: {} },
  ];
  for (const p of pkgs) {
    db.insert(packages)
      .values({ key: p.key, name: p.name, prices: JSON.stringify(p.prices) })
      .onConflictDoNothing({ target: packages.key })
      .run();
  }
  // Perbaiki data lama: private {anyer:0} -> {} (bukan Rp0 palsu).
  sqliteConn
    .prepare("UPDATE packages SET prices='{}' WHERE key='private' AND prices='{\"anyer\":0}'")
    .run();

  // Tier Private Trip (per rombongan).
  const privatePkg = db
    .select()
    .from(packages)
    .where(eq(packages.key, "private"))
    .get();
  if (privatePkg) {
    const existing = sqliteConn
      .prepare("SELECT COUNT(*) AS n FROM package_tiers WHERE package_id = ?")
      .get(privatePkg.id) as { n: number };
    if (existing.n === 0) {
      const tiers = [
        { minPax: 1, maxPax: 6, price: 4500000 },
        { minPax: 7, maxPax: 9, price: 5500000 },
        { minPax: 10, maxPax: 11, price: 6300000 },
        { minPax: 12, maxPax: 14, price: 7300000 },
      ];
      for (const t of tiers) {
        db.insert(packageTiers).values({ packageId: privatePkg.id, ...t }).run();
      }
    }
  }

  // Jadwal operasional: seluruh Sabtu & Minggu untuk 3 bulan ke depan (idempoten).
  const added = seedOperationalSchedules(3);
  // Konten CMS verbatim (idempoten).
  seedContent();

  console.log(
    `Seed selesai. Owner: ${env.OWNER_EMAIL}. Jadwal akhir pekan baru: ${added}.`,
  );
  sqliteConn.close();
}

main();
