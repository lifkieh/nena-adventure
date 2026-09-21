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
import { packageDefs } from "./package-baseline.js";

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
    { key: "testimoni", title: "Testimoni" },
  ];
  for (const sec of sections) {
    db.insert(contentSections)
      .values({ key: sec.key, title: sec.title })
      .onConflictDoNothing({ target: contentSections.key })
      .run();
  }

  seedPackages();

  // Jadwal operasional: seluruh Sabtu & Minggu untuk 3 bulan ke depan (idempoten).
  const added = seedOperationalSchedules(3);
  // Konten CMS verbatim (idempoten).
  seedContent();

  console.log(
    `Seed selesai. Owner: ${env.OWNER_EMAIL}. Jadwal akhir pekan baru: ${added}.`,
  );
  sqliteConn.close();
}

/**
 * Seed paket + tier. Akar masalah harga hilang: UPSERT sejati berdasar key —
 * TIDAK PERNAH delete lalu buat ulang, jadi ID paket STABIL lintas seed (tier
 * yang mereferensi package_id tidak pernah jadi yatim). Idempoten.
 */
export function seedPackages(): void {
  for (const def of packageDefs()) {
    // Upsert paket by key: baris ada -> update name/prices, ID dipertahankan.
    db.insert(packages)
      .values({ key: def.key, name: def.name, prices: JSON.stringify(def.prices) })
      .onConflictDoUpdate({
        target: packages.key,
        set: { name: def.name, prices: JSON.stringify(def.prices) },
      })
      .run();

    const row = db.select().from(packages).where(eq(packages.key, def.key)).get();
    if (!row) continue;
    // Tier: upsert-nothing per (package_id,min_pax,max_pax) — tak menambah baris,
    // tak menimpa harga hasil edit admin (unique index menjamin idempotensi).
    for (const t of def.tiers) {
      db.insert(packageTiers)
        .values({ packageId: row.id, ...t })
        .onConflictDoNothing({
          target: [packageTiers.packageId, packageTiers.minPax, packageTiers.maxPax],
        })
        .run();
    }
  }
}

// Jalur CLI: hanya jalankan seed penuh saat dieksekusi langsung (bukan diimpor test).
if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  main();
}
