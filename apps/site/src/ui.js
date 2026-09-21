import { SPOT } from "./data/spot.js";
import { loadContent } from "./data/api.js";
import { faqHtml, syaratHtml, testimoniHtml } from "./render.js";
(function(){
  "use strict";

  /* ── Konten dari CMS (fallback ke konten bawaan HTML) ───── */
  loadContent().then(function(c){
    if (!c) return;
    if (c.hero && typeof c.hero.heading === "string"){
      var h = document.querySelector('#view-home .hero2-copy h1');
      if (h) h.textContent = c.hero.heading;
    }
    if (c.faq && Array.isArray(c.faq.items)){
      var f = document.querySelector('#faq .faq');
      if (f) f.innerHTML = faqHtml(c.faq.items);
    }
    if (c.syarat && Array.isArray(c.syarat.groups)){
      var s = document.querySelector('#syarat .accord');
      if (s) s.innerHTML = syaratHtml(c.syarat.groups);
    }
    if (c.testimoni && Array.isArray(c.testimoni.items)){
      var r = document.querySelector('#ulasan .revs');
      if (r) r.innerHTML = testimoniHtml(c.testimoni.items);
    }
  }).catch(function(){ /* biarkan konten bawaan HTML */ });

  /* ── Search card (hero) — pilih paket & cek booking ────── */
  var searchCard = document.getElementById("searchCard");
  if (searchCard){
    var pkgTerpilih = "reguler";
    var tabPkg = searchCard.querySelectorAll('[data-pkg]');
    tabPkg.forEach(function(b){
      b.addEventListener("click", function(){
        tabPkg.forEach(function(x){ x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true");
        pkgTerpilih = b.dataset.pkg;
      });
    });
    var heroSearch = document.getElementById("heroSearch");
    if (heroSearch) heroSearch.addEventListener("click", function(){
      location.hash = "#/booking?pkg=" + pkgTerpilih;
    });
  }

  /* ── Explore tabs — filter kartu paket/destinasi ───────── */
  var expTabs = document.getElementById("expTabs");
  if (expTabs){
    var expItems = document.querySelectorAll("#expGrid .exp-item");
    expTabs.querySelectorAll("[data-filter]").forEach(function(b){
      b.addEventListener("click", function(){
        expTabs.querySelectorAll("[data-filter]").forEach(function(x){ x.setAttribute("aria-selected", "false"); });
        b.setAttribute("aria-selected", "true");
        var f = b.dataset.filter;
        expItems.forEach(function(li){
          var cat = (" " + li.dataset.cat + " ");
          li.classList.toggle("hidden", f !== "all" && cat.indexOf(" " + f + " ") === -1);
        });
      });
    });
  }

  /* ── Adventure row — panah geser ────────────────────────── */
  var advList = document.querySelector(".adv-list");
  if (advList){
    document.querySelectorAll(".adv-nav button").forEach(function(b, i){
      b.addEventListener("click", function(){
        advList.scrollBy({ left: i === 0 ? -160 : 160, behavior: "smooth" });
      });
    });
  }

  /* ── Header state ──────────────────────────────────────── */
  var hdr = document.getElementById("hdr"), ticking = false;
  window.addEventListener("scroll", function(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      hdr.classList.toggle("stuck", window.scrollY > 40);
      ticking = false;
    });
  }, { passive:true });

  /* ── Menu mobile ───────────────────────────────────────── */
  var burger = document.getElementById("burger"), mm = document.getElementById("mm"), mmx = document.getElementById("mmx");
  function bukaMenu(){
    mm.hidden = false; burger.setAttribute("aria-expanded","true");
    document.body.style.overflow = "hidden"; mmx.focus();
  }
  function tutupMenu(){
    mm.hidden = true; burger.setAttribute("aria-expanded","false");
    document.body.style.overflow = ""; burger.focus();
  }
  burger.addEventListener("click", bukaMenu);
  mmx.addEventListener("click", tutupMenu);
  mm.addEventListener("click", function(e){ if (e.target.tagName === "A") tutupMenu(); });

  /* ── Lightbox galeri ───────────────────────────────────── */
  var lb = document.getElementById("lb"),
      lbBody = document.getElementById("lbBody"), lbx = document.getElementById("lbx"),
      lbp = document.getElementById("lbp"), lbn = document.getElementById("lbn");
  var tiles = [], idx = 0, pemicu = null;
  var mbar = document.querySelector(".mbar");

  function render(i){
    var t = tiles[i];
    if (t.dataset.type === "spot"){
      var d = SPOT[t.dataset.spot];
      var im = t.querySelector("img");
      var utama = im.getAttribute("src").replace("w=480", "w=1200").replace("q=68", "q=76");
      var kecil = im.getAttribute("src").replace("w=480", "w=300").replace("q=68", "q=60");
      var alt = im.alt;

      var thumbs = '<button class="spot-thumb" aria-current="true" data-kind="img" data-big="' + utama + '">'
        + '<img src="' + kecil + '" alt="' + alt + '"></button>';
      d.extra.forEach(function(pair, k){
        thumbs += '<button class="spot-thumb" aria-current="false" data-kind="img" data-big="' + pair[0] + '">'
          + '<img src="' + pair[1] + '" alt="' + d.nama + ', foto ' + (k + 2) + '"></button>';
      });
      thumbs += '<button class="spot-thumb" aria-current="false" data-kind="vid" aria-label="Putar video ' + d.nama + '">'
        + '<img src="' + kecil + '" alt="">'
        + '<span class="pl"><svg width="18" height="18" viewBox="0 0 20 20" fill="#fff"><path d="M6.5 4.2l9.5 5.8-9.5 5.8z"/></svg></span></button>';

      var ulasan = "";
      d.ulasan.forEach(function(u){
        var bintang = "";
        for (var b = 0; b < 5; b++) bintang += (b < u.r ? "\u2605" : "\u2606");
        ulasan += '<div class="spot-rev">'
          + '<div class="stars" role="img" aria-label="' + u.r + ' dari 5 bintang">' + bintang + '</div>'
          + '<p>' + u.t + '</p><small>' + u.n + ', ' + u.w + '</small></div>';
      });

      lbBody.innerHTML = '<article class="spot">'
        + '<div class="spot-media">'
        + '<div class="spot-stage"><img src="' + utama + '" alt="' + alt + '"></div>'
        + '<div class="spot-thumbs">' + thumbs + '</div>'
        + '</div>'
        + '<div class="spot-body">'
        + '<span class="spot-cat">' + d.kat + '</span>'
        + '<h3>' + d.nama + '</h3>'
        + '<p>' + d.teks + '</p>'
        + '<dl class="spot-specs">'
        + '<div><dt>Aktivitas</dt><dd>' + d.akt + '</dd></div>'
        + '<div><dt>Waktu di lokasi</dt><dd>' + d.dur + '</dd></div>'
        + '<div><dt>Tingkat kesulitan</dt><dd>' + d.tkt + '</dd></div>'
        + '<div><dt>Tiket masuk</dt><dd>Sudah termasuk paket</dd></div>'
        + '</dl>'
        + '<p class="spot-tip"><b>Tips dari guide.</b> ' + d.tip + '</p>'
        + '<div class="spot-revs"><h4>Kata peserta yang pernah ke sini</h4>' + ulasan + '</div>'
        + '<p class="spot-nav">Titik ' + (i + 1) + ' dari ' + tiles.length + ' — pakai panah kiri/kanan untuk berpindah.</p>'
        + '<div class="spot-cta">'
        + '<div><b>' + (d.kat.indexOf("Private Trip") > -1 ? "Khusus Private Trip Premium" : "Mulai Rp385.000") + '</b>'
        + '<small>' + (d.kat.indexOf("Private Trip") > -1 ? "Tersedia di paket Private Trip Premium" : "Titik ini masuk di paket Open Trip &amp; Private Trip") + '</small></div>'
        + '<a class="btn btn--go btn--sm" href="#/booking' + (d.kat.indexOf("Private Trip") > -1 ? "?pkg=private" : "") + '" data-book>Booking trip ini</a>'
        + '</div>'
        + '</div></article>';
    } else if (t.dataset.type === "vid"){
      lbBody.innerHTML = '<div class="vidslot"><div><b>Slot video</b>'
        + '<p>Sambungkan ID YouTube atau file MP4 milik klien di atribut <code>data-yt</code>.</p></div></div>'
        + '<p class="lb-cap">' + t.dataset.cap + '</p>';
    } else {
      lbBody.innerHTML = '<img src="' + t.dataset.src + '" alt="' + t.querySelector("img").alt + '">'
        + '<p class="lb-cap">' + t.dataset.cap + '</p>';
    }
  }
  function buka(daftar, i){
    tiles = daftar; idx = i; pemicu = tiles[i]; lb.hidden = false;
    if (mbar) mbar.style.display = "none";
    document.body.style.overflow = "hidden"; render(idx); lbx.focus();
  }
  function tutup(){
    lb.hidden = true; lbBody.innerHTML = ""; document.body.style.overflow = "";
    if (mbar) mbar.style.display = "";
    if (pemicu) pemicu.focus();
  }
  function geser(step){
    if (!tiles.length) return;
    idx = (idx + step + tiles.length) % tiles.length;
    render(idx);
  }

  Array.prototype.forEach.call(document.querySelectorAll("#gal, .dests"), function(wadah){
    var daftar = Array.prototype.slice.call(wadah.querySelectorAll("button[data-type]"));
    daftar.forEach(function(t, i){
      t.addEventListener("click", function(){ buka(daftar, i); });
    });
  });
  lbBody.addEventListener("click", function(e){
    var th = e.target.closest(".spot-thumb");
    if (th){
      var stage = lbBody.querySelector(".spot-stage");
      Array.prototype.forEach.call(lbBody.querySelectorAll(".spot-thumb"), function(x){
        x.setAttribute("aria-current", "false");
      });
      th.setAttribute("aria-current", "true");
      if (th.dataset.kind === "vid"){
        stage.innerHTML = '<div class="spot-slot"><div><b>Slot video</b>'
          + '<p>Unggah file MP4 atau tempel tautan YouTube lewat menu Konten website di panel admin.</p></div></div>';
      } else {
        stage.innerHTML = '<img src="' + th.dataset.big + '" alt="' + th.querySelector("img").alt + '">';
      }
      return;
    }
    var bk = e.target.closest("[data-book]");
    if (bk){
      e.preventDefault();
      tutup();
      location.hash = "#/booking";
    }
  });

  if (lbx) lbx.addEventListener("click", tutup);
  if (lbp) lbp.addEventListener("click", function(){ geser(-1); });
  if (lbn) lbn.addEventListener("click", function(){ geser(1); });
  if (lb) lb.addEventListener("click", function(e){ if (e.target === lb) tutup(); });

  document.addEventListener("keydown", function(e){
    if (e.key === "Escape"){
      if (lb && !lb.hidden) tutup();
      else if (mm && !mm.hidden) tutupMenu();
    }
    if (lb && !lb.hidden){
      if (e.key === "ArrowLeft") geser(-1);
      if (e.key === "ArrowRight") geser(1);
    }
  });

})();
