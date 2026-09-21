# Rencana CMS per-section (lanjutan Fase 6a)

Konteks: FAQ sudah tembus sebagai pola bukti (typed editor add/hapus/urut/aktif,
dikonsumsi situs, parity 0.0000%, ada test UI + test negatif). Enam section sisa
di bawah, **diurutkan dari yang paling aman ke paling berisiko**. Prinsip tetap:

- Angka harga di section **paket** WAJIB berasal dari tabel `packages` (+ `package_tiers`),
  diformat `formatRupiah` saat render — **tidak pernah** disalin jadi teks konten.
- Setiap section: DTO mapper (tak ada row DB mentah keluar), editor bertipe di panel,
  situs mengonsumsi via `/api/public/content`, dan **parity publik wajib tetap 0.0000%**
  (render dari seed = markup lama, verbatim, seperti FAQ).
- Tiap section dapat minimal satu test UI (ubah 1 item → tampil di situs → kembalikan)
  + satu test negatif (hapus/ubah item → render beda) seperti pola FAQ.

---

## 1. `syarat` — Syarat, Ketentuan & Kebijakan  · RISIKO: SANGAT RENDAH · ~0,5 hari

Markup: `<div class="accord">` berisi beberapa `<details>` (grup), tiap grup punya
`<summary>` + `<ul><li>…</li></ul>` daftar poin teks polos. Pola identik FAQ.

Skema:
```jsonc
{ "groups": [ { "title": "string", "open": true, "items": ["string", ...] } ] }
```
Risiko parity: minim — hanya teks yang di-`esc`, tak ada harga/aset/SVG dinamis.
Reuse fungsi render bergaya `faqHtml`. Ini kandidat pertama setelah FAQ.

## 2. `testimoni` — Ulasan peserta  · RISIKO: RENDAH · ~0,5 hari

Markup: `<div class="revs">` berisi `<article class="rev">`: bintang (★ diulang
sesuai rating), `<blockquote>` kutipan, `.rev-who` (inisial avatar = huruf pertama
nama, nama, meta "Paket, Bulan Tahun").

Skema:
```jsonc
{ "items": [ { "rating": 5, "quote": "string", "name": "string", "meta": "string" } ] }
```
`avatarInitial` diturunkan dari `name[0]` saat render (bukan disimpan). Teks-only.
Risiko parity: rendah (hanya perlu pastikan pengulangan ★ dan inisial persis).

## 3. `itinerary` — Susunan hari  · RISIKO: MENENGAH · ~1 hari

Markup: `<div class="accord">` 3 `<details>` (satu per paket), tiap grup `<ol class="itin">`
dengan `<li><time class="num">07.00</time><div><h4>Aktivitas</h4></div></li>`.

Skema:
```jsonc
{ "trips": [ { "title": "string", "open": true,
              "steps": [ { "time": "07.00", "activity": "string" } ] } ] }
```
Risiko parity: menengah — markup bertingkat (ol/li/time/div/h4) harus verbatim,
tapi semuanya teks. Tidak ada harga/aset. Perlu hati-hati pada whitespace/indentasi.

## 4. `kontak` — Meeting point / lokasi  · RISIKO: MENENGAH · ~1 hari

Markup: `<ul class="addr">` daftar poin, tiap poin **SVG ikon tetap** + `<b>judul</b>`
+ `<p>isi</p>`; lalu `.mapbox` `<iframe src=…>` + tombol "Buka di Google Maps".

Skema:
```jsonc
{ "points": [ { "icon": "pin|calendar|phone|clock", "title": "string", "body": "string" } ],
  "mapEmbedUrl": "string", "mapLinkUrl": "string" }
```
Ikon dari **set enum tetap** (SVG di render, bukan disimpan sebagai HTML) — cegah
injeksi & jaga byte-parity. Risiko: iframe `src` + tombol href harus persis; teks poin
bebas. Validasi URL map (whitelist host google maps).

## 5. `galeri` — Galeri foto/video  · RISIKO: MENENGAH-TINGGI · ~1,5–2 hari

Markup: `<div class="gal">` berisi `<button>` per item dengan kelas ukuran (`w2`,`h2`,`w2 h2`),
`data-type=img|vid`, `data-src` (full), `data-cap`, `<img loading=lazy width height src>` (thumb),
untuk video ada overlay `.play` + `.lbl "Video · 4:02"`. Lightbox JS baca `data-*`.

Skema:
```jsonc
{ "items": [ { "type": "img|vid", "size": "|w2|h2|w2 h2",
              "full": "url", "thumb": "url", "alt": "string",
              "cap": "string", "videoLabel": "4:02" } ] }
```
Risiko parity: menengah-tinggi — (a) butuh integrasi **media library** (upload/pilih,
delete + reorder + tolak-hapus-jika-dipakai), (b) atribut `width/height/loading` &
kelas ukuran harus verbatim, (c) baseline pakai URL Unsplash eksternal; render harus
mempertahankan URL yang sama persis agar DOM cocok (piksel bisa beda karena jaringan
diblok di harness — tetap andalkan DOM diff + masking bila perlu). Butuh keputusan:
tetap URL eksternal (aman untuk parity) atau pindah ke media lokal (butuh regen fixture).

## 6. `paket` — Paket & harga  · RISIKO: TINGGI · ~2–3 hari

Markup paling kompleks: 3 `<div class="pkg">` (judul, sub, `.pkg-price`, `.pkg-note`,
`<ul class="feat">` daftar fitur dengan **SVG centang/silang** per baris, tombol CTA),
lalu 2 tabel harga (`Open Trip Premium` per meeting point; `Private Trip Premium` per tier).

Skema **konten** (editorial saja — TANPA angka harga):
```jsonc
{ "cards": [ { "key": "reguler|premium|private", "title": "string", "sub": "string",
              "note": "string", "highlight": false, "tag": "string|null",
              "features": [ { "included": true, "text": "string" } ], "ctaKey": "reguler" } ] }
```
Harga & tabel **100% diturunkan dari `packages`**:
- `.pkg-price` angka utama = `formatRupiah(packages[key].prices.anyer)` (atau tier termurah untuk private).
- Tabel meeting point = proyeksi `packages['premium'].prices` (+ baris "harga normal" bila disimpan
  di packages sebagai metadata, kalau tidak → tetap teks statis non-harga).
- Tabel tier = proyeksi `package_tiers` (private).

Risiko parity: **tertinggi** — (a) SVG inline centang/silang harus verbatim,
(b) format angka `Rp385.000` harus sama persis dengan `formatRupiah`, (c) sinkronisasi
dua sumber (konten editorial + harga dari packages) tanpa menggeser 1 byte. Perlu test
khusus: ubah harga di tabel `packages` → kartu paket & tabel ikut berubah, dan **booking
lama tidak berubah** (sudah ada test harga di admin-ops). Kerjakan paling akhir, dengan
regen fixture parity hanya lewat jalur `--regen-baseline --reason` bila markup lama pun
harus disesuaikan (idealnya tidak).

---

### Ringkas urutan & estimasi

| # | Section    | Risiko            | Estimasi   | Aset/harga khusus |
|---|-----------|-------------------|-----------|-------------------|
| 1 | syarat    | sangat rendah     | ~0,5 hari | tidak ada |
| 2 | testimoni | rendah            | ~0,5 hari | tidak ada |
| 3 | itinerary | menengah          | ~1 hari   | tidak ada |
| 4 | kontak    | menengah          | ~1 hari   | ikon enum, iframe map |
| 5 | galeri    | menengah-tinggi   | ~1,5–2 hari | media library |
| 6 | paket     | tinggi            | ~2–3 hari | **harga dari tabel packages** |

Total kasar: ~6,5–8 hari kerja. Rekomendasi: kirim per-batch (1–2 → 3–4 → 5 → 6),
tiap batch lengkap dengan editor + konsumsi situs + test UI + parity 0.0000% sebelum lanjut.
