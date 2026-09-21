import { useEffect, useState } from "react";

/** Tick tiap detik — untuk hitung mundur yang hidup. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Deadline hold untuk status yang PUNYA batas waktu, else null. */
export function holdDeadline(b: { status?: unknown; holdExpiresAt?: unknown; balanceDueAt?: unknown }): string | null {
  const s = String(b.status ?? "");
  if (s === "menunggu_bayar" && b.holdExpiresAt) return String(b.holdExpiresAt);
  if (s === "menunggu_pelunasan" && b.balanceDueAt) return String(b.balanceDueAt);
  return null;
}

function fmt(ms: number): string {
  if (ms <= 0) return "kedaluwarsa";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}h ${h}j`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Hitung mundur hidup ke `deadline`. Merah <15 menit / kedaluwarsa. */
export function Countdown({ deadline }: { deadline: string | null }) {
  const now = useNow();
  if (!deadline) return <span className="text-slate-400">-</span>;
  const ms = new Date(deadline).getTime() - now;
  const urgent = ms <= 15 * 60_000;
  return (
    <span data-testid="hold-countdown" className={`rounded px-1.5 text-xs font-bold ${urgent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
      {fmt(ms)}
    </span>
  );
}
