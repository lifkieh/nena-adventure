import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaApi, type MediaItem } from "../lib/api";

interface Props {
  /** Dipanggil dengan URL media terpilih (mis. "/media/xxxx.png"). */
  onPick: (url: string) => void;
  onClose: () => void;
}

/** Pemilih media (modal): pilih gambar tersimpan atau unggah baru. */
export function MediaPicker({ onPick, onClose }: Props) {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["media"], queryFn: mediaApi.list });
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      const f = fileRef.current?.files?.[0];
      if (!f) throw new Error("Pilih berkas gambar dulu.");
      if (!alt.trim()) throw new Error("Isi teks alternatif (alt) dulu.");
      if (!["image/png", "image/jpeg"].includes(f.type)) throw new Error("Hanya PNG atau JPG.");
      if (f.size > 2 * 1024 * 1024) throw new Error("Ukuran maksimal 2MB.");
      return mediaApi.upload(f, alt.trim());
    },
    onSuccess: (m: MediaItem) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      onPick(m.url);
      onClose();
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : "Gagal mengunggah."),
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih gambar"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Pilih gambar</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">✕</button>
        </div>

        {/* Unggah baru */}
        <div className="mb-4 rounded-xl border border-slate-200 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-700">Unggah gambar baru (PNG/JPG, maks 2MB)</div>
          <input
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            placeholder="Teks alternatif (deskripsi singkat gambar)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="text-sm" />
            <button
              onClick={() => { setErr(null); upload.mutate(); }}
              disabled={upload.isPending}
              className="rounded-lg bg-laut px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >{upload.isPending ? "Mengunggah…" : "Unggah & pakai"}</button>
          </div>
          {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
        </div>

        {/* Galeri tersimpan */}
        <div className="text-sm font-semibold text-slate-700">Atau pilih dari media tersimpan</div>
        {listQ.isLoading ? (
          <div className="py-6 text-sm text-slate-500">Memuat…</div>
        ) : !listQ.data?.length ? (
          <div className="py-6 text-sm text-slate-500">Belum ada media.</div>
        ) : (
          <div className="mt-2 grid max-h-72 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {listQ.data.map((m) => (
              <button
                key={m.id}
                onClick={() => { onPick(m.url); onClose(); }}
                className="group rounded-lg border border-slate-200 p-1 text-left hover:border-laut"
                title={m.alt}
              >
                <img src={m.url} alt={m.alt} className="h-20 w-full rounded object-cover" />
                <div className="truncate px-1 py-1 text-xs text-slate-500">{m.alt}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
