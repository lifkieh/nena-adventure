import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { BookingsPage } from "./pages/BookingsPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ContentPage } from "./pages/ContentPage";
import "./index.css";

const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "bookings", element: <BookingsPage /> },
        { path: "schedules", element: <SchedulesPage /> },
        { path: "content", element: <ContentPage /> },
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
