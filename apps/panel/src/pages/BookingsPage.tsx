import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BOOKING_STATUSES, bookingStatusMeta, formatRupiah } from "@nena/shared";
import { bookingsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { BookingStatus } from "../components/StatusPill";
import { Countdown, holdDeadline, deadlineLabel } from "../components/Countdown";
import { ManualBookingModal } from "../components/ManualBookingModal";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function BookingsPage() {
  const { has } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["bookings", status, search],
    queryFn: () => bookingsApi.list({ ...(status ? { status } : {}), ...(search ? { search } : {}), pageSize: "50" }),
    enabled: has("booking:read"),
  });

  if (!has("booking:read")) return <NoAccess />;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-800">Booking</h2>
        {has("booking:write") && <button className="rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white" onClick={() => setShowAdd(true)}>+ Tambah booking</button>}
      </div>
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {showAdd && <ManualBookingModal onClose={() => setShowAdd(false)} onCreated={(code) => { setShowAdd(false); setMsg(`Booking ${code} dibuat (status Baru masuk).`); qc.invalidateQueries({ queryKey: ["bookings"] }); }} />}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <button onClick={() => setStatus("")} className={`rounded px-2 py-1 text-xs font-semibold ${status === "" ? "bg-laut text-white" : "bg-slate-100"}`}>Semua</button>
        {BOOKING_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded px-2 py-1 text-xs font-semibold ${status === s ? "bg-laut text-white" : "bg-slate-100"}`}>{bookingStatusMeta[s].label}</button>
        ))}
        <input className="ml-auto rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Cari kode/nama/HP" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat booking." onRetry={() => q.refetch()} />
        : (q.data?.items.length ?? 0) === 0 ? <EmptyState title="Tidak ada booking." hint="Coba ubah filter/pencarian." />
        : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Kode</th><th className="px-4 py-2">Pemesan</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Tenggat</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {q.data!.items.map((b) => (
                <tr key={String(b.id)} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">{String(b.code)}</td>
                  <td className="px-4 py-2">{String(b.customerName)}</td>
                  <td className="px-4 py-2"><BookingStatus status={String(b.status)} /></td>
                  <td className="px-4 py-2">{formatRupiah(Number(b.total))}</td>
                  <td className="px-4 py-2">{holdDeadline(b) ? <span className="whitespace-nowrap"><span className="mr-1 text-xs text-slate-400">{deadlineLabel(String(b.status))}</span><Countdown deadline={holdDeadline(b)} /></span> : <span className="text-slate-400">-</span>}</td>
                  <td className="px-4 py-2"><button data-testid={`open-${String(b.code)}`} className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => navigate(`/bookings/${String(b.id)}`)}>Detail</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
