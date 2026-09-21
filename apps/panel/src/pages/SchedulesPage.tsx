import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta, monthGrid, monthRangeFor, pickScheduleMonthOffset } from "@nena/shared";
import { ApiError, schedulesApi, type ScheduleDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { ScheduleStatus } from "../components/StatusPill";
import { ScheduleRosterModal } from "../components/ScheduleRosterModal";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

const PKGS = ["reguler", "premium", "private"];

/** "YYYY-MM-DD" -> "26 September 2026". */
function idDate(iso: string): string {
  return formatJakarta(iso + "T00:00:00Z", { day: "numeric", month: "long", year: "numeric" });
}
/** "YYYY-MM-DD" -> "Sabtu, 26 Sep 2026" (dengan nama hari). */
function dayDate(iso: string): string {
  return formatJakarta(iso + "T00:00:00Z", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthRange(offset: number) {
  const r = monthRangeFor(new Date(), offset);
  const label = formatJakarta(`${r.from.slice(0, 8)}15T00:00:00Z`, { month: "long", year: "numeric" });
  return { from: r.from, to: r.to, label };
}

export function SchedulesPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState<ScheduleDto | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [gen, setGen] = useState({ from: "", to: "" });
  const [preview, setPreview] = useState<{ date: string; exists: boolean }[] | null>(null);
  const [form, setForm] = useState({ date: "", capacity: 24, threshold: 6, status: "terbit" });
  const [showCal, setShowCal] = useState(false); // #5: kalender default tertutup
  const [addOpen, setAddOpen] = useState(false); // modal "Tambah jadwal"
  const [addTab, setAddTab] = useState<"single" | "bulk">("single");
  const [rosterFor, setRosterFor] = useState<ScheduleDto | null>(null); // #4 modal peserta

  const [navigated, setNavigated] = useState(false);
  const range = monthRange(offset);
  const q = useQuery({ queryKey: ["schedules", range.from], queryFn: () => schedulesApi.list({ monthFrom: range.from, monthTo: range.to }), enabled: has("schedule:read") });
  const allQ = useQuery({ queryKey: ["schedules", "all"], queryFn: () => schedulesApi.list(), enabled: has("schedule:read") });
  useEffect(() => {
    if (navigated || !allQ.data || allQ.data.length === 0) return;
    const months = allQ.data.map((s) => s.date.slice(0, 7));
    setOffset(pickScheduleMonthOffset(months, currentMonthKey()));
  }, [allQ.data, navigated]);
  const goMonth = (delta: number) => { setNavigated(true); setOffset(offset + delta); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["schedules"] });
  const run = <T,>(p: Promise<T>, okMsg?: string) => p.then(() => { setErr(null); setMsg(okMsg ?? null); refresh(); }).catch((e) => { setMsg(null); setErr(e instanceof ApiError ? e.message : "Terjadi kesalahan."); });

  if (!has("schedule:read")) return <NoAccess />;
  const canWrite = has("schedule:write");

  const byDate = new Map((q.data ?? []).map((s) => [s.date, s]));

  async function del(s: ScheduleDto) {
    if (s.bookingCount > 0) {
      const r = await confirm({
        title: "Jadwal tak bisa dihapus", confirmLabel: "Arsipkan",
        body: <>Tanggal <b>{idDate(s.date)}</b> punya <b>{s.bookingCount} booking</b> (data transaksi tak boleh dihapus). Arsipkan jadwal ini agar tak tampil?</>,
      });
      if (r.confirmed) run(schedulesApi.setStatus(s.id, "arsip"), "Jadwal diarsipkan.");
      return;
    }
    const r = await confirm({ title: "Hapus jadwal?", danger: true, confirmLabel: "Hapus",
      body: <>Tanggal <b>{idDate(s.date)}</b> ({s.used}/{s.capacity} kursi) akan dihapus permanen.</> });
    if (r.confirmed) run(schedulesApi.remove(s.id), "Jadwal dihapus.");
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
  function bulk(status: string, label: string) {
    run(schedulesApi.bulkStatus([...sel], status), label);
    setSel(new Set());
  }

  const grid = monthGrid(new Date(), offset);
  const cells: (string | null)[] = [
    ...Array.from({ length: grid.startDow }, () => null),
    ...grid.datedCells,
  ];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold text-slate-800">Jadwal</h2>
        {canWrite && (
          <button className="rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white" onClick={() => { setAddOpen(true); setAddTab("single"); setPreview(null); }}>+ Tambah jadwal</button>
        )}
      </div>
      {err && <div data-testid="sched-error" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => goMonth(-1)}>‹</button>
        <b>{range.label}</b>
        <button className="rounded border border-slate-300 px-2 py-1 text-sm" onClick={() => goMonth(1)}>›</button>
        <button className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600" onClick={() => setShowCal((v) => !v)}>
          {showCal ? "Sembunyikan kalender" : "Tampilkan kalender"}
        </button>
        {canWrite && sel.size > 0 && (
          <div className="ml-auto flex gap-2">
            <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white" onClick={() => bulk("terbit", `${sel.size} jadwal diterbitkan.`)}>Terbitkan {sel.size}</button>
            <button className="rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white" onClick={() => bulk("tutup", `${sel.size} jadwal ditutup.`)}>Tutup {sel.size}</button>
          </div>
        )}
      </div>

      {/* Kalender bulanan (bisa dilipat) */}
      {showCal && (q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat jadwal." onRetry={() => q.refetch()} /> : (
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
      ))}

      {/* Tabel */}
      {q.isLoading && !showCal ? <Loading /> : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada jadwal di bulan ini." hint="Klik + Tambah jadwal untuk membuat satu atau banyak sekaligus." /> : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500"><tr><th className="px-3 py-2"></th><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Terisi</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Aksi</th></tr></thead>
            <tbody>
              {q.data!.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{canWrite && <input type="checkbox" checked={sel.has(s.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(s.id) : n.delete(s.id); setSel(n); }} />}</td>
                  <td className="px-3 py-2">{dayDate(s.date)}</td>
                  <td className="px-3 py-2">{s.used} dari {s.capacity} orang {s.belowThreshold && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-bold text-amber-700">≤threshold</span>}</td>
                  <td className="px-3 py-2"><ScheduleStatus status={s.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button data-testid={`roster-${s.date}`} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-laut" onClick={() => setRosterFor(s)}>Detail peserta</button>
                      {canWrite && <button data-testid={`edit-${s.date}`} className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setEdit(s)}>Ubah</button>}
                      {canWrite && <button data-testid={`del-${s.date}`} className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600" onClick={() => del(s)}>{s.bookingCount > 0 ? "Arsipkan" : "Hapus"}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah jadwal (2 tab): satuan + banyak sekaligus */}
      {canWrite && addOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Tambah jadwal</h3>
              <button onClick={() => setAddOpen(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">✕</button>
            </div>
            <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-bold">
              <button className={`flex-1 rounded-md px-2 py-1.5 ${addTab === "single" ? "bg-white text-laut shadow" : "text-slate-500"}`} onClick={() => setAddTab("single")}>Satu tanggal</button>
              <button className={`flex-1 rounded-md px-2 py-1.5 ${addTab === "bulk" ? "bg-white text-laut shadow" : "text-slate-500"}`} onClick={() => setAddTab("bulk")}>Buat banyak jadwal sekaligus</button>
            </div>

            {addTab === "single" ? (
              <form onSubmit={(e) => { e.preventDefault(); run(schedulesApi.create(form), "Jadwal ditambahkan."); setAddOpen(false); }} className="space-y-2 text-sm">
                <label className="block">Tanggal
                  <input type="date" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <div className="flex gap-2">
                  <label className="block">Kapasitas (orang)
                    <input type="number" className="mt-1 w-28 rounded border border-slate-300 px-2 py-1.5" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} />
                  </label>
                  <label className="block">Ambang (threshold)
                    <input type="number" className="mt-1 w-28 rounded border border-slate-300 px-2 py-1.5" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: +e.target.value })} />
                  </label>
                </div>
                <div className="pt-2 text-right">
                  <button className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white">Tambah jadwal</button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-slate-500">Membuat jadwal untuk setiap Sabtu &amp; Minggu dalam rentang tanggal yang kamu pilih.</p>
                <div className="flex flex-wrap gap-2">
                  <label className="block">Dari
                    <input type="date" className="mt-1 rounded border border-slate-300 px-2 py-1.5" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} />
                  </label>
                  <label className="block">Sampai
                    <input type="date" className="mt-1 rounded border border-slate-300 px-2 py-1.5" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} />
                  </label>
                  <button data-testid="gen-preview" className="mt-6 rounded border border-slate-300 px-3 py-1.5 font-semibold" onClick={async () => { try { const r = await schedulesApi.genPreview({ from: gen.from, to: gen.to, weekdays: [0, 6], capacity: 24, threshold: 6, status: "terbit" }); setPreview(r.items); setErr(null); } catch (e) { setErr(e instanceof ApiError ? e.message : "Preview gagal."); } }}>Preview</button>
                </div>
                {preview && (
                  <div>
                    <p className="text-xs text-slate-500">{preview.length} tanggal ({preview.filter((p) => p.exists).length} sudah ada, {preview.filter((p) => !p.exists).length} baru)</p>
                    <button data-testid="gen-commit" className="mt-2 rounded-lg bg-laut px-4 py-1.5 font-bold text-white" onClick={() => { run(schedulesApi.genCommit({ from: gen.from, to: gen.to, weekdays: [0, 6], capacity: 24, threshold: 6, status: "terbit" }), "Jadwal massal dibuat."); setPreview(null); setAddOpen(false); }}>Simpan {preview.filter((p) => !p.exists).length} jadwal baru</button>
                  </div>
                )}
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

      {/* Modal detail peserta (#4) */}
      {rosterFor && <ScheduleRosterModal schedule={rosterFor} onClose={() => setRosterFor(null)} />}
    </section>
  );
}
