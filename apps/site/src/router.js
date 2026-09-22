/* ── Router (hash-based: #/ beranda, #/booking; #/admin -> redirect beranda) ─── */
(function(){
  "use strict";
  var VIEWS = { home:"view-home", booking:"view-booking" };
  /* Sub-halaman di dalam #view-home — tiap satu section.page berid page-xxx */
  var PAGES = ["beranda","paket","itinerary","destinasi","keselamatan","jadwal","lokasi","registrasi","syarat","faq"];
  var aktif = null, aktifPage = null;

  function baca(){
    var h = location.hash.replace(/^#\/?/, "");
    var nama = h.split("?")[0];
    var key = (nama === "booking") ? nama : "home";
    var page = PAGES.indexOf(nama) > -1 ? nama : "beranda";
    return { key:key, view:key, page:page, query:(h.split("?")[1] || "") };
  }

  function route(){
    if (location.hash.replace(/^#\/?/, "").split("?")[0] === "admin"){ location.hash = "#/"; return; }
    var r = baca(), ganti = (r.key !== aktif) || (r.key === "home" && r.page !== aktifPage);
    for (var k in VIEWS){
      document.getElementById(VIEWS[k]).hidden = (k !== r.key);
    }
    if (r.key === "home"){
      PAGES.forEach(function(p){
        var el = document.getElementById("page-" + p);
        if (el) el.hidden = (p !== r.page);
      });
      document.querySelectorAll("[data-page-link]").forEach(function(a){
        a.classList.toggle("on", a.dataset.pageLink === r.page);
      });
    }
    document.body.style.overflow = "";
    if (ganti){
      aktif = r.key;
      aktifPage = r.page;
      window.scrollTo(0, 0);
    }
    window.dispatchEvent(new CustomEvent("nena:route", { detail:r }));
  }

  window.addEventListener("hashchange", route);
  route();
})();
