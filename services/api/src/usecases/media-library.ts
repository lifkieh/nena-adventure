import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ulid } from "ulid";
import { AppError } from "../lib/errors.js";
import { repoRoot } from "../db/paths.js";
import { detectType } from "../lib/upload.js";
import * as mediaRepo from "../repos/media.repo.js";
import * as contentRepo from "../repos/content.repo.js";
import { record, type ActorContext } from "./audit.js";

// Storage PUBLIK (CMS) — TERPISAH dari data/uploads (bukti bayar, privat).
const PUBLIC_DIR = resolve(repoRoot, "apps/site/media");

/** Dimensi PNG dari header IHDR (jpg/pdf -> null). */
function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function uploadImage(input: {
  buffer: Buffer;
  alt: string;
  ctx: ActorContext;
}) {
  if (!input.alt || !input.alt.trim()) {
    throw AppError.validation("Teks alt wajib diisi.");
  }
  if (input.buffer.length > 5 * 1024 * 1024) {
    throw AppError.validation("Ukuran file melebihi 5MB.");
  }
  const detected = detectType(input.buffer);
  if (!detected || detected.ext === "pdf") {
    throw AppError.validation("File harus gambar JPG atau PNG yang valid.");
  }
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const filename = ulid() + "." + detected.ext;
  const path = resolve(PUBLIC_DIR, filename);
  writeFileSync(path, input.buffer);
  const dim = pngDimensions(input.buffer);
  const row = mediaRepo.insert({
    filename,
    mime: detected.mime,
    size: input.buffer.length,
    path,
    scope: "public",
    alt: input.alt.trim(),
    width: dim?.width ?? null,
    height: dim?.height ?? null,
    sha256: createHash("sha256").update(input.buffer).digest("hex"),
    uploadedBy: input.ctx.userId,
  });
  record(input.ctx, {
    action: "media_uploaded",
    entity: "media",
    entityId: row.id,
    data: { filename, scope: "public" },
  });
  return toDto(row);
}

function toDto(m: mediaRepo.MediaRow) {
  return {
    id: m.id,
    url: `/media/${m.filename}`,
    alt: m.alt,
    width: m.width,
    height: m.height,
    mime: m.mime,
    size: m.size,
    createdAt: m.createdAt,
  };
}

export function listLibrary() {
  return mediaRepo.listPublic().map(toDto);
}

/** Hapus media dengan PENJAGA PEMAKAIAN: tolak bila URL-nya dipakai di konten. */
export function removeImage(id: string, ctx: ActorContext) {
  const m = mediaRepo.findById(id);
  if (!m) throw AppError.notFound("Media tidak ditemukan.");
  const url = `/media/${m.filename}`;
  const used = contentRepo.sectionsReferencing(url); // hanya versi AKTIF (draft+published)
  if (used.length > 0) {
    throw AppError.conflict(`Masih dipakai di section ${used.join(", ")}. Lepas dari section itu dulu sebelum menghapus.`);
  }
  mediaRepo.remove(id);
  record(ctx, { action: "media_deleted", entity: "media", entityId: id, data: { filename: m.filename } });
  return { ok: true };
}
