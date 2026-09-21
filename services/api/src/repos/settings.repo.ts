import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { settings } from "../db/schema.js";

/** Ambil nilai setting (JSON-parsed) atau fallback. */
export function getSetting<T>(key: string, fallback: T): T {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row || row.value == null) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  const json = JSON.stringify(value);
  db.insert(settings)
    .values({ key, value: json, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: json, updatedAt: new Date().toISOString() },
    })
    .run();
}

/** Timeout sesi dari settings (detik). */
export function sessionTimeouts(): { idleSeconds: number; absoluteSeconds: number } {
  return {
    idleSeconds: getSetting<number>("session.idle_seconds", 8 * 60 * 60),
    absoluteSeconds: getSetting<number>(
      "session.absolute_seconds",
      7 * 24 * 60 * 60,
    ),
  };
}
