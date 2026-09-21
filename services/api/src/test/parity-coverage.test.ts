import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — modul .mjs polos tanpa deklarasi tipe.
import { routerRoutes, capturesForRoute, baseCaptureKeys } from "../../../../scripts/parity-routes.mjs";
// @ts-expect-error — render situs polos tanpa deklarasi tipe.
import { faqHtml } from "../../../../apps/site/src/render.js";

const ROOT = resolve(__dirname, "../../../..");

describe("integritas cakupan harness parity", () => {
  it("setiap rute router punya minimal satu capture", () => {
    const routes = routerRoutes() as string[];
    const uncovered = routes.filter((r) => capturesForRoute(r).length === 0);
    expect(uncovered, `rute tanpa capture: ${uncovered.join(", ")}`).toEqual([]);
  });

  it("jumlah rute ter-capture TIDAK boleh kurang dari jumlah rute router", () => {
    const routes = routerRoutes() as string[];
    const covered = routes.filter((r) => capturesForRoute(r).length > 0);
    // Kalau ada rute baru di router tapi belum di-capture, ini merah.
    expect(covered.length).toBeGreaterThanOrEqual(routes.length);
  });

  it("tidak ada capture yatim (capture tanpa rute router)", () => {
    const routes = routerRoutes() as string[];
    const routeCaps = new Set(routes.flatMap((r) => capturesForRoute(r) as string[]));
    const orphan = (baseCaptureKeys() as string[]).filter((k) => !routeCaps.has(k));
    expect(orphan, `capture yatim: ${orphan.join(", ")}`).toEqual([]);
  });
});

/** Inner HTML blok <div class="faq"> di baseline pre-1a, apa adanya. */
function pre1aFaqInner(): string {
  const html = execSync("git show pre-1a:apps/site/index.html", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const sec = html.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/)?.[0] ?? "";
  return sec.match(/<div class="faq">([\s\S]*?)<\/div>/)?.[1] ?? "";
}

const seededFaq = JSON.parse(
  readFileSync(resolve(ROOT, "services/api/src/db/faq.pre-1a.json"), "utf8"),
) as { q: string; a: string; active: boolean }[];

describe("FAQ verbatim pre-1a + sensitivitas harness", () => {
  it("7 item ter-seed = 7 item pre-1a", () => {
    expect(seededFaq.length).toBe(7);
  });

  it("render faqHtml(item seed) IDENTIK dengan blok FAQ pre-1a (verbatim)", () => {
    expect(faqHtml(seededFaq)).toBe(pre1aFaqInner());
  });

  it("NEGATIF: hapus satu item -> render BEDA dari pre-1a (harness bisa merah)", () => {
    const missingOne = seededFaq.slice(0, seededFaq.length - 1); // 6 item
    expect(faqHtml(missingOne)).not.toBe(pre1aFaqInner());
  });

  it("NEGATIF: ubah satu pertanyaan -> render BEDA dari pre-1a", () => {
    const edited = seededFaq.map((it, i) => (i === 0 ? { ...it, q: it.q + " (diubah)" } : it));
    expect(faqHtml(edited)).not.toBe(pre1aFaqInner());
  });
});
