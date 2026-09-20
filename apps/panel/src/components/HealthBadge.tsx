import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../lib/api";

/** Menampilkan koneksi ke /api/health — bukti panel & api tersambung. */
export function HealthBadge() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
  });

  if (isLoading)
    return <span className="text-xs text-slate-400">memeriksa API…</span>;

  if (isError || !data)
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        API terputus
      </span>
    );

  return (
    <span
      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
      title={`migrasi: ${data.migrations.applied}/${data.migrations.expected} (${data.migrations.status})`}
    >
      API v{data.version} · uptime {data.uptimeSeconds}s
    </span>
  );
}
