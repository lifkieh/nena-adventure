import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, contentApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

interface FaqItem { q: string; a: string; active: boolean }
interface TestiItem { rating: number; quote: string; name: string; meta: string; active: boolean }
interface SyaratGroup { title: string; items: string[]; active: boolean }
interface Step { time: string; activity: string }
interface Trip { title: string; steps: Step[]; active: boolean }
interface KontakPoint { icon: string; title: string; body: string; active: boolean }
const ICON_OPTS = ["pin", "kalender", "telepon", "jam"];

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
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
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [testi, setTesti] = useState<TestiItem[]>([]);
  const [groups, setGroups] = useState<SyaratGroup[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [points, setPoints] = useState<KontakPoint[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["content"], queryFn: contentApi.list, enabled: has("content:read") });
  const secQ = useQuery({ queryKey: ["content", key], queryFn: () => contentApi.get(key), enabled: has("content:read") });

  useEffect(() => {
    const src = (secQ.data?.draft ?? secQ.data?.published) as Record<string, unknown> | null;
    setHeading((src?.heading as string) ?? "");
    setFaq(((src?.items as FaqItem[]) ?? []).map((i) => ({ q: i.q, a: i.a, active: i.active ?? true })));
    setTesti(((src?.items as TestiItem[]) ?? []).map((i) => ({ rating: i.rating ?? 5, quote: i.quote, name: i.name, meta: i.meta, active: i.active ?? true })));
    setGroups(((src?.groups as SyaratGroup[]) ?? []).map((g) => ({ title: g.title, items: g.items ?? [], active: g.active ?? true })));
    setTrips(((src?.trips as Trip[]) ?? []).map((t) => ({ title: t.title, steps: (t.steps ?? []).map((s) => ({ time: s.time, activity: s.activity })), active: t.active ?? true })));
    setPoints(((src?.points as KontakPoint[]) ?? []).map((p) => ({ icon: p.icon ?? "pin", title: p.title, body: p.body, active: p.active ?? true })));
  }, [secQ.data]);

  if (!has("content:read")) return <NoAccess />;
  const canWrite = has("content:write");
  const canPublish = has("content:publish");
  const meta = secQ.data as { publishedAt?: string | null; hasUnpublishedDraft?: boolean } | undefined;

  function currentBody(): unknown {
    if (key === "faq") return { items: faq };
    if (key === "testimoni") return { items: testi };
    if (key === "syarat") return { groups };
    if (key === "itinerary") return { trips };
    if (key === "kontak") return { points };
    return { heading };
  }
  function afterOk(m: string) { setMsg(m); qc.invalidateQueries({ queryKey: ["content"] }); qc.invalidateQueries({ queryKey: ["content", key] }); }
  function err(e: unknown) { setMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan."); }

  async function saveDraft() { try { await contentApi.saveDraft(key, currentBody()); afterOk("Draft tersimpan (belum diterbitkan)."); } catch (e) { err(e); } }
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
            {faq.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <input data-testid={`faq-q-${i}`} className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Pertanyaan" value={it.q} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} disabled={!canWrite} />
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Jawaban" rows={2} value={it.a} onChange={(e) => setFaq(faq.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && itemControls(it.active, () => setFaq(faq.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setFaq((p) => move(p, i, -1)), () => setFaq((p) => move(p, i, 1)), () => setFaq(faq.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setFaq([...faq, { q: "", a: "", active: true }])}>+ Tambah FAQ</button>}
          </div>
        ) : key === "testimoni" ? (
          <div className="space-y-2">
            {testi.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <div className="mb-1 flex gap-2">
                  <input data-testid={`testi-name-${i}`} className="w-1/2 rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Nama" value={it.name} onChange={(e) => setTesti(testi.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} disabled={!canWrite} />
                  <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={it.rating} onChange={(e) => setTesti(testi.map((x, j) => j === i ? { ...x, rating: +e.target.value } : x))} disabled={!canWrite}>
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}
                  </select>
                </div>
                <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Paket, Bulan Tahun" value={it.meta} onChange={(e) => setTesti(testi.map((x, j) => j === i ? { ...x, meta: e.target.value } : x))} disabled={!canWrite} />
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Kutipan" rows={2} value={it.quote} onChange={(e) => setTesti(testi.map((x, j) => j === i ? { ...x, quote: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && itemControls(it.active, () => setTesti(testi.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setTesti((p) => move(p, i, -1)), () => setTesti((p) => move(p, i, 1)), () => setTesti(testi.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setTesti([...testi, { rating: 5, quote: "", name: "", meta: "", active: true }])}>+ Tambah testimoni</button>}
          </div>
        ) : key === "syarat" ? (
          <div className="space-y-2">
            {groups.map((g, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <input data-testid={`syarat-title-${i}`} className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold" placeholder="Judul grup" value={g.title} onChange={(e) => setGroups(groups.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} disabled={!canWrite} />
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Satu poin per baris" rows={4} value={g.items.join("\n")} onChange={(e) => setGroups(groups.map((x, j) => j === i ? { ...x, items: e.target.value.split("\n").filter((s) => s.trim() !== "") } : x))} disabled={!canWrite} />
                {canWrite && itemControls(g.active, () => setGroups(groups.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setGroups((p) => move(p, i, -1)), () => setGroups((p) => move(p, i, 1)), () => setGroups(groups.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setGroups([...groups, { title: "", items: [], active: true }])}>+ Tambah grup</button>}
          </div>
        ) : key === "itinerary" ? (
          <div className="space-y-2">
            {trips.map((t, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <input data-testid={`itin-title-${i}`} className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold" placeholder="Judul itinerary" value={t.title} onChange={(e) => setTrips(trips.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} disabled={!canWrite} />
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs" rows={6} placeholder="Satu langkah per baris: 07.00 Aktivitas" value={t.steps.map((s) => `${s.time} ${s.activity}`).join("\n")}
                  onChange={(e) => setTrips(trips.map((x, j) => j === i ? { ...x, steps: e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const m = l.trim().match(/^(\S+)\s+(.*)$/); return m ? { time: m[1]!, activity: m[2]! } : { time: l.trim(), activity: "" }; }) } : x))} disabled={!canWrite} />
                {canWrite && itemControls(t.active, () => setTrips(trips.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setTrips((p) => move(p, i, -1)), () => setTrips((p) => move(p, i, 1)), () => setTrips(trips.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setTrips([...trips, { title: "", steps: [], active: true }])}>+ Tambah itinerary</button>}
          </div>
        ) : key === "kontak" ? (
          <div className="space-y-2">
            {points.map((p, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <div className="mb-1 flex gap-2">
                  <select data-testid={`kontak-icon-${i}`} className="rounded border border-slate-300 px-2 py-1 text-sm" value={p.icon} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} disabled={!canWrite}>
                    {ICON_OPTS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <input data-testid={`kontak-title-${i}`} className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold" placeholder="Judul" value={p.title} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} disabled={!canWrite} />
                </div>
                <textarea className="w-full rounded border border-slate-300 px-2 py-1 text-sm" rows={2} placeholder="Keterangan" value={p.body} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && itemControls(p.active, () => setPoints(points.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setPoints((z) => move(z, i, -1)), () => setPoints((z) => move(z, i, 1)), () => setPoints(points.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setPoints([...points, { icon: "pin", title: "", body: "", active: true }])}>+ Tambah poin</button>}
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

function itemControls(active: boolean, toggle: () => void, up: () => void, down: () => void, del: () => void) {
  return (
    <div className="mt-1 flex gap-2 text-xs">
      <label><input type="checkbox" checked={active} onChange={toggle} /> aktif</label>
      <button onClick={up}>↑</button>
      <button onClick={down}>↓</button>
      <button className="text-red-600" onClick={del}>hapus</button>
    </div>
  );
}
