import { sqliteConn } from "./client.js";
import { purgeOverduePii } from "../usecases/pii-purge.js";

/** Manual: npm run job:purge-pii — hapus NIK/tgl lahir 90 hari pasca keberangkatan. */
const n = purgeOverduePii();
console.log(`Purge PII selesai. Peserta di-purge: ${n}.`);
sqliteConn.close();
