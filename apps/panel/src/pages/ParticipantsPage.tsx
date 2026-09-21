import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, bookingsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function ParticipantsPage() {
  const { has } = usePermissions();
  const [selected, setSelected] = useState<string | null>(null);
  const [pii, setPii] = useState<{ name: string; idNumber: string | null }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const listQ = useQuery({ queryKey: ["bookings", "participants", search], queryFn: () => bookingsApi.list({ pageSize: "50", ...(search ? { search } : {}) }), enabled: has("booking:read") });
  const detailQ = useQuery({ queryKey: ["booking", selected], queryFn: () => bookingsApi.detail(selected!), enabled: !!selected });

  if (!has("booking:read")) return <NoAccess />;

  async function openPii(id: string) {
    setErr(null); setPii(null);
    try {
      const r = await bookingsApi.pii(id);
      setPii(r.participants);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal membuka data."); }
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Data peserta</h2>
      <p className="mt-1 text-sm text-slate-500">NIK ter-mask secara default. Buka data utuh butuh izin & tercatat di audit.</p>
      <input className="mt-3 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Cari kode/nama/HP" value={search} onChange={(e) => setSearch(e.target.value)} />

      {listQ.isLoading ? <Loading /> : listQ.isError ? <ErrorState message="Tidak bisa memuat booking." onRetry={() => listQ.refetch()} />
        : (listQ.data?.items.length ?? 0) === 0 ? <EmptyState title="Belum ada booking." hint="Peserta muncul setelah ada booking." />
        : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Kode</th><th className="px-4 py-2">Pemesan</th><th className="px-4 py-2">Pax</th><th className="px-4 py-2">Aksi</th></tr>
            </thead>
            <tbody>
              {listQ.data!.items.map((b) => (
                <tr key={String(b.id)} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-mono">{String(b.code)}</td>
                  <td className="px-4 py-2">{String(b.customerName)}</td>
                  <td className="px-4 py-2">{String(b.pax)}</td>
                  <td className="px-4 py-2">
                    <button data-testid="lihat-peserta" onClick={() => { setSelected(String(b.id)); setPii(null); }} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold">Lihat peserta</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-700">Peserta</h3>
          {detailQ.isLoading ? <Loading /> : (
            <ul className="mt-2 text-sm">
              {(detailQ.data?.participants as { name: string; idNumberLast4: string | null }[] | undefined)?.map((p, i) => (
                <li key={i} className="border-b border-slate-100 py-1">
                  {p.name} — NIK: {pii ? (pii[i]?.idNumber ?? "-") : `••••${p.idNumberLast4 ?? ""}`}
                </li>
              ))}
            </ul>
          )}
          {has("participant:read_pii") ? (
            <button data-testid="buka-nik" onClick={() => openPii(selected)} className="mt-3 rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white">Buka NIK utuh</button>
          ) : (
            <p data-testid="pii-locked" className="mt-3 text-xs text-slate-400">NIK utuh tidak dapat dibuka oleh role Anda.</p>
          )}
          {has("participant:export") && (
            <a data-testid="export-zurich" href="/api/admin/exports/zurich?date=2099-01-01" className="ml-3 mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Export Zurich</a>
          )}
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>
      )}
    </section>
  );
}
