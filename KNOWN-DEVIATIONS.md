# KNOWN DEVIATIONS dari baseline pre-1a

Penyimpangan hanya boleh untuk perbaikan **visual/CSS**, tidak pernah untuk konten
(DOM/teks). Setiap penyimpangan wajib: DOM/teks tetap 0.0000% terhadap pre-1a, hanya
dimensi piksel yang divergen, dan disetujui PM lebih dulu. Satu entri per penyimpangan.

---

## registrasi (`#/registrasi` — `.tflow`)

- **Kapture parity terdampak:** `1440/registrasi`, `390/registrasi` (dimensi PIKSEL saja).
- **Dimensi DOM/teks:** tetap **0.0000%** (wajib) — markup tidak berubah satu byte pun.
- **Tanggal:** 2026-09-22
- **Aturan CSS yang ditambahkan** (`apps/site/styles/01-base.css`, setelah `#view-home .tflow p`):

  ```css
  #view-home .tflow li > b, #view-home .tflow li > p{grid-column:2}
  ```

- **Diff perilaku:** `.tflow li` memakai `display:grid; grid-template-columns:36px 1fr`
  dan berisi 3 grid item: `::before` (nomor), `<b>` (judul), `<p>` (deskripsi).
  Tanpa aturan ini, auto-flow menaruh `::before`→(baris1,kol1), `<b>`→(baris1,kol2),
  `<p>`→(baris2,**kol1 36px**) sehingga deskripsi tampil satu kata per baris.
  Aturan baru memaksa `<b>` dan `<p>` ke kolom 2 (deskripsi kembali lebar penuh).
- **Alasan:** bug laten yang DIWARISI dari pre-1a (markup + CSS pre-1a identik).
  `#/registrasi` menjelaskan cara pembayaran ke calon pembeli; membiarkannya rusak
  demi angka parity 0 menukar pendapatan dengan metrik internal.
- **Disetujui oleh:** PM (keputusan fix/11a, Opsi 1 dengan syarat).
- **Baseline:** pre-1a TIDAK disentuh; tidak ada `--regen-baseline`.
