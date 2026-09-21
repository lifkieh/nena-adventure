import { ulid } from "ulid";
import { sqliteConn } from "./client.js";

/**
 * Rekonsiliasi ledger pembayaran (SEKALI JALAN, idempoten, TANPA hapus baris):
 *  1) Tandai booking "SMOKE …" sebagai data uji (is_test = 1).
 *  2) Untuk booking dgn amountPaid > SUM(payment verified positif): sisipkan
 *     satu baris payment VERIFIED sebesar selisih (transfer, kind sesuai skema,
 *     verifiedAt = confirmedAt/statusChangedAt).
 *  3) Untuk booking dgn refundAmount > 0 tapi belum ada baris refund: sisipkan
 *     baris payment NEGATIF (−refund) verified.
 *  4) Isi ulang amountPaid = SUM(payment verified) untuk semua booking.
 *   DB_PATH=services/api/data/nena.db npm run reconcile:ledger
 */
const now = new Date().toISOString();

// 1) Flag data uji.
const flagged = sqliteConn
  .prepare("UPDATE bookings SET is_test = 1 WHERE (customer_name LIKE 'SMOKE %' OR customer_name LIKE 'SMOKE') AND is_test = 0")
  .run();
console.log(`SMOKE ditandai is_test: ${flagged.changes}`);

const bookings = sqliteConn
  .prepare("SELECT id, code, total, amount_paid AS amountPaid, payment_scheme AS scheme, confirmed_at AS confirmedAt, status_changed_at AS statusChangedAt, refund_amount AS refundAmount FROM bookings")
  .all() as {
  id: string; code: string; total: number; amountPaid: number; scheme: string;
  confirmedAt: string | null; statusChangedAt: string | null; refundAmount: number;
}[];

const sumVerified = sqliteConn.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE booking_id = ? AND status='verified'");
const sumPositive = sqliteConn.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE booking_id = ? AND status='verified' AND amount > 0");
const hasRefund = sqliteConn.prepare("SELECT COUNT(*) AS c FROM payments WHERE booking_id = ? AND kind='refund'");
const insertPay = sqliteConn.prepare(
  `INSERT INTO payments (id, booking_id, amount, method, kind, status, provider, verified_at, paid_at, created_at)
   VALUES (?, ?, ?, 'transfer', ?, 'verified', 'manual', ?, ?, ?)`,
);
const setPaid = sqliteConn.prepare("UPDATE bookings SET amount_paid = ? WHERE id = ?");

let backPos = 0, backRef = 0;
for (const b of bookings) {
  const pos = (sumPositive.get(b.id) as { s: number }).s;
  if (b.amountPaid > pos) {
    const gap = b.amountPaid - pos;
    const kind = b.amountPaid >= b.total ? (b.scheme === "dp" ? "pelunasan" : "full") : "dp";
    const vAt = b.confirmedAt ?? b.statusChangedAt ?? now;
    insertPay.run(ulid(), b.id, gap, kind, vAt, vAt, vAt);
    backPos++;
  }
  if (b.refundAmount > 0 && (hasRefund.get(b.id) as { c: number }).c === 0) {
    const vAt = b.statusChangedAt ?? b.confirmedAt ?? now;
    insertPay.run(ulid(), b.id, -b.refundAmount, "refund", vAt, vAt, vAt);
    backRef++;
  }
}
console.log(`Backfill pembayaran positif: ${backPos}, refund negatif: ${backRef}`);

// 4) Isi ulang amountPaid dari SUM(verified).
let synced = 0;
for (const b of bookings) {
  const s = (sumVerified.get(b.id) as { s: number }).s;
  setPaid.run(s, b.id);
  synced++;
}
console.log(`amountPaid diselaraskan ke SUM(verified) untuk ${synced} booking.`);

// Bukti singkat untuk NA-125218 bila ada.
const na = sqliteConn.prepare("SELECT id FROM bookings WHERE code='NA-125218'").get() as { id: string } | undefined;
if (na) {
  const rows = sqliteConn.prepare("SELECT amount, kind FROM payments WHERE booking_id = ? ORDER BY created_at").all(na.id);
  console.log("NA-125218 payments:", JSON.stringify(rows));
}
sqliteConn.close();
