import { sqliteConn } from "./client.js";
import * as content from "../usecases/content/service.js";
import { contentBaseline, stableStringify } from "./content-baseline.js";

const SYSTEM = { userId: null, role: "system", ip: null, userAgent: null } as const;

const eq = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

/**
 * REKONSILIASI konten CMS terhadap baseline pre-1a (hero + FAQ dari berkas
 * ekstraksi). Bukan "sisipkan-kalau-kosong": bila versi terbit menyimpang dari
 * baseline, konten dipublik ulang; draf sisa pengujian di-reset. Idempoten.
 */
export function seedContent(): void {
  for (const [key, body] of Object.entries(contentBaseline())) {
    const r = content.reconcile(key, body, SYSTEM, eq);
    if (r !== "unchanged") console.log(`konten ${key}: ${r}`);
  }
}

// Jalur manual: npm run seed:content
if (process.argv[1] && process.argv[1].endsWith("seed-content.ts")) {
  seedContent();
  console.log("Rekonsiliasi konten selesai.");
  sqliteConn.close();
}
