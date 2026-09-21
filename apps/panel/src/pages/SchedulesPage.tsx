import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, schedulesApi, type ScheduleDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { ScheduleStatus } from "../components/StatusPill";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

const PKGS = ["reguler", "premium", "private"];

/** "YYYY-MM-DD" -> "26 September 2026" (tampilan Indonesia). */
function idDate(iso: string): string {
  return formatJakarta(iso + "T00:00:00Z", { day: "numeric", month: "long", year: "numeric" });
}
/** Selisih bulan antar kunci "YYYY-MM". */
function monthDiff(from: string, to: string): number {
  const [ay, am] = from.split("-").map(Number) as [number, number];
  const [by, bm] = to.split("-").map(Number) as [number, number];
  return (by - ay) * 12 + (bm - am);
}
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to), label: formatJakarta(iso(from) + "T00:00:00Z", { month: "long", year: "numeric" }) };
}

export function SchedulesPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState<ScheduleDto | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState({ from: "", to: "" });
  const [preview, setPreview] = useState<{ date: string; exists: boolean }[] | null>(null);
  const [form, setForm] = useState({ date: "", capacity: 24, threshold: 6, status: "terbit" });

  const [navigated, setNavigated] = useState(false);
  const range = monthRange(offset);
  const q = useQuery({ queryKey: ["schedules", range.from], queryFn: () => schedulesApi.list({ monthFrom: range.from, monthTo: range.to }), enabled: has("schedule:read") });
  // Semua jadwal (sekali) untuk memilih bulan default: bulan berjalan kalau ada
  // jadwalnya, kalau tidak lompat ke bulan pertama yang punya jadwal.
  const allQ = useQuery({ queryKey: ["schedules", "all"], queryFn: () => schedulesApi.list(), enabled: has("schedule:read") });
  useEffect(() => {
    if (navigated || !allQ.data || allQ.data.length === 0) return;
    const cur = currentMonthKey();
    const months = allQ.data.map((s) => s.date.slice(0, 7));
    if (months.includes(cur)) return; // bulan berjalan sudah ada jadwal
    const future = months.filter((m) => m >= cur).sort();
    const target = future[0] ?? months.slice().sort()[0];
    if (target) setOffset(monthDiff(cur, target));
  }, [allQ.data, navigated]);
  const goMonth = (delta: number) => { setNavigated(true); setOffset(offset + delta); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["schedules"] });
  const run = <T,>(p: Promise<T>) => p.then(() => { setErr(null); refresh(); }).catch((e) => setErr(e instanceof ApiError ? e.message : "Terjadi kesalahan."));

  if (!has("schedule:read")) return <NoAccess />;
  const canWrite = has("schedule:write");

  const byDate = new Map((q.data ?? []).map((s) => [s.date, s]));

  async function del(s: ScheduleDto) {
    const r = await confirm({ title: "Hapus jadwal?", danger: true, confirmLabel: "Hapus",
      body: <>Tanggal <b>{idDate(s.date)}</b> ({s.used}/{s.capacity} kursi) akan dihapus permanen.</> });
    if (r.confirmed) run(schedulesApi.remove(s.id));
  }
  async function save() {
    if (!edit) return;
    try {
      await schedulesApi.update(edit.id, {
        date: edit.date, capacity: edit.capacity, threshold: edit.threshold, status: edit.status,
        publicNote: edit.publicNote, closedReason: edit.closedReason, availablePackages: edit.availablePackages ?? undefined,
      });
      setEdit(null); setErr(null); refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal simpan."); }
  }

  // Kalender bulanan (grid mulai Minggu).
  const first = new Date(range.from + "T00:00:00Z");
  const startDow = first.getUTCDay();
  const daysInMonth = new Date(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(range.from.slice(0, 8) + String(d).padStart(2, "0"));

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Jadwal</h2>
      {err && <div data-testid="sched-error" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}

      <div className="mt-3 flex items-center gap-3">
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => goMonth(-1)}>‹</button>
        <b>{range.label}</b>
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => goMonth(1)}>›</button>
        {canWrite && sel.size > 0 && (
          <div className="ml-auto flex gap-2">
            <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white" onClick={() => { run(schedulesApi.list().then(() => Promise.all([...sel].map((id) => schedulesApi.setStatus(id, "terbit"))))); setSel(new Set()); }}>Buka {sel.size}</button>
            <button className="rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white" onClick={() => { run(Promise.all([...sel].map((id) => schedulesApi.setStatus(id, "tutup")))); setSel(new Set()); }}>Tutup {sel.size}</button>
          </div>
        )}
      </div>

      {/* Kalender bulanan */}
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat jadwal." onRetry={() => q.refetch()} /> : (
        <div className="mt-3 grid grid-cols-7 gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => <div key={d} className="p-1 text-center font-bold text-slate-400">{d}</div>)}
          {cells.map((date, i) => {
            const s = date ? byDate.get(date) : undefined;
            return (
              <div key={i} className={`min-h-[56px] rounded-lg border p-1 ${s ? "border-slate-200" : "border-transparent"}`}>
                {date && <div className="text-right text-slate-400">{+date.slice(8)}</div>}
                {s && (
                  <button data-testid={`cal-${s.date}`} onClick={() => canWrite && setEdit(s)} className="mt-0.5 block w-full text-left">
                    <div className="font-bold">{s.used}/{s.capacity}</div>
                    <ScheduleStatus status={s.status} />
                    {s.belowThreshold && <div className="text-[10px] font-bold text-amber-600">≤threshold</div>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabel + pilih massal */}
      {(q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada jadwal di bulan ini." hint="Tambah manual atau pakai generator." /> : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500"><tr><th className="px-3 py-2"></th><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Terisi</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Aksi</th></tr></thead>
            <tbody>
              {q.data!.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{canWrite && <input type="checkbox" checked={sel.has(s.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(s.id) : n.delete(s.id); setSel(n); }} />}</td>
                  <td className="px-3 py-2">{idDate(s.date)}</td>
                  <td className="px-3 py-2">{s.used}/{s.capacity} {s.belowThreshold && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-bold text-amber-700">≤threshold</span>}</td>
                  <td className="px-3 py-2"><ScheduleStatus status={s.status} /></td>
                  <td className="px-3 py-2">{canWrite && <div className="flex gap-1"><button data-testid={`edit-${s.date}`} className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setEdit(s)}>Ubah</button><button data-testid={`del-${s.date}`} className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600" onClick={() => del(s)}>Hapus</button></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <form onSubmit={(e) => { e.preventDefault(); run(schedulesApi.create(form)); }} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-600">Tambah jadwal</h3>
            <input type="date" required className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <div className="flex gap-2"><input type="number" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /><input type="number" className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: +e.target.value })} /><button className="rounded-lg bg-laut px-4 py-1.5 text-sm font-bold text-white">Tambah</button></div>
          </form>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-600">Generator akhir pekan</h3>
            <div className="mb-2 flex gap-2">
              <input type="date" className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} />
              <input type="date" className="rounded border border-slate-300 px-2 py-1.5 text-sm" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} />
              <button data-testid="gen-preview" className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold" onClick={async () => { const r = await schedulesApi.genPreview({ from: gen.from, to: gen.to, weekdays: [0, 6], capacity: 24, threshold: 6, status: "terbit" }); setPreview(r.items); }}>Preview</button>
            </div>
            {preview && (
              <div>
                <p className="text-xs text-slate-500">{preview.length} tanggal ({preview.filter((p) => p.exists).length} sudah ada, {preview.filter((p) => !p.exists).length} baru)</p>
                <button data-testid="gen-commit" className="mt-2 rounded-lg bg-laut px-4 py-1.5 text-sm font-bold text-white" onClick={() => { run(schedulesApi.genCommit({ from: gen.from, to: gen.to, weekdays: [0, 6], capacity: 24, threshold: 6, status: "terbit" })); setPreview(null); }}>Commit {preview.filter((p) => !p.exists).length} baru</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal edit */}
      {edit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold">Ubah jadwal {idDate(edit.date)}</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <label>Kapasitas <input type="number" data-testid="edit-capacity" className="ml-2 w-24 rounded border border-slate-300 px-2 py-1" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: +e.target.value })} /></label>
              <label>Threshold <input type="number" className="ml-2 w-24 rounded border border-slate-300 px-2 py-1" value={edit.threshold} onChange={(e) => setEdit({ ...edit, threshold: +e.target.value })} /></label>
              <label>Status <select className="ml-2 rounded border border-slate-300 px-2 py-1" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="draft">Draf</option><option value="terbit">Terbit</option><option value="tutup">Ditutup</option><option value="arsip">Arsip</option></select></label>
              <label>Catatan publik <input className="ml-2 rounded border border-slate-300 px-2 py-1" value={edit.publicNote ?? ""} onChange={(e) => setEdit({ ...edit, publicNote: e.target.value })} /></label>
              <label>Alasan tutup <input className="ml-2 rounded border border-slate-300 px-2 py-1" value={edit.closedReason ?? ""} onChange={(e) => setEdit({ ...edit, closedReason: e.target.value })} /></label>
              <div>Paket tersedia: {PKGS.map((p) => (
                <label key={p} className="ml-2"><input type="checkbox" checked={(edit.availablePackages ?? PKGS).includes(p)} onChange={(e) => { const cur = new Set(edit.availablePackages ?? PKGS); e.target.checked ? cur.add(p) : cur.delete(p); setEdit({ ...edit, availablePackages: [...cur] }); }} /> {p}</label>
              ))}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setEdit(null)}>Batal</button>
              <button data-testid="edit-save" className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white" onClick={save}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
