const JKT = "Asia/Jakarta";

/** Tanggal hari ini di zona Asia/Jakarta sebagai 'YYYY-MM-DD'. */
export function todayJakarta(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JKT }).format(now);
}

/** ISO UTC untuk tengah malam tanggal (YYYY-MM-DD) + offset hari. */
export function dateAtOffset(dateYmd: string, offsetDays: number): string {
  const base = Date.parse(dateYmd + "T00:00:00Z");
  return new Date(base + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}
