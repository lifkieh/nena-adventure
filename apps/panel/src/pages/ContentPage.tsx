import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatJakarta } from "@nena/shared";
import { ApiError, contentApi, mediaApi } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

interface FaqItem { q: string; a: string; active: boolean }
interface TestiItem { rating: number; quote: string; name: string; meta: string; active: boolean }
// raw = teks textarea mentah (spasi & baris baru bebas diketik; dinormalkan saat SIMPAN).
interface SyaratGroup { title: string; raw: string; active: boolean }
interface Trip { title: string; raw: string; active: boolean }
interface KontakPoint { icon: string; title: string; body: string; active: boolean }
interface GalItem { type: string; size: string; full?: string; thumb: string; alt: string; cap: string; videoLabel?: string; width: number; height: number; active: boolean }
interface Feature { included: boolean; html: string }
interface PaketCard { key: string; name: string; sub: string; unit: string; note: string; tag: string | null; highlight: boolean; ctaClass: string; ctaHref: string; ctaText: string; features: Feature[] }
const ICON_OPTS = ["pin", "kalender", "telepon", "jam"];
const SIZE_OPTS = ["", "w2", "h2", "w2 h2"];

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
  const [gal, setGal] = useState<GalItem[]>([]);
  const [cards, setCards] = useState<PaketCard[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["content"], queryFn: contentApi.list, enabled: has("content:read") });
  const mediaQ = useQuery({ queryKey: ["media"], queryFn: mediaApi.list, enabled: has("content:read") });
  const secQ = useQuery({ queryKey: ["content", key], queryFn: () => contentApi.get(key), enabled: has("content:read") });

  useEffect(() => {
    const src = (secQ.data?.draft ?? secQ.data?.published) as Record<string, unknown> | null;
    setHeading((src?.heading as string) ?? "");
    setFaq(((src?.items as FaqItem[]) ?? []).map((i) => ({ q: i.q, a: i.a, active: i.active ?? true })));
    setTesti(((src?.items as TestiItem[]) ?? []).map((i) => ({ rating: i.rating ?? 5, quote: i.quote, name: i.name, meta: i.meta, active: i.active ?? true })));
    setGroups(((src?.groups as { title: string; items?: string[]; active?: boolean }[]) ?? []).map((g) => ({ title: g.title, raw: (g.items ?? []).join("\n"), active: g.active ?? true })));
    setTrips(((src?.trips as { title: string; steps?: { time: string; activity: string }[]; active?: boolean }[]) ?? []).map((t) => ({ title: t.title, raw: (t.steps ?? []).map((s) => `${s.time} ${s.activity}`).join("\n"), active: t.active ?? true })));
    setPoints(((src?.points as KontakPoint[]) ?? []).map((p) => ({ icon: p.icon ?? "pin", title: p.title, body: p.body, active: p.active ?? true })));
    setGal(((src?.items as GalItem[]) ?? []).map((g) => ({ type: g.type ?? "img", size: g.size ?? "", full: g.full, thumb: g.thumb, alt: g.alt ?? "", cap: g.cap ?? "", videoLabel: g.videoLabel, width: g.width ?? 800, height: g.height ?? 600, active: g.active ?? true })));
    setCards(((src?.cards as PaketCard[]) ?? []).map((c) => ({ ...c, tag: c.tag ?? null, features: (c.features ?? []).map((f) => ({ included: f.included, html: f.html })) })));
  }, [secQ.data]);

  if (!has("content:read")) return <NoAccess />;
  const canWrite = has("content:write");
  const canPublish = has("content:publish");
  const meta = secQ.data as { publishedAt?: string | null; hasUnpublishedDraft?: boolean; canRevert?: boolean } | undefined;

  function currentBody(): unknown {
    if (key === "faq") return { items: faq };
    if (key === "testimoni") return { items: testi };
    // Normalisasi HANYA di sini (saat simpan), bukan tiap ketukan.
    if (key === "syarat") return { groups: groups.map((g) => ({ title: g.title, active: g.active, items: g.raw.split("\n").map((l) => l.trim()).filter(Boolean) })) };
    if (key === "itinerary") return {
      trips: trips.map((t) => ({
        title: t.title, active: t.active,
        steps: t.raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(\S+)\s+(.*)$/); return m ? { time: m[1]!, activity: m[2]! } : { time: l, activity: "" }; }),
      })),
    };
    if (key === "kontak") return { points };
    if (key === "galeri") return { items: gal };
    if (key === "paket") return { cards }; // hanya teks; harga TIDAK disimpan di konten
    return { heading };
  }
  function validate(): string | null {
    if (key === "galeri") {
      const bad = gal.some((g) => g.active !== false && !g.alt.trim());
      if (bad) return "Setiap gambar galeri aktif wajib punya teks alt.";
    }
    return null;
  }
  function afterOk(m: string) { setErr(null); setMsg(m); qc.invalidateQueries({ queryKey: ["content"] }); qc.invalidateQueries({ queryKey: ["content", key] }); }
  function showErr(e: unknown) { setMsg(null); setErr(e instanceof ApiError ? e.message : "Terjadi kesalahan."); }

  async function saveDraft() { const v = validate(); if (v) return showErr(v); try { await contentApi.saveDraft(key, currentBody()); afterOk("Draft tersimpan (belum diterbitkan)."); } catch (e) { showErr(e); } }
  async function publish() { const v = validate(); if (v) return showErr(v); try { await contentApi.saveDraft(key, currentBody()); await contentApi.publish(key); afterOk("Perubahan disimpan & diterbitkan."); } catch (e) { showErr(e); } }
  async function revert() { try { await contentApi.revert(key); afterOk("Dikembalikan ke versi sebelumnya."); } catch (e) { showErr(e); } }

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Konten situs</h2>

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
                <textarea data-testid={`syarat-items-${i}`} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Satu poin per baris" rows={4} value={g.raw} onChange={(e) => setGroups(groups.map((x, j) => j === i ? { ...x, raw: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && itemControls(g.active, () => setGroups(groups.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setGroups((p) => move(p, i, -1)), () => setGroups((p) => move(p, i, 1)), () => setGroups(groups.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setGroups([...groups, { title: "", raw: "", active: true }])}>+ Tambah grup</button>}
          </div>
        ) : key === "itinerary" ? (
          <div className="space-y-2">
            {trips.map((t, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <input data-testid={`itin-title-${i}`} className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold" placeholder="Judul itinerary" value={t.title} onChange={(e) => setTrips(trips.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} disabled={!canWrite} />
                <textarea data-testid={`itin-steps-${i}`} className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs" rows={6} placeholder="Satu langkah per baris: 07.00 Aktivitas" value={t.raw}
                  onChange={(e) => setTrips(trips.map((x, j) => j === i ? { ...x, raw: e.target.value } : x))} disabled={!canWrite} />
                {canWrite && itemControls(t.active, () => setTrips(trips.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setTrips((p) => move(p, i, -1)), () => setTrips((p) => move(p, i, 1)), () => setTrips(trips.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setTrips([...trips, { title: "", raw: "", active: true }])}>+ Tambah itinerary</button>}
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
        ) : key === "galeri" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Tiap gambar aktif WAJIB punya teks alt. Pakai media library untuk mengisi URL, atau tempel URL manual.</p>
            {gal.map((g, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <div className="mb-1 flex flex-wrap gap-2">
                  <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={g.type} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} disabled={!canWrite}>
                    <option value="img">Foto</option><option value="vid">Video</option>
                  </select>
                  <select className="rounded border border-slate-300 px-2 py-1 text-sm" value={g.size} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} disabled={!canWrite}>
                    {SIZE_OPTS.map((s) => <option key={s} value={s}>{s === "" ? "ukuran biasa" : s}</option>)}
                  </select>
                  {canWrite && (mediaQ.data?.length ?? 0) > 0 && (
                    <select className="rounded border border-slate-300 px-2 py-1 text-sm" value="" onChange={(e) => { const m = mediaQ.data!.find((x) => x.url === e.target.value); if (m) setGal(gal.map((x, j) => j === i ? { ...x, full: m.url, thumb: m.url, alt: x.alt || m.alt, width: m.width ?? x.width } : x)); }}>
                      <option value="">pilih dari media library…</option>
                      {mediaQ.data!.map((m) => <option key={m.id} value={m.url}>{m.alt}</option>)}
                    </select>
                  )}
                </div>
                <input data-testid={`gal-alt-${i}`} className={`mb-1 w-full rounded border px-2 py-1 text-sm ${g.active !== false && !g.alt.trim() ? "border-red-400" : "border-slate-300"}`} placeholder="Teks alt (wajib)" value={g.alt} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))} disabled={!canWrite} />
                <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Caption" value={g.cap} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, cap: e.target.value } : x))} disabled={!canWrite} />
                <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-xs" placeholder="URL thumbnail" value={g.thumb} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, thumb: e.target.value } : x))} disabled={!canWrite} />
                {g.type === "img"
                  ? <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-xs" placeholder="URL full" value={g.full ?? ""} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, full: e.target.value } : x))} disabled={!canWrite} />
                  : <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Label video (mis. Video · 4:02)" value={g.videoLabel ?? ""} onChange={(e) => setGal(gal.map((x, j) => j === i ? { ...x, videoLabel: e.target.value } : x))} disabled={!canWrite} />}
                {canWrite && itemControls(g.active, () => setGal(gal.map((x, j) => j === i ? { ...x, active: !x.active } : x)), () => setGal((z) => move(z, i, -1)), () => setGal((z) => move(z, i, 1)), () => setGal(gal.filter((_, j) => j !== i)))}
              </div>
            ))}
            {canWrite && <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setGal([...gal, { type: "img", size: "", full: "", thumb: "", alt: "", cap: "", width: 800, height: 600, active: true }])}>+ Tambah gambar</button>}
          </div>
        ) : key === "paket" ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Hanya teks yang bisa diedit. Angka harga selalu dari tabel Paket &amp; harga — tidak bisa diketik di sini.</p>
            {cards.map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2">
                <div className="text-xs font-bold text-slate-400">{c.key}</div>
                <input data-testid={`paket-name-${i}`} className="mb-1 mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold" placeholder="Nama tampilan" value={c.name} onChange={(e) => setCards(cards.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} disabled={!canWrite} />
                <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Deskripsi singkat" value={c.sub} onChange={(e) => setCards(cards.map((x, j) => j === i ? { ...x, sub: e.target.value } : x))} disabled={!canWrite} />
                <input className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Catatan (harga pakai token {{harga_normal_reguler}})" value={c.note} onChange={(e) => setCards(cards.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} disabled={!canWrite} />
                <div className="mt-1 space-y-1">
                  {c.features.map((f, k) => (
                    <div key={k} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={f.included} onChange={(e) => setCards(cards.map((x, j) => j === i ? { ...x, features: x.features.map((y, z) => z === k ? { ...y, included: e.target.checked } : y) } : x))} disabled={!canWrite} title="termasuk?" />
                      <input className="w-full rounded border border-slate-300 px-2 py-0.5 text-xs" value={f.html} onChange={(e) => setCards(cards.map((x, j) => j === i ? { ...x, features: x.features.map((y, z) => z === k ? { ...y, html: e.target.value } : y) } : x))} disabled={!canWrite} />
                      {canWrite && <button className="text-xs text-red-600" onClick={() => setCards(cards.map((x, j) => j === i ? { ...x, features: x.features.filter((_, z) => z !== k) } : x))}>×</button>}
                    </div>
                  ))}
                  {canWrite && <button className="rounded border border-slate-300 px-2 py-0.5 text-xs" onClick={() => setCards(cards.map((x, j) => j === i ? { ...x, features: [...x.features, { included: true, html: "" }] } : x))}>+ fasilitas</button>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Editor typed untuk section ini menyusul (fase konten lanjutan).</p>}

        {!canWrite && <p className="mt-2 text-xs text-slate-400">Hanya bisa dilihat (butuh izin content:write).</p>}
        {/* Pesan gagal bergaya galat + sukses hijau, DI DEKAT tombol yang ditekan. */}
        {err && <div data-testid="content-error" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</div>}
        {msg && <div data-testid="content-msg" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{msg}</div>}
        <div className="mt-3 flex gap-2">
          <button data-testid="save-draft" disabled={!canWrite} onClick={saveDraft} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Simpan draft</button>
          <button data-testid="publish" disabled={!canPublish} onClick={publish} className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Simpan &amp; Terbitkan</button>
          <button data-testid="revert" disabled={!canPublish || !meta?.canRevert} title={!meta?.canRevert ? "Tidak ada versi sebelumnya" : ""} onClick={revert} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Kembalikan</button>
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
