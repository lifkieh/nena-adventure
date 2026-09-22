import { env } from "./env.js";
import { buildApp } from "./app.js";
import { startExpiryJob } from "./usecases/booking/expiry-job.js";
import { purgeOverduePii } from "./usecases/pii-purge.js";
import { retryOutbox, runSettlementReminders } from "./usecases/notification/service.js";
import * as content from "./usecases/content/service.js";
import { diffAgainstBaseline } from "./db/content-baseline.js";

/** Peringatkan (bukan matikan) bila ada section terbit lebih miskin dari baseline. */
function warnPoorerContent(log: { warn: (msg: string) => void }): void {
  try {
    const diffs = diffAgainstBaseline(
      (key) => content.getSectionSafe(key)?.published ?? null,
    );
    for (const d of diffs) {
      if (d.status === "poorer" || d.status === "missing") {
        log.warn(
          `KONTEN: section "${d.key}" ${d.status} dari baseline (${d.detail}). ` +
            `Jalankan: npm run seed:content lalu npm run content:verify.`,
        );
      }
    }
  } catch {
    /* jangan halangi start hanya karena cek konten */
  }
}

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    warnPoorerContent(app.log);
    startExpiryJob(); // job kedaluwarsa tiap menit
    // Job harian: purge PII 90 hari pasca keberangkatan.
    const purgeTimer = setInterval(() => {
      try {
        purgeOverduePii();
      } catch {
        /* jangan matikan proses */
      }
    }, 24 * 60 * 60 * 1000);
    purgeTimer.unref?.();
    // Retry email outbox tiap 5 menit (backoff via attempt_count, maks 3).
    const retryTimer = setInterval(() => { void retryOutbox().catch(() => {}); }, 5 * 60 * 1000);
    retryTimer.unref?.();
    // Reminder pelunasan tiap 12 jam (idempoten per booking).
    const settleTimer = setInterval(() => { void runSettlementReminders().catch(() => {}); }, 12 * 60 * 60 * 1000);
    settleTimer.unref?.();
    app.log.info(`Situs publik : http://localhost:${env.PORT}/`);
    app.log.info(`Panel admin  : http://localhost:${env.PORT}/panel/`);
    app.log.info(`API health   : http://localhost:${env.PORT}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
