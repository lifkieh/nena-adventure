import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { media } from "../db/schema.js";

export type MediaRow = typeof media.$inferSelect;

export function insert(input: {
  filename: string;
  mime: string;
  size: number;
  path: string;
  scope?: "private" | "public";
  alt?: string | null;
  width?: number | null;
  height?: number | null;
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
      scope: input.scope ?? "private",
      alt: input.alt ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      sha256: input.sha256 ?? null,
      uploadedBy: input.uploadedBy ?? null,
    })
    .returning()
    .get();
}

export function findById(id: string): MediaRow | undefined {
  return db.select().from(media).where(eq(media.id, id)).get();
}

export function remove(id: string): void {
  db.delete(media).where(eq(media.id, id)).run();
}

export function listPublic(): MediaRow[] {
  return db
    .select()
    .from(media)
    .where(eq(media.scope, "public"))
    .orderBy(desc(media.createdAt))
    .all();
}
