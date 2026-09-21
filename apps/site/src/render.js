// Fungsi render MURNI (tanpa DOM/fetch) supaya bisa diuji unit.
// remainingByIso: { 'YYYY-MM-DD': number }. Tanggal yang TIDAK ada di map =
// tidak ada jadwal -> TIDAK dirender (bukan "penuh").
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BLN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

function remainingOf(map, d) {
  var v = map[iso(d)];
  return typeof v === "number" ? v : null; // null = tidak ada jadwal
}

/** HTML papan keberangkatan: 3 akhir pekan terdekat yang ADA jadwalnya. */
export function boardHtml(remainingByIso, now) {
  var d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
  var picked = [], guard = 0;
  while (picked.length < 3 && guard < 400) {
    var w = d.getDay();
    if (w === 0 || w === 6) picked.push(new Date(d));
    d.setDate(d.getDate() + 1); guard++;
  }
  var html = "";
  picked.forEach(function (day) {
    var sisa = remainingOf(remainingByIso, day);
    if (sisa === null) return; // tidak ada jadwal -> lewati
    var penuh = sisa <= 0;
    var chip = penuh ? '<span class="chip chip--full">Kuota penuh</span>'
      : sisa <= 6 ? '<span class="chip chip--few">Sisa ' + sisa + ' kursi</span>'
        : '<span class="chip chip--ok">' + sisa + ' kursi tersedia</span>';
    var aksi = penuh
      ? '<span class="btn btn--out btn--sm" aria-disabled="true" style="opacity:.5">Penuh</span>'
      : '<a class="btn btn--go btn--sm" href="#/booking?date=' + iso(day) + '">Pilih</a>';
    html += '<div class="board-row">'
      + '<div class="board-date"><b class="num">' + pad(day.getDate()) + '</b><small>' + HARI[day.getDay()] + ', ' + BLN[day.getMonth()] + '</small></div>'
      + '<div class="board-info"><b>Berangkat 07.00 WIB</b><small>' + chip + '</small></div>'
      + '<div class="board-price num">Rp385.000<small>per orang</small></div>'
      + aksi + '</div>';
  });
  return html;
}

/** HTML kalender 4 bulan. Tanggal tanpa jadwal tidak dirender (bukan "penuh"). */
export function calendarHtml(remainingByIso, now) {
  var base = new Date(now); base.setHours(0, 0, 0, 0);
  var out = "";
  for (var m = 0; m < 4; m++) {
    var kursor = new Date(base.getFullYear(), base.getMonth() + m, 1);
    var tahun = kursor.getFullYear(), bulan = kursor.getMonth();
    var akhir = new Date(tahun, bulan + 1, 0).getDate();
    var items = "";
    for (var t = 1; t <= akhir; t++) {
      var d = new Date(tahun, bulan, t);
      if (d < base) continue;
      var w = d.getDay();
      if (w !== 0 && w !== 6) continue;
      var sisa = remainingOf(remainingByIso, d);
      if (sisa === null) continue; // tidak ada jadwal -> lewati (bukan "penuh")
      if (sisa <= 0) {
        items += '<li><span class="slot slot--full" aria-disabled="true">'
          + '<b class="num">' + t + '</b><small>penuh</small></span></li>';
      } else {
        var few = sisa <= 6 ? " slot--few" : "";
        items += '<li><a class="slot' + few + '" href="#/booking?date=' + iso(d) + '" '
          + 'aria-label="' + t + ' ' + BLN_PANJANG[bulan] + ' ' + tahun + ', sisa ' + sisa + ' kursi">'
          + '<b class="num">' + t + '</b><small>' + sisa + ' kursi</small></a></li>';
      }
    }
    if (!items) items = '<li style="color:#B4D9F4;font-size:14px">Tidak ada keberangkatan tersisa</li>';
    out += '<div class="month"><h4>' + BLN_PANJANG[bulan] + " " + tahun + '</h4><ul class="slots">' + items + '</ul></div>';
  }
  return out;
}
