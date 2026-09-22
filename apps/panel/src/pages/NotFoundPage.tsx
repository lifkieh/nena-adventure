import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl font-extrabold text-slate-300">404</div>
      <h1 className="text-lg font-bold text-slate-700">
        Halaman tidak ditemukan
      </h1>
      <p className="text-sm text-slate-500">
        Alamat yang Anda tuju tidak ada di panel.
      </p>
      <button
        onClick={() => navigate("/")}
        className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white"
      >
        Kembali ke Ringkasan
      </button>
    </div>
  );
}
