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

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
// Nilai atribut verbatim seperti pre-1a (URL menyimpan & mentah). Escape kutip saja.
function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }
function starsOf(r) { r = Math.max(0, Math.min(5, r || 5)); return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r); }
var STAR_WORD = { 1: "Satu", 2: "Dua", 3: "Tiga", 4: "Empat", 5: "Lima" };

/** HTML FAQ (verbatim-compatible dgn markup situs). Hanya item aktif. */
export function faqHtml(items) {
  var active = (items || []).filter(function (it) { return it.active !== false; });
  var parts = active.map(function (it, i) {
    return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(it.q) + "</summary><p>" + esc(it.a) + "</p></details>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

/** HTML accordion Syarat & Ketentuan (verbatim). Hanya grup aktif. */
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

/** HTML testimoni/ulasan (verbatim). Hanya item aktif. */
export function testimoniHtml(items) {
  var active = (items || []).filter(function (it) { return it.active !== false; });
  var parts = active.map(function (it) {
    var r = Math.max(0, Math.min(5, it.rating || 5));
    var stars = "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
    var initial = esc(String(it.name || "").charAt(0));
    return '<article class="rev">\n'
      + '        <div class="stars" role="img" aria-label="' + STAR_WORD[r] + ' dari lima bintang">' + stars + "</div>\n"
      + "        <blockquote>" + esc(it.quote) + "</blockquote>\n"
      + '        <div class="rev-who"><span class="ava" aria-hidden="true">' + initial + "</span><span><b>" + esc(it.name) + "</b><small>" + esc(it.meta) + "</small></span></div>\n"
      + "      </article>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

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

/** HTML galeri (verbatim). img/vid, kelas ukuran opsional. Hanya item aktif. */
export function galeriHtml(items) {
  var active = (items || []).filter(function (it) { return it.active !== false; });
  var parts = active.map(function (it) {
    var cls = it.size ? ' class="' + it.size + '"' : "";
    var img = '<img loading="lazy" width="' + it.width + '" height="' + it.height + '" src="' + it.thumb + '" alt="' + escAttr(it.alt) + '">';
    if (it.type === "vid") {
      return "<button" + cls + ' data-type="vid" data-cap="' + escAttr(it.cap) + '">' + img
        + '<span class="play" aria-hidden="true"><span><svg width="20" height="20" viewBox="0 0 20 20" fill="#fff"><path d="M6.5 4.2l9.5 5.8-9.5 5.8z"/></svg></span></span>'
        + '<span class="lbl">' + esc(it.videoLabel) + "</span></button>";
    }
    return "<button" + cls + ' data-type="img" data-src="' + escAttr(it.full) + '" data-cap="' + escAttr(it.cap) + '">' + img + "</button>";
  });
  return "\n      " + parts.join("\n      ") + "\n      \n    ";
}

/* ── Paket & harga: teks dari CMS, ANGKA dari tabel packages (token) ──────── */
// Harga NORMAL (coret) tidak ada di tabel packages — konstanta baseline, bukan konten.
var PAKET_NORMAL = { reguler: 450000, premium: { jakarta: 875000, tangerang: 825000, serang: 750000, anyer: 650000 } };
function rp(n) { return "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
var SVG_YES = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.6 9.4l3.4 3.4L14.4 5.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var SVG_NO = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

function cardPrice(key, prices) {
  if (key === "private") return rp((prices.privateTiers && prices.privateTiers[0] ? prices.privateTiers[0].price : 0));
  if (key === "premium") return rp((prices.premium && prices.premium.anyer) || 0);
  return rp((prices.reguler && prices.reguler.anyer) || 0);
}
function renderTokens(text, prices) {
  return String(text).replace(/\{\{harga_normal_reguler\}\}/g, rp(PAKET_NORMAL.reguler));
}

/** HTML kartu paket (verbatim). Teks dari CMS; harga dari `prices` (tabel). */
export function paketCardsHtml(cards, prices) {
  var parts = (cards || []).map(function (c) {
    var hi = c.highlight ? " pkg--hi" : "";
    var tag = c.tag ? '\n        <span class="pkg-tag">' + esc(c.tag) + "</span>" : "";
    var feats = (c.features || []).map(function (f) {
      var inner = f.bold ? "<strong>" + esc(f.text) + "</strong>" : esc(f.text);
      return '<li class="' + (f.included ? "yes" : "no") + '">' + (f.included ? SVG_YES : SVG_NO) + "<span>" + inner + "</span></li>";
    }).join("\n          ");
    return '<div class="pkg' + hi + '">' + tag
      + "\n        <h3>" + esc(c.name) + "</h3>"
      + '\n        <p class="pkg-sub">' + esc(c.sub) + "</p>"
      + '\n        <div class="pkg-price"><b class="num">' + cardPrice(c.key, prices) + "</b><span>" + esc(c.unit) + "</span></div>"
      + '\n        <p class="pkg-note">' + renderTokens(c.note, prices) + "</p>"
      + '\n        <ul class="feat">\n          ' + feats + "\n        </ul>"
      + '\n        <a class="' + c.ctaClass + '" href="' + c.ctaHref + '">' + esc(c.ctaText) + "</a>"
      + "\n      </div>";
  });
  return "\n      " + parts.join("\n\n      ") + "\n    ";
}

/** HTML blok tabel harga (verbatim). SELURUH angka dari `prices` + konstanta normal. */
export function paketTablesHtml(prices) {
  var mp = [["Jakarta", "jakarta"], ["Tangerang", "tangerang"], ["Stasiun Serang", "serang"], ["Pantai Pangaradan, Anyer", "anyer"]];
  var rows = mp.map(function (c) {
    return "<tr><td>" + c[0] + '</td><td class="num">' + rp(PAKET_NORMAL.premium[c[1]]) + '</td><td class="num"><strong>' + rp(prices.premium[c[1]]) + "</strong></td></tr>";
  }).join("\n            ");
  var tiers = (prices.privateTiers || []).map(function (t) {
    return "<tr><td>" + t.minPax + "–" + t.maxPax + ' peserta</td><td class="num"><strong>' + rp(t.price) + "</strong></td></tr>";
  }).join("\n            ");
  return '\n      <h3 style="margin-bottom:var(--s4)">Harga berdasarkan meeting point &amp; jumlah peserta</h3>\n'
    + '      <div class="cmpwrap" style="background:var(--paper)">\n'
    + '        <table class="cmp">\n'
    + "          <thead><tr><th>Open Trip Premium — meeting point</th><th>Harga normal</th><th>Harga promo</th></tr></thead>\n"
    + "          <tbody>\n            " + rows + "\n          </tbody>\n"
    + "        </table>\n      </div>\n"
    + '      <p class="hint" style="margin:var(--s4) 0 var(--s3)">Open Trip Reguler hanya berangkat dari Pantai Pangaradan, Anyer (' + rp(prices.reguler.anyer) + "). Untuk keberangkatan dari Jakarta, Tangerang, atau Stasiun Serang, hubungi admin.</p>\n"
    + '      <div class="cmpwrap" style="background:var(--paper);margin-top:var(--s4)">\n'
    + '        <table class="cmp">\n'
    + "          <thead><tr><th>Private Trip Premium — jumlah peserta</th><th>Harga per rombongan</th></tr></thead>\n"
    + "          <tbody>\n            " + tiers + "\n          </tbody>\n"
    + "        </table>\n      </div>\n    ";
}

/** HTML 3 poin "Adventure yang bikin kangen pulang" (verbatim). */
export function adventureHtml(points) {
  var parts = (points || []).map(function (p, i) {
    var n = i + 1;
    return '<li><span class="feat2-n feat2-n--' + n + '">' + (n < 10 ? "0" + n : "" + n) + "</span>\n"
      + "            <div><h4>" + esc(p.title) + "</h4><p>" + esc(p.body) + "</p></div></li>";
  });
  return "\n          " + parts.join("\n          ") + "\n        ";
}

/** HTML kartu destinasi (verbatim). data-spot merujuk SPOT (detail lightbox). */
export function destinasiHtml(cards) {
  var parts = (cards || []).map(function (c) {
    return '<li><button class="dest" data-type="spot" data-spot="' + c.spot + '"><img loading="lazy" width="'
      + c.width + '" height="' + c.height + '" src="' + c.img + '" alt="' + escAttr(c.alt) + '">'
      + '<span class="cue">Detail</span><span class="ov"><b>' + esc(c.name) + "</b><small>" + esc(c.tag) + "</small></span></button></li>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
}

// Santunan asuransi — dari KONSTANTA, bukan konten (token di teks item).
var SANTUNAN = { meninggal: 50000000, pengobatan: 5000000 };
function kesItem(text) {
  return esc(text)
    .replace(/\{\{santunan_meninggal\}\}/g, "<strong>" + rp(SANTUNAN.meninggal) + "</strong>")
    .replace(/\{\{santunan_pengobatan\}\}/g, "<strong>" + rp(SANTUNAN.pengobatan) + "</strong>");
}
/** HTML kartu keselamatan (verbatim). Ikon SVG verbatim; angka santunan dari token. */
export function keselamatanHtml(cards) {
  var parts = (cards || []).map(function (c) {
    var lis = (c.items || []).map(function (it) { return "<li>" + kesItem(it) + "</li>"; }).join("\n          ");
    return '<article class="safecard">\n'
      + '        <span class="safeicon">' + c.iconSvg + "</span>\n"
      + "        <h4>" + esc(c.title) + "</h4>\n"
      + "        <p>" + esc(c.body) + "</p>\n"
      + "        <ul>\n          " + lis + "\n        </ul>\n"
      + "      </article>";
  });
  return "\n      " + parts.join("\n\n      ") + "\n    ";
}
/** HTML blok kebijakan keselamatan (verbatim). */
export function keselamatanPolicyHtml(policy) {
  return "\n      <h4>" + esc(policy.heading) + "</h4>\n      <p>" + esc(policy.body) + "</p>\n    ";
}

/** HTML langkah registrasi (.tflow, verbatim). */
export function registrasiHtml(steps) {
  var parts = (steps || []).map(function (s) {
    return "<li><b>" + esc(s.title) + "</b><p>" + esc(s.body) + "</p></li>";
  });
  return "\n      " + parts.join("\n      ") + "\n    ";
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
