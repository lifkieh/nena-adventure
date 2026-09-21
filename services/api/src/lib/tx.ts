import { sqliteConn } from "../db/client.js";

/**
 * Jalankan fn dalam transaksi BEGIN IMMEDIATE (kunci tulis diambil di awal),
 * sehingga cek kapasitas + penulisan ledger tidak bisa disalip transaksi lain.
 * better-sqlite3 sinkron, jadi fn juga sinkron.
 */
export function txImmediate<T>(fn: () => T): T {
  const wrapped = sqliteConn.transaction(fn);
  return wrapped.immediate();
}
