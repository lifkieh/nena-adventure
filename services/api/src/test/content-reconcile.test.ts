import { describe, expect, it, beforeEach } from "vitest";
import { db } from "../db/client.js";
import { contentSections, contentVersions } from "../db/schema.js";
import * as content from "../usecases/content/service.js";
import { contentBaseline, stableStringify } from "../db/content-baseline.js";
import type { ActorContext } from "../usecases/audit.js";

const CTX: ActorContext = { userId: null, role: "system", ip: null, userAgent: null };
const eq = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
const faqBody = contentBaseline().faq as { items: unknown[] };

function faqPublishedLen(): number {
  const p = content.getSectionSafe("faq")?.published as { items?: unknown[] } | null;
  return p?.items?.length ?? 0;
}

describe("rekonsiliasi konten", () => {
  beforeEach(() => {
    db.delete(contentVersions).run();
    db.delete(contentSections).run();
  });

  it("section kosong -> republished ke baseline (7 item)", () => {
    expect(content.reconcile("faq", faqBody, CTX, eq)).toBe("republished");
    expect(faqPublishedLen()).toBe(7);
  });

  it("sudah cocok -> unchanged (idempoten)", () => {
    content.reconcile("faq", faqBody, CTX, eq);
    expect(content.reconcile("faq", faqBody, CTX, eq)).toBe("unchanged");
  });

  it("terbit lebih miskin -> republished balik ke 7", () => {
    content.saveDraft("faq", { items: [{ q: "x", a: "y", active: true }] }, CTX);
    content.publish("faq", CTX);
    expect(faqPublishedLen()).toBe(1);
    expect(content.reconcile("faq", faqBody, CTX, eq)).toBe("republished");
    expect(faqPublishedLen()).toBe(7);
  });

  it("draf nyangkut walau terbit cocok -> draft-reset (bukan republish)", () => {
    content.reconcile("faq", faqBody, CTX, eq); // terbit = baseline
    content.saveDraft("faq", { items: [] }, CTX); // draf uji nyangkut
    expect(content.getSection("faq").hasUnpublishedDraft).toBe(true);
    expect(content.reconcile("faq", faqBody, CTX, eq)).toBe("draft-reset");
    expect(content.getSection("faq").hasUnpublishedDraft).toBe(false);
    expect(faqPublishedLen()).toBe(7);
  });
});
