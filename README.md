# Nena Adventure — Website

Website satu halaman (single-file) untuk Nena Adventure: beranda publik, alur booking online, dan panel admin internal. Semua ada di `index.html` (HTML, CSS, dan JavaScript digabung dalam satu file supaya gampang di-hosting di mana saja tanpa proses build).

## Struktur folder

```
nena-adventure/
├── index.html              ← seluruh website (beranda, booking, admin)
├── README.md                ← file ini
└── assets/
    ├── logo/                 ← logo resmi Nena Adventure
    ├── images/
    │   ├── hero/             ← foto banner utama beranda
    │   ├── destinasi/        ← foto tiap titik kunjungan di Pulau Sangiang
    │   ├── gallery/          ← foto untuk section "Galeri"
    │   ├── feature/          ← foto besar di section "Adventure yang bikin kangen pulang"
    │   └── adventure/        ← foto untuk lingkaran meeting point (Anyer, Jakarta, dst.)
    └── video/                ← video profil / cuplikan trip
```

Saat ini folder `assets/` masih kosong (baru ada file `.gitkeep` supaya foldernya ikut ter-upload ke Git). Semua foto yang tampil di `index.html` masih pakai foto stok sementara dari Unsplash — tinggal ganti sesuai panduan di bawah begitu foto/video/logo asli sudah ada.

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
