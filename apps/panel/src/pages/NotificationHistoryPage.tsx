import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, notifApi, type OutboxItem } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

const STATUSES = [
  { v: "", label: "Semua" },
  { v: "sent", label: "Terkirim" },
  { v: "queued", label: "Menunggu kirim" },
  { v: "failed", label: "Gagal" },
  { v: "skipped", label: "Dilewati" },
];

function badgeClass(status: string): string {
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "queued") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function NotificationHistoryPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<OutboxItem | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["outbox", status], queryFn: () => notifApi.outbox(status || undefined), enabled: has("booking:read") });

  if (!has("booking:read")) return <NoAccess />;
  const canResend = has("booking:write");

  async function resend(o: OutboxItem) {
    const r = await confirm({ title: "Kirim ulang email?", confirmLabel: "Kirim ulang", body: <>Kirim ulang <b>{o.subject}</b> ke <b>{o.to}</b>?</> });
    if (!r.confirmed) return;
    try {
      const res = await notifApi.resend(o.id);
      setErr(null);
      setMsg(res ? `Kirim ulang: ${res.statusLabel}${res.mode !== "live" ? ` (mode ${res.mode})` : ""}.` : "Diproses.");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["outbox"] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal kirim ulang."); }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-extrabold text-slate-800">Riwayat notifikasi</h2>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Status:</span>
        {STATUSES.map((s) => (
          <button key={s.v} onClick={() => setStatus(s.v)} className={`rounded-lg px-3 py-1 font-semibold ${status === s.v ? "bg-laut text-white" : "bg-slate-100 text-slate-600"}`}>{s.label}</button>
        ))}
      </div>

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat riwayat." onRetry={() => q.refetch()} />
        : (q.data?.items.length ?? 0) === 0 ? <EmptyState title="Belum ada email." hint="Notifikasi email yang dikirim/dilewati muncul di sini." />
        : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Waktu</th><th className="px-4 py-2">Template</th><th className="px-4 py-2">Ke</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Mode</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {q.data!.items.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 whitespace-nowrap">{formatJakarta(o.sentAt ?? o.createdAt)}</td>
                  <td className="px-4 py-2">{o.label}</td>
                  <td className="px-4 py-2">{o.to}</td>
                  <td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${badgeClass(o.status)}`}>{o.statusLabel}</span></td>
                  <td className="px-4 py-2 text-xs text-slate-500">{o.mode}</td>
                  <td className="px-4 py-2"><button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => setDetail(o)}>Lihat</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pop-up detail email (bukan tab baru). */}
      {detail && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">{detail.label}</h3>
              <button onClick={() => setDetail(null)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">✕</button>
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="text-slate-400">Ke:</span> {detail.to}</div>
              <div><span className="text-slate-400">Subjek:</span> {detail.subject}</div>
              <div><span className="text-slate-400">Status:</span> <span className={`rounded px-2 py-0.5 text-xs font-bold ${badgeClass(detail.status)}`}>{detail.statusLabel}</span> · mode {detail.mode} · percobaan {detail.attemptCount}</div>
              {detail.lastError && <div className="text-amber-600">Catatan: {detail.lastError}</div>}
              <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-slate-600">{detail.bodyText}</div>
            </div>
            {canResend && detail.bookingId && (
              <div className="mt-4 text-right">
                <button className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white" onClick={() => resend(detail)}>Kirim ulang</button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
