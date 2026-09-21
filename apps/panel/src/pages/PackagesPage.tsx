import { useQuery } from "@tanstack/react-query";
import { formatRupiah } from "@nena/shared";
import { packagesApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, EmptyState, ErrorState, NoAccess } from "../components/States";

export function PackagesPage() {
  const { has } = usePermissions();
  const q = useQuery({ queryKey: ["packages"], queryFn: packagesApi.list, enabled: has("settings:read") });
  if (!has("settings:read")) return <NoAccess />;

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Paket &amp; harga</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sumber kebenaran harga. Perubahan tercatat di audit &amp; tidak mengubah booking lama.
        {!has("settings:write") && " (read-only untuk role Anda)"}
      </p>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message="Tidak bisa memuat paket." onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="Belum ada paket." />
        : (
        <div className="mt-4 space-y-3">
          {q.data!.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <b>{p.name}</b>
                <span className="text-xs text-slate-400">{p.key}{p.active ? "" : " · nonaktif"}</span>
              </div>
              <ul className="mt-2 text-sm text-slate-600">
                {Object.entries(p.prices).map(([mp, price]) => (
                  <li key={mp}>{mp}: <b>{formatRupiah(price)}</b></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
