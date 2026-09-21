import { useNavigate, useRouteError, isRouteErrorResponse } from "react-router-dom";

/** errorElement: tangkap error React Router supaya tidak tampil mentah. */
export function RouteError() {
  const navigate = useNavigate();
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Terjadi kesalahan tak terduga.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
      <h1 className="text-lg font-bold text-slate-700">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm text-slate-500">{message}</p>
      <button
        onClick={() => navigate("/")}
        className="rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white"
      >
        Kembali ke Ringkasan
      </button>
    </div>
  );
}
