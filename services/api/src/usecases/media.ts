import { existsSync } from "node:fs";
import { AppError } from "../lib/errors.js";
import * as mediaRepo from "../repos/media.repo.js";

/** Ambil metadata media untuk disajikan (route yang stream file-nya). */
export function getMedia(id: string): {
  path: string;
  mime: string;
  filename: string;
} {
  const m = mediaRepo.findById(id);
  if (!m || !existsSync(m.path)) {
    throw AppError.notFound("Berkas tidak ditemukan.");
  }
  return { path: m.path, mime: m.mime, filename: m.filename };
}
