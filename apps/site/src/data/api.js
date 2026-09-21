// Klien API publik untuk situs. Data kursi & booking dari server (bukan mock).
const BASE = "/api/public";

let _cache = null;

/** Muat jadwal dari server sekali (cache promise). */
export function loadSchedules() {
  if (!_cache) {
    _cache = fetch(BASE + "/schedules")
      .then(function (r) {
        if (!r.ok) throw new Error("Gagal memuat jadwal.");
        return r.json();
      })
      .then(function (list) {
        var remainingByIso = {};
        var idByIso = {};
        for (var i = 0; i < list.length; i++) {
          remainingByIso[list[i].date] = list[i].remaining;
          idByIso[list[i].date] = list[i].id;
        }
        return { list: list, remainingByIso: remainingByIso, idByIso: idByIso };
      });
  }
  return _cache;
}

/** POST booking. Lempar Error dengan .code / .status bila gagal. */
export async function createBooking(payload, idempotencyKey) {
  var res = await fetch(BASE + "/bookings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  var body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    var msg =
      (body && body.error && body.error.message) || "Gagal membuat pesanan.";
    var err = new Error(msg);
    err.code = body && body.error && body.error.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

/** Muat konten terbit dari API. Cache di localStorage; fallback ke cache terakhir
 *  bila API gagal (situs tidak boleh kosong). */
export async function loadContent() {
  try {
    var res = await fetch(BASE + "/content");
    if (!res.ok) throw new Error("gagal");
    var data = await res.json();
    try { localStorage.setItem("nena_content", JSON.stringify(data)); } catch (e) {}
    return data;
  } catch (e) {
    try {
      var cached = localStorage.getItem("nena_content");
      if (cached) return JSON.parse(cached);
    } catch (e2) {}
    return null; // biar situs pakai konten bawaan di HTML
  }
}

/** Upload bukti (multipart). Token via header X-Booking-Token. Lempar Error bila gagal. */
export async function uploadProof(code, token, file) {
  var fd = new FormData();
  fd.append("file", file);
  var res = await fetch(BASE + "/bookings/" + encodeURIComponent(code) + "/proof", {
    method: "POST",
    headers: { "x-booking-token": token }, // JANGAN set content-type: biar boundary otomatis
    body: fd,
  });
  var body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    var msg = (body && body.error && body.error.message) || "Gagal mengunggah bukti.";
    var err = new Error(msg);
    err.code = body && body.error && body.error.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

/** Ambil ringkasan pesanan (untuk restore setelah refresh). null bila gagal.
 *  Token dikirim via header X-Booking-Token (bukan query string). */
export async function getSummary(code, token) {
  var res = await fetch(BASE + "/bookings/" + encodeURIComponent(code), {
    headers: { "x-booking-token": token },
  });
  if (!res.ok) return null;
  return res.json();
}
