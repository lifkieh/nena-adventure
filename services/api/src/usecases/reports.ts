import * as reportsRepo from "../repos/reports.repo.js";

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
