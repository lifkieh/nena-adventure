import { env } from "../env.js";
import { hashPassword } from "../lib/password.js";
import { db, sqliteConn } from "./client.js";
import {
  boats,
  contentSections,
  settings,
  users,
} from "./schema.js";

/** Isi data awal minimal (idempoten). Fase 1B: owner, settings, kapal, seksi konten. */
function main(): void {
  // Owner pertama.
  db.insert(users)
    .values({
      email: env.OWNER_EMAIL,
      passwordHash: hashPassword(env.OWNER_PASSWORD),
      name: "Owner Nena Adventure",
      role: "owner",
    })
    .onConflictDoNothing({ target: users.email })
    .run();

  // Pengaturan default.
  const defaultSettings: { key: string; value: string }[] = [
    { key: "brand.name", value: JSON.stringify("Nena Adventure") },
    { key: "brand.timezone", value: JSON.stringify("Asia/Jakarta") },
    { key: "payment.bca_account", value: JSON.stringify("6510693653") },
    { key: "contact.whatsapp", value: JSON.stringify("6281286133202") },
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

  console.log(`Seed selesai. Owner: ${env.OWNER_EMAIL}`);
  sqliteConn.close();
}

main();
