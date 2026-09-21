import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, mediaApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { useConfirm } from "../components/Confirm";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function MediaPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [alt, setAlt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ok = (m: string) => { setErr(null); setMsg(m); };
  const bad = (m: string) => { setMsg(null); setErr(m); };
  const q = useQuery({ queryKey: ["media"], queryFn: mediaApi.list, enabled: has("content:read") });
  if (!has("content:read")) return <NoAccess />;

  async function del(m: { id: string; alt: string }) {
    const r = await confirm({ title: "Hapus gambar?", danger: true, confirmLabel: "Hapus", body: <>Gambar <b>{m.alt}</b> akan dihapus. Ditolak bila masih dipakai di konten.</> });
    if (!r.confirmed) return;
    try { await mediaApi.remove(m.id); ok("Gambar dihapus."); qc.invalidateQueries({ queryKey: ["media"] }); }
    catch (e) { bad(e instanceof ApiError ? e.message : "Gagal menghapus gambar."); }
  }

  async function upload(file: File) {
    if (!alt.trim()) { bad("Teks alt wajib diisi dulu sebelum unggah."); return; }
    const fd = new FormData(); fd.append("alt", alt); fd.append("file", file); // alt di BODY, sebelum file
    const res = await fetch("/api/admin/media-library", { method: "POST", credentials: "include", body: fd });
    if (!res.ok) { const b = await res.json().catch(() => null); bad((b?.error?.message) || "Gagal mengunggah gambar."); return; }
    setAlt(""); ok("Gambar terunggah."); qc.invalidateQueries({ queryKey: ["media"] });
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Media library</h2>
      <p className="mt-1 text-sm text-slate-500">Gambar publik (validasi magic byte, alt wajib). Terpisah dari storage bukti bayar.</p>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
      {msg && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
      {has("content:write") && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Teks alt (wajib)" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      )}
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat media." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada gambar." hint="Unggah gambar pertama." />
        : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {q.data!.map((m) => (
            <figure key={m.id} className="rounded-xl border border-slate-200 bg-white p-2">
              <img src={m.url} alt={m.alt} className="h-24 w-full rounded object-cover" />
              <figcaption className="mt-1 truncate text-xs text-slate-500">{m.alt}</figcaption>
              {has("content:write") && <button className="mt-1 w-full rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600" onClick={() => del(m)}>Hapus</button>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
