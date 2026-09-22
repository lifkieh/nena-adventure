import { WA_PRIMARY as WA } from "./data/wa.js";
(function(){
  "use strict";
  /* ── WhatsApp: pesan aman untuk URL ────────────────────── */
  function waLink(pesan){
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(pesan);
  }
  var band = document.getElementById("waBand");
  if (band) band.href = waLink("Halo Nena Adventure, saya mau tanya soal open trip Pulau Sangiang.");
  var fab = document.getElementById("waFab");
  if (fab) fab.href = waLink("Halo Nena Adventure, saya mau tanya soal trip Pulau Sangiang.");
})();
