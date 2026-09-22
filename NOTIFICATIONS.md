# Notifikasi Email

Kanal notifikasi = **EMAIL SAJA**. WhatsApp **bukan** kanal notifikasi otomatis.

## Kanal & WhatsApp
- WhatsApp otomatis (template teks tagihan lewat `wa.me?text=…`) DIHAPUS dari sistem.
- Yang DIPERTAHANKAN: link WhatsApp **kontak manual** (click-to-chat tanpa teks
  template) di detail booking & detail peserta, plus kolom nomor WhatsApp peserta.
  WhatsApp = kanal kontak manual, bukan kanal notifikasi.
- Template lama tidak dihapus. Field `channel` legacy (mis. `wa`) pada template
  tersimpan **diabaikan sepenuhnya** — tak ada code path yang membacanya; semua
  template kini dirender & dikirim sebagai email. `listTemplates()` selalu
  mengembalikan `channel: "email"`.

## Transport
- nodemailer, `smtp.gmail.com:587` (STARTTLS), auth **App Password**.
- Kredensial HANYA di `.env` (di-gitignore). JANGAN pernah menaruh kredensial di
  kode, commit, log, atau screenshot. Owner mengisi `.env` sendiri (lihat `.env.example`).

## Setup Gmail (dilakukan OWNER)
1. Aktifkan **2FA** di Akun Google.
2. Buat **App Password** (Google Account → Security → App passwords), 16 karakter.
3. Isi `.env`: `SMTP_USER` = alamat Gmail, `SMTP_PASS` = App Password (tanpa spasi),
   `MAIL_FROM` = **sama dengan** `SMTP_USER` (syarat Gmail), `MAIL_FROM_NAME` = nama tampilan.

## ENV
| Variabel | Default | Keterangan |
|---|---|---|
| `SMTP_HOST` | — | `smtp.gmail.com` |
| `SMTP_PORT` | 587 | STARTTLS |
| `SMTP_USER` | — | alamat Gmail |
| `SMTP_PASS` | — | App Password 16 char |
| `MAIL_FROM` | — | = `SMTP_USER` untuk Gmail |
| `MAIL_FROM_NAME` | — | nama pengirim tampilan |
| `NOTIFY_MODE` | `dryrun` | `off` \| `dryrun` \| `live` |
| `NOTIFY_REDIRECT_TO` | — | alihkan SEMUA penerima ke alamat ini (uji) |
| `NOTIFY_MAX_PER_HOUR` | 60 | batas kirim per jam |

## Matriks mode
| Mode | Perilaku |
|---|---|
| `off` | Tidak render-kirim; baris outbox `skipped` (mode off). |
| `dryrun` | Render + simpan ke outbox, **tidak** dikirim (`skipped`). Default dev. |
| `live` | Kirim via SMTP. Sukses `sent`, gagal retry (maks 3) lalu `failed`. |

**Gerbang keamanan:**
- Booking `is_test=1` **selalu dipaksa dryrun** — tak pernah kirim live.
- `NOTIFY_REDIRECT_TO` terisi → semua email dialihkan ke sana; alamat asli di header
  `X-Original-To` dan subjek diberi awalan `[REDIRECT]`.
- `NOTIFY_MAX_PER_HOUR` membatasi kirim live per jam.

## Trigger (email)
| Template | Pemicu |
|---|---|
| `booking_confirmation` | Otomatis saat booking web dibuat |
| `invoice` | Aksi admin (modal konfirmasi) |
| `proof_rejected` | Otomatis saat bukti ditolak (wajib `{{alasan}}`) |
| `settlement` | Job terjadwal (booking `menunggu_pelunasan`) |
| `evoucher` | Otomatis saat status `siap_jalan` |
| `cancellation` | Otomatis saat pembatalan (termasuk `{{refund}}`) |

Semua trigger idempoten pada `(booking_id, template_key, state_transition)` — restart/
retry tidak menggandakan kiriman. Retry backoff maksimal 3× (job tiap 5 menit).

## Placeholder
`{{kode}} {{nama}} {{tanggal}} {{paket}} {{total}} {{dibayar}} {{sisa}} {{alasan}}
{{refund}} {{titik_kumpul}} {{jam_kumpul}}`. Menyimpan template dengan placeholder tak
dikenal DITOLAK.

## Kuota Gmail — RISIKO PRODUKSI
Gmail membatasi ~**500 email/hari** (akun biasa). Untuk volume produksi, PINDAH ke
provider transaksional (mis. SendGrid / Amazon SES / Postmark) sebelum launch —
cukup ganti `SMTP_HOST/PORT/USER/PASS` di `.env`, tak ada perubahan kode.

## Uji aman
- Set `NOTIFY_MODE=dryrun` (default) untuk render tanpa kirim; cek "Riwayat notifikasi".
- Atau `NOTIFY_MODE=live` + `NOTIFY_REDIRECT_TO=email-anda` agar semua email masuk ke
  satu kotak uji, bukan ke pelanggan.
- Tombol "Kirim email uji" (owner-only) di Template notifikasi mengirim ke email owner.
