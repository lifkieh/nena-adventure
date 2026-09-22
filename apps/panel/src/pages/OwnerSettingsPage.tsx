import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, settingsApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";
import { ImageField } from "../components/ImageField";
import { useConfirm } from "../components/Confirm";

export function OwnerSettingsPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState({ bankAccount: "", qrisUrl: "", serviceFee: 0, dpPercent: 0, cutoffDays: 0, whatsapp: "", whatsappSecondary: "", mapUrl: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["owner-settings"], queryFn: settingsApi.get, enabled: has("settings:read") });
  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  if (!has("settings:read")) return <NoAccess />;
  const canWrite = has("settings:write");

  const waInvalid = form.whatsapp !== "" && !/^\d{8,15}$/.test(form.whatsapp);
  const wa2Invalid = form.whatsappSecondary !== "" && !/^\d{8,15}$/.test(form.whatsappSecondary);
  const mapInvalid = form.mapUrl !== "" && !/^https:\/\//.test(form.mapUrl);

  async function save() {
    if (waInvalid || wa2Invalid) { setMsg("Nomor WhatsApp hanya angka (8–15 digit)."); return; }
    if (mapInvalid) { setMsg("URL peta harus diawali https://."); return; }
    try { await settingsApi.set(form); setMsg("Pengaturan tersimpan."); qc.invalidateQueries({ queryKey: ["owner-settings"] }); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : "Gagal simpan."); }
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Pengaturan owner</h2>
      <p className="mt-1 text-sm text-slate-500">Rekening, biaya layanan, persentase DP, dan cutoff. Owner-only.</p>
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat pengaturan." onRetry={() => q.refetch()} /> : (
        <div className="mt-4 max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <label className="block">Rekening BCA
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} disabled={!canWrite} />
          </label>
          {canWrite && (
            <ImageField
              label="Gambar QRIS — dipakai di halaman booking publik (PNG/JPG, maks 2MB)"
              value={form.qrisUrl}
              onChange={(url) => setForm({ ...form, qrisUrl: url })}
              optional
              onBeforeRemove={async () => {
                const r = await confirm({ title: "Hapus gambar QRIS?", danger: true, confirmLabel: "Hapus", body: <>Halaman booking akan menampilkan instruksi transfer manual sampai QRIS baru diunggah. Simpan perubahan untuk menerapkannya.</> });
                return r.confirmed;
              }}
            />
          )}
          <label className="block">Biaya layanan (Rp)
            <input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={form.serviceFee} onChange={(e) => setForm({ ...form, serviceFee: +e.target.value })} disabled={!canWrite} />
          </label>
          <label className="block">Persentase DP (%)
            <input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={form.dpPercent} onChange={(e) => setForm({ ...form, dpPercent: +e.target.value })} disabled={!canWrite} />
          </label>
          <label className="block">Cutoff pelunasan (hari)
            <input type="number" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={form.cutoffDays} onChange={(e) => setForm({ ...form, cutoffDays: +e.target.value })} disabled={!canWrite} />
          </label>
          <label className="block">Nomor WhatsApp (angka saja, mis. 6281286133202)
            <input data-testid="set-whatsapp" className={`mt-1 w-full rounded border px-2 py-1.5 ${waInvalid ? "border-red-400" : "border-slate-300"}`} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} disabled={!canWrite} />
            {waInvalid && <span className="text-xs font-semibold text-red-600">Hanya angka, 8–15 digit.</span>}
          </label>
          <label className="block">Nomor WhatsApp sekunder
            <input data-testid="set-whatsapp2" className={`mt-1 w-full rounded border px-2 py-1.5 ${wa2Invalid ? "border-red-400" : "border-slate-300"}`} value={form.whatsappSecondary} onChange={(e) => setForm({ ...form, whatsappSecondary: e.target.value })} disabled={!canWrite} />
            {wa2Invalid && <span className="text-xs font-semibold text-red-600">Hanya angka, 8–15 digit.</span>}
          </label>
          <label className="block">URL peta (https)
            <input data-testid="set-mapurl" className={`mt-1 w-full rounded border px-2 py-1.5 ${mapInvalid ? "border-red-400" : "border-slate-300"}`} value={form.mapUrl} onChange={(e) => setForm({ ...form, mapUrl: e.target.value })} disabled={!canWrite} />
            {mapInvalid && <span className="text-xs font-semibold text-red-600">Harus diawali https://.</span>}
          </label>
          {canWrite && <button data-testid="save-settings" disabled={waInvalid || wa2Invalid || mapInvalid} className="rounded-lg bg-laut px-4 py-2 font-bold text-white disabled:opacity-50" onClick={save}>Simpan</button>}
        </div>
      )}
    </section>
  );
}
