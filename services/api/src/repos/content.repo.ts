import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { contentSections, contentVersions } from "../db/schema.js";

export type SectionRow = typeof contentSections.$inferSelect;
export type VersionRow = typeof contentVersions.$inferSelect;

export function listSections(): SectionRow[] {
  return db.select().from(contentSections).all();
}
export function findByKey(key: string): SectionRow | undefined {
  return db.select().from(contentSections).where(eq(contentSections.key, key)).get();
}
export function createSection(key: string, title: string): SectionRow {
  return db.insert(contentSections).values({ key, title }).returning().get();
}
export function versionById(id: string): VersionRow | undefined {
  return db.select().from(contentVersions).where(eq(contentVersions.id, id)).get();
}
/**
 * Judul section yang versi AKTIF-nya (draft ATAU published, BUKAN riwayat) memuat
 * teks `needle`. Dipakai penjaga pemakaian media — setelah referensi dilepas,
 * hapus harus berhasil (versi lama tidak lagi mengunci).
 */
export function sectionsReferencing(needle: string): string[] {
  const out: string[] = [];
  for (const s of db.select().from(contentSections).all()) {
    const ids = [s.draftVersionId, s.publishedVersionId].filter(Boolean) as string[];
    for (const id of ids) {
      const v = db.select().from(contentVersions).where(eq(contentVersions.id, id)).get();
      if (v && v.body.includes(needle)) { out.push(s.title); break; }
    }
  }
  return out;
}
export function versionsForSection(sectionId: string): VersionRow[] {
  return db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.sectionId, sectionId))
    .orderBy(desc(contentVersions.createdAt))
    .all();
}
export function addVersion(input: {
  sectionId: string;
  body: unknown;
  createdBy: string | null;
  note?: string | null;
}): VersionRow {
  return db
    .insert(contentVersions)
    .values({
      sectionId: input.sectionId,
      body: JSON.stringify(input.body),
      createdBy: input.createdBy,
      note: input.note ?? null,
    })
    .returning()
    .get();
}
export function setPointers(
  sectionId: string,
  patch: { draftVersionId?: string | null; publishedVersionId?: string | null },
): SectionRow {
  return db
    .update(contentSections)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(contentSections.id, sectionId))
    .returning()
    .get();
}
