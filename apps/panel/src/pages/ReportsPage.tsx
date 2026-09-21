import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatJakarta, formatRupiah, bookingStatusLabel } from "@nena/shared";
import { reportsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { Loading, ErrorState, NoAccess } from "../components/States";

export function ReportsPage() {
  const { has } = usePermissions();
  const confirm = useConfirm();
  const [msg, setMsg] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["report-tables"], queryFn: reportsApi.tables, enabled: has("report:read") });

  if (!has("report:read")) return <NoAccess />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="Tidak bisa memuat laporan." onRetry={() => q.refetch()} />;
  const d = q.data;

  async function exportCsv() {
    const r = await confirm({ title: "Export CSV?", confirmLabel: "Export", body: <>Unduh laporan sebagai CSV. Aktivitas ini tercatat di audit log.</> });
    if (!r.confirmed) return;
    // Navigasi langsung memicu unduhan (endpoint set content-disposition + catat audit).
    window.location.href = "/api/admin/reports/export.csv";
    setMsg("Export dimulai — cek unduhan browser. Tercatat di audit log.");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-800">Laporan</h2>
        <button data-testid="export-csv" className="rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white" onClick={exportCsv}>Export CSV</button>
      </div>
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

      {/* Anomali data: booking "selesai" tapi ledger < total (bukan sisa tagihan biasa). */}
      {d.underpaidCompleted.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-bold text-amber-800">⚠ Anomali: booking "selesai" tapi pembayaran kurang</h3>
          <p className="mb-2 text-xs text-amber-700">Ledger (SUM pembayaran verified) lebih kecil dari total. Perlu ditinjau — ini bukan sisa tagihan di detail booking.</p>
          <table className="w-full text-sm">
            <thead className="text-left text-amber-700"><tr><th className="py-1">Kode</th><th className="py-1">Pemesan</th><th className="py-1">Tanggal</th><th className="py-1 text-right">Ledger / Total</th><th className="py-1 text-right">Kurang</th></tr></thead>
            <tbody>
              {d.underpaidCompleted.map((r) => (
                <tr key={r.code} className="border-b border-amber-200">
                  <td className="py-1 font-mono">{r.code}</td>
                  <td className="py-1">{r.customerName}</td>
                  <td className="py-1">{formatJakarta(r.scheduleDate + "T00:00:00Z", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="py-1 text-right">{formatRupiah(r.ledger)} / {formatRupiah(r.total)}</td>
                  <td className="py-1 text-right font-bold text-amber-800">{formatRupiah(r.shortfall)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-600">Pendapatan bersih per bulan (ledger, refund negatif)</h3>
        {d.monthlyRevenue.length === 0 ? <p className="text-sm text-slate-400">Belum ada pendapatan.</p> : (
          <table className="w-full text-sm"><tbody>
            {d.monthlyRevenue.map((r) => <tr key={r.month} className="border-b border-slate-100"><td className="py-1">{r.month}</td><td className="py-1 text-right font-bold">{formatRupiah(r.amount)}</td></tr>)}
          </tbody></table>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-600">Booking per status</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {d.bookingsByStatus.map((r) => <span key={r.status} className="rounded bg-slate-100 px-2 py-1">{bookingStatusLabel(r.status)}: <b>{r.count}</b></span>)}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-600">Kursi terjual per jadwal (mendatang)</h3>
        {d.seatsPerSchedule.length === 0 ? <p className="text-sm text-slate-400">Tidak ada jadwal mendatang.</p> : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm"><tbody>
              {d.seatsPerSchedule.map((r) => <tr key={r.date} className="border-b border-slate-100"><td className="py-1">{formatJakarta(r.date + "T00:00:00Z", { day: "numeric", month: "long", year: "numeric" })}</td><td className="py-1 text-right">{r.sold}/{r.capacity}</td></tr>)}
            </tbody></table>
          </div>
        )}
      </div>
    </section>
  );
}
