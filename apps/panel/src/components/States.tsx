export function Loading({ label = "Memuat…" }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-slate-400">{label}</p>;
}
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center">
      <p className="font-semibold text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">Gagal memuat data.</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">
          Coba lagi
        </button>
      )}
    </div>
  );
}
export function NoAccess() {
  return <p className="text-sm text-slate-500">Anda tidak punya izin untuk halaman ini.</p>;
}
