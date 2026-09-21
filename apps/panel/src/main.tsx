import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { RouteError } from "./components/RouteError";
import { ConfirmProvider } from "./components/Confirm";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BookingsPage } from "./pages/BookingsPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ContentPage } from "./pages/ContentPage";
import { UsersPage } from "./pages/UsersPage";
import { AuditPage } from "./pages/AuditPage";
import { VerificationPage } from "./pages/VerificationPage";
import { ParticipantsPage } from "./pages/ParticipantsPage";
import { PackagesPage } from "./pages/PackagesPage";
import { MediaPage } from "./pages/MediaPage";
import { OwnerSettingsPage } from "./pages/OwnerSettingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PromosPage } from "./pages/PromosPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import "./index.css";

// refetchOnWindowFocus:false — akar "klik pertama hilang": refetch saat window
// fokus memicu re-render yang menelan klik pertama setelah load/alih-fokus.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 15_000 } },
});

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage />, errorElement: <RouteError /> },
    {
      path: "/",
      element: <RequireAuth />,
      errorElement: <RouteError />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "bookings", element: <BookingsPage /> },
        { path: "bookings/:id", element: <BookingDetailPage /> },
        { path: "verification", element: <VerificationPage /> },
        { path: "schedules", element: <SchedulesPage /> },
        { path: "participants", element: <ParticipantsPage /> },
        { path: "packages", element: <PackagesPage /> },
        { path: "settings", element: <OwnerSettingsPage /> },
        { path: "reports", element: <ReportsPage /> },
        { path: "promos", element: <PromosPage /> },
        { path: "content", element: <ContentPage /> },
        { path: "media", element: <MediaPage /> },
        { path: "notifications", element: <NotificationsPage /> },
        { path: "users", element: <UsersPage /> },
        { path: "audit", element: <AuditPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: "/panel" },
);

const root = document.getElementById("root");
if (!root) throw new Error("Elemen #root tidak ditemukan");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </QueryClientProvider>
  </StrictMode>,
);
