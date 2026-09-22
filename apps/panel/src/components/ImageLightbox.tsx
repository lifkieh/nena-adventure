import { useEffect, useState, type ReactNode } from "react";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
  /** Aksi (mis. Terima/Tolak) di footer — tetap terjangkau tanpa menutup gambar. */
  footer?: ReactNode;
}

/** Lightbox gambar: layar penuh, bisa zoom, tutup via tombol/Esc/klik area gelap. */
export function ImageLightbox({ src, alt, onClose, footer }: Props) {
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau bukti pembayaran"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">{alt || "Bukti pembayaran"}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => !z)} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25">
            {zoom ? "Perkecil" : "Perbesar"}
          </button>
          <button onClick={onClose} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25" aria-label="Tutup">✕ Tutup</button>
        </div>
      </div>
      <div
        className="flex flex-1 items-start justify-center overflow-auto p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <img
          src={src}
          alt={alt || "Bukti pembayaran"}
          onClick={() => setZoom((z) => !z)}
          className={zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}
          style={zoom ? { width: "min(2000px, 180%)" } : undefined}
        />
      </div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-black/40 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
