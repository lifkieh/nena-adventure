import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/* ────────────────────────────────────────────────────────────
 * Password hashing — scrypt (node:crypto, tanpa dependency native baru).
 *
 * Parameter default (bisa dinaikkan tanpa memecah hash lama karena parameter
 * disimpan DI DALAM string hash):
 *   N (cost)     = 2^15 = 32768
 *   r (blocksize)= 8
 *   p (parallel) = 1
 *   keylen       = 64 byte
 *   salt         = 16 byte acak
 *
 * Format tersimpan: scrypt$N$r$p$<salt-hex>$<hash-hex>
 *
 * Cara menaikkan cost nanti: ubah SCRYPT_PARAMS di bawah (mis. N=2^16). Hash
 * lama tetap terverifikasi karena verify membaca N/r/p dari string. Untuk
 * rehash otomatis, panggil needsRehash() saat login sukses lalu simpan ulang.
 * ──────────────────────────────────────────────────────────── */

const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, keylen: 64, saltBytes: 16 };
// maxmem harus cukup untuk 128*N*r byte + overhead.
const MAXMEM = 256 * SCRYPT_PARAMS.N * SCRYPT_PARAMS.r;

export function hashPassword(plain: string): string {
  const { N, r, p, keylen, saltBytes } = SCRYPT_PARAMS;
  const salt = randomBytes(saltBytes);
  const key = scryptSync(plain, salt, keylen, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  const salt = Buffer.from(parts[4] ?? "", "hex");
  const expected = Buffer.from(parts[5] ?? "", "hex");
  if (expected.length === 0) return false;
  const actual = scryptSync(plain, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 256 * N * r,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True jika hash memakai parameter lebih lemah dari default sekarang. */
export function needsRehash(stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return Number(parts[1]) < SCRYPT_PARAMS.N;
}

/**
 * Hash dummy dengan biaya setara — dipakai saat email tidak ditemukan supaya
 * waktu respons login seragam (mitigasi user enumeration lewat timing).
 */
const DUMMY_HASH = hashPassword("dummy-password-for-timing-equalization");
export function dummyVerify(plain: string): void {
  verifyPassword(plain, DUMMY_HASH);
}
