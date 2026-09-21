import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function MediaPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [alt, setAlt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["media"], queryFn: mediaApi.list, enabled: has("content:read") });
  if (!has("content:read")) return <NoAccess />;

  async function upload(file: File) {
    setMsg(null);
    if (!alt.trim()) { setMsg("Teks alt wajib diisi dulu."); return; }
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/media-library?alt=" + encodeURIComponent(alt), { method: "POST", credentials: "include", body: fd });
    if (!res.ok) { const b = await res.json().catch(() => null); setMsg((b?.error?.message) || "Gagal unggah."); return; }
    setAlt(""); setMsg("Gambar terunggah."); qc.invalidateQueries({ queryKey: ["media"] });
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Media library</h2>
      <p className="mt-1 text-sm text-slate-500">Gambar publik (validasi magic byte, alt wajib). Terpisah dari storage bukti bayar.</p>
      {msg && <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{msg}</div>}
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
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
