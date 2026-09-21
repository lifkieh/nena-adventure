import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, contentApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

export function ContentPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [key, setKey] = useState("hero");
  const [heading, setHeading] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["content"], queryFn: contentApi.list, enabled: has("content:read") });
  const secQ = useQuery({ queryKey: ["content", key], queryFn: () => contentApi.get(key), enabled: has("content:read") });

  useEffect(() => {
    const d = (secQ.data?.draft ?? secQ.data?.published) as { heading?: string } | null;
    setHeading(d?.heading ?? "");
  }, [secQ.data]);

  const wrap = <T,>(p: Promise<T>, okMsg: string) =>
    p.then(() => { setMsg(okMsg); qc.invalidateQueries({ queryKey: ["content"] }); })
     .catch((e) => setMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan."));

  const saveDraft = useMutation({ mutationFn: () => contentApi.saveDraft(key, { heading }), onSuccess: () => wrap(Promise.resolve(), "Draft tersimpan.") });

  if (!has("content:read")) return <NoAccess />;
  const canWrite = has("content:write");
  const canPublish = has("content:publish");

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Konten situs</h2>
      <p className="mt-1 text-sm text-slate-500">Edit per section, simpan draft, terbitkan, atau kembalikan.</p>

      {msg && <div data-testid="content-msg" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

      {listQ.isLoading ? <Loading /> : listQ.isError ? <ErrorState message="Tidak bisa memuat daftar section." onRetry={() => listQ.refetch()} /> : (
        <div className="mt-4 flex gap-2">
          {listQ.data?.map((s) => (
            <button key={s.key} onClick={() => setKey(s.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${key === s.key ? "bg-laut text-white" : "bg-slate-100 text-slate-600"}`}>
              {s.title}{s.hasDraft ? " •" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-white p-5">
        {secQ.isLoading ? <Loading /> : (
          <>
            <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="heading">Judul hero</label>
            <input id="heading" data-testid="hero-heading" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={heading} onChange={(e) => setHeading(e.target.value)} disabled={!canWrite} />
            {!canWrite && <p className="mt-2 text-xs text-slate-400">Hanya bisa dilihat (butuh izin content:write).</p>}
            <div className="mt-4 flex gap-2">
              <button data-testid="save-draft" disabled={!canWrite} onClick={() => saveDraft.mutate()}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Simpan draft</button>
              <button data-testid="publish" disabled={!canPublish} onClick={() => wrap(contentApi.publish(key), "Konten diterbitkan.")}
                className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Terbitkan</button>
              <button data-testid="revert" disabled={!canPublish} onClick={() => wrap(contentApi.revert(key), "Dikembalikan ke versi sebelumnya.")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Kembalikan</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
