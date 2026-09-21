import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { media } from "../db/schema.js";

export type MediaRow = typeof media.$inferSelect;

export function insert(input: {
  filename: string;
  mime: string;
  size: number;
  path: string;
  sha256?: string | null;
  uploadedBy?: string | null;
}): MediaRow {
  return db
    .insert(media)
    .values({
      filename: input.filename,
      mime: input.mime,
      size: input.size,
      path: input.path,
      sha256: input.sha256 ?? null,
      uploadedBy: input.uploadedBy ?? null,
    })
    .returning()
    .get();
}

export function findById(id: string): MediaRow | undefined {
  return db.select().from(media).where(eq(media.id, id)).get();
}
