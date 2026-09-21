import { loadSchedules } from "./data/api.js";
import { WA_PRIMARY as WA } from "./data/wa.js";
import { boardHtml, calendarHtml } from "./render.js";
(function () {
  "use strict";
  var rows = document.getElementById("boardRows");
  var months = document.getElementById("months");

  function waErrorHtml() {
    var href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Halo, saya mau tanya jadwal keberangkatan Pulau Sangiang.");
    return '<p class="muted">Jadwal belum bisa ditampilkan. '
      + '<a class="btn btn--go btn--sm" href="' + href + '">Hubungi kami via WhatsApp</a></p>';
  }

  // Keadaan awal: sedang dimuat (bukan "penuh").
  if (rows) rows.innerHTML = '<p class="muted">Jadwal sedang dimuat…</p>';
  if (months) months.innerHTML = '<p class="muted">Jadwal sedang dimuat…</p>';

  loadSchedules().then(function (data) {
    var now = new Date();
    if (rows) {
      var b = boardHtml(data.remainingByIso, now);
      rows.innerHTML = b || '<p class="muted">Belum ada jadwal keberangkatan terdekat.</p>';
    }
    if (months) months.innerHTML = calendarHtml(data.remainingByIso, now);
  }).catch(function () {
    // API gagal/belum termuat: keadaan netral + WhatsApp. JANGAN "penuh".
    if (rows) rows.innerHTML = waErrorHtml();
    if (months) months.innerHTML = waErrorHtml();
  });
})();
