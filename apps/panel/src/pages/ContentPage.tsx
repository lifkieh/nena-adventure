import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, contentApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

interface FaqItem { q: string; a: string; active: boolean }

function move(arr: FaqItem[], i: number, dir: -1 | 1): FaqItem[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  return next;
}

export function ContentPage() {
  const { has } = usePermissions();
  const qc = useQueryClient();
  const [key, setKey] = useState("hero");
  const [heading, setHeading] = useState("");
  const [items, setItems] = useState<FaqItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["content"], queryFn: contentApi.list, enabled: has("content:read") });
  const secQ = useQuery({ queryKey: ["content", key], queryFn: () => contentApi.get(key), enabled: has("content:read") });

  useEffect(() => {
    const src = (secQ.data?.draft ?? secQ.data?.published) as Record<string, unknown> | null;
    setHeading((src?.heading as string) ?? "");
    setItems(((src?.items as FaqItem[]) ?? []).map((i) => ({ q: i.q, a: i.a, active: i.active ?? true })));
  }, [secQ.data]);

  if (!has("content:read")) return <NoAccess />;
  const canWrite = has("content:write");
  const canPublish = has("content:publish");
  const meta = secQ.data as { publishedAt?: string | null; hasUnpublishedDraft?: boolean } | undefined;

  function currentBody(): unknown {
    if (key === "faq") return { items };
    return { heading };
  }
  function afterOk(m: string) { setMsg(m); qc.invalidateQueries({ queryKey: ["content"] }); qc.invalidateQueries({ queryKey: ["content", key] }); }
  function err(e: unknown) { setMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan."); }

  async function saveDraft() { try { await contentApi.saveDraft(key, currentBody()); afterOk("Draft tersimpan (belum diterbitkan)."); } catch (e) { err(e); } }
  // Terbitkan JUJUR: simpan dulu perubahan lalu terbitkan dalam satu aksi.
  async function publish() { try { await contentApi.saveDraft(key, currentBody()); await contentApi.publish(key); afterOk("Perubahan disimpan & diterbitkan."); } catch (e) { err(e); } }
  async function revert() { try { await contentApi.revert(key); afterOk("Dikembalikan ke versi sebelumnya."); } catch (e) { err(e); } }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Konten situs</h2>
      {msg && <div data-testid="content-msg" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}

      {listQ.isLoading ? <Loading /> : listQ.isError ? <ErrorState message="Tidak bisa memuat section." onRetry={() => listQ.refetch()} /> : (
        <div className="mt-4 flex flex-wrap gap-2">
          {listQ.data?.map((s) => (
            <button key={s.key} onClick={() => setKey(s.key)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${key === s.key ? "bg-laut text-white" : "bg-slate-100 text-slate-600"}`}>
              {s.title}{s.hasDraft ? " •" : ""}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs">
        {meta?.hasUnpublishedDraft && <span data-testid="badge-draft" className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">Draf belum diterbitkan</span>}
        <span className="text-slate-400">{meta?.publishedAt ? `Terakhir terbit: ${formatJakarta(meta.publishedAt)}` : "Belum pernah diterbitkan"}</span>
      </div>

      <div className="mt-3 max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
        {secQ.isLoading ? <Loading /> : key === "hero" ? (
          <>
            <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="heading">Judul hero</label>
            <input id="heading" data-testid="hero-heading" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={heading} onChange={(e) => setHeading(e.target.value)} disabled={!canWrite} />
          </>
        ) : key === "faq" ? (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <input data-testid={`faq-q-${i}`} className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Pertanyaan" value={it.q} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} disabled={!canWrite} />
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Jawaban" rows={2} value={it.a} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && (
                  <div className="mt-1 flex gap-2 text-xs">
                    <label><input type="checkbox" checked={it.active} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} /> aktif</label>
                    <button onClick={() => setItems((prev) => move(prev, i, -1))}>↑</button>
                    <button onClick={() => setItems((prev) => move(prev, i, 1))}>↓</button>
                    <button className="text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}>hapus</button>
                  </div>
                )}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setItems([...items, { q: "", a: "", active: true }])}>+ Tambah FAQ</button>}
          </div>
        ) : <p className="text-sm text-slate-400">Editor typed untuk section ini menyusul (fase konten lanjutan).</p>}

        {!canWrite && <p className="mt-2 text-xs text-slate-400">Hanya bisa dilihat (butuh izin content:write).</p>}
        <div className="mt-4 flex gap-2">
          <button data-testid="save-draft" disabled={!canWrite} onClick={saveDraft} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Simpan draft</button>
          <button data-testid="publish" disabled={!canPublish} onClick={publish} className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Simpan &amp; Terbitkan</button>
          <button data-testid="revert" disabled={!canPublish} onClick={revert} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Kembalikan</button>
        </div>
      </div>
    </section>
  );
}
