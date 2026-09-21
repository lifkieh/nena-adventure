import { loadSchedules } from "./data/api.js";
import { WA_PRIMARY as WA } from "./data/wa.js";
import { boardHtml, calendarHtml } from "./render.js";
(function () {
  "use strict";
  var rows = document.getElementById("boardRows");
  var months = document.getElementById("months");

  function neutralHtml() {
    var href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Halo, saya mau tanya jadwal keberangkatan Pulau Sangiang.");
    return '<p class="muted">Jadwal belum bisa ditampilkan sekarang. '
      + '<button type="button" data-reload-jadwal class="btn btn--go btn--sm">Muat ulang</button> '
      + '<a class="btn btn--out btn--sm" href="' + href + '">Hubungi via WhatsApp</a></p>';
  }

  var loading = false;
  function renderJadwal() {
    if (loading) return;
    loading = true;
    if (rows) rows.innerHTML = '<p class="muted">Jadwal sedang dimuat…</p>';
    if (months) months.innerHTML = '<p class="muted">Jadwal sedang dimuat…</p>';
    loadSchedules().then(function (data) {
      loading = false;
      var now = new Date();
      // Data fresh: tanggal yang tak ada lagi otomatis hilang (render ulang penuh).
      if (rows) { var b = boardHtml(data.remainingByIso, now); rows.innerHTML = b || '<p class="muted">Belum ada jadwal keberangkatan terdekat.</p>'; }
      if (months) months.innerHTML = calendarHtml(data.remainingByIso, now);
    }).catch(function () {
      loading = false;
      // Gagal total: pesan netral + tombol muat ulang, BUKAN angka kursi lama.
      if (rows) rows.innerHTML = neutralHtml();
      if (months) months.innerHTML = neutralHtml();
    });
  }

  // Tombol "Muat ulang" (delegasi).
  document.addEventListener("click", function (e) {
    if (e.target && e.target.closest && e.target.closest("[data-reload-jadwal]")) {
      e.preventDefault();
      renderJadwal();
    }
  });

  // Revalidasi tiap kali halaman home dibuka (beranda/jadwal).
  window.addEventListener("nena:route", function (e) {
    if (e.detail && e.detail.view === "home") renderJadwal();
  });

  renderJadwal();
})();
