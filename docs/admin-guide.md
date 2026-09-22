# Panduan Admin Nena Adventure (1 halaman)

## Alur booking
Pelanggan (situs) atau admin (**Booking → + Tambah booking**) membuat pesanan →
peserta bayar/transfer → unggah bukti → admin **verifikasi** → siap jalan →
setelah trip: selesai. Uang masuk selalu dari baris **payments** (ledger); kolom
`amountPaid` & sisa kursi dihitung dari ledger, tak pernah diketik manual.

## Arti status booking
- **Baru masuk** — dibuat admin (manual), belum ada tenggat. Admin jalankan transisi berikut.
- **Menunggu bayar** — menunggu pembayaran/DP; ada tenggat hold.
- **Verifikasi bukti** — bukti masuk, menunggu admin verifikasi.
- **Menunggu pelunasan** — DP disetujui, sisa dibayar paling lambat H-3.
- **Siap jalan** — lunas & terkonfirmasi; e-voucher terbit.
- **Selesai** — trip selesai.
- **Kadaluarsa** — hold lewat batas, kursi dilepas otomatis.
- **Batal** — dibatalkan; refund (bila ada) tercatat sebagai baris payments negatif.

## Verifikasi bukti
**Verifikasi bukti** (antrian) atau **Booking → Detail**: lihat thumbnail bukti →
**Setujui DP / Setujui pelunasan** (menyebut nominal & kode) atau **Tolak bukti**
(wajib alasan). Hanya transisi legal yang aktif; sisanya nonaktif dengan alasan.

## Ubah konten situs
**Konten situs**: pilih section (Hero, Paket, Itinerary, Galeri, Destinasi,
Keselamatan, dst) → edit teks → **Simpan draft** atau **Simpan & Terbitkan** →
**Kembalikan** untuk versi sebelumnya. Angka harga tak bisa diketik — selalu dari
tabel **Paket & harga**. Media untuk galeri dari **Media library** (alt wajib).

## Arsipkan jadwal
**Jadwal**: jadwal tanpa booking bisa **Hapus**; jadwal yang punya riwayat booking
**tidak bisa dihapus** (data transaksi dilindungi) — pakai **Arsipkan** agar tak tampil.

## Pengaturan
**Pengaturan owner**: rekening, biaya layanan, DP%, cutoff, **nomor WhatsApp
(primer & sekunder)**, dan **URL peta**. Semua CTA WhatsApp di situs membacanya.

## Job berkala (otomatis, tercatat di Audit)
- Kedaluwarsakan hold lewat tenggat (tiap menit) → audit `holds_expired` (+jumlah).
- Purge PII 90 hari pasca keberangkatan → audit `pii_purged` (+jumlah). NIK dikosongkan, baris tetap.

## Backup & restore (SQLite)
- Backup: `npm run backup` → `services/api/data/backups/nena-<stamp>.db` (aman saat server jalan).
- Restore: hentikan server, lalu `npm run restore <file-backup> --yes` (DB lama diamankan ke `.pre-restore.bak`).

## Laporan
**Laporan**: pendapatan bersih per bulan (verified − refund dari ledger), booking per
status, kursi terjual per jadwal. **Export CSV** minta konfirmasi & tercatat di audit.
