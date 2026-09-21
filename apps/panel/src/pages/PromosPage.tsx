import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, promosApi, type PromoDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

const BLANK = { code: "", type: "percent", value: 10, minPax: 1, validFrom: "", validUntil: "", maxUses: "", packages: "", active: true };

export function PromosPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [editId, setEditId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["promos"], queryFn: promosApi.list, enabled: has("package:read") });

  if (!has("package:read")) return <NoAccess />;
  const canWrite = has("package:write");

  function edit(p: PromoDto) {
    setEditId(p.id);
    setForm({ code: p.code, type: p.type, value: p.value, minPax: p.minPax, validFrom: p.validFrom ?? "", validUntil: p.validUntil ?? "", maxUses: p.maxUses != null ? String(p.maxUses) : "", packages: (p.packages ?? []).join(","), active: p.active });
  }
  async function save() {
    setErr(null); setMsg(null);
    const body = {
      code: form.code, type: form.type, value: Number(form.value), minPax: Number(form.minPax),
      validFrom: form.validFrom || null, validUntil: form.validUntil || null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      packages: form.packages ? form.packages.split(",").map((s) => s.trim()).filter(Boolean) : null,
      active: form.active,
    };
    try {
      if (editId) await promosApi.update(editId, body); else await promosApi.create(body);
      setMsg("Promo tersimpan."); setForm(BLANK); setEditId(null); qc.invalidateQueries({ queryKey: ["promos"] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal simpan promo."); }
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Promo / voucher</h2>
      <p className="mt-1 text-sm text-slate-500">Diskon divalidasi di server saat booking. Nilai & tipe tak bisa diketik di CMS.</p>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

      {canWrite && (
        <div className="mt-4 grid max-w-2xl gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
          <label>Kode<input className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
          <label>Tipe<select className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Persen (%)</option><option value="amount">Nominal (Rp)</option></select></label>
          <label>Nilai<input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} /></label>
          <label>Min pax<input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.minPax} onChange={(e) => setForm({ ...form, minPax: +e.target.value })} /></label>
          <label>Berlaku dari<input type="date" className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.validFrom?.slice(0, 10)} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label>
          <label>Sampai<input type="date" className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.validUntil?.slice(0, 10)} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></label>
          <label>Kuota (kosong = tak terbatas)<input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></label>
          <label>Paket berlaku (kosong = semua)<input className="mt-1 w-full rounded border border-slate-300 px-2 py-1" placeholder="reguler,premium" value={form.packages} onChange={(e) => setForm({ ...form, packages: e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> aktif</label>
          <div className="flex items-end gap-2">
            <button className="rounded-lg bg-laut px-4 py-2 font-bold text-white" onClick={save}>{editId ? "Simpan perubahan" : "Tambah promo"}</button>
            {editId && <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={() => { setEditId(null); setForm(BLANK); }}>Batal</button>}
          </div>
        </div>
      )}

      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat promo." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada promo." />
        : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500"><tr><th className="px-3 py-2">Kode</th><th className="px-3 py-2">Diskon</th><th className="px-3 py-2">Min pax</th><th className="px-3 py-2">Dipakai</th><th className="px-3 py-2">Aktif</th><th className="px-3 py-2">Paket</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {q.data!.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-mono">{p.code}</td>
                  <td className="px-3 py-2">{p.type === "percent" ? `${p.value}%` : `Rp${p.value.toLocaleString("id-ID")}`}</td>
                  <td className="px-3 py-2">{p.minPax}</td>
                  <td className="px-3 py-2">{p.usedCount}{p.maxUses != null ? `/${p.maxUses}` : ""}</td>
                  <td className="px-3 py-2">{p.active ? "ya" : "tidak"}</td>
                  <td className="px-3 py-2">{p.packages?.join(", ") ?? "semua"}</td>
                  <td className="px-3 py-2">{canWrite && <button className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => edit(p)}>Ubah</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
