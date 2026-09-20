import { NavLink, Outlet } from "react-router-dom";
import { HealthBadge } from "./HealthBadge";

const nav = [
  { to: "/", label: "Ringkasan", end: true },
  { to: "/bookings", label: "Booking", end: false },
  { to: "/schedules", label: "Jadwal", end: false },
  { to: "/content", label: "Konten", end: false },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
          <div className="mb-6 text-lg font-extrabold text-laut">
            Nena Admin
          </div>
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? "bg-laut text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
            <h1 className="text-sm font-bold text-slate-500">
              Panel Admin — Fase 1B (fondasi)
            </h1>
            <HealthBadge />
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
