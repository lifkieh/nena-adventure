# Nena Adventure

Monorepo (npm workspaces) untuk Nena Adventure: situs publik statis, API backend, dan panel admin.

## Struktur folder

```
nena-adventure/
├── apps/
│   ├── site/                ← situs publik (index.html modular + styles/ + src/ + assets/)
│   └── panel/               ← panel admin (Vite + React + TypeScript)
├── services/
│   └── api/                 ← API (Fastify + Drizzle + SQLite)
├── packages/
│   └── shared/              ← tipe + skema Zod dipakai bersama api & panel
├── scripts/parity.mjs       ← gate parity visual situs (Playwright)
└── README.md
```

Aset situs kini di `apps/site/assets/` (bukan lagi `assets/` di root — sesuaikan path pada tabel aset di bawah). Foto isi masih memakai stok Unsplash sementara.

## Perintah (dari root)

```
npm install            # sekali; membangun better-sqlite3 native
npm run dev            # api :3000 (sekaligus menyajikan apps/site) + panel :5173
npm run migrate        # terapkan migrasi DB
npm run seed           # data awal (owner, settings, dll)
npm run typecheck      # tsc semua workspace
npm run test           # vitest (arsitektur, MIME statis, enum, dst.)
npm run parity         # gate parity visual situs (lihat bawah)
```

Buka: situs `http://localhost:3000/`, health `http://localhost:3000/api/health`, panel `http://localhost:5173/panel/`.

## Parity gate (`npm run parity`)

Membuktikan situs tetap tampil IDENTIK setelah perubahan. Untuk tiap sub-halaman + langkah
booking, pada viewport 1440 & 390: bandingkan outerHTML ternormalisasi (harus 0 selisih) dan
screenshot full-page (diff piksel harus < 0.1%) terhadap sebuah baseline git.

```
npm run parity                          # baseline default: tag `pre-1a` (monolith beku)
npm run parity -- --baseline main       # bandingkan terhadap branch/tag/sha lain
npm run parity -- --baseline=<ref>      # bentuk =  juga didukung
```

Baseline di-checkout otomatis lewat `git worktree`, disajikan bersama working tree, lalu
dirender headless dengan Math.random/Date/timer/scroll dibekukan + jaringan eksternal diblok
supaya kedua build identik. Gagal → exit 1 + artefak di `.parity-out/`.

Sejak Fase 3 sisi refactor **disajikan oleh API** (DB parity ter-seed `seed:parity`), sedangkan
baseline disajikan statis dari worktree. Pemulihan kursi antar-viewport dilakukan lewat **reset
fixture penuh** (`seed:parity` membangun ulang seluruh jadwal) — BUKAN dengan menghapus baris
`seat_ledger` secara diam-diam.

**Elemen yang di-mask di harness** (nilainya bergantung jam/kode server, jadi berbeda antar-run):

| Elemen | Alasan | Perlakuan |
|---|---|---|
| `#timer` | dihitung dari jam server (tak beku) | `display:none` (piksel) + isi dinormalkan jadi `TIMER` (DOM) |
| `#kode` | kode `NA-xxxxxx` acak server | `display:none` (piksel) + dinormalkan jadi `NA-XXXXXX` (DOM) |

`display:none` (bukan `visibility:hidden`) dipakai agar lebar elemen tidak menggeser teks di
sekitarnya. **Angka sisa kursi TIDAK di-mask** — dibandingkan apa adanya (fixture `seed:parity`
membuatnya identik dengan nilai lama), sehingga selisih kursi tetap tertangkap.

Harness ini permanen: **Fase 5** akan memakainya untuk membuktikan situs yang membaca konten
dari API tampil identik dengan situs yang membaca dari file data — cukup arahkan `--baseline`
ke commit situs-baca-file.

## Autentikasi, RBAC & audit (Fase 2)

Panel admin tertutup sesi. Sesi disimpan sebagai cookie **httpOnly** (`nena_session`),
`SameSite=Lax`, `Secure` saat produksi. Token 32-byte acak; DB hanya menyimpan hash SHA-256.
Panel **tidak** menyimpan token apa pun di localStorage.

- Password: scrypt (`node:crypto`), N=2^15, r=8, p=1, salt 16-byte, verifikasi timing-safe.
  Parameter tersimpan di dalam hash → bisa dinaikkan tanpa memecah hash lama.
- Idle timeout 8 jam, absolute timeout 7 hari (dari `settings`, bisa diubah).
- Login: rate limit 5 gagal / 15 menit per (IP+email) → 429; pesan gagal seragam
  (tidak membocorkan email terdaftar/tidak); jeda acak 100–300ms.
- Otorisasi: `requireAuth` + `requirePermission(perm)`. Semua `/api/admin/**` wajib izin
  (ada test yang gagal bila ada route admin tanpa deklarasi izin).
- Audit log: login sukses/gagal, logout, ganti password, perubahan role, CRUD user.
  NIK, password hash, dan token TIDAK PERNAH masuk audit (diredaksi).

### Role & izin (ringkas)

| Role | Ringkasan izin |
|------|----------------|
| owner | semua |
| admin | semua kecuali `user:manage` & `settings:write` (rekening/biaya/DP/cutoff = owner) |
| operasional | booking (read/write/cancel), schedule (read/write), content:read, payment:read, report:read |
| keuangan | booking:read/refund, payment read/verify/refund, report:read |
| viewer | read-only (TANPA `participant:read_pii`) |

`participant:read_pii` & `participant:export` hanya owner & admin.

### Endpoint auth

```
POST /api/auth/login            { email, password }  -> set cookie, balas { user, permissions }
POST /api/auth/logout           -> hapus sesi
GET  /api/auth/me               -> { user, permissions efektif }
POST /api/auth/change-password  { currentPassword, newPassword }  (cabut sesi lain)
GET  /api/admin/users ...       CRUD user (izin user:manage)
GET  /api/admin/audit-logs      filter entity/actor/tanggal + paginasi (izin user:read)
```

### Menyajikan panel

Panel adalah SPA build (Vite, base `/panel/`). API menyajikannya di prefix `/panel`:

- `npm run build` — build panel ke `apps/panel/dist` + verifikasi artefak.
- Lalu jalankan API (`npm run dev` atau `npm start -w @nena/api`) → panel tayang di
  **http://localhost:3000/panel/** (`/panel/**` fallback ke index panel; `/panel/assets/**`
  MIME benar). Situs publik tetap di `/`, API di `/api`. Ketiganya tidak saling menangkap.
- Kalau `dist` belum ada, `/panel/**` membalas **503 "panel belum di-build"** (tidak diam-diam
  jatuh ke situs publik).
- Dev alternatif: `npm run dev:panel` (Vite di `http://localhost:5173/panel/`, proxy `/api` → 3000).

### QA — cara masuk (URL terverifikasi)

- URL login: **http://localhost:3000/panel/login** (setelah `npm run build`).
  Dev: `http://localhost:5173/panel/login`.
- Owner produksi: dari `.env` — `OWNER_EMAIL` / `OWNER_PASSWORD` (default dev: `owner@nena-adventure.id` / `nena-dev-2026`). `npm run seed` melakukan upsert owner sesuai `.env`.
- Akun demo per role (password acak dicetak ke terminal, TIDAK ikut seed produksi):

  ```
  npm run seed:demo-users
  ```

  Membuat `demo-owner@`, `demo-admin@`, `demo-operasional@`, `demo-keuangan@`,
  `demo-viewer@` (domain `.test`) untuk menguji pembatasan izin dari sisi UI.

## Booking engine (Fase 3)

Server jadi otoritas harga & kursi. Situs publik membaca jadwal/kursi dari API.

- Harga: tabel `packages` + `package_tiers`; biaya layanan/DP/hold/ambang di `settings`.
  Server menghitung ulang total & MENOLAK bila `clientTotal` tidak cocok.
- Kursi: `seat_ledger` append-only, sisa = `capacity - SUM(delta)`. Semua perubahan
  kursi + status dalam SATU transaksi `BEGIN IMMEDIATE` (WAL + busy_timeout). Tidak ada counter.
- Status: 8 status (`baru_masuk`…`selesai`/`kadaluarsa`/`batal`) via mesin transisi eksplisit
  (`usecases/booking/transition.ts`); transisi tak terdaftar ditolak. Refund H-7+ 80% / H-3..6 50% / <H-3 0%.
- Job kedaluwarsa: interval tiap menit + evaluasi lazy saat `/schedules` dibaca; idempoten (tak double-release).

Endpoint publik:
```
GET  /api/public/schedules              tanggal + sisa kursi + label + publicNote (open & belum lewat)
POST /api/public/bookings               buat booking (Zod, harga server, hold kursi, kode NA- unik DB)
                                         header Idempotency-Key -> pengiriman ulang = booking sama
GET  /api/public/bookings/:code?token=  ringkasan + sisa hold (halaman langkah 4 tahan refresh)
```
Endpoint admin (izin RBAC): `GET/POST /api/admin/bookings`, `:id` detail (NIK utuh hanya
`participant:read_pii`), `:id/history`, `:id/send-invoice`, `:id/transition`, `:id/cancel`.

Fixture parity: `npm run seed:parity` mengisi jadwal agar sisa kursi = nilai lama, sehingga
`npm run parity` tetap 0 selisih DOM meski angka kini dari DB. E2E alur situs: `npm run test:e2e`.

## Pembayaran, voucher, PII (Fase 4)

- **Upload bukti** (publik): `POST /api/public/bookings/:code/proof` (header `X-Booking-Token`,
  multipart 1 file). Divalidasi via **magic bytes** (jpg/png/pdf), maks 5MB, nama di-generate
  ulang (ULID), disimpan di `services/api/data/uploads` (di luar direktori publik). Memindahkan
  status ke `verifikasi_bukti`. Upload ulang boleh (versi lama tetap tersimpan).
- **Media**: `GET /api/admin/media/:id` — butuh sesi + `payment:read`. Tidak ada URL tebak-tebakan.
- **Verifikasi**: `GET /api/admin/payments/queue`, `/:id`, `POST /:id/approve`, `/:id/reject`
  (`payment:verify`). Approve/reject lewat state machine. Provider di balik `PaymentProvider`
  (implementasi `manual`).
- **E-voucher**: terbit otomatis saat `siap_jalan`; halaman publik ber-token `/voucher.html?code=&token=`
  (versi cetak), kedaluwarsa H+7. Terbit ulang: `POST /api/admin/bookings/:id/reissue-voucher`
  (mencabut tautan lama, tercatat audit).
- **PII**: NIK & tanggal lahir dienkripsi AES-256-GCM (kunci `ENCRYPTION_KEY`, IV per record).
  `idNumberLast4` plaintext. Dibuka utuh hanya di `GET /api/admin/bookings/:id/pii`
  (`participant:read_pii`) dan tiap pembukaan tercatat audit (tanpa memuat NIK). Job harian +
  `npm run job:purge-pii` menghapus NIK 90 hari pasca keberangkatan (idempoten).
- **Export Zurich**: `GET /api/admin/exports/zurich?date=YYYY-MM-DD` (`participant:export`) → CSV
  UTF-8 + BOM. Menolak bila ada peserta tak lengkap (menyebut kode booking). Tiap export teraudit.
- **Laporan**: `GET /api/admin/reports/summary?from=&to=` (`report:read`) — omzet per paket, pax
  terangkut, kadaluarsa vs batal, piutang DP.

Catatan izin: `viewer` TIDAK punya `payment:read` (bukti bayar = data finansial).

---

## Panduan aset (foto/video/logo)

## Cara pasang aset asli

1. Simpan file ke folder yang sesuai dengan nama file **persis** seperti tabel di bawah (biar gampang, tapi boleh juga pakai nama lain lalu bilang ke saya).
2. Kirim ke saya / beri tahu foldernya sudah terisi — saya akan update path di `index.html` supaya foto stok Unsplash diganti ke file asli.

### Logo — `assets/logo/`

| File | Kegunaan |
| --- | --- |
| `logo-mark.svg` atau `.png` | Logo utama (dipakai di header, footer, dan sidebar admin). Idealnya SVG background transparan. |
| `logo-mark-white.svg` atau `.png` | Versi putih/monokrom untuk dipasang di atas foto/background gelap (footer, sidebar admin). |
| `favicon.png` (32×32 atau 64×64) | Ikon tab browser. |

### Foto hero — `assets/images/hero/`

| File | Ukuran disarankan | Dipakai di |
| --- | --- | --- |
| `hero-main.jpg` | ±1800×1200px (landscape), area laut/pantai Sangiang dari atas | Banner utama paling atas beranda |

### Foto destinasi — `assets/images/destinasi/`

Satu foto berkualitas baik per titik sudah cukup (dipakai otomatis untuk thumbnail dan tampilan detail). Ukuran disarankan ±1600×1200px, orientasi bebas menyesuaikan objeknya.

| File | Destinasi |
| --- | --- |
| `turtle-area.jpg` | Turtle Area |
| `tembuyung-beach.jpg` | Tembuyung Beach |
| `legon-bajo.jpg` | Legon Bajo |
| `legon-waru.jpg` | Legon Waru (khusus Private Trip) |
| `mangrove-river.jpg` | Mangrove River |
| `desa-sangiang.jpg` | Desa Sangiang |
| `hutan-hujan.jpg` | Hutan Hujan Pulau Sangiang |
| `goa-kelelawar.jpg` | Goa Kelelawar |
| `puncak-begal.jpg` | Puncak Begal |
| `puncak-harapan.jpg` | Puncak Harapan |
| `krakatoa-view.jpg` | Krakatoa View (khusus Private Trip) |
| `sepanjang-beach.jpg` | Sepanjang Beach |

*(Opsional: kalau punya lebih dari satu foto per titik, boleh tambah `-2.jpg`, `-3.jpg` — nanti dipasang sebagai foto tambahan di galeri detail titik tersebut.)*

### Galeri — `assets/images/gallery/`

| File | Catatan |
| --- | --- |
| `gallery-01.jpg` … `gallery-08.jpg` | 8 foto bebas dari dokumentasi trip sebelumnya |
| `gallery-video-1-cover.jpg`, `gallery-video-2-cover.jpg` | Thumbnail untuk 2 slot video di galeri |

### Video — `assets/video/`

| File | Kegunaan |
| --- | --- |
| `profil-nena-adventure.mp4` | Video singkat di section galeri / banner "Booking sekarang" |
| `highlight-trip.mp4` | Video cuplikan trip (opsional, slot video kedua di galeri) |

Format MP4 (H.264) resolusi 1080p, durasi pendek (idealnya di bawah 30 detik per video) supaya loading tetap cepat. Kalau videonya sudah di-upload ke YouTube/Instagram, kirim saja link-nya — tidak perlu file mentah.

### Foto pendukung lain

| File | Folder | Kegunaan |
| --- | --- | --- |
| `feature-mockup.jpg` | `assets/images/feature/` | Foto besar di section "Adventure yang bikin kangen pulang" |
| `anyer.jpg`, `jakarta.jpg`, `tangerang.jpg`, `stasiun-serang.jpg` | `assets/images/adventure/` | Foto lingkaran meeting point |

## Catatan teknis

- `index.html` tidak butuh proses build — buka langsung di browser atau upload ke hosting statis mana pun (GitHub Pages, Netlify, Vercel, cPanel, dll).
- Semua styling dan interaksi (routing beranda/booking/admin, kalkulasi harga, filter tab, dll.) ada di dalam file yang sama, jadi tidak perlu takut ketinggalan file lain saat upload.
