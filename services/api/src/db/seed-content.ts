import { sqliteConn } from "./client.js";
import * as content from "../usecases/content/service.js";

const SYSTEM = { userId: null, role: "system", ip: null, userAgent: null } as const;

/**
 * Seed konten CMS dari isi HTML situs saat ini — VERBATIM — agar setelah situs
 * membaca konten dari API, render tetap identik (parity 0.0000%). Idempoten.
 */
export function seedContent(): void {
  // Hero: heading verbatim dari apps/site/index.html.
  const heroPublished = content.getSectionSafe("hero")?.published as
    | { heading?: string }
    | null
    | undefined;
  if (!heroPublished || !heroPublished.heading) {
    content.saveDraft(
      "hero",
      { heading: "Jelajahi Pulau Sangiang dan nikmati keindahannya" },
      SYSTEM,
    );
    content.publish("hero", SYSTEM);
  }

  // FAQ: 7 item VERBATIM dari index.html (dikonsumsi situs; parity 0).
  const faq = content.getSectionSafe("faq");
  if (!faq || !faq.published) {
    content.saveDraft("faq", { items: FAQ_ITEMS }, SYSTEM);
    content.publish("faq", SYSTEM);
  }
}

const FAQ_ITEMS = [
  { q: "Bagaimana cara membayar?", a: "Pembayaran dilakukan melalui transfer ke rekening resmi BCA Nena Adventure Nusantara. Anda bisa membayar penuh atau DP minimal 50% dulu, lalu melunasi paling lambat H-3 sebelum keberangkatan. Setelah transfer, kirim bukti pembayaran ke admin untuk verifikasi.", active: true },
  { q: "Apakah open trip tetap berangkat kalau pesertanya sedikit atau cuma sendirian?", a: "Ya. Tidak ada minimal pax untuk open trip — 1 peserta pun tetap berangkat. Khusus program 2D1N berlaku minimal 2 pax.", active: true },
  { q: "Apa bedanya Open Trip Reguler, Open Trip Premium, dan Private Trip Premium?", a: "Reguler memakai kapal tradisional dan gabung dengan peserta lain. Premium memakai speedboat, menambah paddle board, drone, kamera underwater, dan kelapa muda. Private Trip Premium memakai kapal eksklusif untuk rombongan sendiri, dengan tambahan Legon Waru dan Krakatoa View, serta jadwal yang lebih fleksibel.", active: true },
  { q: "Saya tidak bisa berenang. Aman?", a: "Aman. Life jacket dipakai selama seluruh aktivitas air dan spot snorkeling kami berada di area berarus tenang. Beri tahu kami saat booking supaya guide bisa mendampingi Anda secara khusus.", active: true },
  { q: "Bagaimana kalau saya batal atau ingin ganti tanggal?", a: "Pembatalan karena alasan pribadi membuat DP tidak dapat dikembalikan. Jika Nena Adventure yang membatalkan karena cuaca ekstrem atau kondisi yang tidak memungkinkan, DP dikembalikan 100%. Detail lengkap ada di bagian Syarat, Ketentuan & Kebijakan.", active: true },
  { q: "Apa yang perlu saya bawa sendiri?", a: "Baju ganti, baju renang, sunscreen, obat pribadi, sandal atau sepatu trekking, dan dry bag untuk barang elektronik — lihat daftar lengkap di bagian Saran Barang Bawaan.", active: true },
  { q: "Bisa untuk keluarga, komunitas, atau rombongan kantor?", a: "Bisa, lewat Private Trip Premium — satu kapal khusus untuk rombongan Anda, harga bertingkat sesuai jumlah peserta (1–14 orang). Untuk rombongan lebih besar, hubungi admin untuk penawaran khusus.", active: true },
];

// Jalur manual: npm run seed:content
if (process.argv[1] && process.argv[1].endsWith("seed-content.ts")) {
  seedContent();
  console.log("Seed konten selesai.");
  sqliteConn.close();
}
