import { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { UNAUTHORIZED_EVENT } from "../lib/api";
import { useMe } from "../lib/useAuth";
import { Layout } from "./Layout";

/** Guard: wajib sesi valid. 401 dari mana pun -> bersihkan cache + ke /login. */
export function RequireAuth() {
  const { data, isLoading, isError } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locRef = useRef(location);
  locRef.current = location;

  useEffect(() => {
    const handler = () => {
      queryClient.clear();
      navigate("/login", { replace: true, state: { from: locRef.current } });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [navigate, queryClient]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Memuat…
      </div>
    );
  }
  if (isError || !data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Layout />;
}
