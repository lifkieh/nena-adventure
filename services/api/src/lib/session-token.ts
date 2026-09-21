import { createHash, randomBytes } from "node:crypto";

/** Token sesi mentah (dikirim ke klien via cookie): 32 byte acak, base64url. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Yang DISIMPAN di DB hanya hash SHA-256 dari token (bukan token mentah). */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const SESSION_COOKIE = "nena_session";
