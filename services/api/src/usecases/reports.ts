import * as reportsRepo from "../repos/reports.repo.js";

const WIB_MS = 7 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Dashboard ringkasan — semua angka dari query, zona Asia/Jakarta.
 * `now` bisa diinjeksi untuk test deterministik.
 */
export function dashboard(now: Date = new Date()) {
  const jk = new Date(now.getTime() + WIB_MS); // baca kalender WIB via getUTC*
  const y = jk.getUTCFullYear();
  const m = jk.getUTCMonth();
  const d = jk.getUTCDate();
  const dateStr = (dt: Date) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  const today = `${y}-${pad(m + 1)}-${pad(d)}`;
  const plus7 = dateStr(new Date(Date.UTC(y, m, d + 7)));
  // Instan UTC dari tengah malam WIB (hari & bulan berjalan).
  const todayStartUtc = new Date(Date.UTC(y, m, d) - WIB_MS).toISOString();
  const monthStartUtc = new Date(Date.UTC(y, m, 1) - WIB_MS).toISOString();

  return {
    bookingsToday: reportsRepo.countBookingsCreatedSince(todayStartUtc),
    awaitingProof: reportsRepo.countBookingsByStatus("verifikasi_bukti"),
    awaitingSettlement: reportsRepo.countBookingsByStatus("menunggu_pelunasan"),
    seatsSoldNext7Days: reportsRepo.seatsSoldBetween(today, plus7),
    verifiedRevenueThisMonth: reportsRepo.verifiedRevenueSince(monthStartUtc),
    nearestNearlyFull: reportsRepo.nearestNearlyFull(today),
    asOf: now.toISOString(),
  };
}

/** Ringkasan laporan untuk rentang tanggal keberangkatan [from, to]. */
export function summary(from: string, to: string) {
  const revenue = reportsRepo.revenueByPackage(from, to);
  const totalRevenue = revenue.reduce((a, r) => a + (r.amount ?? 0), 0);
  const { expired, cancelled } = reportsRepo.statusCounts(from, to);
  const outstanding = reportsRepo.outstandingDp();
  const outstandingTotal = outstanding.reduce((a, r) => a + r.outstanding, 0);
  return {
    range: { from, to },
    revenueByPackage: revenue,
    totalRevenue,
    paxCarried: reportsRepo.paxCarried(from, to),
    expired,
    cancelled,
    outstandingDp: outstanding,
    outstandingDpTotal: outstandingTotal,
  };
}
