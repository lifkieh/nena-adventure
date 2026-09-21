import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BookingsPage } from "./pages/BookingsPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ContentPage } from "./pages/ContentPage";
import { UsersPage } from "./pages/UsersPage";
import { AuditPage } from "./pages/AuditPage";
import "./index.css";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: <RequireAuth />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "bookings", element: <BookingsPage /> },
        { path: "schedules", element: <SchedulesPage /> },
        { path: "content", element: <ContentPage /> },
        { path: "users", element: <UsersPage /> },
        { path: "audit", element: <AuditPage /> },
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
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
