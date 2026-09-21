/**
 * Rate limiter login sederhana (in-memory, single-instance).
 * 5 kegagalan per 15 menit per kunci (IP + email). Reset saat sukses.
 * Untuk multi-instance nanti pindahkan ke store bersama (mis. SQLite/Redis).
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function keyOf(ip: string, email: string): string {
  return `${ip}|${email.toLowerCase()}`;
}

export function isLimited(
  ip: string,
  email: string,
  now: number = Date.now(),
): { limited: boolean; retryAfterSeconds: number } {
  const b = buckets.get(keyOf(ip, email));
  if (!b || now >= b.resetAt) return { limited: false, retryAfterSeconds: 0 };
  if (b.count >= MAX_FAILURES) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function recordFailure(
  ip: string,
  email: string,
  now: number = Date.now(),
): void {
  const key = keyOf(ip, email);
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    b.count += 1;
  }
}

export function reset(ip: string, email: string): void {
  buckets.delete(keyOf(ip, email));
}

/** Untuk test. */
export function _clearAll(): void {
  buckets.clear();
}
