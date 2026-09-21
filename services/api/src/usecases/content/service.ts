import type { ContentSectionDto } from "@nena/shared";
import { AppError } from "../../lib/errors.js";
import * as repo from "../../repos/content.repo.js";
import { record, type ActorContext } from "../audit.js";

function parse(id: string | null): unknown {
  if (!id) return null;
  const v = repo.versionById(id);
  return v ? JSON.parse(v.body) : null;
}

export function listSections(): ContentSectionDto[] {
  return repo.listSections().map((s) => ({
    id: s.id,
    key: s.key,
    title: s.title,
    hasDraft: !!s.draftVersionId,
    hasPublished: !!s.publishedVersionId,
    updatedAt: s.updatedAt,
  }));
}

export function getSectionSafe(key: string) {
  const s = repo.findByKey(key);
  if (!s) return null;
  return {
    key: s.key,
    title: s.title,
    draft: parse(s.draftVersionId),
    published: parse(s.publishedVersionId),
  };
}

export function getSection(key: string) {
  const s = repo.findByKey(key);
  if (!s) throw AppError.notFound("Section tidak ditemukan.");
  const pubVer = s.publishedVersionId ? repo.versionById(s.publishedVersionId) : undefined;
  return {
    key: s.key,
    title: s.title,
    draft: parse(s.draftVersionId),
    published: parse(s.publishedVersionId),
    publishedAt: pubVer?.createdAt ?? null,
    hasUnpublishedDraft:
      !!s.draftVersionId && s.draftVersionId !== s.publishedVersionId,
  };
}

/** Ambil peta konten TERBIT (untuk situs publik). */
export function publicContent(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of repo.listSections()) {
    if (s.publishedVersionId) out[s.key] = parse(s.publishedVersionId);
  }
  return out;
}

export function saveDraft(key: string, body: unknown, ctx: ActorContext) {
  let s = repo.findByKey(key);
  if (!s) s = repo.createSection(key, key);
  const v = repo.addVersion({ sectionId: s.id, body, createdBy: ctx.userId });
  repo.setPointers(s.id, { draftVersionId: v.id });
  record(ctx, { action: "content_draft_saved", entity: "content", entityId: key });
  return getSection(key);
}

export function publish(key: string, ctx: ActorContext) {
  const s = repo.findByKey(key);
  if (!s) throw AppError.notFound("Section tidak ditemukan.");
  if (!s.draftVersionId) throw AppError.validation("Tidak ada draft untuk diterbitkan.");
  repo.setPointers(s.id, { publishedVersionId: s.draftVersionId });
  record(ctx, {
    action: "content_published",
    entity: "content",
    entityId: key,
    data: { versionId: s.draftVersionId },
  });
  return getSection(key);
}

/** Kembalikan publish ke versi TERBIT sebelumnya. */
export function revert(key: string, ctx: ActorContext) {
  const s = repo.findByKey(key);
  if (!s || !s.publishedVersionId) {
    throw AppError.validation("Belum ada versi terbit untuk dikembalikan.");
  }
  const versions = repo.versionsForSection(s.id);
  const idx = versions.findIndex((v) => v.id === s.publishedVersionId);
  const prev = versions[idx + 1]; // versi lebih lama
  if (!prev) throw AppError.validation("Tidak ada versi sebelumnya.");
  repo.setPointers(s.id, { publishedVersionId: prev.id });
  record(ctx, {
    action: "content_reverted",
    entity: "content",
    entityId: key,
    before: { versionId: s.publishedVersionId },
    after: { versionId: prev.id },
  });
  return getSection(key);
}
