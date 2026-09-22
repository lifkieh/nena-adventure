import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, ApiError } from "../lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await authApi.login(email, password);
      queryClient.setQueryData(["me"], me);
      navigate(from, { replace: true });
    } catch (err) {
      // Tampilkan pesan API apa adanya (tidak membocorkan email terdaftar/tidak).
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 text-center">
          <div className="text-lg font-extrabold text-laut">Nena Admin</div>
          <p className="mt-1 text-sm text-slate-500">Masuk ke panel</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="password">
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-laut px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
