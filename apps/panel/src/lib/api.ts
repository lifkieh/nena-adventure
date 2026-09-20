import { healthResponseSchema, type HealthResponse } from "@nena/shared";

/** Ambil status kesehatan API (diproxy Vite ke port 3000). */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("Gagal memuat status API");
  const json: unknown = await res.json();
  return healthResponseSchema.parse(json);
}
