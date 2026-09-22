import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, notifApi, type NotifTemplate } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

const PLACEHOLDERS = ["{{kode}}", "{{nama}}", "{{tanggal}}", "{{paket}}", "{{total}}", "{{dibayar}}", "{{sisa}}", "{{alasan}}"];

export function NotificationsPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { channel: string; subject: string; body: string }>>({});
  const q = useQuery({ queryKey: ["notif-templates"], queryFn: notifApi.list, enabled: has("content:read") });

  useEffect(() => {
    if (q.data) setDrafts(Object.fromEntries(q.data.map((t) => [t.key, { channel: t.channel, subject: t.subject, body: t.body }])));
  }, [q.data]);

  if (!has("content:read")) return <NoAccess />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="Tidak bisa memuat template." onRetry={() => q.refetch()} />;
  const canWrite = has("content:write");

  async function save(t: NotifTemplate) {
    setErr(null); setMsg(null);
    const d = drafts[t.key]!;
    try { await notifApi.update(t.key, { channel: d.channel, subject: d.subject, body: d.body }); setMsg(`Template "${t.label}" tersimpan.`); qc.invalidateQueries({ queryKey: ["notif-templates"] }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal simpan template."); }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-extrabold text-slate-800">Template notifikasi</h2>
      <p className="text-sm text-slate-500">Email dikirim via SMTP dari halaman booking (dengan konfirmasi); WhatsApp tetap sebagai aksi manual. Placeholder: <span className="font-mono text-xs">{PLACEHOLDERS.join(" ")}</span></p>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {q.data.map((t) => (
        <div key={t.key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>{t.label}</span>
            <label className="ml-auto text-xs font-normal text-slate-500">Kanal:
              <select className="ml-1 rounded border border-slate-300 px-2 py-1 text-xs" value={drafts[t.key]?.channel ?? "email"} onChange={(e) => setDrafts({ ...drafts, [t.key]: { ...drafts[t.key]!, channel: e.target.value } })} disabled={!canWrite}>
                <option value="email">Email</option>
                <option value="wa">WhatsApp</option>
              </select>
            </label>
          </div>
          <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Subjek email" value={drafts[t.key]?.subject ?? ""} onChange={(e) => setDrafts({ ...drafts, [t.key]: { ...drafts[t.key]!, subject: e.target.value } })} disabled={!canWrite} />
          <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" rows={3} value={drafts[t.key]?.body ?? ""} onChange={(e) => setDrafts({ ...drafts, [t.key]: { ...drafts[t.key]!, body: e.target.value } })} disabled={!canWrite} />
          {canWrite && <button className="mt-2 rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white" onClick={() => save(t)}>Simpan</button>}
        </div>
      ))}
    </section>
  );
}
