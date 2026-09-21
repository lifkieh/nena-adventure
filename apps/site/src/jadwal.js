import { loadSchedules } from "./data/api.js";
(function () {
  "use strict";
  var HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  var BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var BLN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  /* ── Papan keberangkatan ───────────────────────────────── */
  function akhirPekanBerikut(jumlah) {
    var out = [], d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1); // paling cepat besok
    var guard = 0;
    while (out.length < jumlah && guard < 400) {
      var w = d.getDay();
      if (w === 0 || w === 6) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
      guard++;
    }
    return out;
  }

  loadSchedules().then(function (data) {
    // Sisa kursi kini dari server (bukan Math.sin). Fallback 0 bila tanggal tak ada.
    function sisaKursi(d) {
      var v = data.remainingByIso[iso(d)];
      return typeof v === "number" ? v : 0;
    }

    var rows = document.getElementById("boardRows");
    if (rows) {
      var html = "";
      akhirPekanBerikut(3).forEach(function (d) {
        var sisa = sisaKursi(d), penuh = sisa <= 0;
        var chip = penuh ? '<span class="chip chip--full">Kuota penuh</span>'
          : sisa <= 6 ? '<span class="chip chip--few">Sisa ' + sisa + ' kursi</span>'
            : '<span class="chip chip--ok">' + sisa + ' kursi tersedia</span>';
        var aksi = penuh
          ? '<span class="btn btn--out btn--sm" aria-disabled="true" style="opacity:.5">Penuh</span>'
          : '<a class="btn btn--go btn--sm" href="#/booking?date=' + iso(d) + '">Pilih</a>';
        html += '<div class="board-row">'
          + '<div class="board-date"><b class="num">' + pad(d.getDate()) + '</b><small>' + HARI[d.getDay()] + ', ' + BLN[d.getMonth()] + '</small></div>'
          + '<div class="board-info"><b>Berangkat 07.00 WIB</b><small>' + chip + '</small></div>'
          + '<div class="board-price num">Rp385.000<small>per orang</small></div>'
          + aksi + '</div>';
      });
      rows.innerHTML = html;
    }

    /* ── Kalender jadwal 4 bulan ───────────────────────────── */
    var months = document.getElementById("months");
    if (months) {
      var now = new Date(); now.setHours(0, 0, 0, 0);
      var out = "";
      for (var m = 0; m < 4; m++) {
        var kursor = new Date(now.getFullYear(), now.getMonth() + m, 1);
        var tahun = kursor.getFullYear(), bulan = kursor.getMonth();
        var akhir = new Date(tahun, bulan + 1, 0).getDate();
        var items = "";
        for (var t = 1; t <= akhir; t++) {
          var d = new Date(tahun, bulan, t);
          if (d < now) continue;
          var w = d.getDay();
          if (w !== 0 && w !== 6) continue;
          var sisa = sisaKursi(d);
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
      months.innerHTML = out;
    }
  }).catch(function () {
    /* jaringan gagal — biarkan papan/kalender kosong, tidak merusak halaman */
  });
})();
