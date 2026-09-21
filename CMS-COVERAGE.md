# CMS Coverage Audit — apps/site

_Generated mechanically by `scripts/cms-inventory.mjs` from `apps/site/index.html` + `apps/site/src/ui.js`. No server involved._

## Summary

| Metric | Count |
|---|---:|
| Total visible strings | 775 |
| — CMS-backed | 340 |
| — Hardcoded | 435 |
| Total images | 42 |
| — CMS-backed | 20 |
| — Hardcoded | 22 |
| **All entries** | **817** |

**Parity note.** `scripts/parity.mjs` compares the normalized *outerHTML* of `#view-home` and `#view-booking`. Every landmark in the `<body>` (navbar, footer, floating WhatsApp button, mobile bar, lightbox, all `Kembali ke beranda` links, all `.err` messages) is nested **inside** `#view-home` or `#view-booking`, so it **IS** parity-captured. Only `<head>` (title/meta/og/favicon/JSON-LD) is uncaptured. Migrating a parity-captured element to CMS changes captured DOM and therefore can break DOM parity.

## Counts by area

| Area | Strings (CMS/hardcoded) | Images (CMS/hardcoded) | Parity-captured |
|---|---|---|---|
| Meta / head | 10 (4/6) | 2 (1/1) | no |
| Navbar & header | 10 (7/3) | 1 (0/1) | yes |
| Navbar & header (mobile menu) | 10 (0/10) | 0 (0/0) | yes |
| Beranda (home) | 105 (21/84) | 17 (0/17) | yes |
| Paket page | 189 (93/96) | 0 (0/0) | yes |
| Itinerary page | 91 (87/4) | 0 (0/0) | yes |
| Destinasi page | 77 (38/39) | 19 (19/0) | yes |
| Keselamatan page | 45 (23/22) | 0 (0/0) | yes |
| Jadwal page | 8 (0/8) | 0 (0/0) | yes |
| Lokasi page | 13 (8/5) | 1 (0/1) | yes |
| Registrasi page | 20 (12/8) | 0 (0/0) | yes |
| Syarat page | 37 (33/4) | 0 (0/0) | yes |
| FAQ page | 17 (14/3) | 0 (0/0) | yes |
| Footer | 24 (0/24) | 1 (0/1) | yes |
| Floating / global | 3 (0/3) | 0 (0/0) | yes |
| Booking wizard | 116 (0/116) | 1 (0/1) | yes |

## Meta / head

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | <!doctype html> | hardcoded | — | no |
| 2 | text | Nena Adventure — One Day Trip Pulau Sangiang | CMS | meta | no |
| 3 | text | One Day Trip Pulau Sangiang bersama Nena Adventure — Open Trip Reguler, Open Trip Premium… | CMS | meta | no |
| 4 | text | One Day Trip Pulau Sangiang — Nena Adventure | CMS | meta | no |
| 5 | text | Open Trip Reguler, Open Trip Premium, dan Private Trip Premium ke Pulau Sangiang. Tanpa m… | CMS | meta | no |
| 6 | image | assets/logo/logo-horizontal.png | CMS | meta | no |
| 7 | image | assets/logo/favicon.png | hardcoded | — | no |
| 8 | text | theme-color=#0F5E9E | hardcoded | — | no |
| 9 | text | og:type=website | hardcoded | — | no |
| 10 | text | og:locale=id_ID | hardcoded | — | no |
| 11 | text | twitter:card=summary_large_image | hardcoded | — | no |
| 12 | text | JSON-LD structured data (TravelAgency schema) | hardcoded | — | no |

## Navbar & header

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | Lompat ke konten utama | hardcoded | — | yes |
| 2 | text | NENA ADVENTURE | hardcoded | — | yes |
| 3 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 4 | text | Destinasi | CMS | navbar | yes |
| 5 | text | Paket | CMS | navbar | yes |
| 6 | text | Itinerary | CMS | navbar | yes |
| 7 | text | Keselamatan | CMS | navbar | yes |
| 8 | text | Jadwal | CMS | navbar | yes |
| 9 | text | Lokasi | CMS | navbar | yes |
| 10 | text | Booking online | CMS | navbar | yes |
| 11 | image | assets/logo/logo-emblem.png  [alt: Logo Nena Adventure] | hardcoded | — | yes |

## Navbar & header (mobile menu)

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | Destinasi & Pulau Sangiang | hardcoded | — | yes |
| 2 | text | Paket & harga | hardcoded | — | yes |
| 3 | text | Itinerary | hardcoded | — | yes |
| 4 | text | Keselamatan & asuransi | hardcoded | — | yes |
| 5 | text | Jadwal keberangkatan | hardcoded | — | yes |
| 6 | text | Lokasi & meeting point | hardcoded | — | yes |
| 7 | text | Registrasi & pembayaran | hardcoded | — | yes |
| 8 | text | Syarat & ketentuan | hardcoded | — | yes |
| 9 | text | FAQ | hardcoded | — | yes |
| 10 | text | Booking online | hardcoded | — | yes |

## Beranda (home)

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | <!-- HERO 2 (Tripco style: banner + floating search card) --> | hardcoded | — | yes |
| 2 | text | Jelajahi Pulau Sangiang dan nikmati keindahannya | CMS | hero | yes |
| 3 | text | One Day Trip Open Trip & Private Trip ke Pulau Sangiang, Selat Sunda — snorkeling, tracki… | CMS | hero | yes |
| 4 | text | Open Trip Reguler | hardcoded | — | yes |
| 5 | text | Open Trip Premium | hardcoded | — | yes |
| 6 | text | Private Trip Premium | hardcoded | — | yes |
| 7 | text | Kuota diperbarui otomatis | hardcoded | — | yes |
| 8 | text | Destinasi | hardcoded | — | yes |
| 9 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 10 | text | Tanggal berangkat | hardcoded | — | yes |
| 11 | text | Sabtu & Minggu | hardcoded | — | yes |
| 12 | text | Meeting point | hardcoded | — | yes |
| 13 | text | Pantai Pangaradan, Anyer | hardcoded | — | yes |
| 14 | text | Jakarta | hardcoded | — | yes |
| 15 | text | Tangerang | hardcoded | — | yes |
| 16 | text | Stasiun Serang | hardcoded | — | yes |
| 17 | text | Jumlah peserta | hardcoded | — | yes |
| 18 | text | 2 peserta | hardcoded | — | yes |
| 19 | text | <!-- POPULAR PLACE --> | hardcoded | — | yes |
| 20 | text | Destinasi populer | hardcoded | — | yes |
| 21 | text | Titik-titik paling banyak difoto peserta Nena Adventure di Pulau Sangiang. | hardcoded | — | yes |
| 22 | text | Snorkeling | hardcoded | — | yes |
| 23 | text | Legon Bajo | hardcoded | — | yes |
| 24 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 25 | text | Viewpoint | hardcoded | — | yes |
| 26 | text | Puncak Harapan | hardcoded | — | yes |
| 27 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 28 | text | Paddle board | hardcoded | — | yes |
| 29 | text | Tembuyung Beach | hardcoded | — | yes |
| 30 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 31 | text | Private Trip | hardcoded | — | yes |
| 32 | text | Krakatoa View | hardcoded | — | yes |
| 33 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 34 | text | <!-- FEATURE + MOCKUP --> | hardcoded | — | yes |
| 35 | text | Adventure yang bikin kangen pulang. | hardcoded | — | yes |
| 36 | text | Tiga alasan peserta mempercayakan trip mereka ke Nena Adventure. | hardcoded | — | yes |
| 37 | text | 01 | CMS | adventure | yes |
| 38 | text | Speedboat & asuransi milik sendiri | CMS | adventure | yes |
| 39 | text | Armada dan polis asuransi Zurich ditangani langsung oleh tim Nena Adventure, bukan pihak … | CMS | adventure | yes |
| 40 | text | 02 | CMS | adventure | yes |
| 41 | text | Kembali dekat ke alam | CMS | adventure | yes |
| 42 | text | Laut, hutan hujan, tebing, dan goa dalam satu pulau — perjalanan terasa seperti eksploras… | CMS | adventure | yes |
| 43 | text | 03 | CMS | adventure | yes |
| 44 | text | Tanpa minimal peserta | CMS | adventure | yes |
| 45 | text | Solo traveler tetap berangkat. Datang sendiri, pulang membawa pengalaman dan teman baru. | CMS | adventure | yes |
| 46 | text | Mulai jelajahi | hardcoded | — | yes |
| 47 | text | A | CMS | testimoni | yes |
| 48 | text | Ayu P. | CMS | testimoni | yes |
| 49 | text | ★★★★★ Open Trip Premium | CMS | testimoni | yes |
| 50 | text | M | CMS | testimoni | yes |
| 51 | text | Mush T. | CMS | testimoni | yes |
| 52 | text | ★★★★★ Open Trip Reguler | CMS | testimoni | yes |
| 53 | text | <!-- EXPLORE MORE (tabs) --> | hardcoded | — | yes |
| 54 | text | Jelajahi lebih banyak. | hardcoded | — | yes |
| 55 | text | Semua trip termasuk tiket masuk, life jacket, dan tour guide. Pilih tab untuk melihat pak… | hardcoded | — | yes |
| 56 | text | Semua paket | hardcoded | — | yes |
| 57 | text | Open Trip Reguler | hardcoded | — | yes |
| 58 | text | Open Trip Premium | hardcoded | — | yes |
| 59 | text | Private Trip Premium | hardcoded | — | yes |
| 60 | text | ★ 4.9 | hardcoded | — | yes |
| 61 | text | Open Trip Reguler | hardcoded | — | yes |
| 62 | text | Anyer, Banten | hardcoded | — | yes |
| 63 | text | Rp385.000 | hardcoded | — | yes |
| 64 | text | /orang | hardcoded | — | yes |
| 65 | text | ★ 4.9 | hardcoded | — | yes |
| 66 | text | Open Trip Premium | hardcoded | — | yes |
| 67 | text | Anyer, Banten | hardcoded | — | yes |
| 68 | text | Rp525.000 | hardcoded | — | yes |
| 69 | text | /orang | hardcoded | — | yes |
| 70 | text | ★ 5.0 | hardcoded | — | yes |
| 71 | text | Private Trip Premium | hardcoded | — | yes |
| 72 | text | Anyer, Banten | hardcoded | — | yes |
| 73 | text | Rp4.500.000 | hardcoded | — | yes |
| 74 | text | /1–6 pax | hardcoded | — | yes |
| 75 | text | ★ 4.8 | hardcoded | — | yes |
| 76 | text | Hutan Hujan Pulau Sangiang | hardcoded | — | yes |
| 77 | text | Pulau Sangiang | hardcoded | — | yes |
| 78 | text | Termasuk | hardcoded | — | yes |
| 79 | text | semua paket | hardcoded | — | yes |
| 80 | text | ★ 4.9 | hardcoded | — | yes |
| 81 | text | Goa Kelelawar | hardcoded | — | yes |
| 82 | text | Pulau Sangiang | hardcoded | — | yes |
| 83 | text | Termasuk | hardcoded | — | yes |
| 84 | text | Open & Private Trip | hardcoded | — | yes |
| 85 | text | ★ 5.0 | hardcoded | — | yes |
| 86 | text | Legon Waru — Free Diving | hardcoded | — | yes |
| 87 | text | Pulau Sangiang | hardcoded | — | yes |
| 88 | text | Khusus | hardcoded | — | yes |
| 89 | text | Private Trip | hardcoded | — | yes |
| 90 | text | Lihat semua paket & harga | hardcoded | — | yes |
| 91 | text | <!-- ADVENTURE (meeting points) --> | hardcoded | — | yes |
| 92 | text | Ayo mulai adventure-mu. | hardcoded | — | yes |
| 93 | text | Pilih meeting point paling dekat dari lokasimu. | hardcoded | — | yes |
| 94 | text | Anyer | hardcoded | — | yes |
| 95 | text | Jakarta | hardcoded | — | yes |
| 96 | text | Tangerang | hardcoded | — | yes |
| 97 | text | Stasiun Serang | hardcoded | — | yes |
| 98 | text | <!-- VIDEO CTA --> | hardcoded | — | yes |
| 99 | text | Booking sekarang dan pergi! | hardcoded | — | yes |
| 100 | text | Book now | hardcoded | — | yes |
| 101 | text | <!-- BAND --> | hardcoded | — | yes |
| 102 | text | Kursi akhir pekan ini masih ada. | CMS | hero | yes |
| 103 | text | Pilih tanggal, isi data peserta, bayar online. Selesai dalam tiga menit, e-voucher langsu… | CMS | hero | yes |
| 104 | text | Booking online sekarang | CMS | hero | yes |
| 105 | text | Tanya dulu lewat WhatsApp | CMS | hero | yes |
| 106 | image | https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=1800&… | hardcoded | — | yes |
| 107 | image | https://images.unsplash.com/photo-1759414386298-e62b69085e50?auto=format&fit=crop&w=480&q… | hardcoded | — | yes |
| 108 | image | https://images.unsplash.com/photo-1770838129435-ada65d5d845a?auto=format&fit=crop&w=480&q… | hardcoded | — | yes |
| 109 | image | https://images.unsplash.com/photo-1550031676-35e3bb00fefe?auto=format&fit=crop&w=480&q=72… | hardcoded | — | yes |
| 110 | image | https://images.unsplash.com/photo-1768680884256-d60cf0e8a916?auto=format&fit=crop&w=480&q… | hardcoded | — | yes |
| 111 | image | https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q… | hardcoded | — | yes |
| 112 | image | https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=640&q… | hardcoded | — | yes |
| 113 | image | https://images.unsplash.com/photo-1502933691298-84fc14542831?auto=format&fit=crop&w=640&q… | hardcoded | — | yes |
| 114 | image | https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=640&q=74… | hardcoded | — | yes |
| 115 | image | https://images.unsplash.com/photo-1673625578217-9bedc6fff7e4?auto=format&fit=crop&w=640&q… | hardcoded | — | yes |
| 116 | image | https://images.unsplash.com/photo-1751517617051-24583509a103?auto=format&fit=crop&w=640&q… | hardcoded | — | yes |
| 117 | image | https://images.unsplash.com/photo-1743656619958-68d85790bdb4?auto=format&fit=crop&w=640&q… | hardcoded | — | yes |
| 118 | image | https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=220&q… | hardcoded | — | yes |
| 119 | image | https://images.unsplash.com/photo-1502933691298-84fc14542831?auto=format&fit=crop&w=220&q… | hardcoded | — | yes |
| 120 | image | https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=220&q… | hardcoded | — | yes |
| 121 | image | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=220&q… | hardcoded | — | yes |
| 122 | image | https://images.unsplash.com/photo-1471922694854-ff1b63b20054?auto=format&fit=crop&w=1600&… | hardcoded | — | yes |

## Paket page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- PACKAGES --> | hardcoded | — | yes |
| 3 | text | Tiga pilihan trip, satu standar keselamatan. | hardcoded | — | yes |
| 4 | text | Open Trip Reguler, Open Trip Premium, dan Private Trip Premium — ketiganya termasuk tiket… | hardcoded | — | yes |
| 5 | text | Open Trip Reguler | CMS | paket | yes |
| 6 | text | Kapal tradisional, gabung dengan peserta lain | CMS | paket | yes |
| 7 | text | Rp385.000 | CMS | paket | yes |
| 8 | text | / orang | CMS | paket | yes |
| 9 | text | Harga normal Rp450.000. Berangkat dari Pantai Pangaradan, Anyer. | CMS | paket | yes |
| 10 | text | Kapal tradisional, captain, dan ABK | CMS | paket | yes |
| 11 | text | Tiket masuk seluruh destinasi | CMS | paket | yes |
| 12 | text | Life jacket dan peralatan snorkeling | CMS | paket | yes |
| 13 | text | Dokumentasi underwater GoPro & kamera iPhone 17 Pro Max | CMS | paket | yes |
| 14 | text | Makan siang, air mineral, tour guide | CMS | paket | yes |
| 15 | text | First aid kit | CMS | paket | yes |
| 16 | text | Speedboat & transportasi darat PP | CMS | paket | yes |
| 17 | text | Paddle board, drone, asuransi wisata | CMS | paket | yes |
| 18 | text | Pilih Open Trip Reguler | CMS | paket | yes |
| 19 | text | Paling banyak dipilih | CMS | paket | yes |
| 20 | text | Open Trip Premium | CMS | paket | yes |
| 21 | text | Speedboat, dengan dokumentasi lengkap | CMS | paket | yes |
| 22 | text | Rp525.000 | CMS | paket | yes |
| 23 | text | / orang | CMS | paket | yes |
| 24 | text | Dari Anyer. Harga berbeda untuk Jakarta, Tangerang, dan Stasiun Serang — lihat perbanding… | CMS | paket | yes |
| 25 | text | Speedboat, captain, dan ABK | CMS | paket | yes |
| 26 | text | Transportasi PP dari meeting point pilihan | CMS | paket | yes |
| 27 | text | Paddle board / canoeing, makanan ikan | CMS | paket | yes |
| 28 | text | Dokumentasi GoPro, drone + pilot, iPhone 17 Pro Max | CMS | paket | yes |
| 29 | text | Kelapa muda di Sepanjang Beach | CMS | paket | yes |
| 30 | text | Asuransi wisata Zurich | CMS | paket | yes |
| 31 | text | Makan siang, air mineral, tour guide | CMS | paket | yes |
| 32 | text | Free diving Legon Waru & Krakatoa View | CMS | paket | yes |
| 33 | text | Pilih Open Trip Premium | CMS | paket | yes |
| 34 | text | Private Trip Premium | CMS | paket | yes |
| 35 | text | Satu kapal khusus rombongan Anda | CMS | paket | yes |
| 36 | text | Rp4.500.000 | CMS | paket | yes |
| 37 | text | / 1–6 peserta | CMS | paket | yes |
| 38 | text | Naik bertahap sesuai jumlah peserta, lihat tabel harga di bawah. Meeting point Pantai Pan… | CMS | paket | yes |
| 39 | text | Semua fasilitas Open Trip Premium | CMS | paket | yes |
| 40 | text | Kapal eksklusif untuk rombongan sendiri | CMS | paket | yes |
| 41 | text | Free diving di Legon Waru | CMS | paket | yes |
| 42 | text | Panorama Krakatoa View | CMS | paket | yes |
| 43 | text | Jadwal dan itinerary lebih fleksibel | CMS | paket | yes |
| 44 | text | Cocok keluarga, komunitas, dan corporate | CMS | paket | yes |
| 45 | text | Transportasi PP sesuai kesepakatan | CMS | paket | yes |
| 46 | text | Pilih Private Trip Premium | CMS | paket | yes |
| 47 | text | Harga berdasarkan meeting point & jumlah peserta | CMS | paket | yes |
| 48 | text | Open Trip Premium — meeting point | CMS | paket | yes |
| 49 | text | Harga normal | CMS | paket | yes |
| 50 | text | Harga promo | CMS | paket | yes |
| 51 | text | Jakarta | CMS | paket | yes |
| 52 | text | Rp875.000 | CMS | paket | yes |
| 53 | text | Rp850.000 | CMS | paket | yes |
| 54 | text | Tangerang | CMS | paket | yes |
| 55 | text | Rp825.000 | CMS | paket | yes |
| 56 | text | Rp800.000 | CMS | paket | yes |
| 57 | text | Stasiun Serang | CMS | paket | yes |
| 58 | text | Rp750.000 | CMS | paket | yes |
| 59 | text | Rp650.000 | CMS | paket | yes |
| 60 | text | Pantai Pangaradan, Anyer | CMS | paket | yes |
| 61 | text | Rp650.000 | CMS | paket | yes |
| 62 | text | Rp525.000 | CMS | paket | yes |
| 63 | text | Open Trip Reguler hanya berangkat dari Pantai Pangaradan, Anyer (Rp385.000). Untuk kebera… | CMS | paket | yes |
| 64 | text | Private Trip Premium — jumlah peserta | CMS | paket | yes |
| 65 | text | Harga per rombongan | CMS | paket | yes |
| 66 | text | 1–6 peserta | CMS | paket | yes |
| 67 | text | Rp4.500.000 | CMS | paket | yes |
| 68 | text | 7–9 peserta | CMS | paket | yes |
| 69 | text | Rp5.500.000 | CMS | paket | yes |
| 70 | text | 10–11 peserta | CMS | paket | yes |
| 71 | text | Rp6.300.000 | CMS | paket | yes |
| 72 | text | 12–14 peserta | CMS | paket | yes |
| 73 | text | Rp7.300.000 | CMS | paket | yes |
| 74 | text | Fasilitas yang tidak termasuk di semua paket: | hardcoded | — | yes |
| 75 | text | kebutuhan & obat-obatan pribadi, baju renang, parkir di meeting point, tip toilet/guide/A… | hardcoded | — | yes |
| 76 | text | <!-- COMPARISON --> | hardcoded | — | yes |
| 77 | text | Perbandingan fasilitas paket. | hardcoded | — | yes |
| 78 | text | Lihat perbedaan lengkap Open Trip Reguler, Open Trip Premium, dan Private Trip Premium da… | hardcoded | — | yes |
| 79 | text | Fasilitas | hardcoded | — | yes |
| 80 | text | Reguler | hardcoded | — | yes |
| 81 | text | Premium | hardcoded | — | yes |
| 82 | text | Private Premium | hardcoded | — | yes |
| 83 | text | Kapal tradisional | hardcoded | — | yes |
| 84 | text | Ya | hardcoded | — | yes |
| 85 | text | Tidak | hardcoded | — | yes |
| 86 | text | Tidak | hardcoded | — | yes |
| 87 | text | Speedboat | hardcoded | — | yes |
| 88 | text | Tidak | hardcoded | — | yes |
| 89 | text | Ya | hardcoded | — | yes |
| 90 | text | Ya | hardcoded | — | yes |
| 91 | text | Transportasi darat PP | hardcoded | — | yes |
| 92 | text | Tidak tercantum | hardcoded | — | yes |
| 93 | text | Ya | hardcoded | — | yes |
| 94 | text | Ya | hardcoded | — | yes |
| 95 | text | Tiket seluruh destinasi | hardcoded | — | yes |
| 96 | text | Ya | hardcoded | — | yes |
| 97 | text | Ya | hardcoded | — | yes |
| 98 | text | Ya | hardcoded | — | yes |
| 99 | text | Captain dan ABK | hardcoded | — | yes |
| 100 | text | Ya | hardcoded | — | yes |
| 101 | text | Ya | hardcoded | — | yes |
| 102 | text | Ya | hardcoded | — | yes |
| 103 | text | Life jacket | hardcoded | — | yes |
| 104 | text | Ya | hardcoded | — | yes |
| 105 | text | Ya | hardcoded | — | yes |
| 106 | text | Ya | hardcoded | — | yes |
| 107 | text | Peralatan snorkeling | hardcoded | — | yes |
| 108 | text | Ya | hardcoded | — | yes |
| 109 | text | Ya | hardcoded | — | yes |
| 110 | text | Ya | hardcoded | — | yes |
| 111 | text | Makanan ikan | hardcoded | — | yes |
| 112 | text | Tidak tercantum | hardcoded | — | yes |
| 113 | text | Ya | hardcoded | — | yes |
| 114 | text | Ya | hardcoded | — | yes |
| 115 | text | Paddle board / canoeing | hardcoded | — | yes |
| 116 | text | Tidak tercantum | hardcoded | — | yes |
| 117 | text | Ya | hardcoded | — | yes |
| 118 | text | Ya | hardcoded | — | yes |
| 119 | text | GoPro underwater | hardcoded | — | yes |
| 120 | text | Ya | hardcoded | — | yes |
| 121 | text | Ya | hardcoded | — | yes |
| 122 | text | Ya | hardcoded | — | yes |
| 123 | text | Drone dan pilot | hardcoded | — | yes |
| 124 | text | Tidak | hardcoded | — | yes |
| 125 | text | Ya | hardcoded | — | yes |
| 126 | text | Ya | hardcoded | — | yes |
| 127 | text | Kamera iPhone 17 Pro Max | hardcoded | — | yes |
| 128 | text | Ya | hardcoded | — | yes |
| 129 | text | Ya | hardcoded | — | yes |
| 130 | text | Ya | hardcoded | — | yes |
| 131 | text | Makan siang | hardcoded | — | yes |
| 132 | text | Ya | hardcoded | — | yes |
| 133 | text | Ya | hardcoded | — | yes |
| 134 | text | Ya | hardcoded | — | yes |
| 135 | text | Kelapa muda | hardcoded | — | yes |
| 136 | text | Tidak | hardcoded | — | yes |
| 137 | text | Ya | hardcoded | — | yes |
| 138 | text | Ya | hardcoded | — | yes |
| 139 | text | Air mineral | hardcoded | — | yes |
| 140 | text | Ya | hardcoded | — | yes |
| 141 | text | Ya | hardcoded | — | yes |
| 142 | text | Ya | hardcoded | — | yes |
| 143 | text | Asuransi wisata | hardcoded | — | yes |
| 144 | text | Tidak tercantum | hardcoded | — | yes |
| 145 | text | Ya | hardcoded | — | yes |
| 146 | text | Ya | hardcoded | — | yes |
| 147 | text | Tour guide | hardcoded | — | yes |
| 148 | text | Ya | hardcoded | — | yes |
| 149 | text | Ya | hardcoded | — | yes |
| 150 | text | Ya | hardcoded | — | yes |
| 151 | text | First aid kit | hardcoded | — | yes |
| 152 | text | Ya | hardcoded | — | yes |
| 153 | text | Ya | hardcoded | — | yes |
| 154 | text | Ya | hardcoded | — | yes |
| 155 | text | Free diving Legon Waru | hardcoded | — | yes |
| 156 | text | Tidak tercantum | hardcoded | — | yes |
| 157 | text | Tidak tercantum | hardcoded | — | yes |
| 158 | text | Ya | hardcoded | — | yes |
| 159 | text | Krakatoa View | hardcoded | — | yes |
| 160 | text | Tidak tercantum | hardcoded | — | yes |
| 161 | text | Tidak tercantum | hardcoded | — | yes |
| 162 | text | Ya | hardcoded | — | yes |
| 163 | text | <!-- REVIEWS --> | hardcoded | — | yes |
| 164 | text | Kata peserta sebelumnya. | hardcoded | — | yes |
| 165 | text | Ulasan diambil dari Google Review dan pesan langsung peserta. Ditampilkan apa adanya. | hardcoded | — | yes |
| 166 | text | Fasilitasnya lengkap tapi harganya masih masuk akal. Kapalnya berangkat tepat waktu, tida… | CMS | testimoni | yes |
| 167 | text | A | CMS | testimoni | yes |
| 168 | text | Ayu P. | CMS | testimoni | yes |
| 169 | text | Open Trip Premium, Agustus 2026 | CMS | testimoni | yes |
| 170 | text | Semua sudah termasuk, tidak ada biaya kejutan di lokasi. Itu yang paling saya hargai. Tik… | CMS | testimoni | yes |
| 171 | text | M | CMS | testimoni | yes |
| 172 | text | Mush T. | CMS | testimoni | yes |
| 173 | text | Open Trip Reguler, Agustus 2026 | CMS | testimoni | yes |
| 174 | text | Saya tidak bisa berenang dan sempat ragu. Guide-nya menemani terus selama snorkeling, jad… | CMS | testimoni | yes |
| 175 | text | D | CMS | testimoni | yes |
| 176 | text | Dani E. | CMS | testimoni | yes |
| 177 | text | Open Trip Reguler, Juli 2026 | CMS | testimoni | yes |
| 178 | text | Family gathering kantor kami 32 orang, koordinasinya rapi dari awal sampai pulang. Konsum… | CMS | testimoni | yes |
| 179 | text | R | CMS | testimoni | yes |
| 180 | text | Raju G. | CMS | testimoni | yes |
| 181 | text | Family Gathering, Agustus 2026 | CMS | testimoni | yes |
| 182 | text | Airnya jernih dan spotnya banyak. Briefing keselamatan sebelum naik kapal dilakukan seriu… | CMS | testimoni | yes |
| 183 | text | V | CMS | testimoni | yes |
| 184 | text | Vincent L. | CMS | testimoni | yes |
| 185 | text | Open Trip Premium, Juli 2026 | CMS | testimoni | yes |
| 186 | text | Tripnya bagus. Satu catatan, jadwal makan siang agak mundur karena antre di spot foto. Se… | CMS | testimoni | yes |
| 187 | text | I | CMS | testimoni | yes |
| 188 | text | Ilham S. | CMS | testimoni | yes |
| 189 | text | Open Trip Reguler, Agustus 2026 | CMS | testimoni | yes |

## Itinerary page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- ITINERARY --> | hardcoded | — | yes |
| 3 | text | Satu hari, dari kumpul sampai pulang. | hardcoded | — | yes |
| 4 | text | Jadwal bersifat kondisional dan dapat berubah mengikuti kondisi cuaca, laut, serta situas… | hardcoded | — | yes |
| 5 | text | Itinerary Open Trip Reguler | CMS | itinerary | yes |
| 6 | text | 07.00 | CMS | itinerary | yes |
| 7 | text | Berangkat menuju Pulau Sangiang | CMS | itinerary | yes |
| 8 | text | 07.30 | CMS | itinerary | yes |
| 9 | text | Mengunjungi Turtle Area | CMS | itinerary | yes |
| 10 | text | 08.00 | CMS | itinerary | yes |
| 11 | text | Mengunjungi Tembuyung Beach | CMS | itinerary | yes |
| 12 | text | 09.30 | CMS | itinerary | yes |
| 13 | text | Snorkeling di Legon Bajo | CMS | itinerary | yes |
| 14 | text | 11.30 | CMS | itinerary | yes |
| 15 | text | Makan siang | CMS | itinerary | yes |
| 16 | text | 12.00 | CMS | itinerary | yes |
| 17 | text | ISOMA, mandi, dan mengganti pakaian | CMS | itinerary | yes |
| 18 | text | 13.00 | CMS | itinerary | yes |
| 19 | text | Trekking Hutan Hujan | CMS | itinerary | yes |
| 20 | text | 13.30 | CMS | itinerary | yes |
| 21 | text | Mengunjungi Goa Kelelawar | CMS | itinerary | yes |
| 22 | text | 14.00 | CMS | itinerary | yes |
| 23 | text | Mengunjungi Puncak Begal | CMS | itinerary | yes |
| 24 | text | 15.00 | CMS | itinerary | yes |
| 25 | text | Mengunjungi Puncak Harapan | CMS | itinerary | yes |
| 26 | text | 15.30 | CMS | itinerary | yes |
| 27 | text | Menikmati Sepanjang Beach | CMS | itinerary | yes |
| 28 | text | 16.45 | CMS | itinerary | yes |
| 29 | text | Kembali menuju Desa Sangiang | CMS | itinerary | yes |
| 30 | text | 17.00 | CMS | itinerary | yes |
| 31 | text | Kembali menuju Meeting Point | CMS | itinerary | yes |
| 32 | text | 17.30 | CMS | itinerary | yes |
| 33 | text | Perjalanan selesai | CMS | itinerary | yes |
| 34 | text | Itinerary Open Trip Premium | CMS | itinerary | yes |
| 35 | text | 07.00 | CMS | itinerary | yes |
| 36 | text | Berangkat menuju Pulau Sangiang | CMS | itinerary | yes |
| 37 | text | 07.30 | CMS | itinerary | yes |
| 38 | text | Mengunjungi Turtle Area | CMS | itinerary | yes |
| 39 | text | 08.00 | CMS | itinerary | yes |
| 40 | text | Bermain paddle board di Tembuyung Beach | CMS | itinerary | yes |
| 41 | text | 09.30 | CMS | itinerary | yes |
| 42 | text | Snorkeling di Legon Bajo | CMS | itinerary | yes |
| 43 | text | 11.30 | CMS | itinerary | yes |
| 44 | text | Makan siang | CMS | itinerary | yes |
| 45 | text | 12.00 | CMS | itinerary | yes |
| 46 | text | ISOMA, mandi, dan mengganti pakaian | CMS | itinerary | yes |
| 47 | text | 13.00 | CMS | itinerary | yes |
| 48 | text | Trekking Hutan Hujan | CMS | itinerary | yes |
| 49 | text | 13.30 | CMS | itinerary | yes |
| 50 | text | Mengunjungi Goa Kelelawar | CMS | itinerary | yes |
| 51 | text | 14.00 | CMS | itinerary | yes |
| 52 | text | Mengunjungi Puncak Begal | CMS | itinerary | yes |
| 53 | text | 15.00 | CMS | itinerary | yes |
| 54 | text | Mengunjungi Puncak Harapan | CMS | itinerary | yes |
| 55 | text | 15.30 | CMS | itinerary | yes |
| 56 | text | Menikmati Sepanjang Beach | CMS | itinerary | yes |
| 57 | text | 16.45 | CMS | itinerary | yes |
| 58 | text | Kembali menuju Desa Sangiang | CMS | itinerary | yes |
| 59 | text | 17.00 | CMS | itinerary | yes |
| 60 | text | Kembali menuju Meeting Point | CMS | itinerary | yes |
| 61 | text | 17.30 | CMS | itinerary | yes |
| 62 | text | Perjalanan selesai | CMS | itinerary | yes |
| 63 | text | Itinerary Private Trip Premium | CMS | itinerary | yes |
| 64 | text | 07.00 | CMS | itinerary | yes |
| 65 | text | Berangkat menuju Pulau Sangiang | CMS | itinerary | yes |
| 66 | text | 07.30 | CMS | itinerary | yes |
| 67 | text | Mengunjungi Turtle Area | CMS | itinerary | yes |
| 68 | text | 08.00 | CMS | itinerary | yes |
| 69 | text | Bermain paddle board di Tembuyung Beach | CMS | itinerary | yes |
| 70 | text | 09.30 | CMS | itinerary | yes |
| 71 | text | Snorkeling di Legon Bajo | CMS | itinerary | yes |
| 72 | text | 10.30 | CMS | itinerary | yes |
| 73 | text | Free diving di Legon Waru | CMS | itinerary | yes |
| 74 | text | 11.30 | CMS | itinerary | yes |
| 75 | text | Makan siang | CMS | itinerary | yes |
| 76 | text | 12.00 | CMS | itinerary | yes |
| 77 | text | ISOMA, mandi, dan mengganti pakaian | CMS | itinerary | yes |
| 78 | text | 12.30 | CMS | itinerary | yes |
| 79 | text | Trekking Hutan Hujan | CMS | itinerary | yes |
| 80 | text | 13.30 | CMS | itinerary | yes |
| 81 | text | Mengunjungi Goa Kelelawar | CMS | itinerary | yes |
| 82 | text | 14.15 | CMS | itinerary | yes |
| 83 | text | Mengunjungi Puncak Begal | CMS | itinerary | yes |
| 84 | text | 14.30 | CMS | itinerary | yes |
| 85 | text | Mengunjungi Puncak Harapan | CMS | itinerary | yes |
| 86 | text | 15.00 | CMS | itinerary | yes |
| 87 | text | Menikmati Sepanjang Beach | CMS | itinerary | yes |
| 88 | text | 17.00 | CMS | itinerary | yes |
| 89 | text | Kembali menuju Meeting Point | CMS | itinerary | yes |
| 90 | text | 18.00 | CMS | itinerary | yes |
| 91 | text | Perjalanan selesai | CMS | itinerary | yes |

## Destinasi page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- ABOUT ISLAND --> | hardcoded | — | yes |
| 3 | text | Pulau Sangiang, Selat Sunda. | hardcoded | — | yes |
| 4 | text | Berada di antara Pulau Jawa dan Sumatra, Pulau Sangiang secara administratif termasuk Des… | hardcoded | — | yes |
| 5 | text | Laut yang jernih | hardcoded | — | yes |
| 6 | text | — cocok untuk snorkeling dan menikmati kehidupan bawah laut. | hardcoded | — | yes |
| 7 | text | Keindahan bawah laut | hardcoded | — | yes |
| 8 | text | — terumbu karang dan ikan jadi daya tarik utama wisata bahari. | hardcoded | — | yes |
| 9 | text | Pantai yang masih alami | hardcoded | — | yes |
| 10 | text | — suasananya tenang dibanding destinasi pantai yang sudah ramai. | hardcoded | — | yes |
| 11 | text | Tebing dan garis pantai | hardcoded | — | yes |
| 12 | text | — perpaduan tebing, batuan, dan laut yang menarik untuk foto. | hardcoded | — | yes |
| 13 | text | Hutan tropis | hardcoded | — | yes |
| 14 | text | — vegetasi alami membuat perjalanan terasa seperti eksplorasi. | hardcoded | — | yes |
| 15 | text | Goa dan kawasan alam | hardcoded | — | yes |
| 16 | text | — lokasi eksplorasi selain bermain di pantai. | hardcoded | — | yes |
| 17 | text | Sunset dan panorama Selat Sunda | hardcoded | — | yes |
| 18 | text | — pemandangan laut terbuka yang berkesan saat cuaca cerah. | hardcoded | — | yes |
| 19 | text | Area peneluran penyu | hardcoded | — | yes |
| 20 | text | — kawasan Sangiang dikenal memiliki habitat yang berkaitan dengan penyu. | hardcoded | — | yes |
| 21 | text | Status kawasan | hardcoded | — | yes |
| 22 | text | Taman Wisata Alam Laut (TWAL) | hardcoded | — | yes |
| 23 | text | Luas daratan | hardcoded | — | yes |
| 24 | text | ± 700,35 Ha (7,0 km²) | hardcoded | — | yes |
| 25 | text | Luas perairan wisata (TWAL) | hardcoded | — | yes |
| 26 | text | ± 720 Ha (7,2 km²) | hardcoded | — | yes |
| 27 | text | Lokasi | hardcoded | — | yes |
| 28 | text | Selat Sunda, antara Jawa & Sumatra | hardcoded | — | yes |
| 29 | text | Administratif | hardcoded | — | yes |
| 30 | text | Desa Cikoneng, Kec. Anyar, Kab. Serang, Banten | hardcoded | — | yes |
| 31 | text | <!-- DESTINATIONS --> | hardcoded | — | yes |
| 32 | text | Destinasi di Pulau Sangiang. | hardcoded | — | yes |
| 33 | text | 10 titik kunjungan untuk Open Trip, bertambah 2 titik eksklusif (Legon Waru & Krakatoa Vi… | hardcoded | — | yes |
| 34 | text | Detail | CMS | destinasi | yes |
| 35 | text | Turtle Area | CMS | destinasi | yes |
| 36 | text | Berfoto dengan kura-kura | CMS | destinasi | yes |
| 37 | text | Detail | CMS | destinasi | yes |
| 38 | text | Tembuyung Beach | CMS | destinasi | yes |
| 39 | text | Paddle board | CMS | destinasi | yes |
| 40 | text | Detail | CMS | destinasi | yes |
| 41 | text | Legon Bajo | CMS | destinasi | yes |
| 42 | text | Snorkeling | CMS | destinasi | yes |
| 43 | text | Detail | CMS | destinasi | yes |
| 44 | text | Legon Waru | CMS | destinasi | yes |
| 45 | text | Free diving · Private Trip | CMS | destinasi | yes |
| 46 | text | Detail | CMS | destinasi | yes |
| 47 | text | Mangrove River | CMS | destinasi | yes |
| 48 | text | Alam | CMS | destinasi | yes |
| 49 | text | Detail | CMS | destinasi | yes |
| 50 | text | Desa Sangiang | CMS | destinasi | yes |
| 51 | text | Budaya | CMS | destinasi | yes |
| 52 | text | Detail | CMS | destinasi | yes |
| 53 | text | Hutan Hujan Pulau Sangiang | CMS | destinasi | yes |
| 54 | text | Tracking | CMS | destinasi | yes |
| 55 | text | Detail | CMS | destinasi | yes |
| 56 | text | Goa Kelelawar | CMS | destinasi | yes |
| 57 | text | Eksplorasi | CMS | destinasi | yes |
| 58 | text | Detail | CMS | destinasi | yes |
| 59 | text | Puncak Begal | CMS | destinasi | yes |
| 60 | text | Viewpoint | CMS | destinasi | yes |
| 61 | text | Detail | CMS | destinasi | yes |
| 62 | text | Puncak Harapan | CMS | destinasi | yes |
| 63 | text | Viewpoint | CMS | destinasi | yes |
| 64 | text | Detail | CMS | destinasi | yes |
| 65 | text | Krakatoa View | CMS | destinasi | yes |
| 66 | text | Viewpoint · Private Trip | CMS | destinasi | yes |
| 67 | text | Detail | CMS | destinasi | yes |
| 68 | text | Sepanjang Beach | CMS | destinasi | yes |
| 69 | text | Pantai | CMS | destinasi | yes |
| 70 | text | Destinasi baru akan ditambahkan di panel admin seiring pengembangan trip ke pulau lain — … | hardcoded | — | yes |
| 71 | text | Konten website → Destinasi | hardcoded | — | yes |
| 72 | text | <!-- GALLERY --> | hardcoded | — | yes |
| 73 | text | Foto dan video dari trip sebelumnya. | hardcoded | — | yes |
| 74 | text | Semua diambil oleh tim dokumentasi kami. Setiap peserta menerima file aslinya setelah tri… | hardcoded | — | yes |
| 75 | text | Video · 4:02 | CMS | galeri | yes |
| 76 | text | Video · 1:12 | CMS | galeri | yes |
| 77 | text | Lihat lebih banyak di Instagram | hardcoded | — | yes |
| 78 | image | https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 79 | image | https://images.unsplash.com/photo-1550031676-35e3bb00fefe?auto=format&fit=crop&w=480&q=68… | CMS | destinasi | yes |
| 80 | image | https://images.unsplash.com/photo-1759414386298-e62b69085e50?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 81 | image | https://images.unsplash.com/photo-1743656619958-68d85790bdb4?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 82 | image | https://images.unsplash.com/photo-1704365159871-6bf63f00b9c8?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 83 | image | https://images.unsplash.com/photo-1724258221877-ea2f92c6368f?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 84 | image | https://images.unsplash.com/photo-1673625578217-9bedc6fff7e4?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 85 | image | https://images.unsplash.com/photo-1751517617051-24583509a103?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 86 | image | https://images.unsplash.com/photo-1675263889817-f2e4b3a780af?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 87 | image | https://images.unsplash.com/photo-1770838129435-ada65d5d845a?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 88 | image | https://images.unsplash.com/photo-1768680884256-d60cf0e8a916?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 89 | image | https://images.unsplash.com/photo-1784057098851-b31bb06b66e5?auto=format&fit=crop&w=480&q… | CMS | destinasi | yes |
| 90 | image | https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=800&q… | CMS | galeri | yes |
| 91 | image | https://images.unsplash.com/photo-1502933691298-84fc14542831?auto=format&fit=crop&w=420&q… | CMS | galeri | yes |
| 92 | image | https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=420&q… | CMS | galeri | yes |
| 93 | image | https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q… | CMS | galeri | yes |
| 94 | image | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=420&q… | CMS | galeri | yes |
| 95 | image | https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=420&q… | CMS | galeri | yes |
| 96 | image | https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q… | CMS | galeri | yes |

## Keselamatan page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- SAFETY & INSURANCE --> | hardcoded | — | yes |
| 3 | text | Keselamatan dan asuransi. | hardcoded | — | yes |
| 4 | text | Trip ini menyeberangi laut terbuka. Berikut apa yang kami siapkan, dan apa yang perlu And… | hardcoded | — | yes |
| 5 | text | Asuransi perjalanan Zurich | CMS | keselamatan | yes |
| 6 | text | Setiap peserta didaftarkan ke polis asuransi kecelakaan diri Zurich sebelum keberangkatan… | CMS | keselamatan | yes |
| 7 | text | Santunan meninggal dunia atau cacat tetap akibat kecelakaan: maks. | CMS | keselamatan | yes |
| 8 | text | Rp50.000.000 | CMS | keselamatan | yes |
| 9 | text | per peserta | CMS | keselamatan | yes |
| 10 | text | Biaya pengobatan akibat kecelakaan: maks. | CMS | keselamatan | yes |
| 11 | text | Rp5.000.000 | CMS | keselamatan | yes |
| 12 | text | per kejadian | CMS | keselamatan | yes |
| 13 | text | Berlaku sejak kumpul di meeting point sampai kembali ke dermaga | CMS | keselamatan | yes |
| 14 | text | Nomor polis dikirim bersama e-voucher | CMS | keselamatan | yes |
| 15 | text | Perlengkapan dan kru | CMS | keselamatan | yes |
| 16 | text | Kapal membawa perlengkapan keselamatan lengkap dan diperiksa sebelum setiap keberangkatan. | CMS | keselamatan | yes |
| 17 | text | Life jacket untuk seluruh penumpang, dipakai selama penyeberangan | CMS | keselamatan | yes |
| 18 | text | Pelampung cadangan, kotak P3K, dan alat pemadam di kapal | CMS | keselamatan | yes |
| 19 | text | Kapten dan ABK bersertifikat, guide menemani setiap sesi air | CMS | keselamatan | yes |
| 20 | text | Rasio pendamping snorkeling menyesuaikan jumlah peserta non-perenang | CMS | keselamatan | yes |
| 21 | text | Cuaca dan pembatalan | CMS | keselamatan | yes |
| 22 | text | Keputusan berangkat mengikuti peringatan dini BMKG dan izin syahbandar setempat. | CMS | keselamatan | yes |
| 23 | text | Jika kami membatalkan karena cuaca, Anda memilih: reschedule gratis atau refund penuh | CMS | keselamatan | yes |
| 24 | text | Keputusan diinformasikan paling lambat H-1 pukul 18.00 WIB | CMS | keselamatan | yes |
| 25 | text | Pembatalan oleh peserta mengikuti kebijakan refund yang berlaku | CMS | keselamatan | yes |
| 26 | text | Sebelum mendaftar, mohon diperhatikan | CMS | keselamatan | yes |
| 27 | text | Trip ini melibatkan penyeberangan laut dan tracking ringan menanjak. Peserta dengan kondi… | CMS | keselamatan | yes |
| 28 | text | <!-- PACKING LIST --> | hardcoded | — | yes |
| 29 | text | Saran barang bawaan. | hardcoded | — | yes |
| 30 | text | Siapkan barang berikut supaya trip lebih nyaman. | hardcoded | — | yes |
| 31 | text | Baju ganti / outfit untuk berfoto | hardcoded | — | yes |
| 32 | text | Baju berenang / pakaian snorkeling | hardcoded | — | yes |
| 33 | text | Jas hujan plastik | hardcoded | — | yes |
| 34 | text | Uang tunai secukupnya | hardcoded | — | yes |
| 35 | text | Sandal / sepatu trekking | hardcoded | — | yes |
| 36 | text | Sunscreen / sunblock | hardcoded | — | yes |
| 37 | text | Lotion antinyamuk | hardcoded | — | yes |
| 38 | text | Topi | hardcoded | — | yes |
| 39 | text | Kacamata hitam | hardcoded | — | yes |
| 40 | text | Identitas diri | hardcoded | — | yes |
| 41 | text | Power bank | hardcoded | — | yes |
| 42 | text | Tas hydropack / tas yang nyaman untuk air minum | hardcoded | — | yes |
| 43 | text | Dry bag / kantong pelindung barang elektronik | hardcoded | — | yes |
| 44 | text | Peralatan makeup untuk touch-up bila diperlukan | hardcoded | — | yes |
| 45 | text | Obat-obatan pribadi | hardcoded | — | yes |

## Jadwal page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- SCHEDULE --> | hardcoded | — | yes |
| 3 | text | Jadwal dan sisa kursi. | hardcoded | — | yes |
| 4 | text | Berangkat setiap Sabtu dan Minggu. Klik tanggal untuk langsung masuk ke halaman booking d… | hardcoded | — | yes |
| 5 | text | Kursi masih banyak | hardcoded | — | yes |
| 6 | text | Sisa 6 kursi atau kurang | hardcoded | — | yes |
| 7 | text | Kuota penuh | hardcoded | — | yes |
| 8 | text | Buka halaman booking | hardcoded | — | yes |

## Lokasi page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- LOCATION / MAPS --> | hardcoded | — | yes |
| 3 | text | Meeting point di Anyer. | hardcoded | — | yes |
| 4 | text | Semua keberangkatan dimulai dari Pantai Pangaradan. Datang paling lambat pukul 06.30. | hardcoded | — | yes |
| 5 | text | Pantai Pangaradan | CMS | kontak | yes |
| 6 | text | Belakang Polsek Anyer, Kecamatan Anyar, Kabupaten Serang, Banten. | CMS | kontak | yes |
| 7 | text | Waktu kumpul | CMS | kontak | yes |
| 8 | text | 06.30 WIB. Kapal berangkat 07.00 dan tidak menunggu peserta yang terlambat. | CMS | kontak | yes |
| 9 | text | Dari Jakarta | CMS | kontak | yes |
| 10 | text | Sekitar 2,5–3 jam lewat Tol Tangerang–Merak, keluar Cilegon Barat lalu ke arah Anyer. Par… | CMS | kontak | yes |
| 11 | text | Butuh dijemput? | CMS | kontak | yes |
| 12 | text | Penjemputan dari Jakarta, Tangerang, Serang, dan Cilegon bisa diatur dengan biaya tambaha… | CMS | kontak | yes |
| 13 | text | Buka petunjuk arah di Google Maps | hardcoded | — | yes |
| 14 | image | https://maps.google.com/maps?q=Pantai%20Pangaradan%20Anyer%20Banten&z=13&output=embed  [a… | hardcoded | — | yes |

## Registrasi page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- REGISTRATION FLOW & PAYMENT --> | hardcoded | — | yes |
| 3 | text | Alur registrasi dan pembayaran. | hardcoded | — | yes |
| 4 | text | Booking sepenuhnya online — pilih paket, transfer, upload bukti, dan konfirmasi WhatsApp. | hardcoded | — | yes |
| 5 | text | Booking online di website. | CMS | registrasi | yes |
| 6 | text | Pilih paket, tanggal keberangkatan, dan isi data peserta (nama & identitas sesuai KTP unt… | CMS | registrasi | yes |
| 7 | text | Bayar DP minimal 50%. | CMS | registrasi | yes |
| 8 | text | Transfer ke rekening resmi BCA Nena Adventure Nusantara, atau scan QRIS resmi — sesuai to… | CMS | registrasi | yes |
| 9 | text | Upload bukti bayar & konfirmasi WhatsApp. | CMS | registrasi | yes |
| 10 | text | Unggah bukti transfer/QRIS langsung di halaman booking, lalu tombol "Konfirmasi ke admin … | CMS | registrasi | yes |
| 11 | text | Booking terverifikasi. | CMS | registrasi | yes |
| 12 | text | Setelah admin memverifikasi, Anda menerima e-voucher dan link grup WhatsApp perjalanan. | CMS | registrasi | yes |
| 13 | text | Lunasi sisa pembayaran maksimal H-3. | CMS | registrasi | yes |
| 14 | text | Dengan cara yang sama — transfer/QRIS, upload bukti, dan konfirmasi WhatsApp. | CMS | registrasi | yes |
| 15 | text | Terima info teknis keberangkatan. | CMS | registrasi | yes |
| 16 | text | Dibagikan lewat grup WhatsApp perjalanan, lalu berangkat sesuai jadwal. | CMS | registrasi | yes |
| 17 | text | Rekening & QRIS resmi pembayaran | hardcoded | — | yes |
| 18 | text | Nena Adventure Nusantara — BCA | hardcoded | — | yes |
| 19 | text | Pembayaran hanya lewat rekening atau QRIS resmi ini. Kirim bukti transfer/bayar ke admin … | hardcoded | — | yes |
| 20 | text | 6510693653 | hardcoded | — | yes |

## Syarat page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- SYARAT & KETENTUAN --> | hardcoded | — | yes |
| 3 | text | Syarat, ketentuan & kebijakan. | hardcoded | — | yes |
| 4 | text | Mohon dibaca sebelum melakukan pembayaran. Dengan membayar, peserta dianggap telah membac… | hardcoded | — | yes |
| 5 | text | Syarat dan ketentuan peserta | CMS | syarat | yes |
| 6 | text | Peserta wajib membaca seluruh informasi dan catatan perjalanan. | CMS | syarat | yes |
| 7 | text | Peserta wajib hadir paling lambat 30 menit sebelum keberangkatan di meeting point. | CMS | syarat | yes |
| 8 | text | Peserta wajib berada dalam keadaan sehat dan mampu mengikuti seluruh rangkaian kegiatan. | CMS | syarat | yes |
| 9 | text | Peserta wajib membawa identitas diri yang masih berlaku. | CMS | syarat | yes |
| 10 | text | Peserta wajib sudah terdaftar sebagai peserta dan masuk ke grup WhatsApp perjalanan. | CMS | syarat | yes |
| 11 | text | Peserta wajib melakukan pembayaran DP minimal 50% sebelum H-5 keberangkatan. | CMS | syarat | yes |
| 12 | text | Pelunasan wajib dilakukan maksimal H-3 atau sesuai ketentuan dari pihak Nena Adventure. | CMS | syarat | yes |
| 13 | text | Peserta wajib membawa uang tunai secukupnya untuk kebutuhan pribadi selama perjalanan. | CMS | syarat | yes |
| 14 | text | Peserta wajib membawa obat-obatan pribadi apabila memiliki kebutuhan atau kondisi kesehat… | CMS | syarat | yes |
| 15 | text | Peserta wajib mengikuti akun media sosial resmi Nena Adventure, yaitu @nenaadventure. | CMS | syarat | yes |
| 16 | text | Peserta wajib mematuhi seluruh arahan dari captain, ABK, admin, dan tour guide. | CMS | syarat | yes |
| 17 | text | Keputusan dan arahan dari tim Nena Adventure bersifat mutlak demi keselamatan, kenyamanan… | CMS | syarat | yes |
| 18 | text | Kebijakan perubahan dan pembatalan | CMS | syarat | yes |
| 19 | text | Apabila terjadi cuaca buruk, tidak diperolehnya izin dari pihak berwenang, atau kondisi l… | CMS | syarat | yes |
| 20 | text | Apabila terdapat peserta yang sakit, mengalami cedera, atau berhalangan, pelaksanaan kegi… | CMS | syarat | yes |
| 21 | text | Apabila peserta melakukan pembatalan karena alasan pribadi, Down Payment yang telah dibay… | CMS | syarat | yes |
| 22 | text | Apabila jumlah peserta berkurang, perjalanan tetap dapat dilaksanakan. Harga dan pengatur… | CMS | syarat | yes |
| 23 | text | Apabila terjadi bencana alam, kegiatan dapat dihentikan sewaktu-waktu sesuai arahan tour … | CMS | syarat | yes |
| 24 | text | Apabila cuaca buruk terjadi secara tiba-tiba saat snorkeling atau penjelajahan berlangsun… | CMS | syarat | yes |
| 25 | text | Apabila perjalanan dibatalkan oleh manajemen Nena Adventure akibat cuaca ekstrem atau kon… | CMS | syarat | yes |
| 26 | text | Kehilangan atau kerusakan barang pribadi menjadi tanggung jawab masing-masing peserta. | CMS | syarat | yes |
| 27 | text | Seluruh keputusan tim Nena Adventure bersifat final demi keamanan, kenyamanan, dan kelanc… | CMS | syarat | yes |
| 28 | text | Informasi penting lainnya | CMS | syarat | yes |
| 29 | text | Peserta wajib hadir di meeting point minimal 30 menit sebelum waktu keberangkatan. | CMS | syarat | yes |
| 30 | text | Jadwal perjalanan dapat berubah sewaktu-waktu menyesuaikan kondisi cuaca dan laut. | CMS | syarat | yes |
| 31 | text | Peserta wajib mengikuti arahan tour guide dan crew boat selama kegiatan berlangsung. | CMS | syarat | yes |
| 32 | text | Peserta wajib menjaga kebersihan area wisata dan tidak membuang sampah sembarangan. | CMS | syarat | yes |
| 33 | text | Barang berharga menjadi tanggung jawab masing-masing peserta — disarankan membawa dry bag. | CMS | syarat | yes |
| 34 | text | Anak-anak wajib berada dalam pengawasan orang tua atau pendamping. | CMS | syarat | yes |
| 35 | text | Dokumentasi selama perjalanan dapat digunakan untuk kebutuhan promosi Nena Adventure. | CMS | syarat | yes |
| 36 | text | Peserta tidak diperkenankan membawa barang berbahaya atau minuman beralkohol. | CMS | syarat | yes |
| 37 | text | Setiap peserta wajib menjaga keselamatan dan kenyamanan bersama selama perjalanan. | CMS | syarat | yes |

## FAQ page

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | ‹ Kembali ke beranda | hardcoded | — | yes |
| 2 | text | <!-- FAQ --> | hardcoded | — | yes |
| 3 | text | Pertanyaan yang sering masuk. | hardcoded | — | yes |
| 4 | text | Bagaimana cara membayar? | CMS | faq | yes |
| 5 | text | Pembayaran dilakukan melalui transfer ke rekening resmi BCA Nena Adventure Nusantara. And… | CMS | faq | yes |
| 6 | text | Apakah open trip tetap berangkat kalau pesertanya sedikit atau cuma sendirian? | CMS | faq | yes |
| 7 | text | Ya. Tidak ada minimal pax untuk open trip — 1 peserta pun tetap berangkat. Khusus program… | CMS | faq | yes |
| 8 | text | Apa bedanya Open Trip Reguler, Open Trip Premium, dan Private Trip Premium? | CMS | faq | yes |
| 9 | text | Reguler memakai kapal tradisional dan gabung dengan peserta lain. Premium memakai speedbo… | CMS | faq | yes |
| 10 | text | Saya tidak bisa berenang. Aman? | CMS | faq | yes |
| 11 | text | Aman. Life jacket dipakai selama seluruh aktivitas air dan spot snorkeling kami berada di… | CMS | faq | yes |
| 12 | text | Bagaimana kalau saya batal atau ingin ganti tanggal? | CMS | faq | yes |
| 13 | text | Pembatalan karena alasan pribadi membuat DP tidak dapat dikembalikan. Jika Nena Adventure… | CMS | faq | yes |
| 14 | text | Apa yang perlu saya bawa sendiri? | CMS | faq | yes |
| 15 | text | Baju ganti, baju renang, sunscreen, obat pribadi, sandal atau sepatu trekking, dan dry ba… | CMS | faq | yes |
| 16 | text | Bisa untuk keluarga, komunitas, atau rombongan kantor? | CMS | faq | yes |
| 17 | text | Bisa, lewat Private Trip Premium — satu kapal khusus untuk rombongan Anda, harga bertingk… | CMS | faq | yes |

## Footer

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | NENA ADVENTURE | hardcoded | — | yes |
| 2 | text | Pulau Sangiang, Banten | hardcoded | — | yes |
| 3 | text | Nena Adventure Nusantara — operator Open Trip & Private Trip One Day Trip Pulau Sangiang,… | hardcoded | — | yes |
| 4 | text | Trip | hardcoded | — | yes |
| 5 | text | Open Trip Reguler | hardcoded | — | yes |
| 6 | text | Open Trip Premium | hardcoded | — | yes |
| 7 | text | Private Trip Premium | hardcoded | — | yes |
| 8 | text | Destinasi Pulau Sangiang | hardcoded | — | yes |
| 9 | text | Informasi | hardcoded | — | yes |
| 10 | text | Jadwal keberangkatan | hardcoded | — | yes |
| 11 | text | Keselamatan & asuransi | hardcoded | — | yes |
| 12 | text | Meeting point | hardcoded | — | yes |
| 13 | text | Registrasi & pembayaran | hardcoded | — | yes |
| 14 | text | FAQ | hardcoded | — | yes |
| 15 | text | Syarat & ketentuan | hardcoded | — | yes |
| 16 | text | Kebijakan pembatalan & refund | hardcoded | — | yes |
| 17 | text | Hubungi kami | hardcoded | — | yes |
| 18 | text | WhatsApp 0812 8613 3202 | hardcoded | — | yes |
| 19 | text | WhatsApp 0813 8712 8350 | hardcoded | — | yes |
| 20 | text | Instagram @nenaadventure | hardcoded | — | yes |
| 21 | text | Pantai Pangaradan, belakang Polsek Anyer, Serang, Banten | hardcoded | — | yes |
| 22 | text | Layanan pesan 07.00–21.00 WIB | hardcoded | — | yes |
| 23 | text | © 2026 Nena Adventure Nusantara | hardcoded | — | yes |
| 24 | text | Login tim & admin | hardcoded | — | yes |
| 25 | image | assets/logo/logo-emblem.png  [alt: Logo Nena Adventure] | hardcoded | — | yes |

## Floating / global

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | Rp385.000 | hardcoded | — | yes |
| 2 | text | per orang, pasti berangkat | hardcoded | — | yes |
| 3 | text | Booking | hardcoded | — | yes |

## Booking wizard

| # | Kind | Content | Status | CMS section | Parity |
|---:|---|---|---|---|---|
| 1 | text | NENA ADVENTURE | hardcoded | — | yes |
| 2 | text | Booking online | hardcoded | — | yes |
| 3 | text | Butuh bantuan? | hardcoded | — | yes |
| 4 | text | WhatsApp | hardcoded | — | yes |
| 5 | text | 0812 8613 3202 | hardcoded | — | yes |
| 6 | text | Paket & tanggal | hardcoded | — | yes |
| 7 | text | Data peserta | hardcoded | — | yes |
| 8 | text | Pembayaran | hardcoded | — | yes |
| 9 | text | Selesai | hardcoded | — | yes |
| 10 | text | <!-- STEP 1 --> | hardcoded | — | yes |
| 11 | text | Pilih paket dan tanggal | hardcoded | — | yes |
| 12 | text | Keberangkatan Sabtu dan Minggu, kumpul 06.30 dan kapal berangkat 07.00 dari Pantai Pangar… | hardcoded | — | yes |
| 13 | text | Paket trip | hardcoded | — | yes |
| 14 | text | Open Trip Reguler | hardcoded | — | yes |
| 15 | text | Kapal tradisional, snorkeling, tracking, makan siang, tiket seluruh destinasi, dokumentas… | hardcoded | — | yes |
| 16 | text | Rp385.000 | hardcoded | — | yes |
| 17 | text | Open Trip Premium | hardcoded | — | yes |
| 18 | text | Speedboat, semua isi Reguler ditambah paddle board, drone, kamera underwater, kelapa muda… | hardcoded | — | yes |
| 19 | text | Rp525.000 | hardcoded | — | yes |
| 20 | text | Private Trip Premium | hardcoded | — | yes |
| 21 | text | Kapal eksklusif rombongan sendiri, tambah Legon Waru & Krakatoa View. Harga per rombongan… | hardcoded | — | yes |
| 22 | text | Mulai Rp4.500.000 | hardcoded | — | yes |
| 23 | text | Private Trip Premium dihitung per rombongan sesuai jumlah peserta (1–14 orang), bukan per… | hardcoded | — | yes |
| 24 | text | Tanggal keberangkatan | hardcoded | — | yes |
| 25 | text | Hanya tanggal dengan kursi tersisa yang ditampilkan. | hardcoded | — | yes |
| 26 | text | Pilih tanggal keberangkatan dulu. | hardcoded | — | yes |
| 27 | text | Meeting point | hardcoded | — | yes |
| 28 | text | Pantai Pangaradan, Anyer | hardcoded | — | yes |
| 29 | text | Datang sendiri. Parkir tersedia di lokasi. | hardcoded | — | yes |
| 30 | text | Dijemput dari Stasiun Serang | hardcoded | — | yes |
| 31 | text | Transportasi PP termasuk dalam harga. | hardcoded | — | yes |
| 32 | text | Dijemput dari Tangerang | hardcoded | — | yes |
| 33 | text | Transportasi PP termasuk dalam harga. | hardcoded | — | yes |
| 34 | text | Dijemput dari Jakarta | hardcoded | — | yes |
| 35 | text | Transportasi PP termasuk dalam harga. | hardcoded | — | yes |
| 36 | text | Open Trip Reguler dan Private Trip Premium hanya tersedia dari Pantai Pangaradan, Anyer. … | hardcoded | — | yes |
| 37 | text | Jumlah peserta | hardcoded | — | yes |
| 38 | text | 2 | hardcoded | — | yes |
| 39 | text | Diskon rombongan 5% mulai 10 peserta. | hardcoded | — | yes |
| 40 | text | Kembali ke beranda | hardcoded | — | yes |
| 41 | text | Lanjut ke data peserta | hardcoded | — | yes |
| 42 | text | <!-- STEP 2 --> | hardcoded | — | yes |
| 43 | text | Data pemesan dan peserta | hardcoded | — | yes |
| 44 | text | Nama lengkap dan tanggal lahir setiap peserta dibutuhkan untuk pendaftaran asuransi perja… | hardcoded | — | yes |
| 45 | text | Pemesan | hardcoded | — | yes |
| 46 | text | Nama lengkap | hardcoded | — | yes |
| 47 | text | Isi nama lengkap Anda. | hardcoded | — | yes |
| 48 | text | Nomor WhatsApp aktif | hardcoded | — | yes |
| 49 | text | Masukkan nomor WhatsApp yang benar, minimal 10 angka. | hardcoded | — | yes |
| 50 | text | Email | hardcoded | — | yes |
| 51 | text | E-voucher dan bukti pembayaran dikirim ke sini. | hardcoded | — | yes |
| 52 | text | Format email belum benar. | hardcoded | — | yes |
| 53 | text | Peserta | hardcoded | — | yes |
| 54 | text | Catatan untuk tim kami | hardcoded | — | yes |
| 55 | text | (opsional) | hardcoded | — | yes |
| 56 | text | Beri tahu kami kondisi kesehatan, alergi makanan, atau kebutuhan pendampingan khusus. | hardcoded | — | yes |
| 57 | text | Kembali | hardcoded | — | yes |
| 58 | text | Lanjut ke pembayaran | hardcoded | — | yes |
| 59 | text | <!-- STEP 3 --> | hardcoded | — | yes |
| 60 | text | Pembayaran | hardcoded | — | yes |
| 61 | text | Kursi Anda ditahan selama 60 menit setelah tagihan dibuat. | hardcoded | — | yes |
| 62 | text | Jumlah yang dibayar sekarang | hardcoded | — | yes |
| 63 | text | Bayar lunas | hardcoded | — | yes |
| 64 | text | Selesai sekali bayar, e-voucher langsung terbit. | hardcoded | — | yes |
| 65 | text | DP 50% dulu | hardcoded | — | yes |
| 66 | text | Sisanya dilunasi paling lambat H-3 sebelum keberangkatan. | hardcoded | — | yes |
| 67 | text | Cara membayar | hardcoded | — | yes |
| 68 | text | Transfer Bank BCA | hardcoded | — | yes |
| 69 | text | Ke rekening resmi Nena Adventure Nusantara | hardcoded | — | yes |
| 70 | text | QRIS | hardcoded | — | yes |
| 71 | text | Pindai kode QRIS resmi Nena Adventure | hardcoded | — | yes |
| 72 | text | Setelah membayar, unggah bukti transfer/bayar dan konfirmasi ke admin lewat WhatsApp di l… | hardcoded | — | yes |
| 73 | text | Kebijakan pembatalan singkat. | hardcoded | — | yes |
| 74 | text | Ganti tanggal gratis maksimal H-3 selama kuota tersedia. Pembatalan H-7 ke atas: refund 8… | hardcoded | — | yes |
| 75 | text | Saya sudah membaca dan menyetujui | hardcoded | — | yes |
| 76 | text | Syarat & Ketentuan | hardcoded | — | yes |
| 77 | text | Kebijakan Pembatalan & Refund | hardcoded | — | yes |
| 78 | text | , serta Kebijakan Privasi, dan setuju data peserta digunakan untuk pendaftaran asuransi p… | hardcoded | — | yes |
| 79 | text | Centang persetujuan untuk melanjutkan. | hardcoded | — | yes |
| 80 | text | Kembali | hardcoded | — | yes |
| 81 | text | Saya sudah bayar | hardcoded | — | yes |
| 82 | text | <!-- STEP 4 --> | hardcoded | — | yes |
| 83 | text | Booking dibuat. Tinggal upload bukti & konfirmasi. | hardcoded | — | yes |
| 84 | text | Kode booking Anda | hardcoded | — | yes |
| 85 | text | NA-000000 | hardcoded | — | yes |
| 86 | text | Upload bukti transfer / bayar | hardcoded | — | yes |
| 87 | text | Format JPG, PNG, atau PDF. File ini membantu admin memverifikasi lebih cepat. | hardcoded | — | yes |
| 88 | text | Selesaikan dalam | hardcoded | — | yes |
| 89 | text | 60:00 | hardcoded | — | yes |
| 90 | text | atau kursi dilepas kembali. | hardcoded | — | yes |
| 91 | text | Ringkasan pesanan | hardcoded | — | yes |
| 92 | text | Tombol di bawah membuka WhatsApp dengan pesan konfirmasi yang sudah terisi kode booking d… | hardcoded | — | yes |
| 93 | text | Konfirmasi ke admin via WhatsApp | hardcoded | — | yes |
| 94 | text | Kembali ke beranda | hardcoded | — | yes |
| 95 | text | <!-- SUMMARY --> | hardcoded | — | yes |
| 96 | text | Ringkasan | hardcoded | — | yes |
| 97 | text | 2 peserta | hardcoded | — | yes |
| 98 | text | Paket Reguler | hardcoded | — | yes |
| 99 | text | Rp385.000 | hardcoded | — | yes |
| 100 | text | Tanggal | hardcoded | — | yes |
| 101 | text | Belum dipilih | hardcoded | — | yes |
| 102 | text | Kumpul | hardcoded | — | yes |
| 103 | text | 06.30 WIB, Anyer | hardcoded | — | yes |
| 104 | text | Rp385.000 × 2 peserta | hardcoded | — | yes |
| 105 | text | Rp770.000 | hardcoded | — | yes |
| 106 | text | Penjemputan | hardcoded | — | yes |
| 107 | text | Rp0 | hardcoded | — | yes |
| 108 | text | Diskon rombongan 5% | hardcoded | — | yes |
| 109 | text | −Rp0 | hardcoded | — | yes |
| 110 | text | Biaya layanan | hardcoded | — | yes |
| 111 | text | Rp5.000 | hardcoded | — | yes |
| 112 | text | Total | hardcoded | — | yes |
| 113 | text | Rp775.000 | hardcoded | — | yes |
| 114 | text | Dibayar sekarang | hardcoded | — | yes |
| 115 | text | Rp775.000 | hardcoded | — | yes |
| 116 | text | Pembayaran lunas. | hardcoded | — | yes |
| 117 | image | assets/logo/logo-emblem.png  [alt: Logo Nena Adventure] | hardcoded | — | yes |

## Notes on dynamically-injected strings (out of static scope)

These are NOT in index.html; they are written by JS at runtime into containers that live **inside** the parity-captured views. They are hardcoded (not CMS-backed) and not covered by the static tables above:

- `apps/site/src/jadwal.js` → into `#months` (inside #view-home): `Jadwal sedang dimuat…`, `Belum ada jadwal keberangkatan terdekat.`, neutral-fail `Jadwal belum bisa ditampilkan sekarang.` + `Muat ulang` / `Hubungi via WhatsApp`.
- `apps/site/src/booking.js` → into `#view-booking`: date-dropdown placeholders (`— memuat jadwal… —`, `— jadwal gagal dimuat, hubungi kami via WhatsApp —`, sold-out option), payment-box copy, recap, and the pay-error banner (`Silakan pilih tanggal keberangkatan lebih dulu.`, `Gagal membuat pesanan.`/API messages, `Gagal mengunggah bukti.`).
- The `.err` validation messages (`errTanggal`, `errNama`, `errHp`, `errEmail`, `errSetuju`) ARE static in index.html and appear in the Booking wizard table above.
