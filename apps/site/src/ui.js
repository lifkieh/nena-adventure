import { SPOT } from "./data/spot.js";
import { WA_PRIMARY, WA_SECONDARY } from "./data/wa.js";
import { loadContent, loadContact, loadPackages } from "./data/api.js";
import { faqHtml, syaratHtml, testimoniHtml, testimoniChipInner, itineraryHtml, kontakHtml, galeriHtml, paketCardsHtml, paketTablesHtml, adventureHtml, destinasiHtml, keselamatanHtml, keselamatanPolicyHtml, registrasiHtml } from "./render.js";
(function(){
  "use strict";

  /* ── Konten dari CMS (fallback ke konten bawaan HTML) ───── */
  loadContent().then(function(c){
    if (!c) return;
    if (c.hero){
      var setText = function(sel, val){ if (typeof val === "string"){ var el = document.querySelector(sel); if (el) el.textContent = val; } };
      setText('#view-home .hero2-copy h1', c.hero.title || c.hero.heading);
      setText('#view-home .hero2-copy p', c.hero.subtitle);
      setText('.band h2', c.hero.bandHeading);
      setText('.band p', c.hero.bandSubtitle);
      setText('.band a.btn--go', c.hero.ctaPrimary);
      setText('#waBand', c.hero.ctaSecondary);
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
      // Chip ulasan kecil di beranda ambil dari SUMBER YANG SAMA (bukan hardcoded).
      var act = c.testimoni.items.filter(function (it) { return it.active !== false; });
      var chip1 = document.querySelector('.feat2-chip--1'), chip2 = document.querySelector('.feat2-chip--2');
      if (chip1 && act[0]) chip1.innerHTML = testimoniChipInner(act[0]);
      if (chip2 && act[1]) chip2.innerHTML = testimoniChipInner(act[1]);
    }
    if (c.itinerary && Array.isArray(c.itinerary.trips)){
      var it = document.querySelector('#itinerary .accord');
      if (it) it.innerHTML = itineraryHtml(c.itinerary.trips);
    }
    if (c.kontak && Array.isArray(c.kontak.points)){
      var ad = document.querySelector('#lokasi .addr');
      if (ad) ad.innerHTML = kontakHtml(c.kontak.points);
    }
    if (c.galeri && Array.isArray(c.galeri.items)){
      var gal = document.getElementById('gal');
      if (gal){ gal.innerHTML = galeriHtml(c.galeri.items); if (window.__nenaBindTiles) window.__nenaBindTiles("#gal"); }
    }
    if (c.adventure && Array.isArray(c.adventure.points)){
      var adv = document.querySelector('ol.feat2-steps');
      if (adv) adv.innerHTML = adventureHtml(c.adventure.points);
    }
    if (c.destinasi && Array.isArray(c.destinasi.cards)){
      var de = document.querySelector('.dests');
      if (de){ de.innerHTML = destinasiHtml(c.destinasi.cards); if (window.__nenaBindTiles) window.__nenaBindTiles(".dests"); }
    }
    if (c.keselamatan && Array.isArray(c.keselamatan.cards)){
      var sf = document.querySelector('#keamanan .safe');
      if (sf) sf.innerHTML = keselamatanHtml(c.keselamatan.cards);
      if (c.keselamatan.policy){ var po = document.querySelector('#keamanan .policy'); if (po) po.innerHTML = keselamatanPolicyHtml(c.keselamatan.policy); }
    }
    if (c.registrasi && Array.isArray(c.registrasi.steps)){
      var tf = document.querySelector('#registrasi .tflow');
      if (tf) tf.innerHTML = registrasiHtml(c.registrasi.steps);
    }
    if (c.navbar){
      if (c.navbar.links){
        Object.keys(c.navbar.links).forEach(function(k){
          document.querySelectorAll('a[data-page-link="' + k + '"]').forEach(function(a){ a.textContent = c.navbar.links[k]; });
        });
      }
      if (c.navbar.bookingLabel){
        var bb = document.querySelector('header a.btn--go.btn--sm[href="#/booking"]');
        if (bb) bb.textContent = c.navbar.bookingLabel;
      }
      // Menu mobile (#mm): overlay teks per-anchor sesuai urutan (byte-identik bila
      // nilai CMS == teks asli). Tak mengubah struktur DOM.
      if (Array.isArray(c.navbar.mobileLinks)){
        var mmA = document.querySelectorAll('#mm a');
        c.navbar.mobileLinks.forEach(function(lbl, i){ if (mmA[i]) mmA[i].textContent = lbl; });
      }
    }
    if (c.meta){
      if (c.meta.title){ document.title = c.meta.title; }
      var setMeta = function(sel, val){ if (val){ var el = document.querySelector(sel); if (el) el.setAttribute("content", val); } };
      setMeta('meta[name="description"]', c.meta.description);
      setMeta('meta[property="og:title"]', c.meta.ogTitle);
      setMeta('meta[property="og:description"]', c.meta.ogDescription);
      setMeta('meta[property="og:image"]', c.meta.ogImage);
    }
    if (c.paket && Array.isArray(c.paket.cards)){
      loadPackages().then(function(prices){
        if (!prices) return;
        var pk = document.querySelector('#paket .pkgs');
        if (pk) pk.innerHTML = paketCardsHtml(c.paket.cards, prices);
        var card = document.querySelector('#paket .card');
        if (card) card.innerHTML = paketTablesHtml(prices);
      }).catch(function(){});
    }
  }).catch(function(){ /* biarkan konten bawaan HTML */ });

  /* ── Kontak dari Pengaturan owner: nomor WA + URL peta (sumber tunggal) ── */
  loadContact().then(function(k){
    if (!k) return;
    // Normalkan ke format internasional (08xx->628xx, +62->62, buang non-digit).
    var normWa = function(raw){ var s = String(raw || "").replace(/[^\d+]/g, ""); if (s.charAt(0) === "+") s = s.slice(1); if (s.charAt(0) === "0") s = "62" + s.slice(1); return s.replace(/\D/g, ""); };
    // Ganti nomor primary & sekunder secara TERPISAH (pesan tetap).
    if (k.whatsapp){
      var wa1 = normWa(k.whatsapp);
      document.querySelectorAll('a[href*="wa.me/' + WA_PRIMARY + '"]').forEach(function(a){
        a.href = a.href.split("wa.me/" + WA_PRIMARY).join("wa.me/" + wa1);
      });
    }
    if (k.whatsappSecondary){
      var wa2 = normWa(k.whatsappSecondary);
      document.querySelectorAll('a[href*="wa.me/' + WA_SECONDARY + '"]').forEach(function(a){
        a.href = a.href.split("wa.me/" + WA_SECONDARY).join("wa.me/" + wa2);
      });
    }
    if (k.mapUrl){
      document.querySelectorAll('#lokasi a[href*="google.com/maps"]').forEach(function(a){
        a.href = k.mapUrl;
      });
    }
  }).catch(function(){ /* pakai nilai bawaan HTML */ });

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

  function bindTiles(selector){
    Array.prototype.forEach.call(document.querySelectorAll(selector), function(wadah){
      var daftar = Array.prototype.slice.call(wadah.querySelectorAll("button[data-type]"));
      daftar.forEach(function(t, i){
        t.addEventListener("click", function(){ buka(daftar, i); });
      });
    });
  }
  bindTiles("#gal, .dests");
  window.__nenaBindTiles = bindTiles; // dipakai ulang setelah galeri/destinasi dirender dari API
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
