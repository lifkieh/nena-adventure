import { sqliteConn } from "./client.js";
import * as content from "../usecases/content/service.js";

const SYSTEM = { userId: null, role: "system", ip: null, userAgent: null } as const;

/**
 * Seed konten CMS dari isi HTML situs saat ini — VERBATIM — agar setelah situs
 * membaca konten dari API, render tetap identik (parity 0.0000%). Idempoten.
 */
export function seedContent(): void {
  // Hero: heading verbatim dari apps/site/index.html.
  const heroPublished = content.getSectionSafe("hero")?.published as
    | { heading?: string }
    | null
    | undefined;
  if (!heroPublished || !heroPublished.heading) {
    content.saveDraft(
      "hero",
      { heading: "Jelajahi Pulau Sangiang dan nikmati keindahannya" },
      SYSTEM,
    );
    content.publish("hero", SYSTEM);
  }

  // FAQ: struktur contoh (belum dikonsumsi situs; disiapkan untuk editor).
  const faq = content.getSectionSafe("faq");
  if (!faq || !faq.published) {
    content.saveDraft(
      "faq",
      {
        items: [
          { q: "Bagaimana cara membayar?", a: "Transfer ke rekening resmi lalu unggah bukti." },
        ],
      },
      SYSTEM,
    );
    content.publish("faq", SYSTEM);
  }
}

// Jalur manual: npm run seed:content
if (process.argv[1] && process.argv[1].endsWith("seed-content.ts")) {
  seedContent();
  console.log("Seed konten selesai.");
  sqliteConn.close();
}
