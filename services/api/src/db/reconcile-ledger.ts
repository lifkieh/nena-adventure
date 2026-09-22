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
 *   Jalankan (memperbaiki): npm run reconcile:ledger
 *   Mode READ-ONLY (hanya lapor drift & anomali, tanpa menulis):
 *     npm run reconcile:ledger -w @nena/api -- --dry-run
 *   (Catatan: flag HARUS lewat bentuk workspace di atas; `npm run reconcile:ledger
 *    -- --dry-run` dari root TIDAK meneruskan flag ke skrip.)
 */
const now = new Date().toISOString();
const DRY_RUN = process.argv.includes("--dry-run");

// Mode read-only: laporkan booking yang SUM(payment verified) != amount_paid.
// Tidak menyisipkan/mengubah baris apa pun.
if (DRY_RUN) {
  const rows = sqliteConn
    .prepare(
      `SELECT b.id, b.code, b.status, b.total, b.amount_paid AS amountPaid, b.is_test AS isTest,
              COALESCE((SELECT SUM(amount) FROM payments p WHERE p.booking_id = b.id AND p.status='verified'), 0) AS ledger
       FROM bookings b`,
    )
    .all() as { id: string; code: string; status: string; total: number; amountPaid: number; isTest: number; ledger: number }[];
  const mismatches = rows.filter((r) => r.ledger !== r.amountPaid);
  const underpaidDone = rows.filter((r) => r.status === "selesai" && r.ledger < r.total && r.isTest === 0);
  console.log(`[dry-run] Total booking: ${rows.length}`);
  console.log(`[dry-run] Ledger != amount_paid: ${mismatches.length}`);
  for (const m of mismatches) {
    console.log(`  ${m.code} (${m.status}): ledger=${m.ledger} amount_paid=${m.amountPaid} selisih=${m.ledger - m.amountPaid}`);
  }
  console.log(`[dry-run] "selesai" tapi ledger < total (anomali): ${underpaidDone.length}`);
  for (const u of underpaidDone) {
    console.log(`  ${u.code}: ledger=${u.ledger} total=${u.total} kurang=${u.total - u.ledger}`);
  }
  console.log("[dry-run] Tidak ada perubahan ditulis.");
  sqliteConn.close();
  process.exit(0);
}

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
