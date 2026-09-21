import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatRupiah } from "@nena/shared";
import { ApiError, paymentsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function VerificationPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["verif-queue"], queryFn: paymentsApi.queue, enabled: has("payment:read") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["verif-queue"] });
  const run = <T,>(p: Promise<T>) => p.then(() => { setErr(null); refresh(); }).catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal."));

  async function approve(p: Record<string, unknown>) {
    const r = await confirm({
      title: "Terima pembayaran?",
      confirmLabel: "Terima",
      body: <>Terima pembayaran <b>{new Intl.NumberFormat("id-ID").format(Number(p.amount))} rupiah</b> untuk booking <b>{String(p.bookingCode)}</b>?</>,
    });
    if (r.confirmed) run(paymentsApi.approve(String(p.id)));
  }
  async function reject(p: Record<string, unknown>) {
    const r = await confirm({ title: `Tolak bukti ${String(p.bookingCode)}?`, danger: true, withReason: true, confirmLabel: "Tolak" });
    if (r.confirmed && r.reason) run(paymentsApi.reject(String(p.id), r.reason));
  }

  if (!has("payment:read")) return <NoAccess />;
  const canVerify = has("payment:verify");

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Antrean verifikasi bukti</h2>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat antrean." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Tidak ada bukti menunggu verifikasi." hint="Semua sudah diproses." />
        : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr><th className="px-4 py-2">Kode</th><th className="px-4 py-2">Pemesan</th><th className="px-4 py-2">Nominal</th><th className="px-4 py-2">Bukti</th><th className="px-4 py-2">Aksi</th></tr>
            </thead>
            <tbody>
              {q.data!.map((p) => (
                <tr key={String(p.id)} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-mono">{String(p.bookingCode)}</td>
                  <td className="px-4 py-2">{String(p.customerName)}</td>
                  <td className="px-4 py-2">{formatRupiah(Number(p.amount))} <span className="text-xs text-slate-400">({String(p.kind)})</span></td>
                  <td className="px-4 py-2">{p.proofMediaId ? <a className="text-laut underline" href={`/api/admin/media/${String(p.proofMediaId)}`} target="_blank" rel="noreferrer">Lihat</a> : "-"}</td>
                  <td className="px-4 py-2">
                    {canVerify && (
                      <div className="flex gap-1">
                        <button data-testid="verif-approve" className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white" onClick={() => approve(p)}>Terima</button>
                        <button data-testid="verif-reject" className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => reject(p)}>Tolak</button>
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
