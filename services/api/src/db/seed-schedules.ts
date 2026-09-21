import { db, sqliteConn } from "./client.js";
import { schedules } from "./schema.js";

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
function isoOf(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

/**
 * Seed jadwal operasional: seluruh Sabtu & Minggu untuk `monthsAhead` bulan.
 * Idempoten — tanggal yang sudah ada dilewati (tidak digandakan).
 * Mengembalikan jumlah tanggal baru yang ditambahkan.
 */
export function seedOperationalSchedules(monthsAhead = 3): number {
  const existing = new Set(
    (
      sqliteConn.prepare("SELECT date FROM schedules").all() as {
        date: string;
      }[]
    ).map((r) => r.date),
  );
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + monthsAhead);

  let added = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const w = cursor.getDay();
    if (w === 0 || w === 6) {
      const key = isoOf(cursor);
      if (!existing.has(key)) {
        db.insert(schedules)
          .values({
            date: key,
            capacity: 24,
            threshold: 6,
            status: "terbit",
            departureTime: "07:00",
            meetingPoint: "Pantai Pangaradan, Anyer",
          })
          .run();
        added++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return added;
}
