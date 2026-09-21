import { useState } from "react";
import { MediaPicker } from "./MediaPicker";

interface Props {
  /** Label lokasi pemakaian, mis. "Gambar utama Hero — muncul di Beranda paling atas". */
  label: string;
  /** URL gambar tersimpan ("/media/…") atau kosong. URL TIDAK pernah ditampilkan. */
  value: string;
  onChange: (url: string) => void;
  /** Bila true, tampilkan tombol "Hapus gambar". */
  optional?: boolean;
}

/** Field gambar CMS: preview + nama file + tombol Ubah/Hapus. Tanpa URL mentah. */
export function ImageField({ label, value, onChange, optional }: Props) {
  const [picking, setPicking] = useState(false);
  const [broken, setBroken] = useState(false);
  const fileName = value ? value.split("/").pop() || value : "";

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {value && !broken ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={value}
              alt="Pratinjau gambar"
              className="h-20 w-full object-contain"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : value && broken ? (
            <span className="px-2 text-center text-xs text-rose-500">Gambar tidak ditemukan</span>
          ) : (
            <span className="px-2 text-center text-xs text-slate-400">Belum ada gambar</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-slate-600">{fileName || <span className="text-slate-400">—</span>}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >Ubah gambar</button>
            {optional && value && (
              <button
                type="button"
                onClick={() => { onChange(""); setBroken(false); }}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >Hapus gambar</button>
            )}
          </div>
        </div>
      </div>
      {picking && (
        <MediaPicker
          onPick={(url) => { onChange(url); setBroken(false); }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
