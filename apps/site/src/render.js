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

/** HTML FAQ (verbatim-compatible dgn markup situs). Hanya item aktif. */
export function faqHtml(items) {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var active = (items || []).filter(function (it) { return it.active !== false; });
  var parts = active.map(function (it, i) {
    return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(it.q) + "</summary><p>" + esc(it.a) + "</p></details>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/** HTML accordion Syarat & Ketentuan (verbatim-compatible). Hanya grup aktif. */
export function syaratHtml(groups) {
  var active = (groups || []).filter(function (g) { return g.active !== false; });
  var parts = active.map(function (g, i) {
    var lis = (g.items || []).map(function (it) { return "<li>" + esc(it) + "</li>"; }).join("\n          ");
    return "<details" + (i === 0 ? " open" : "") + ">\n"
      + "        <summary>" + esc(g.title) + "</summary>\n"
      + "        <ul>\n          " + lis + "\n        </ul>\n"
      + "      </details>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

var STAR_WORD = { 1: "Satu", 2: "Dua", 3: "Tiga", 4: "Empat", 5: "Lima" };
/** HTML testimoni/ulasan (verbatim-compatible). Hanya item aktif. */
export function testimoniHtml(items) {
  var active = (items || []).filter(function (it) { return it.active !== false; });
  var parts = active.map(function (it) {
    var r = Math.max(0, Math.min(5, it.rating || 5));
    var stars = "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r); // r bintang penuh + (5-r) kosong
    var initial = esc(String(it.name || "").charAt(0));
    return '<article class="rev">\n'
      + '        <div class="stars" role="img" aria-label="' + STAR_WORD[r] + ' dari lima bintang">' + stars + "</div>\n"
      + "        <blockquote>" + esc(it.quote) + "</blockquote>\n"
      + '        <div class="rev-who"><span class="ava" aria-hidden="true">' + initial + "</span><span><b>" + esc(it.name) + "</b><small>" + esc(it.meta) + "</small></span></div>\n"
      + "      </article>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

function starsOf(r) { r = Math.max(0, Math.min(5, r || 5)); return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r); }

/** Inner HTML chip ulasan kecil beranda (verbatim). meta dipangkas sebelum koma. */
export function testimoniChipInner(it) {
  var metaShort = String(it.meta || "").split(",")[0].trim();
  return '<span class="ava">' + esc(String(it.name || "").charAt(0)) + "</span><div><b>"
    + esc(it.name) + "</b><small>" + starsOf(it.rating) + " " + esc(metaShort) + "</small></div>";
}

/** HTML accordion Itinerary (verbatim). Hanya trip aktif. */
export function itineraryHtml(trips) {
  var active = (trips || []).filter(function (t) { return t.active !== false; });
  var parts = active.map(function (t, i) {
    var steps = (t.steps || []).map(function (s) {
      return '<li><time class="num">' + esc(s.time) + "</time><div><h4>" + esc(s.activity) + "</h4></div></li>";
    }).join("\n          ");
    return "<details" + (i === 0 ? " open" : "") + ">\n"
      + "        <summary>" + esc(t.title) + "</summary>\n"
      + '        <ol class="itin" style="border-top:0">\n          ' + steps + "\n        </ol>\n"
      + "      </details>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

// SVG ikon kontak — VERBATIM dari pre-1a (jangan diubah, dipakai untuk parity).
var KONTAK_ICONS = {
  pin: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 18s6-5 6-9.4A6 6 0 004 8.6C4 13 10 18 10 18z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="10" cy="8.4" r="2.2" stroke="currentColor" stroke-width="1.7"/></svg>',
  kalender: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  telepon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 5.5C4 12 8 16 14.5 16l1.8-2.6-3.2-2-1.6 1.6c-1.5-.8-2.7-2-3.5-3.5l1.6-1.6-2-3.2L5 6.4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  jam: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.6" stroke="currentColor" stroke-width="1.7"/><path d="M10 6v4.4l2.8 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
};

/** HTML daftar alamat/kontak (verbatim). Hanya poin aktif. */
export function kontakHtml(points) {
  var active = (points || []).filter(function (p) { return p.active !== false; });
  var parts = active.map(function (p) {
    var icon = KONTAK_ICONS[p.icon] || KONTAK_ICONS.pin;
    return "<li>" + icon + "\n          <div><b>" + esc(p.title) + "</b><p>" + esc(p.body) + "</p></div></li>";
  });
  return "\n        " + parts.join("\n        ") + "\n      ";
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
