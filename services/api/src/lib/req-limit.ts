/**
 * Rate limiter permintaan generik (in-memory, fixed window per kunci).
 * Untuk endpoint publik (POST). Multi-instance nanti pindah ke store bersama.
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function hit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): { limited: boolean; retryAfterSeconds: number } {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }
  b.count += 1;
  if (b.count > max) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function _clearAll(): void {
  buckets.clear();
}
