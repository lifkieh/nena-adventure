import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../env.js";

/* ────────────────────────────────────────────────────────────
 * Enkripsi PII at-rest — AES-256-GCM.
 * Kunci dari ENCRYPTION_KEY (64 hex = 32 byte). IV acak 12-byte per record,
 * authTag disimpan. Format tersimpan: v1:<ivHex>:<tagHex>:<cipherHex>.
 * ──────────────────────────────────────────────────────────── */

const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");
const ALGO = "aes-256-gcm";

export function encryptPII(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPII(blob: string | null | undefined): string | null {
  if (!blob) return null;
  const parts = blob.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // Bukan format terenkripsi (mis. data legacy) — kembalikan apa adanya.
    return blob;
  }
  try {
    const iv = Buffer.from(parts[1]!, "hex");
    const tag = Buffer.from(parts[2]!, "hex");
    const data = Buffer.from(parts[3]!, "hex");
    const decipher = createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null; // authTag gagal / kunci salah
  }
}
