import { sqliteConn } from "./client.js";
import * as content from "../usecases/content/service.js";
import { diffAgainstBaseline } from "./content-baseline.js";

/**
 * content:verify — bandingkan konten TERBIT di database berjalan dengan baseline
 * ekstraksi. Exit 1 bila ada section yang menyimpang (mismatch/poorer/missing).
 *   DB_PATH=services/api/data/nena.db npm run content:verify
 */
const publishedOf = (key: string) => content.getSectionSafe(key)?.published ?? null;
const diffs = diffAgainstBaseline(publishedOf);

let bad = 0;
for (const d of diffs) {
  const tag = d.status === "ok" ? "OK  " : "BEDA";
  console.log(`${tag} ${d.key.padEnd(8)} ${d.status.padEnd(9)} ${d.detail}`);
  if (d.status !== "ok") bad++;
}

sqliteConn.close();
if (bad > 0) {
  console.error(`\ncontent:verify GAGAL — ${bad} section menyimpang dari baseline.`);
  process.exit(1);
}
console.log("\ncontent:verify OK — semua section terbit cocok baseline.");
