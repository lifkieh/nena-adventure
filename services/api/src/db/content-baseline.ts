import { readFileSync } from "node:fs";

/**
 * Sumber kebenaran konten kanonik (baseline pre-1a).
 * Hero verbatim + FAQ dari berkas hasil ekstraksi scripts/extract-faq.mjs.
 * Dipakai oleh: seed-content (rekonsiliasi), content-verify (CLI), warn saat start.
 */

export const HERO_HEADING = "Jelajahi Pulau Sangiang dan nikmati keindahannya";

export interface FaqItem {
  q: string;
  a: string;
  active: boolean;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(new URL("./" + file, import.meta.url), "utf8")) as T;
}

export function faqBaseline(): FaqItem[] {
  return readJson<FaqItem[]>("faq.pre-1a.json");
}

/** Peta section -> body kanonik yang HARUS terbit. */
export function contentBaseline(): Record<string, unknown> {
  return {
    hero: { heading: HERO_HEADING },
    faq: { items: faqBaseline() },
    syarat: { groups: readJson<unknown[]>("syarat.pre-1a.json") },
    testimoni: { items: readJson<unknown[]>("testimoni.pre-1a.json") },
    itinerary: { trips: readJson<unknown[]>("itinerary.pre-1a.json") },
    kontak: { points: readJson<unknown[]>("kontak.pre-1a.json") },
  };
}

/** Stringify stabil (kunci objek diurut) untuk banding tanpa peduli urutan kunci. */
export function stableStringify(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.keys(val as Record<string, unknown>)
          .sort()
          .map((k) => [k, (val as Record<string, unknown>)[k]]),
      );
    }
    return val;
  });
}

/** Ukuran "kekayaan" section untuk deteksi baseline yang lebih miskin. */
function richness(key: string, body: unknown): number {
  if (key === "faq" || key === "testimoni") {
    const items = (body as { items?: unknown[] } | null)?.items;
    return Array.isArray(items) ? items.length : 0;
  }
  if (key === "syarat") {
    const groups = (body as { groups?: unknown[] } | null)?.groups;
    return Array.isArray(groups) ? groups.length : 0;
  }
  if (key === "itinerary") {
    const trips = (body as { trips?: unknown[] } | null)?.trips;
    return Array.isArray(trips) ? trips.length : 0;
  }
  if (key === "kontak") {
    const points = (body as { points?: unknown[] } | null)?.points;
    return Array.isArray(points) ? points.length : 0;
  }
  const h = (body as { heading?: string } | null)?.heading;
  return typeof h === "string" && h.trim() ? 1 : 0;
}

export type SectionStatus = "ok" | "mismatch" | "poorer" | "missing";

export interface SectionDiff {
  key: string;
  status: SectionStatus;
  detail: string;
}

/**
 * Bandingkan konten TERBIT (published) terhadap baseline.
 * publishedOf(key) mengembalikan body terbit atau null.
 */
export function diffAgainstBaseline(
  publishedOf: (key: string) => unknown,
): SectionDiff[] {
  const out: SectionDiff[] = [];
  for (const [key, want] of Object.entries(contentBaseline())) {
    const got = publishedOf(key);
    if (got == null) {
      out.push({ key, status: "missing", detail: "tidak ada versi terbit" });
      continue;
    }
    if (stableStringify(got) === stableStringify(want)) {
      out.push({ key, status: "ok", detail: "cocok baseline" });
      continue;
    }
    const rGot = richness(key, got);
    const rWant = richness(key, want);
    out.push({
      key,
      status: rGot < rWant ? "poorer" : "mismatch",
      detail: `terbit(${rGot}) vs baseline(${rWant})`,
    });
  }
  return out;
}
