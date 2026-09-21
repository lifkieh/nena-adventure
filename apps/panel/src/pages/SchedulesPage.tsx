import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, schedulesApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function SchedulesPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", capacity: 24, threshold: 6, status: "terbit" });
  const [gen, setGen] = useState({ from: "", to: "", capacity: 24 });

  const q = useQuery({ queryKey: ["schedules"], queryFn: () => schedulesApi.list(), enabled: has("schedule:read") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["schedules"] });
  const run = <T,>(p: Promise<T>) => p.then(refresh).catch((e) => setErr(e instanceof ApiError ? e.message : "Terjadi kesalahan."));

  const create = useMutation({
    mutationFn: () => schedulesApi.create(form),
    onSuccess: () => { setErr(null); refresh(); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Gagal."),
  });

  if (!has("schedule:read")) return <NoAccess />;
  const canWrite = has("schedule:write");

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Jadwal</h2>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}

      {canWrite && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-600">Tambah jadwal</h3>
            <input type="date" required className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <div className="mb-2 flex gap-2">
              <input type="number" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} placeholder="Kapasitas" />
              <input type="number" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: +e.target.value })} placeholder="Threshold" />
              <select className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">draft</option><option value="terbit">terbit</option><option value="tutup">tutup</option><option value="arsip">arsip</option>
              </select>
            </div>
            <button className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white">Tambah</button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); run(schedulesApi.genCommit({ from: gen.from, to: gen.to, weekdays: [0, 6], capacity: gen.capacity, threshold: 6, status: "terbit" })); }} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-600">Generator akhir pekan (idempoten)</h3>
            <div className="mb-2 flex gap-2">
              <input type="date" required className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} />
              <input type="date" required className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} />
            </div>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Generate Sabtu–Minggu</button>
          </form>
        </div>
      )}

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat jadwal." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada jadwal." hint="Tambah manual atau pakai generator." />
        : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Terisi/Kapasitas</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Aksi</th></tr>
            </thead>
            <tbody>
              {q.data!.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{formatJakarta(s.date + "T00:00:00Z", { dateStyle: "medium" })}</td>
                  <td className="px-4 py-2">{s.used}/{s.capacity} {s.belowThreshold && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-bold text-amber-700">di bawah threshold</span>}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2">
                    {canWrite && (
                      <div className="flex gap-1">
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => run(schedulesApi.setStatus(s.id, s.status === "terbit" ? "tutup" : "terbit"))}>{s.status === "terbit" ? "Tutup" : "Buka"}</button>
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600" onClick={() => { if (confirm("Hapus jadwal ini?")) run(schedulesApi.remove(s.id)); }}>Hapus</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
