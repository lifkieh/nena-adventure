import { WA_PRIMARY as WA } from "./data/wa.js";
import { REKENING_BCA } from "./data/rekening.js";
import { HARGA, TIER_PRIVATE } from "./data/harga.js";
import { LABEL_MP, LABEL_PKG } from "./data/meetingpoint.js";
import { sisaKursi, generateKode } from "./data/__mock__.js";
(function(){
  "use strict";
  var KUOTA = 24, LAYANAN = 5000;
  var HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  var BLN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  var $ = function(id){ return document.getElementById(id); };
  var $$ = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var rupiah = function(n){ return "Rp" + Math.round(n).toLocaleString("id-ID"); };
  var pad = function(n){ return n < 10 ? "0" + n : "" + n; };
  var iso = function(d){ return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()); };

  function labelTanggal(s){
    var p = s.split("-"), d = new Date(+p[0], +p[1]-1, +p[2]);
    return HARI[d.getDay()] + ", " + d.getDate() + " " + BLN[d.getMonth()] + " " + d.getFullYear();
  }

  /* ── Isi pilihan tanggal ────────────────────────────────── */
  var sel = $("tanggal"), stok = {};
  (function(){
    var d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 1);
    var opsi = '<option value="">— pilih tanggal —</option>', n = 0, guard = 0;
    while (n < 14 && guard < 200){
      var w = d.getDay();
      if (w === 0 || w === 6){
        var sisa = sisaKursi(d);
        if (sisa > 0){
          stok[iso(d)] = sisa;
          opsi += '<option value="' + iso(d) + '">' + HARI[w] + ", " + d.getDate() + " " + BLN[d.getMonth()]
                + " — sisa " + sisa + " kursi</option>";
          n++;
        }
      }
      d.setDate(d.getDate() + 1); guard++;
    }
    sel.innerHTML = opsi;
  })();

  /* ── Baca parameter URL dari homepage ───────────────────── */
  function terapkanParam(qs){
    var q = new URLSearchParams(qs || "");
    var pkg = q.get("pkg");
    if (pkg){
      var r = document.querySelector('#view-booking input[name="pkg"][value="' + pkg + '"]');
      if (r) r.checked = true;
    }
    var date = q.get("date");
    if (date && stok[date]) sel.value = date;
  }
  terapkanParam((location.hash.split("?")[1] || ""));

  /* ── State ─────────────────────────────────────────────── */
  var pax = 2;


  function paket(){ var p = document.querySelector('#view-booking input[name="pkg"]:checked'); return p ? p.value : "reguler"; }
  function mpKey(){ var m = document.querySelector('#view-booking input[name="mp"]:checked'); return m ? m.dataset.mp : "anyer"; }
  function skema(){ var b = document.querySelector('#view-booking input[name="bayar"]:checked'); return b ? b.value : "lunas"; }
  function metode(){ var m = document.querySelector('#view-booking input[name="metode"]:checked'); return m ? m.value : "Transfer Bank"; }

  function renderMetodeBox(el, nominal){
    if (!el) return;
    if (metode() === "QRIS"){
      el.innerHTML = '<small>Pindai kode QRIS resmi Nena Adventure</small>'
        + '<div class="qr" role="img" aria-label="Kode QRIS Nena Adventure"></div>'
        + '<b class="num">' + rupiah(nominal) + '</b>'
        + '<small>QRIS a.n. Nena Adventure Nusantara</small>';
    } else {
      el.innerHTML = '<small>Transfer ke rekening resmi</small>'
        + '<b class="num">' + REKENING_BCA + '</b>'
        + '<small>BCA — a.n. Nena Adventure Nusantara — nominal <strong>' + rupiah(nominal) + '</strong></small>';
    }
  }

  function tierPrivate(n){
    for (var i = 0; i < TIER_PRIVATE.length; i++){
      var t = TIER_PRIVATE[i];
      if (n >= t.min && n <= t.max) return t;
    }
    return TIER_PRIVATE[TIER_PRIVATE.length - 1];
  }

  /* ── Tampilkan hanya meeting point yang relevan untuk paket terpilih ── */
  function terapkanOpsiMp(){
    var pk = paket();
    var opsi = $$(".mp-opt");
    opsi.forEach(function(o){
      var boleh = o.dataset.for.split(",").indexOf(pk) > -1;
      o.classList.toggle("hidden", !boleh);
      var input = o.querySelector("input");
      if (!boleh && input.checked){
        var pertama = document.querySelector('#view-booking .mp-opt:not(.hidden) input');
        if (pertama) pertama.checked = true;
      }
      var amt = o.querySelector("[data-amt]");
      if (amt){
        var harga = HARGA[pk] ? HARGA[pk][input.dataset.mp] : null;
        amt.textContent = pk === "private" ? "Termasuk" : (harga ? rupiah(harga) + "/org" : "—");
      }
    });
    $("hintMp").textContent = pk === "reguler"
      ? "Open Trip Reguler hanya berangkat dari Pantai Pangaradan, Anyer. Untuk meeting point lain, hubungi admin."
      : pk === "private"
      ? "Private Trip Premium berkumpul di Pantai Pangaradan, Anyer. Transportasi lain dari Jakarta/Tangerang/Serang sesuai kesepakatan dengan admin."
      : "Harga sudah berbeda otomatis mengikuti meeting point yang dipilih.";
    $("hintPrivate").classList.toggle("hidden", pk !== "private");
  }

  function hitung(){
    var pk = paket(), mp = mpKey();
    if (pk === "private"){
      var t = tierPrivate(pax);
      var total = t.harga + LAYANAN;
      return { pk:pk, unit:t.harga, sub:t.harga, jem:0, disk:0, total:total, dp:Math.round(total * 0.5), tier:t };
    }
    var unit = (HARGA[pk] && HARGA[pk][mp]) || HARGA[pk].anyer;
    var sub  = unit * pax;
    var disk = pax >= 10 ? Math.round(sub * 0.05) : 0;
    var total = sub - disk + LAYANAN;
    return { pk:pk, unit:unit, sub:sub, jem:0, disk:disk, total:total, dp:Math.round(total * 0.5) };
  }

  function render(){
    terapkanOpsiMp();
    var h = hitung();
    var namaPkg = LABEL_PKG[h.pk];

    $("sumPax").textContent = pax + " peserta";
    $("sumPkg").textContent = namaPkg;
    $("sumUnit").textContent = rupiah(h.unit);
    $("sumBaris").textContent = h.pk === "private"
      ? "Paket rombongan " + h.tier.min + "–" + h.tier.max + " peserta"
      : rupiah(h.unit) + " × " + pax + " peserta";
    $("sumSub").textContent = rupiah(h.sub);
    $("sumTgl").textContent = sel.value ? labelTanggal(sel.value) : "Belum dipilih";
    $("sumJemputLbl").textContent = "Meeting point";
    $("sumJemput").textContent = LABEL_MP[mpKey()];
    $("rowDiskon").classList.toggle("hidden", h.disk === 0);
    $("sumDiskon").textContent = "−" + rupiah(h.disk);
    $("sumTotal").textContent = rupiah(h.total);

    var lunas = skema() === "lunas";
    $("sumDue").textContent = rupiah(lunas ? h.total : h.dp);
    $("sumDueNote").textContent = lunas
      ? "Pembayaran lunas."
      : "Sisa " + rupiah(h.total - h.dp) + " dilunasi paling lambat H-3.";
    $("amtLunas").textContent = rupiah(h.total);
    $("amtDp").textContent = rupiah(h.dp);
    $("bayarNominal").textContent = rupiah(lunas ? h.total : h.dp);
    renderMetodeBox($("metodeBox"), lunas ? h.total : h.dp);

    var sisa = sel.value ? stok[sel.value] : null;
    $("sisaInfo").textContent = h.pk === "private"
      ? "Private Trip Premium tidak berbagi kuota dengan open trip — kapal terpisah untuk rombongan Anda."
      : sisa
      ? "Tersisa " + sisa + " dari " + KUOTA + " kursi untuk tanggal ini."
      : "Hanya tanggal dengan kursi tersisa yang ditampilkan.";
    var maxPax = h.pk === "private" ? 14 : (sisa ? Math.min(sisa, 30) : 30);
    $("plus").disabled = pax >= maxPax;
    $("minus").disabled = pax <= 1;
    $("pax").textContent = pax;
    $("paxHint").textContent = h.pk === "private"
      ? "Harga per rombongan naik bertahap tiap kelipatan peserta (maks. 14 peserta)."
      : pax >= 10
      ? "Diskon rombongan 5% sudah diterapkan."
      : "Diskon rombongan 5% mulai 10 peserta.";
  }

  /* ── Kartu data peserta ────────────────────────────────── */
  function bangunPeserta(){
    var box = $("paxList"), lama = box.querySelectorAll(".pax").length;
    if (lama === pax) return;
    var html = "";
    for (var i = 1; i <= pax; i++){
      var v = {};
      var ada = box.querySelector('.pax[data-i="' + i + '"]');
      if (ada){
        v.n = ada.querySelector(".pnama").value;
        v.l = ada.querySelector(".plahir").value;
        v.k = ada.querySelector(".pid").value;
      }
      html += '<div class="pax" data-i="' + i + '">'
        + '<h3>Peserta ' + i + (i === 1 ? " (pemesan)" : "") + '</h3>'
        + '<div class="two">'
        + '<div class="field"><label for="pn' + i + '">Nama sesuai identitas</label>'
        + '<input class="inp pnama" id="pn' + i + '" autocomplete="off" value="' + (v.n || "") + '"><p class="err">Isi nama peserta.</p></div>'
        + '<div class="field"><label for="pl' + i + '">Tanggal lahir</label>'
        + '<input class="inp plahir" id="pl' + i + '" type="date" max="' + iso(new Date()) + '" value="' + (v.l || "") + '"><p class="err">Isi tanggal lahir.</p></div>'
        + '</div>'
        + '<div class="field"><label for="pk' + i + '">Nomor KTP / paspor / KIA</label>'
        + '<input class="inp pid" id="pk' + i + '" inputmode="numeric" value="' + (v.k || "") + '">'
        + '<p class="hint">Dipakai hanya untuk pendaftaran asuransi perjalanan.</p><p class="err">Isi nomor identitas.</p></div>'
        + '</div>';
    }
    box.innerHTML = html;
  }

  /* ── Navigasi langkah ──────────────────────────────────── */
  var langkah = 1;
  function keLangkah(n){
    langkah = n;
    [1,2,3,4].forEach(function(i){ $("s" + i).classList.toggle("hidden", i !== n); });
    var li = $("stepper").children;
    for (var i = 0; i < li.length; i++){
      li[i].classList.toggle("done", i + 1 < n);
      if (i + 1 === n) li[i].setAttribute("aria-current", "step");
      else li[i].removeAttribute("aria-current");
    }
    window.scrollTo({ top:0, behavior:"smooth" });
    var h = $("s" + n).querySelector("h2");
    if (h){ h.setAttribute("tabindex","-1"); h.focus(); }
  }

  function tandai(el, errId, salah){
    el.setAttribute("aria-invalid", salah ? "true" : "false");
    var e = errId ? $(errId) : el.parentElement.querySelector(".err");
    if (e) e.classList.toggle("on", salah);
    return !salah;
  }

  $("to2").addEventListener("click", function(){
    if (!tandai(sel, "errTanggal", !sel.value)){ sel.focus(); return; }
    bangunPeserta();
    keLangkah(2);
  });
  $("back1").addEventListener("click", function(){ keLangkah(1); });
  $("back2").addEventListener("click", function(){ keLangkah(2); });

  $("to3").addEventListener("click", function(){
    var ok = true, pertama = null;
    var nama = $("nama"), hp = $("hp"), email = $("email");
    if (!tandai(nama, "errNama", nama.value.trim().length < 3)){ ok = false; pertama = pertama || nama; }
    if (!tandai(hp, "errHp", hp.value.replace(/\D/g,"").length < 10)){ ok = false; pertama = pertama || hp; }
    if (!tandai(email, "errEmail", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value))){ ok = false; pertama = pertama || email; }

    Array.prototype.forEach.call($("paxList").querySelectorAll(".pax"), function(p){
      var n = p.querySelector(".pnama"), l = p.querySelector(".plahir"), k = p.querySelector(".pid");
      if (!tandai(n, null, n.value.trim().length < 3)){ ok = false; pertama = pertama || n; }
      if (!tandai(l, null, !l.value)){ ok = false; pertama = pertama || l; }
      if (!tandai(k, null, k.value.replace(/\s/g,"").length < 6)){ ok = false; pertama = pertama || k; }
    });

    if (!ok){ pertama.focus(); return; }
    keLangkah(3);
  });

  /* ── Bayar ─────────────────────────────────────────────── */
  $("bayar").addEventListener("click", function(){
    var setuju = $("setuju");
    if (!setuju.checked){
      $("errSetuju").classList.add("on");
      setuju.focus();
      return;
    }
    $("errSetuju").classList.remove("on");

    var h = hitung(), lunas = skema() === "lunas", nominal = lunas ? h.total : h.dp;
    var kode = generateKode();
    $("kode").textContent = kode;
    var m = metode();
    renderMetodeBox($("payBox"), nominal);

    var namaPkg = LABEL_PKG[paket()];
    $("recap").innerHTML =
        '<li><span>Paket</span><b>' + namaPkg + '</b></li>'
      + '<li><span>Tanggal</span><b>' + labelTanggal(sel.value) + '</b></li>'
      + '<li><span>Kumpul</span><b>06.30 WIB, Pantai Pangaradan</b></li>'
      + '<li><span>Peserta</span><b>' + pax + ' orang</b></li>'
      + '<li><span>Meeting point</span><b>' + LABEL_MP[mpKey()] + '</b></li>'
      + '<li><span>Pemesan</span><b>' + $("nama").value + '</b></li>'
      + '<li><span>Kontak</span><b>' + $("hp").value + '</b></li>'
      + '<li><span>Cara bayar</span><b>' + m + '</b></li>'
      + '<li><span>Total tagihan</span><b>' + rupiah(h.total) + '</b></li>'
      + '<li><span>Dibayar sekarang</span><b>' + rupiah(nominal) + '</b></li>';

    $("waKonfirmasi").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(
      "Halo Nena Adventure, saya sudah booking dan bayar.\n"
      + "Kode: " + kode + "\n"
      + "Paket: " + namaPkg + "\n"
      + "Tanggal: " + labelTanggal(sel.value) + "\n"
      + "Peserta: " + pax + " orang\n"
      + "Cara bayar: " + m + "\n"
      + "Nominal dibayar: " + rupiah(nominal) + "\n"
      + "(Bukti pembayaran akan saya lampirkan di sini.)"
    );

    keLangkah(4);
    mulaiTimer(60 * 60);
  });

  /* ── Upload bukti transfer (arsip lokal, tetap dilampirkan manual di WhatsApp) ── */
  var buktiUpload = $("buktiUpload");
  if (buktiUpload) buktiUpload.addEventListener("change", function(){
    var f = buktiUpload.files && buktiUpload.files[0];
    $("buktiHint").textContent = f
      ? "Terpilih: " + f.name + ". Lampirkan file yang sama saat chat WhatsApp dengan admin."
      : "Format JPG, PNG, atau PDF. File ini membantu admin memverifikasi lebih cepat.";
  });

  var jam = null;
  function mulaiTimer(detik){
    clearInterval(jam);
    var t = $("timer");
    jam = setInterval(function(){
      detik--;
      if (detik <= 0){
        clearInterval(jam);
        t.textContent = "kedaluwarsa";
        return;
      }
      t.textContent = pad(Math.floor(detik / 60)) + ":" + pad(detik % 60);
    }, 1000);
  }

  /* ── Event ─────────────────────────────────────────────── */
  $("plus").addEventListener("click", function(){ pax++; render(); bangunPeserta(); });
  $("minus").addEventListener("click", function(){ if (pax > 1){ pax--; render(); bangunPeserta(); } });
  sel.addEventListener("change", function(){
    var sisa = stok[sel.value];
    if (sisa && pax > sisa) pax = sisa;
    render();
    bangunPeserta();
    tandai(sel, "errTanggal", false);
  });
  document.addEventListener("change", function(e){
    if (e.target.name === "pkg" || e.target.name === "mp" || e.target.name === "bayar" || e.target.name === "metode") render();
    if (e.target.id === "setuju" && e.target.checked) $("errSetuju").classList.remove("on");
  });

  $("waHelp").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Halo, saya butuh bantuan saat booking di website.");

  window.addEventListener("nena:route", function(e){
    if (e.detail.view !== "booking") return;
    terapkanParam(e.detail.query);
    if (langkah === 4) keLangkah(1);
    bangunPeserta();
    render();
  });

  render();
})();

