import { sqliteConn, db } from "./client.js";
import { schedules } from "./schema.js";

/**
 * Fixture PARITY: isi jadwal sehingga sisa kursi (capacity, tanpa booking) SAMA
 * PERSIS dengan nilai sisaKursi() Math.sin lama untuk tiap akhir pekan.
 * Dengan ini `npm run parity` tetap 0 selisih DOM (angka kursi identik).
 * HANYA untuk parity/QA — bukan seed produksi.
 */
function sisaKursiLama(d: Date): number {
  const KUOTA = 24;
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (KUOTA + 3));
}
function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
function iso(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function main(): void {
  // Bersihkan state booking + jadwal agar deterministik (anak dulu -> FK aman).
  sqliteConn.prepare("DELETE FROM payments").run();
  sqliteConn.prepare("DELETE FROM booking_participants").run();
  sqliteConn.prepare("DELETE FROM seat_ledger").run();
  sqliteConn.prepare("DELETE FROM bookings").run();
  sqliteConn.prepare("DELETE FROM schedules").run();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let count = 0;
  // Dari besok hingga ~210 hari ke depan (menutup dropdown 14 + kalender 4 bulan).
  for (let offset = 1; offset <= 210; offset++) {
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    const w = d.getDay();
    if (w !== 0 && w !== 6) continue; // hanya akhir pekan
    const cap = sisaKursiLama(d); // 0..26 (== sisa lama, tanpa booking)
    db.insert(schedules)
      .values({
        date: iso(d),
        capacity: cap,
        threshold: 6,
        status: "open",
        departureTime: "07:00",
        meetingPoint: "Pantai Pangaradan, Anyer",
      })
      .run();
    count++;
  }
  console.log(`Seed PARITY selesai: ${count} jadwal akhir pekan.`);
  sqliteConn.close();
}

main();
