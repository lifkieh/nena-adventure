import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, bookingsApi, schedulesApi, packagesApi } from "../lib/api";

const MP: Record<string, { key: string; label: string }[]> = {
  reguler: [{ key: "anyer", label: "Pantai Pangaradan, Anyer" }],
  premium: [
    { key: "anyer", label: "Anyer" }, { key: "serang", label: "Stasiun Serang" },
    { key: "tangerang", label: "Tangerang" }, { key: "jakarta", label: "Jakarta" },
  ],
  private: [{ key: "anyer", label: "Pantai Pangaradan, Anyer" }],
};

export function ManualBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const schedQ = useQuery({ queryKey: ["schedules", "all"], queryFn: () => schedulesApi.list() });
  const pkgQ = useQuery({ queryKey: ["packages"], queryFn: packagesApi.list });
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    scheduleId: "", packageKey: "reguler", meetingPoint: "anyer", pax: 1,
    paymentScheme: "lunas", notes: "", promoCode: "",
    customer: { name: "", phone: "", email: "" },
  });
  const [parts, setParts] = useState<{ name: string; idNumber: string }[]>([{ name: "", idNumber: "" }]);

  const scheds = useMemo(() => (schedQ.data ?? []).filter((s) => s.status === "terbit" && s.remaining > 0), [schedQ.data]);
  const mpOpts = MP[f.packageKey] ?? MP.reguler!;

  function setPax(n: number) {
    const pax = Math.max(1, Math.min(30, n));
    setF({ ...f, pax });
    setParts((p) => {
      const next = p.slice(0, pax);
      while (next.length < pax) next.push({ name: "", idNumber: "" });
      return next;
    });
  }

  async function submit() {
    setErr(null);
    if (!f.scheduleId) { setErr("Pilih jadwal dulu."); return; }
    if (!f.customer.name || !f.customer.phone || !f.customer.email) { setErr("Nama, HP, dan email pemesan wajib."); return; }
    if (parts.some((p) => !p.name.trim())) { setErr("Nama tiap peserta wajib diisi."); return; }
    try {
      const res = await bookingsApi.createManual({
        scheduleId: f.scheduleId, packageKey: f.packageKey, meetingPoint: mpOpts.some((m) => m.key === f.meetingPoint) ? f.meetingPoint : mpOpts[0]!.key,
        pax: f.pax, paymentScheme: f.paymentScheme, notes: f.notes || undefined, promoCode: f.promoCode || undefined,
        customer: f.customer, participants: parts.map((p) => ({ name: p.name, idNumber: p.idNumber || undefined })),
      });
      onCreated(res.code);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Gagal membuat booking."); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6">
        <h3 className="text-lg font-bold">Tambah booking manual</h3>
        <p className="text-xs text-slate-400">Status awal: baru masuk (tanpa timer). Admin menjalankan transisi berikutnya.</p>
        {err && <div data-testid="mb-error" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
        <div className="mt-3 space-y-2 text-sm">
          <label className="block">Jadwal
            <select data-testid="mb-schedule" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={f.scheduleId} onChange={(e) => setF({ ...f, scheduleId: e.target.value })}>
              <option value="">— pilih tanggal (sisa kursi) —</option>
              {scheds.map((s) => <option key={s.id} value={s.id}>{formatJakarta(s.date + "T00:00:00Z", { day: "numeric", month: "long", year: "numeric" })} · sisa {s.remaining}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex-1">Paket
              <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={f.packageKey} onChange={(e) => setF({ ...f, packageKey: e.target.value, meetingPoint: (MP[e.target.value] ?? MP.reguler!)[0]!.key })}>
                {(pkgQ.data ?? []).map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex-1">Meeting point
              <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={f.meetingPoint} onChange={(e) => setF({ ...f, meetingPoint: e.target.value })}>
                {mpOpts.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
            <label className="w-20">Pax
              <input type="number" min={1} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={f.pax} onChange={(e) => setPax(+e.target.value)} />
            </label>
          </div>
          <label className="block">Skema bayar
            <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" value={f.paymentScheme} onChange={(e) => setF({ ...f, paymentScheme: e.target.value })}>
              <option value="lunas">Lunas</option><option value="dp">DP dulu</option>
            </select>
          </label>
          <div className="rounded-lg border border-slate-200 p-2">
            <div className="mb-1 text-xs font-bold text-slate-500">Pemesan</div>
            <input data-testid="mb-name" className="mb-1 w-full rounded border border-slate-300 px-2 py-1" placeholder="Nama" value={f.customer.name} onChange={(e) => setF({ ...f, customer: { ...f.customer, name: e.target.value } })} />
            <div className="flex gap-2">
              <input className="w-1/2 rounded border border-slate-300 px-2 py-1" placeholder="HP" value={f.customer.phone} onChange={(e) => setF({ ...f, customer: { ...f.customer, phone: e.target.value } })} />
              <input className="w-1/2 rounded border border-slate-300 px-2 py-1" placeholder="Email" value={f.customer.email} onChange={(e) => setF({ ...f, customer: { ...f.customer, email: e.target.value } })} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-2">
            <div className="mb-1 text-xs font-bold text-slate-500">Peserta ({parts.length})</div>
            {parts.map((p, i) => (
              <div key={i} className="mb-1 flex gap-2">
                <input className="w-1/2 rounded border border-slate-300 px-2 py-1" placeholder={`Nama peserta ${i + 1}`} value={p.name} onChange={(e) => setParts(parts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="w-1/2 rounded border border-slate-300 px-2 py-1" placeholder="NIK (opsional)" value={p.idNumber} onChange={(e) => setParts(parts.map((x, j) => j === i ? { ...x, idNumber: e.target.value } : x))} />
              </div>
            ))}
          </div>
          <label className="block">Kode promo (opsional)
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={f.promoCode} onChange={(e) => setF({ ...f, promoCode: e.target.value })} />
          </label>
          <label className="block">Catatan
            <textarea className="mt-1 w-full rounded border border-slate-300 px-2 py-1" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={onClose}>Batal</button>
          <button data-testid="mb-submit" className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white" onClick={submit}>Buat booking</button>
        </div>
      </div>
    </div>
  );
}
