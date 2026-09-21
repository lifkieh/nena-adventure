import { readFileSync } from "node:fs";
import { sqliteConn } from "./client.js";
import * as content from "../usecases/content/service.js";

const SYSTEM = { userId: null, role: "system", ip: null, userAgent: null } as const;

// FAQ diambil VERBATIM dari baseline pre-1a lewat scripts/extract-faq.mjs.
// Bukan salin-tangan: `npm run extract:faq` menulis ulang file ini dari tag.
const FAQ_ITEMS = JSON.parse(
  readFileSync(new URL("./faq.pre-1a.json", import.meta.url), "utf8"),
) as { q: string; a: string; active: boolean }[];

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

  // FAQ: 7 item VERBATIM dari index.html (dikonsumsi situs; parity 0).
  const faq = content.getSectionSafe("faq");
  if (!faq || !faq.published) {
    content.saveDraft("faq", { items: FAQ_ITEMS }, SYSTEM);
    content.publish("faq", SYSTEM);
  }
}

// Jalur manual: npm run seed:content
if (process.argv[1] && process.argv[1].endsWith("seed-content.ts")) {
  seedContent();
  console.log("Seed konten selesai.");
  sqliteConn.close();
}
