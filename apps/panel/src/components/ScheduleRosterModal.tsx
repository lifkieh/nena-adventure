import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingStatusLabel, formatJakarta, normalizeWa } from "@nena/shared";
import { downloadFile, schedulesApi, type RosterRow, type ScheduleDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading } from "./States";

function dayDate(iso: string): string {
  return formatJakarta(iso + "T00:00:00Z", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function groupByPackage(rows: RosterRow[]): { name: string; rows: RosterRow[] }[] {
  const map = new Map<string, { name: string; rows: RosterRow[] }>();
  for (const r of rows) {
    const name = r.packageName ?? r.packageKey;
    let g = map.get(name);
    if (!g) { g = { name, rows: [] }; map.set(name, g); }
    g.rows.push(r);
  }
  return Array.from(map.values());
}

function Table({ rows }: { rows: RosterRow[] }) {
  return (
    <table className="w-full min-w-[520px] text-sm">
      <thead className="border-b border-slate-200 text-left text-slate-500">
        <tr><th className="px-3 py-1.5">Nama</th><th className="px-3 py-1.5">No. HP</th><th className="px-3 py-1.5">Paket</th><th className="px-3 py-1.5">Kode booking</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.participantId} className="border-b border-slate-100">
            <td className="px-3 py-1.5">{r.name}{r.isLead ? " (pemesan)" : ""}</td>
            <td className="px-3 py-1.5">{r.phone ? <a className="text-laut underline" href={`https://wa.me/${normalizeWa(r.phone)}`} target="_blank" rel="noreferrer">{normalizeWa(r.phone)}</a> : <span className="text-slate-400">—</span>}</td>
            <td className="px-3 py-1.5">{r.packageName ?? r.packageKey}</td>
            <td className="px-3 py-1.5 font-mono">{r.bookingCode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Modal "Detail peserta" untuk satu jadwal: aktif dikelompokkan per paket,
 *  batal/kadaluarsa dipisah di bawah. */
export function ScheduleRosterModal({ schedule, onClose }: { schedule: ScheduleDto; onClose: () => void }) {
  const { has } = usePermissions();
  const q = useQuery({ queryKey: ["schedule-roster", schedule.id], queryFn: () => schedulesApi.roster(schedule.id) });
  const activeGroups = useMemo(() => groupByPackage(q.data?.active ?? []), [q.data]);
  const cancelled = q.data?.cancelled ?? [];
  const activeCount = q.data?.active.length ?? 0;
  const [exp, setExp] = useState<{ msg?: string; err?: string }>({});

  async function exportZurich() {
    setExp({});
    try {
      const { lines } = await downloadFile(`/admin/exports/zurich?date=${schedule.date}`, `zurich-${schedule.date}.csv`);
      setExp({ msg: `Export berhasil — ${lines - 1} baris peserta.` });
    } catch (e) {
      setExp({ err: e instanceof Error ? e.message : "Export gagal." });
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detail peserta jadwal"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-800">Detail peserta · {dayDate(schedule.date)}</h3>
          <div className="flex items-center gap-2">
            {has("participant:export") && <button onClick={exportZurich} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Export Zurich (CSV)</button>}
            <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">✕</button>
          </div>
        </div>
        {exp.err && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{exp.err}</div>}
        {exp.msg && <div className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{exp.msg}</div>}

        {q.isLoading ? <Loading /> : (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-600">Peserta aktif: {activeCount} orang</div>
            {activeGroups.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada peserta aktif.</p>
            ) : activeGroups.map((g) => (
              <div key={g.name} className="overflow-x-auto rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">{g.name} · {g.rows.length} orang</div>
                <Table rows={g.rows} />
              </div>
            ))}

            {cancelled.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-rose-200">
                <div className="border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-bold text-rose-700">
                  Batal / kadaluarsa · {cancelled.length} orang (tidak dihitung)
                </div>
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-slate-500">
                    <tr><th className="px-3 py-1.5">Nama</th><th className="px-3 py-1.5">No. HP</th><th className="px-3 py-1.5">Paket</th><th className="px-3 py-1.5">Kode</th><th className="px-3 py-1.5">Status</th></tr>
                  </thead>
                  <tbody>
                    {cancelled.map((r) => (
                      <tr key={r.participantId} className="border-b border-slate-100 text-slate-500">
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5">{r.phone ?? "—"}</td>
                        <td className="px-3 py-1.5">{r.packageName ?? r.packageKey}</td>
                        <td className="px-3 py-1.5 font-mono">{r.bookingCode}</td>
                        <td className="px-3 py-1.5">{bookingStatusLabel(r.bookingStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
