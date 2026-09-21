import type {
  AuditLogDto,
  CreateUserInput,
  HealthResponse,
  MeResponse,
  Paginated,
  UserDto,
  UserRole,
} from "@nena/shared";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Event global saat 401 — didengar AuthWatcher untuk bersihkan cache + redirect. */
export const UNAUTHORIZED_EVENT = "nena:unauthorized";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("/api" + path, {
    credentials: "include", // sesi via cookie httpOnly, tidak ada token di JS
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
  let body: unknown = null;
  if (res.status !== 204) body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: string } })?.error;
    throw new ApiError(
      err?.message ?? "Terjadi kesalahan.",
      err?.code ?? "INTERNAL",
      res.status,
    );
  }
  return body as T;
}

export function fetchHealth(): Promise<HealthResponse> {
  return req<HealthResponse>("/health");
}

export const authApi = {
  login: (email: string, password: string) =>
    req<MeResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => req<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => req<MeResponse>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export const usersApi = {
  list: () => req<UserDto[]>("/admin/users"),
  create: (input: CreateUserInput) =>
    req<UserDto>("/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRole: (id: string, role: UserRole) =>
    req<UserDto>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  setActive: (id: string, active: boolean) =>
    req<UserDto>(`/admin/users/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
  resetPassword: (id: string, newPassword: string) =>
    req<{ ok: true }>(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
  revokeSessions: (id: string) =>
    req<{ ok: true }>(`/admin/users/${id}/revoke-sessions`, {
      method: "POST",
    }),
};

export const auditApi = {
  list: (params: Record<string, string> = {}) =>
    req<Paginated<AuditLogDto>>(
      "/admin/audit-logs?" + new URLSearchParams(params).toString(),
    ),
};
