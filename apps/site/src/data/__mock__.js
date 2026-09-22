// SUMBER MOCK yang TERSISA. sisaKursi() & generateKode() sudah DIHAPUS di fase 3
// (diganti panggilan API: /api/public/schedules & POST /api/public/bookings).

// seedAcak + bangunGrup: grup trip per tanggal (seeded random) untuk view admin lama.
// Diisolasi; tidak dipakai situs publik setelah view admin dihapus.
export function seedAcak(n){ var x = Math.sin(n) * 10000; return x - Math.floor(x); }
export function bangunGrup(d, terisiOpen){
    var seed = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
    var grup = [{
      nama: "Grup 1 — Open Trip (Reguler + Premium)",
      tipe: "reguler",
      dotClass: "dot--reguler",
      meeting: "Anyer, Jakarta, Tangerang & Stasiun Serang",
      berangkat: "07.00 WIB",
      kuota: 24,
      terisi: terisiOpen,
      pic: "Kapten Endang — Speedboat 1"
    }];
    var jumlahPrivate = Math.floor(seedAcak(seed * 3.7) * 3); // 0–2 grup private per tanggal
    for (var i = 0; i < jumlahPrivate; i++){
      var pax = 2 + Math.floor(seedAcak(seed * 5.3 + i * 11) * 12); // 2–13 pax
      grup.push({
        nama: "Grup " + (i + 2) + " — Private Trip Premium",
        tipe: "private",
        dotClass: "dot--private",
        meeting: "Pantai Pangaradan, Anyer",
        berangkat: (i === 0 ? "07.00 WIB" : "08.00 WIB"),
        kuota: pax,
        terisi: pax,
        pic: "Kapten " + (i === 0 ? "Yusuf" : "Rahmat") + " — Speedboat " + (i + 2)
      });
    }
    return grup;
  }
