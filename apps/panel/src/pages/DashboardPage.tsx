import { useQuery } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { fetchHealth } from "../lib/api";

export function DashboardPage() {
  const { data } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Ringkasan</h2>
      <p className="mt-1 text-sm text-slate-500">
        Kerangka panel. Logika bisnis & halaman isi menyusul di fase berikutnya.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-600">Status API</h3>
        {data ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-400">Versi</dt>
              <dd className="font-bold">{data.version}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Uptime</dt>
              <dd className="font-bold">{data.uptimeSeconds}s</dd>
            </div>
            <div>
              <dt className="text-slate-400">Migrasi</dt>
              <dd className="font-bold">
                {data.migrations.applied}/{data.migrations.expected} (
                {data.migrations.status})
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Waktu (WIB)</dt>
              <dd className="font-bold">{formatJakarta(data.time)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Memuat…</p>
        )}
      </div>
    </section>
  );
}
