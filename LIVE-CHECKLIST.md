# LIVE-CHECKLIST — Menyalakan Email Notifikasi (dijalankan OWNER)

Urutan WAJIB. Jangan lompat. **Selalu mulai dari REDIRECT sebelum LIVE.**
Jangan pernah menaruh kredensial di kode/commit/chat — hanya di `.env`.

## 0. Prasyarat
- [ ] Punya akun Gmail untuk pengirim.
- [ ] Aktifkan 2FA di akun Google tersebut.
- [ ] Buat **App Password** (Google Account → Security → App passwords) — 16 karakter.

## 1. Isi `.env` (jangan commit)
- [ ] `SMTP_HOST=smtp.gmail.com`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USER=<alamat-gmail>`
- [ ] `SMTP_PASS=<app-password-16-karakter-tanpa-spasi>`
- [ ] `MAIL_FROM=<alamat-gmail-yang-sama-dengan-SMTP_USER>`
- [ ] `MAIL_FROM_NAME=Nena Adventure`

## 2. AMANKAN DULU — redirect, JANGAN live dulu
- [ ] `NOTIFY_REDIRECT_TO=<email-uji-milikmu>`  ← isi INI dulu
- [ ] `NOTIFY_MODE=live`  ← baru set live SETELAH redirect terisi
- [ ] `NOTIFY_MAX_PER_HOUR=60` (atau lebih rendah saat uji)
- [ ] Restart server.

Dengan redirect terisi, SEMUA email (termasuk ke pelanggan) dialihkan ke email ujimu;
subjek diawali `[REDIRECT]`, alamat asli ada di header `X-Original-To`. Pelanggan TIDAK
menerima apa pun selama tahap ini.

## 3. Uji terkendali
- [ ] Panel → Template notifikasi → "Kirim email uji" (owner-only). Cek email ujimu.
- [ ] Buat 1 booking uji (atau pakai yang `is_test=1`). Catatan: booking `is_test=1`
      SELALU dryrun — untuk uji live pakai booking non-test.
- [ ] Verifikasi tiap trigger di email ujimu: konfirmasi (buat booking web), tagihan
      (aksi admin), bukti ditolak (tolak bukti), e-voucher (approve → siap_jalan),
      pembatalan (batal).
- [ ] Cek Panel → Riwayat notifikasi: status `Terkirim`, mode `live`.

## 4. Buka ke pelanggan asli (HANYA setelah tahap 3 mulus)
- [ ] Kosongkan `NOTIFY_REDIRECT_TO` (hapus barisnya).
- [ ] Pastikan `NOTIFY_MODE=live`.
- [ ] Restart server.
- [ ] Kirim 1 email uji ke dirimu sendiri via booking milikmu, konfirmasi tampilannya.

## 5. Catatan produksi
- Kuota Gmail ~500 email/hari. Untuk volume lebih tinggi, pindah ke provider
  transaksional (SendGrid/SES/Postmark) — cukup ganti `SMTP_*` di `.env`, tanpa ubah kode.
- Matikan sementara: `NOTIFY_MODE=off` (tak ada email dikirim; tercatat `skipped`).
- Semua pengiriman tercatat di Panel → Riwayat notifikasi + Audit log.

## Rollback cepat
- Set `NOTIFY_MODE=dryrun` (atau `off`) + restart. Tak ada email keluar.
