# Migrasi Database

DB: SQLite (better-sqlite3) + Drizzle. Migrasi = file SQL di `services/api/drizzle/`
+ entri di `services/api/drizzle/meta/_journal.json`. Runtime `npm run migrate`
menjalankan migrasi yang belum diterapkan (baca journal + file SQL).

`drizzle-kit generate` SUDAH berfungsi lagi (rantai snapshot 0005–0011 diperbaiki:
setiap snapshot kini punya `id` unik dan `prevId` berantai; snapshot 0010/0011
mencerminkan skema terkini). `generate` sekarang melaporkan "No schema changes"
saat skema selaras.

## Jalur A — perubahan skema via drizzle-kit (disarankan)
1. Ubah `services/api/src/db/schema.ts`.
2. `npm run generate -w @nena/api` → menghasilkan `NNNN_<slug>.sql` + snapshot + entri journal.
3. Tinjau SQL yang dihasilkan.
4. (Opsional) tambahkan backfill data sebagai statement tambahan di file SQL,
   dipisah `--> statement-breakpoint`. Untuk transformasi yang tak bisa di-SQL murni
   (mis. normalisasi/enkripsi), tulis langkah idempoten di `migrate-guards.ts` dan
   panggil dari `migrate.ts` (contoh: `normalizeParticipantPhones`).
5. `npm run migrate`.
6. Commit file SQL + snapshot + journal.

## Jalur B — hand-authored SQL (untuk backfill kompleks / kontrol penuh)
Dipakai bila perlu SQL khusus (contoh 0010/0011). Checklist:
1. Buat `services/api/drizzle/NNNN_<slug>.sql` (NNNN = indeks berikutnya, 4 digit).
   - DDL + backfill; pisahkan tiap statement dengan baris `--> statement-breakpoint`.
   - JANGAN menghapus baris transaksional.
2. Tambah entri ke `services/api/drizzle/meta/_journal.json`:
   `{ "idx": NNNN, "version": "6", "when": <ms epoch naik>, "tag": "NNNN_<slug>", "breakpoints": true }`
3. Selaraskan skema Drizzle (`schema.ts`) dengan hasil akhir DDL (agar `generate`
   berikutnya bersih).
4. Perbarui snapshot agar `generate` tetap sehat:
   `npm run generate -w @nena/api` → bila melaporkan "No schema changes", snapshot
   sudah selaras. Bila menghasilkan migrasi "spurious", berarti snapshot terakhir
   belum mencerminkan skema; perbaiki snapshot terakhir lalu ulangi (lihat catatan
   di bawah).
5. `npm run migrate` untuk menerapkan.
6. Commit SQL + journal + snapshot.

## Aturan keras
- JANGAN pernah mengubah file migrasi yang SUDAH diterapkan di lingkungan mana pun.
- JANGAN menghapus baris booking/peserta/pembayaran/seat_ledger dalam migrasi.
- Backfill harus idempoten (aman dijalankan ulang).
- Selalu `npm run backup` sebelum migrasi di produksi.

## Catatan perbaikan snapshot (riwayat)
Snapshot 0005–0009 pernah berbagi `id` yang sama (hasil menyalin snapshot saat
hand-authoring), sehingga `generate` gagal ("collision"). Perbaikannya: beri `id`
unik + `prevId` berantai pada 0005–0009, lalu set snapshot 0010 & 0011 = snapshot
skema terkini (0011 hanya perubahan DATA, jadi skemanya sama dengan 0010). File
migrasi SQL yang sudah diterapkan TIDAK diubah.
