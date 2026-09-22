import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../lib/api";
import { useMe, usePermissions } from "../lib/useAuth";

interface NavItem { to: string; label: string; end?: boolean; perm?: string }

const OPERASIONAL: NavItem[] = [
  { to: "/", label: "Ringkasan", end: true },
  { to: "/bookings", label: "Booking", perm: "booking:read" },
  { to: "/verification", label: "Verifikasi bukti", perm: "payment:verify" },
  { to: "/schedules", label: "Jadwal", perm: "schedule:read" },
  { to: "/participants", label: "Peserta", perm: "booking:read" },
  { to: "/packages", label: "Paket & harga", perm: "package:read" },
  { to: "/promos", label: "Promo / voucher", perm: "package:read" },
  { to: "/reports", label: "Laporan", perm: "report:read" },
  { to: "/notifications", label: "Template notifikasi", perm: "content:read" },
  { to: "/settings", label: "Pengaturan owner", perm: "settings:write" },
  { to: "/users", label: "Pengguna & peran", perm: "user:manage" },
  { to: "/audit", label: "Audit log", perm: "user:read" },
];
const KONTEN: NavItem[] = [
  { to: "/content", label: "Konten situs", perm: "content:read" },
  { to: "/media", label: "Media library", perm: "content:read" },
];
const KONTEN_PATHS = KONTEN.map((n) => n.to);

/** Workspace ditentukan oleh RUTE (bukan state), supaya buka /panel/content
 *  langsung ikut memindahkan header & sidebar ke Konten. */
function workspaceForPath(pathname: string): "operasional" | "konten" {
  return KONTEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ? "konten"
    : "operasional";
}

export function Layout() {
  const { data } = useMe();
  const { has } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const ws = workspaceForPath(location.pathname);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  function switchWs(next: "operasional" | "konten") {
    navigate(next === "konten" ? "/content" : "/");
  }

  const items = (ws === "konten" ? KONTEN : OPERASIONAL).filter((n) => !n.perm || has(n.perm));

  async function logout() {
    try { await authApi.logout(); } finally { queryClient.clear(); navigate("/login", { replace: true }); }
  }

  const sidebar = (
    <>
      <div className="mb-4 text-lg font-extrabold text-laut">Nena Admin</div>
      <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-xs font-bold" role="tablist" aria-label="Workspace">
        <button
          onClick={() => switchWs("operasional")}
          className={`flex-1 rounded-md px-2 py-1.5 ${ws === "operasional" ? "bg-white text-laut shadow" : "text-slate-500"}`}
        >Operasional</button>
        <button
          onClick={() => switchWs("konten")}
          className={`flex-1 rounded-md px-2 py-1.5 ${ws === "konten" ? "bg-white text-laut shadow" : "text-slate-500"}`}
        >Konten</button>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-laut text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          {sidebar}
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setNavOpen(true)}
                aria-label="Buka menu"
                className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <h1 className="truncate text-sm font-bold text-slate-500">
                Panel Admin · {ws === "konten" ? "Konten" : "Operasional"}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-bold text-slate-700">{data?.user.name}</div>
                <div className="text-xs uppercase tracking-wide text-slate-400">{data?.user.role}</div>
              </div>
              <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Keluar</button>
            </div>
          </header>
          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
