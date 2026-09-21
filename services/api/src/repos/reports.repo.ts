import { sqliteConn } from "../db/client.js";

export function revenueByPackage(from: string, to: string) {
  return sqliteConn
    .prepare(
      `SELECT b.package_type AS packageType, SUM(b.amount_paid) AS amount, COUNT(*) AS bookings
       FROM bookings b JOIN schedules s ON s.id = b.schedule_id
       WHERE s.date BETWEEN ? AND ? AND b.status NOT IN ('batal','kadaluarsa')
       GROUP BY b.package_type`,
    )
    .all(from, to) as { packageType: string; amount: number; bookings: number }[];
}

export function paxCarried(from: string, to: string): number {
  const r = sqliteConn
    .prepare(
      `SELECT COALESCE(SUM(b.pax),0) AS pax
       FROM bookings b JOIN schedules s ON s.id = b.schedule_id
       WHERE s.date BETWEEN ? AND ? AND b.status IN ('siap_jalan','selesai')`,
    )
    .get(from, to) as { pax: number };
  return r.pax;
}

export function statusCounts(from: string, to: string): {
  expired: number;
  cancelled: number;
} {
  const r = sqliteConn
    .prepare(
      `SELECT
         SUM(CASE WHEN b.status='kadaluarsa' THEN 1 ELSE 0 END) AS expired,
         SUM(CASE WHEN b.status='batal' THEN 1 ELSE 0 END) AS cancelled
       FROM bookings b JOIN schedules s ON s.id = b.schedule_id
       WHERE s.date BETWEEN ? AND ?`,
    )
    .get(from, to) as { expired: number | null; cancelled: number | null };
  return { expired: r.expired ?? 0, cancelled: r.cancelled ?? 0 };
}

/* ── Dashboard ringkasan ─────────────────────────────────── */

/** Booking AKTIF (bukan batal/kadaluarsa) dibuat sejak instan UTC. Kecuali data uji. */
export function countActiveBookingsCreatedSince(sinceIso: string): number {
  const r = sqliteConn
    .prepare("SELECT COUNT(*) AS c FROM bookings WHERE created_at >= ? AND status NOT IN ('batal','kadaluarsa') AND is_test = 0")
    .get(sinceIso) as { c: number };
  return r.c;
}
/** Booking batal/kadaluarsa dibuat sejak instan UTC (untuk label terpisah). Kecuali data uji. */
export function countInactiveBookingsCreatedSince(sinceIso: string): number {
  const r = sqliteConn
    .prepare("SELECT COUNT(*) AS c FROM bookings WHERE created_at >= ? AND status IN ('batal','kadaluarsa') AND is_test = 0")
    .get(sinceIso) as { c: number };
  return r.c;
}

/** Jumlah booking pada status tertentu (kecuali data uji). */
export function countBookingsByStatus(status: string): number {
  const r = sqliteConn
    .prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = ? AND is_test = 0")
    .get(status) as { c: number };
  return r.c;
}

/** Kursi terjual (net SUM(delta)) untuk jadwal dengan tanggal di [from,to]. Kecuali data uji. */
export function seatsSoldBetween(from: string, to: string): number {
  const r = sqliteConn
    .prepare(
      `SELECT COALESCE(SUM(l.delta),0) AS seats
       FROM seat_ledger l JOIN schedules s ON s.id = l.schedule_id
       LEFT JOIN bookings b ON b.id = l.booking_id
       WHERE s.date BETWEEN ? AND ? AND COALESCE(b.is_test, 0) = 0`,
    )
    .get(from, to) as { seats: number };
  return r.seats;
}

/**
 * Pendapatan BERSIH sejak instan UTC = SUM(amount) baris payments VERIFIED yang
 * verified_at-nya >= since (refund sudah baris NEGATIF), TANPA memandang status
 * booking. Data uji (is_test) dikecualikan dari Ringkasan.
 */
export function verifiedRevenueSince(sinceIso: string): number {
  const r = sqliteConn
    .prepare(
      `SELECT COALESCE(SUM(p.amount),0) AS a
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE p.status='verified' AND p.verified_at >= ? AND b.is_test = 0`,
    )
    .get(sinceIso) as { a: number };
  return r.a;
}

/** Jadwal terbit terdekat (date>=today) yang hampir penuh: 0 < sisa <= threshold. */
export function nearestNearlyFull(today: string): {
  id: string;
  date: string;
  capacity: number;
  threshold: number;
  remaining: number;
} | null {
  const r = sqliteConn
    .prepare(
      `SELECT * FROM (
         SELECT s.id AS id, s.date AS date, s.capacity AS capacity, s.threshold AS threshold,
                (s.capacity - COALESCE((SELECT SUM(delta) FROM seat_ledger WHERE schedule_id = s.id),0)) AS remaining
         FROM schedules s
         WHERE s.status='terbit' AND s.date >= ?
       )
       WHERE remaining > 0 AND remaining <= threshold
       ORDER BY date ASC LIMIT 1`,
    )
    .get(today) as { id: string; date: string; capacity: number; threshold: number; remaining: number } | undefined;
  return r ?? null;
}

/** Pendapatan bersih per bulan (dari ledger payments verified, refund negatif). Kecuali data uji. */
export function monthlyRevenue(): { month: string; amount: number }[] {
  return sqliteConn
    .prepare(
      `SELECT substr(p.verified_at,1,7) AS month, COALESCE(SUM(p.amount),0) AS amount
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE p.status='verified' AND p.verified_at IS NOT NULL AND b.is_test = 0
       GROUP BY month ORDER BY month DESC`,
    )
    .all() as { month: string; amount: number }[];
}

/** Jumlah booking per status (kecuali data uji). */
export function bookingsByStatusAll(): { status: string; count: number }[] {
  return sqliteConn
    .prepare("SELECT status, COUNT(*) AS count FROM bookings WHERE is_test = 0 GROUP BY status")
    .all() as { status: string; count: number }[];
}

/** Kursi terjual per jadwal mendatang (net SUM delta, kecuali data uji). */
export function seatsSoldPerSchedule(fromDate: string): { date: string; capacity: number; sold: number }[] {
  return sqliteConn
    .prepare(
      `SELECT s.date AS date, s.capacity AS capacity,
              COALESCE((SELECT SUM(l.delta) FROM seat_ledger l LEFT JOIN bookings b ON b.id=l.booking_id
                        WHERE l.schedule_id=s.id AND COALESCE(b.is_test,0)=0),0) AS sold
       FROM schedules s WHERE s.date >= ? ORDER BY s.date ASC`,
    )
    .all(fromDate) as { date: string; capacity: number; sold: number }[];
}

export function outstandingDp() {
  return sqliteConn
    .prepare(
      `SELECT b.code AS code, b.customer_name AS customerName, b.total AS total,
              b.amount_paid AS amountPaid, (b.total - b.amount_paid) AS outstanding,
              s.date AS scheduleDate, b.balance_due_at AS balanceDueAt
       FROM bookings b JOIN schedules s ON s.id = b.schedule_id
       WHERE b.status = 'menunggu_pelunasan'
       ORDER BY s.date ASC`,
    )
    .all() as {
    code: string;
    customerName: string;
    total: number;
    amountPaid: number;
    outstanding: number;
    scheduleDate: string;
    balanceDueAt: string | null;
  }[];
}
