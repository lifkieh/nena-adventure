import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatJakarta, formatRupiah } from "@nena/shared";
import { reportsApi, type DashboardDto } from "../lib/api";
import { usePermissions } from "../lib/useAuth";
import { Loading, ErrorState, NoAccess } from "../components/States";

interface Card {
  key: keyof DashboardDto | "nearestNearlyFull";
  label: string;
  to: string;
  value: string;
  empty: boolean;
  emptyText: string;
}

export function DashboardPage() {
  const { has } = usePermissions();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: reportsApi.dashboard, enabled: has("report:read") });

  if (!has("report:read")) return <NoAccess />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="Tidak bisa memuat ringkasan." onRetry={() => q.refetch()} />;
  const d = q.data;

  const nf = d.nearestNearlyFull;
  const cards: Card[] = [
    { key: "bookingsToday", label: "Booking aktif hari ini", to: "/bookings", value: d.bookingsTodayCancelled > 0 ? `${d.bookingsToday} aktif · ${d.bookingsTodayCancelled} batal/kadaluarsa` : String(d.bookingsToday), empty: d.bookingsToday === 0 && d.bookingsTodayCancelled === 0, emptyText: "Belum ada booking hari ini." },
    { key: "awaitingProof", label: "Menunggu verifikasi bukti", to: "/verification", value: String(d.awaitingProof), empty: d.awaitingProof === 0, emptyText: "Tidak ada bukti menunggu." },
    { key: "awaitingSettlement", label: "Menunggu pelunasan", to: "/bookings", value: String(d.awaitingSettlement), empty: d.awaitingSettlement === 0, emptyText: "Tidak ada yang menunggu pelunasan." },
    { key: "seatsSoldNext7Days", label: "Kursi terjual 7 hari ke depan", to: "/schedules", value: `${d.seatsSoldNext7Days} kursi`, empty: d.seatsSoldNext7Days === 0, emptyText: "Belum ada kursi terjual pekan ini." },
    { key: "verifiedRevenueThisMonth", label: "Pendapatan terverifikasi bulan ini", to: "/verification", value: formatRupiah(d.verifiedRevenueThisMonth), empty: d.verifiedRevenueThisMonth === 0, emptyText: "Belum ada pendapatan terverifikasi." },
    { key: "nearestNearlyFull", label: "Jadwal terdekat hampir penuh", to: "/schedules", value: nf ? `${formatJakarta(nf.date + "T00:00:00Z", { day: "numeric", month: "long" })} · sisa ${nf.remaining}` : "", empty: !nf, emptyText: "Tidak ada jadwal yang hampir penuh." },
  ];

  return (
    <section>
      <h2 className="text-xl font-extrabold text-slate-800">Ringkasan</h2>
      <p className="mt-1 text-xs text-slate-400">Per {formatJakarta(d.asOf)} · zona WIB</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.key} to={c.to} data-testid={`card-${c.key}`}
            className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-laut hover:shadow-sm">
            <div className="text-sm font-semibold text-slate-500">{c.label}</div>
            {c.empty ? (
              <div className="mt-2 text-sm text-slate-400">{c.emptyText}</div>
            ) : (
              <div className="mt-1 text-2xl font-extrabold text-slate-800">{c.value}</div>
            )}
            <div className="mt-3 text-xs font-semibold text-laut">Lihat →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
