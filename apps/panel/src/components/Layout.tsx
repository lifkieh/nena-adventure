import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../lib/api";
import { useMe, usePermissions } from "../lib/useAuth";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  perm?: string; // izin yang dibutuhkan; item disembunyikan bila tidak punya
}

const NAV: NavItem[] = [
  { to: "/", label: "Ringkasan", end: true },
  { to: "/bookings", label: "Booking", perm: "booking:read" },
  { to: "/schedules", label: "Jadwal", perm: "schedule:read" },
  { to: "/content", label: "Konten", perm: "content:read" },
  { to: "/users", label: "Pengguna & peran", perm: "user:manage" },
  { to: "/audit", label: "Audit log", perm: "user:read" },
];

export function Layout() {
  const { data } = useMe();
  const { has } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const items = NAV.filter((n) => !n.perm || has(n.perm));

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
          <div className="mb-6 text-lg font-extrabold text-laut">Nena Admin</div>
          <nav className="flex flex-col gap-1">
            {items.map((n) => (
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
            <h1 className="text-sm font-bold text-slate-500">Panel Admin</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-700">
                  {data?.user.name}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {data?.user.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keluar
              </button>
            </div>
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
