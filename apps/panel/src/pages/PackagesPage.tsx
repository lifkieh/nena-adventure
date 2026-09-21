import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatRupiah } from "@nena/shared";
import { ApiError, packagesApi, type PackageDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function PackagesPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<PackageDto | null>(null);
  const q = useQuery({ queryKey: ["packages"], queryFn: packagesApi.list, enabled: has("package:read") });
  if (!has("package:read")) return <NoAccess />;
  const canWrite = has("package:write");

  async function save() {
    if (!edit) return;
    try {
      await packagesApi.update(edit.id, { key: edit.key, name: edit.name, prices: edit.prices, active: edit.active });
      setEdit(null); setMsg("Harga tersimpan (tercatat di audit; booking lama tak berubah)."); qc.invalidateQueries({ queryKey: ["packages"] });
    } catch (e) { setMsg(e instanceof ApiError ? e.message : "Gagal simpan."); }
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Paket &amp; harga</h2>
      <p className="mt-1 text-sm text-slate-500">Sumber kebenaran harga. {canWrite ? "Perubahan tercatat di audit & tidak mengubah booking lama." : "(read-only untuk role Anda)"}</p>
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat paket." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada paket." />
        : (
        <div className="mt-4 space-y-3">
          {q.data!.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <b>{p.name}</b>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{p.key}{p.active ? "" : " · nonaktif"}</span>
                  {canWrite && <button data-testid={`edit-pkg-${p.key}`} className="rounded border border-slate-300 px-2 py-0.5 text-slate-600" onClick={() => setEdit({ ...p, prices: { ...p.prices } })}>Ubah harga</button>}
                </div>
              </div>
              {/* Paket ber-tier (Private Trip) SELALU tampilkan daftar tier —
                  jangan pernah menampilkan Rp0 dari harga per-meeting-point kosong. */}
              {p.tiers.length > 0 ? (
                <ul className="mt-2 text-sm text-slate-600">
                  <li className="text-slate-400">Harga per rombongan (tier):</li>
                  {p.tiers.map((t) => <li key={t.id}>{t.minPax}–{t.maxPax} peserta: <b>{formatRupiah(t.price)}</b></li>)}
                </ul>
              ) : (
                <ul className="mt-2 text-sm text-slate-600">{Object.entries(p.prices).map(([mp, price]) => <li key={mp}>{mp}: <b>{formatRupiah(price)}</b></li>)}</ul>
              )}
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold">Ubah harga {edit.name}</h3>
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(edit.prices).map(([mp, price]) => (
                <label key={mp} className="flex items-center gap-2">{mp}
                  <input type="number" data-testid={`price-${mp}`} className="w-32 rounded border border-slate-300 px-2 py-1" value={price} onChange={(e) => setEdit({ ...edit, prices: { ...edit.prices, [mp]: +e.target.value } })} />
                </label>
              ))}
              {Object.keys(edit.prices).length === 0 && <p className="text-slate-400">Paket ini pakai tier (edit tier menyusul).</p>}
              <label className="flex items-center gap-2"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> aktif</label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setEdit(null)}>Batal</button>
              <button data-testid="save-price" className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white" onClick={save}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
