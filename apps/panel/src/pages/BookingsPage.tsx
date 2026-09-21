import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BOOKING_STATUSES, formatRupiah } from "@nena/shared";
import { ApiError, bookingsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function BookingsPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["bookings", status, search],
    queryFn: () => bookingsApi.list({ ...(status ? { status } : {}), ...(search ? { search } : {}), pageSize: "50" }),
    enabled: has("booking:read"),
  });
  const detail = useQuery({ queryKey: ["booking", sel], queryFn: () => bookingsApi.detail(sel!), enabled: !!sel });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["booking", sel] }); };
  const run = <T,>(p: Promise<T>) => p.then(() => { setErr(null); refresh(); }).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal."));

  if (!has("booking:read")) return <NoAccess />;

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Booking</h2>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <button onClick={() => setStatus("")} className={`rounded px-2 py-1 text-xs font-semibold ${status === "" ? "bg-laut text-white" : "bg-slate-100"}`}>Semua</button>
        {BOOKING_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded px-2 py-1 text-xs font-semibold ${status === s ? "bg-laut text-white" : "bg-slate-100"}`}>{s}</button>
        ))}
        <input className="ml-auto rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Cari kode/nama/HP" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat booking." onRetry={() => q.refetch()} />
        : (q.data?.items.length ?? 0) === 0 ? <EmptyState title="Tidak ada booking." hint="Coba ubah filter/pencarian." />
        : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Kode</th><th className="px-4 py-2">Pemesan</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Hold</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {q.data!.items.map((b) => {
                const hold = b.holdExpiresAt ? new Date(String(b.holdExpiresAt)).getTime() - Date.now() : null;
                return (
                  <tr key={String(b.id)} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-mono">{String(b.code)}</td>
                    <td className="px-4 py-2">{String(b.customerName)}</td>
                    <td className="px-4 py-2">{String(b.status)} <span className="text-xs text-slate-400">{String(b.source)}</span></td>
                    <td className="px-4 py-2">{formatRupiah(Number(b.total))}</td>
                    <td className="px-4 py-2">{hold != null && hold > 0 && hold < 15 * 60_000 ? <span className="rounded bg-amber-100 px-1.5 text-xs font-bold text-amber-700">hampir kedaluwarsa</span> : "-"}</td>
                    <td className="px-4 py-2"><button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setSel(String(b.id))}>Detail</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sel && detail.data && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-700">Detail {String(detail.data.booking.code)}</h3>
          <p className="text-sm text-slate-500">Status: {String(detail.data.booking.status)} · {formatRupiah(Number(detail.data.booking.total))}</p>
          {has("booking:write") && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => run(bookingsApi.sendInvoice(sel))}>Kirim tagihan</button>
              <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => run(bookingsApi.transition(sel, "approve_dp"))}>Setujui DP</button>
              <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => run(bookingsApi.transition(sel, "approve_full"))}>Setujui lunas</button>
              <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => run(bookingsApi.reissueVoucher(sel))}>Terbitkan ulang voucher</button>
            </div>
          )}
          {has("booking:cancel") && (
            <button className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => { const r = prompt("Alasan batal:"); if (r) run(bookingsApi.cancel(sel, r)); }}>Batalkan</button>
          )}
        </div>
      )}
    </section>
  );
}
