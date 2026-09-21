import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bookingStatusLabel, formatJakarta, normalizeWa } from "@nena/shared";
import { bookingsApi, type RosterRow } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

function dateLabel(iso: string): string {
  return formatJakarta(iso + "T00:00:00Z", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

interface Group { date: string; packageName: string; rows: RosterRow[] }

export function ParticipantsPage() {
  const { has } = usePermissions();
  const [includePast, setIncludePast] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const q = useQuery({
    queryKey: ["participant-roster", includePast],
    queryFn: () => bookingsApi.roster(includePast),
    enabled: has("booking:read"),
  });

  const groups = useMemo<Group[]>(() => {
    const rows = q.data?.items ?? [];
    const s = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (dateFilter && r.scheduleDate !== dateFilter) return false;
      if (s) {
        const hay = (r.name + " " + (r.phone ?? "")).toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    // Kelompokkan per tanggal lalu paket (urut sudah dari server).
    const map = new Map<string, Group>();
    for (const r of filtered) {
      const key = r.scheduleDate + "||" + (r.packageName ?? r.packageKey);
      let g = map.get(key);
      if (!g) { g = { date: r.scheduleDate, packageName: r.packageName ?? r.packageKey, rows: [] }; map.set(key, g); }
      g.rows.push(r);
    }
    return Array.from(map.values());
  }, [q.data, dateFilter, search]);

  if (!has("booking:read")) return <NoAccess />;

  async function copyList() {
    const text = groups
      .map((g) => {
        const head = `${dateLabel(g.date)} — ${g.packageName} — ${g.rows.length} orang`;
        const lines = g.rows.map((r, i) => `${i + 1}. ${r.name} — ${r.phone ? normalizeWa(r.phone) : "(tanpa nomor)"} — ${bookingStatusLabel(r.bookingStatus)} — ${r.bookingCode}`);
        return head + "\n" + lines.join("\n");
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold text-slate-800">Peserta per keberangkatan</h2>
        <button
          onClick={copyList}
          disabled={groups.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >{copied ? "Tersalin ✓" : "Salin daftar"}</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <input
          className="rounded border border-slate-300 px-3 py-1.5"
          placeholder="Cari nama / no. HP"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-1">Tanggal:
          <input type="date" className="rounded border border-slate-300 px-2 py-1" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </label>
        {dateFilter && <button className="text-xs text-laut underline" onClick={() => setDateFilter("")}>hapus filter</button>}
        <label className="ml-auto flex items-center gap-1">
          <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} />
          Tampilkan tanggal lampau
        </label>
      </div>

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat peserta." onRetry={() => q.refetch()} />
        : groups.length === 0 ? <EmptyState title="Tidak ada peserta." hint="Coba ubah filter atau tampilkan tanggal lampau." />
        : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.date + g.packageName} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                {dateLabel(g.date)} · {g.packageName} · {g.rows.length} orang
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-slate-200 text-left text-slate-500">
                  <tr><th className="px-4 py-2">Nama</th><th className="px-4 py-2">No. HP</th><th className="px-4 py-2">Paket</th><th className="px-4 py-2">Kode booking</th><th className="px-4 py-2">Status booking</th></tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.participantId} className="border-b border-slate-100">
                      <td className="px-4 py-2">{r.name}{r.isLead ? " (pemesan)" : ""}</td>
                      <td className="px-4 py-2">
                        {r.phone ? <a className="text-laut underline" href={`https://wa.me/${normalizeWa(r.phone)}`} target="_blank" rel="noreferrer">{normalizeWa(r.phone)}</a> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2">{r.packageName ?? r.packageKey}</td>
                      <td className="px-4 py-2 font-mono"><Link className="text-laut hover:underline" to={`/bookings`}>{r.bookingCode}</Link></td>
                      <td className="px-4 py-2">{bookingStatusLabel(r.bookingStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
