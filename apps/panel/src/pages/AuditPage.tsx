import { useQuery } from "@tanstack/react-query";
import { formatJakarta, auditActionLabel } from "@nena/shared";
import { auditApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";

export function AuditPage() {
  const { has } = usePermissions();
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditApi.list({ page: "1", pageSize: "50" }),
    enabled: has("user:read"),
  });

  if (!has("user:read")) {
    return <p className="text-sm text-slate-500">Tidak berizin.</p>;
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Audit log</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Waktu (WIB)</th>
              <th className="px-4 py-2">Aksi</th>
              <th className="px-4 py-2">Entitas</th>
              <th className="px-4 py-2">Aktor</th>
              <th className="px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.items.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-2 text-slate-500">
                  {formatJakarta(r.createdAt)}
                </td>
                <td className="px-4 py-2 font-semibold">{auditActionLabel(String(r.action))}</td>
                <td className="px-4 py-2">
                  {r.entity}
                  {r.entityId ? ` · ${r.entityId}` : ""}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {r.actorEmail ?? "—"}
                </td>
                <td className="px-4 py-2 text-slate-400">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
