import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, notifApi, type NotifTemplate, type NotifTemplatePreview } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { Loading, ErrorState, NoAccess } from "../components/States";

const PLACEHOLDERS = ["{{kode}}", "{{nama}}", "{{tanggal}}", "{{paket}}", "{{total}}", "{{dibayar}}", "{{sisa}}", "{{alasan}}", "{{refund}}", "{{titik_kumpul}}", "{{jam_kumpul}}"];

export function NotificationsPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [preview, setPreview] = useState<Record<string, NotifTemplatePreview | undefined>>({});
  // Field terakhir difokus (untuk sisipan chip di posisi kursor).
  const active = useRef<{ key: string; field: "subject" | "body"; start: number; end: number } | null>(null);
  const q = useQuery({ queryKey: ["notif-templates"], queryFn: notifApi.list, enabled: has("content:read") });

  useEffect(() => {
    if (q.data) setDrafts(Object.fromEntries(q.data.map((t) => [t.key, { subject: t.subject, body: t.body }])));
  }, [q.data]);

  if (!has("content:read")) return <NoAccess />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="Tidak bisa memuat template." onRetry={() => q.refetch()} />;
  const canWrite = has("content:write");
  const canTest = has("settings:write"); // owner-only

  function insertChip(key: string, token: string) {
    const a = active.current;
    setDrafts((d) => {
      const cur = d[key]!;
      if (a && a.key === key) {
        const src = cur[a.field];
        const next = src.slice(0, a.start) + token + src.slice(a.end);
        return { ...d, [key]: { ...cur, [a.field]: next } };
      }
      return { ...d, [key]: { ...cur, body: cur.body + token } };
    });
  }

  async function save(t: NotifTemplate) {
    setErr(null); setMsg(null);
    const d = drafts[t.key]!;
    try {
      await notifApi.update(t.key, { subject: d.subject, body: d.body });
      setMsg(`Template "${t.label}" tersimpan.`);
      qc.invalidateQueries({ queryKey: ["notif-templates"] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal simpan template."); }
  }

  async function doPreview(t: NotifTemplate) {
    setErr(null);
    const d = drafts[t.key]!;
    try {
      const pv = await notifApi.previewTemplate(t.key, { subject: d.subject, body: d.body });
      setPreview((p) => ({ ...p, [t.key]: pv }));
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Pratinjau gagal (cek placeholder)."); }
  }

  async function test(t: NotifTemplate) {
    setErr(null); setMsg(null);
    const r = await confirm({ title: `Kirim email uji: ${t.label}?`, confirmLabel: "Kirim uji", body: <>Email uji akan dikirim ke alamat owner. Tunduk pada mode notifikasi (dryrun/live).</> });
    if (!r.confirmed) return;
    try {
      const res = await notifApi.test(t.key);
      setMsg(`Uji "${t.label}": ${res.status}${res.note ? ` — ${res.note}` : ` ke ${res.to}`} (mode ${res.mode}).`);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal kirim uji."); }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-extrabold text-slate-800">Template notifikasi (email)</h2>
      <p className="text-sm text-slate-500">Kanal = email. WhatsApp bukan kanal notifikasi (hanya kontak manual di detail booking). Placeholder tersedia — klik chip untuk menyisipkan:</p>
      <div className="flex flex-wrap gap-1">
        {PLACEHOLDERS.map((ph) => <span key={ph} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">{ph}</span>)}
      </div>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {q.data.map((t) => (
        <div key={t.key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-sm font-bold text-slate-700">{t.label}</div>
          {canWrite && (
            <div className="mb-1 flex flex-wrap gap-1">
              {PLACEHOLDERS.map((ph) => (
                <button key={ph} type="button" className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-laut hover:bg-slate-50" onClick={() => insertChip(t.key, ph)}>{ph}</button>
              ))}
            </div>
          )}
          <input
            className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="Subjek email"
            value={drafts[t.key]?.subject ?? ""}
            onChange={(e) => setDrafts({ ...drafts, [t.key]: { ...drafts[t.key]!, subject: e.target.value } })}
            onSelect={(e) => { const el = e.currentTarget; active.current = { key: t.key, field: "subject", start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }; }}
            disabled={!canWrite}
          />
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            rows={4}
            value={drafts[t.key]?.body ?? ""}
            onChange={(e) => setDrafts({ ...drafts, [t.key]: { ...drafts[t.key]!, body: e.target.value } })}
            onSelect={(e) => { const el = e.currentTarget; active.current = { key: t.key, field: "body", start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length }; }}
            disabled={!canWrite}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {canWrite && <button className="rounded-lg bg-laut px-3 py-1.5 text-sm font-bold text-white" onClick={() => save(t)}>Simpan</button>}
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => doPreview(t)}>Pratinjau</button>
            {canTest && <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => test(t)}>Kirim email uji</button>}
          </div>
          {preview[t.key] && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="text-xs text-slate-400">Pratinjau {preview[t.key]!.usedSample ? "(data booking contoh)" : "(data dummy)"}</div>
              <div className="font-semibold text-slate-700">Subjek: {preview[t.key]!.subject}</div>
              <div className="mt-1 whitespace-pre-wrap text-slate-600">{preview[t.key]!.text}</div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
