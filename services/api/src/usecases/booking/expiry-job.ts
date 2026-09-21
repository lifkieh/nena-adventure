import { expireOverdueHolds } from "./service.js";

let timer: NodeJS.Timeout | null = null;

/** Job kedaluwarsa: jalan tiap menit. Aman berbarengan dgn evaluasi lazy. */
export function startExpiryJob(intervalMs = 60_000): void {
  if (timer) return;
  timer = setInterval(() => {
    try {
      expireOverdueHolds();
    } catch {
      /* jangan sampai job mematikan proses */
    }
  }, intervalMs);
  timer.unref?.();
}

export function stopExpiryJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
