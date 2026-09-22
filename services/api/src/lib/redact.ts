/**
 * Redaksi field sensitif sebelum masuk audit log.
 * NIK, password hash, token sesi TIDAK BOLEH pernah tersimpan di audit.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "newpassword",
  "currentpassword",
  "idnumber",
  "id_number",
  "nik",
  "email",
  "customeremail",
  "customer_email",
  "token",
  "tokenhash",
  "token_hash",
  "sessiontoken",
]);

export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => redact(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redact(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}

/** Diff before/after dangkal, hanya field yang berubah, sudah diredaksi. */
export function diff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { before: unknown; after: unknown } {
  const b = before ? redact(before) : null;
  const a = after ? redact(after) : null;
  if (!b || !a) return { before: b, after: a };
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    const bv = (b as Record<string, unknown>)[k];
    const av = (a as Record<string, unknown>)[k];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changedBefore[k] = bv;
      changedAfter[k] = av;
    }
  }
  return { before: changedBefore, after: changedAfter };
}
