# HANDOVER — Nena Adventure

Dokumen serah-terima: cara deploy, environment, backup, dan data yang HARUS diisi
owner sendiri. Sistem notifikasi/email tidak dibahas (di luar cakupan rilis ini).

## 1. Arsitektur singkat
- Monorepo npm workspaces:
  - `apps/site` — situs publik (statis, disajikan langsung oleh API).
  - `apps/panel` — panel admin (React/Vite, di-build ke `apps/panel/dist`).
  - `services/api` — Fastify + SQLite (better-sqlite3) + Drizzle.
  - `packages/shared` — tipe & util bersama.
- Satu proses API menyajikan: `/api/*` (API), `/panel/*` (panel dist), `/` (situs publik).

## 2. Deploy
1. `npm install` (root).
2. Siapkan file `.env` di root (lihat bagian 3). JANGAN commit `.env`.
3. `npm run build` — build panel (`apps/panel/dist`) + verifikasi.
4. `npm run migrate` — terapkan migrasi DB (idempoten).
5. `npm run seed` lalu `npm run seed:content` — data awal + konten CMS (idempoten).
   - Alias gabungan: `npm run db:init` (migrate + seed + seed:content).
6. `npm run start -w @nena/api` — jalankan server (baca `PORT`, default 3000).
   - Jalankan di belakang process manager (systemd/pm2) agar auto-restart.
7. Buka `/panel/` → login sebagai owner (kredensial dari `.env`).

Job terjadwal (otomatis saat server hidup, tidak perlu cron OS):
- Kedaluwarsa hold: tiap 60 detik (`startExpiryJob`).
- Purge PII (NIK/tgl lahir) 90 hari pasca keberangkatan: tiap 24 jam.
  - Manual sewaktu-waktu: `npm run job:purge-pii`.

## 3. Environment variables (isi di `.env` root)
WAJIB diisi untuk produksi (nilai contoh di bawah BUKAN nilai asli — ganti semua):

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NODE_ENV` | ya | `production` |
| `PORT` | opsional | Default 3000 |
| `DB_PATH` | opsional | Default `./services/api/data/nena.db` |
| `SESSION_SECRET` | ya | Acak, minimal 16 karakter. Buat baru, rahasia. |
| `ENCRYPTION_KEY` | ya | 64 karakter hex (32 byte). Kunci enkripsi PII (NIK/tgl lahir). **Kalau hilang, data PII lama tak bisa didekripsi.** Simpan aman & backup terpisah. |
| `OWNER_EMAIL` | ya | Email login owner pertama. |
| `OWNER_PASSWORD` | ya | Password owner pertama. Ganti setelah login pertama. |

Catatan SMTP (`SMTP_HOST`, dst.) tidak dikonfigurasi pada rilis ini — biarkan kosong.

Membuat nilai acak:
- `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
- `ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Data yang HARUS diisi owner sendiri (di panel, BUKAN di kode)
Nilai-nilai berikut sengaja TIDAK diisi contoh yang terlihat asli — owner mengisinya:
- **Nomor rekening bank** — Panel → Pengaturan owner → "Rekening BCA".
- **Gambar QRIS** — Panel → Pengaturan owner → field QRIS (unggah PNG/JPG ≤2MB).
  Selama kosong, halaman booking publik menampilkan instruksi transfer manual.
- **Nomor WhatsApp resmi** (primary + sekunder) — Panel → Pengaturan owner.
- **URL peta (Google Maps)** — Panel → Pengaturan owner (harus `https://`).

Situs publik membaca nilai-nilai ini dari API — mengubahnya di panel langsung
mengubah tampilan situs (rekening & QRIS di halaman booking, WA di kontak).

## 5. Backup & restore (SUDAH DIUJI)
- Backup (aman saat server jalan): `npm run backup`
  → `services/api/data/backups/nena-YYYYMMDD-HHMMSS.db`
- Restore (hentikan server dulu): `node scripts/restore-db.mjs <file-backup> --yes`
  (DB lama otomatis disalin ke `*.pre-restore.bak`).
- **Jadwal backup yang disarankan:** harian (mis. cron OS 02:00) + sebelum tiap
  deploy/migrasi. Simpan salinan off-site. Uji restore berkala.

## 6. Operasional & audit
- Semua mutasi tercatat di Audit log (Panel → Audit). PII (NIK, email, password,
  token) diredaksi otomatis dari audit.
- Rekonsiliasi ledger (read-only, deteksi selisih tanpa mengubah data):
  `npm run reconcile:ledger:dry`
- Laporan → tombol "Export CSV" (mengunduh file; tercatat di audit setelah sukses).
  Ada kartu peringatan anomali "selesai tapi ledger < total".

## 7. Migrasi DB
- `drizzle-kit generate` berfungsi kembali (rantai snapshot diperbaiki).
- Alur baku ada di `docs/MIGRATIONS.md`.
- JANGAN mengubah file migrasi yang sudah diterapkan.

## 8. Reseed produksi (JANGAN dijalankan tanpa keputusan owner)
Untuk memulai DB bersih (mis. instalasi produksi baru) — pakai DB kosong lalu:
`npm run db:init`  (migrate + seed + seed:content, idempoten, tidak menghapus baris).
Ini TIDAK menghapus booking/peserta/pembayaran yang sudah ada. Untuk benar-benar
mulai dari nol, arahkan `DB_PATH` ke berkas baru yang belum ada, lalu `db:init`.
