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
  // Hanya set content-type JSON kalau ada body — request tanpa body (DELETE)
  // dengan header JSON + body kosong ditolak Fastify (FST_ERR_CTP_EMPTY_JSON_BODY).
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (init?.body != null && !("content-type" in headers)) headers["content-type"] = "application/json";
  const res = await fetch("/api" + path, {
    credentials: "include", // sesi via cookie httpOnly, tidak ada token di JS
    ...init,
    headers,
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

/* ── Operasional ─────────────────────────────────────────── */
export interface ScheduleDto {
  id: string; date: string; capacity: number; threshold: number;
  status: string; publicNote: string | null; closedReason: string | null;
  availablePackages: string[] | null; used: number; remaining: number;
  belowThreshold: boolean; bookingCount: number;
}
export const schedulesApi = {
  list: (q: Record<string, string> = {}) =>
    req<ScheduleDto[]>("/admin/schedules?" + new URLSearchParams(q).toString()),
  create: (b: unknown) => req<ScheduleDto>("/admin/schedules", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: unknown) => req<ScheduleDto>(`/admin/schedules/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  remove: (id: string) => req<{ ok: true }>(`/admin/schedules/${id}`, { method: "DELETE" }),
  setStatus: (id: string, status: string) => req<ScheduleDto>(`/admin/schedules/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  genPreview: (b: unknown) => req<{ items: { date: string; exists: boolean }[] }>("/admin/schedules/generate/preview", { method: "POST", body: JSON.stringify(b) }),
  genCommit: (b: unknown) => req<{ created: number; skipped: number }>("/admin/schedules/generate/commit", { method: "POST", body: JSON.stringify(b) }),
  bulkStatus: (ids: string[], status: string) => req<{ updated: number }>("/admin/schedules/bulk-status", { method: "POST", body: JSON.stringify({ ids, status }) }),
  roster: (id: string) => req<{ active: RosterRow[]; cancelled: RosterRow[] }>(`/admin/schedules/${id}/roster`),
};

export interface PackageDto { id: string; key: string; name: string; prices: Record<string, number>; active: boolean; tiers: { id: string; minPax: number; maxPax: number; price: number }[] }
export const packagesApi = {
  list: () => req<PackageDto[]>("/admin/packages"),
  update: (id: string, b: unknown) => req<unknown>(`/admin/packages/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  updateTier: (id: string, b: unknown) => req<unknown>(`/admin/tiers/${id}`, { method: "PUT", body: JSON.stringify(b) }),
};

export const settingsApi = {
  get: () => req<{ bankAccount: string; qrisUrl: string; serviceFee: number; dpPercent: number; cutoffDays: number; whatsapp: string; whatsappSecondary: string; mapUrl: string }>("/admin/settings/owner"),
  set: (b: unknown) => req<unknown>("/admin/settings/owner", { method: "PUT", body: JSON.stringify(b) }),
};

export interface RosterRow {
  participantId: string;
  name: string;
  phone: string | null;
  isLead: boolean;
  packageKey: string;
  packageName: string | null;
  bookingCode: string;
  bookingStatus: string;
  scheduleId: string;
  scheduleDate: string;
}

export interface PaymentRowDto {
  id: string; amount: number; method: string; kind: string; status: string;
  paidAt: string | null; verifiedAt: string | null; rejectedReason: string | null;
  proofUrl: string | null; createdAt: string;
}
export interface BookingDetailDto {
  booking: Record<string, unknown>;
  participants: { id: string; name: string; phone: string | null; idNumberLast4: string | null; piiPurgedAt: string | null; isLead: boolean }[];
  schedule: { id: string; date: string; meetingPoint: string | null; departureTime: string | null; status: string } | null;
  package: { key: string; name: string } | null;
  breakdown: { subtotal: number; discount: number; serviceFee: number; total: number; amountPaidGross: number; refundTotal: number; amountPaidNet: number; outstanding: number };
  cancellation: { refundAmount: number; cancelReason: string | null; cancelledByEmail: string | null } | null;
  payments: PaymentRowDto[];
}
export interface HistoryItem { action: string; createdAt: string; actorEmail: string | null; details: string | null }

export const bookingsApi = {
  list: (q: Record<string, string> = {}) => req<Paginated<Record<string, unknown>>>("/admin/bookings?" + new URLSearchParams(q).toString()),
  createManual: (b: unknown) => req<{ id: string; code: string }>("/admin/bookings", { method: "POST", body: JSON.stringify(b) }),
  detail: (id: string) => req<BookingDetailDto>(`/admin/bookings/${id}`),
  history: (id: string) => req<{ items: HistoryItem[] }>(`/admin/bookings/${id}/history`),
  transition: (id: string, action: string, reason?: string) => req<unknown>(`/admin/bookings/${id}/transition`, { method: "POST", body: JSON.stringify({ action, reason }) }),
  cancel: (id: string, reason: string) => req<unknown>(`/admin/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  sendInvoice: (id: string) => req<unknown>(`/admin/bookings/${id}/send-invoice`, { method: "POST", body: "{}" }),
  reissueVoucher: (id: string) => req<{ code: string; url: string }>(`/admin/bookings/${id}/reissue-voucher`, { method: "POST", body: "{}" }),
  pii: (id: string) => req<{ participants: { name: string; idNumber: string | null; birthDate: string | null }[] }>(`/admin/bookings/${id}/pii`),
  updateParticipantPhone: (id: string, pid: string, phone: string | null) =>
    req<{ id: string; phone: string | null }>(`/admin/bookings/${id}/participants/${pid}`, { method: "PATCH", body: JSON.stringify({ phone }) }),
  roster: (includePast: boolean) => req<{ items: RosterRow[] }>(`/admin/participants/roster${includePast ? "?includePast=1" : ""}`),
  emails: (id: string) => req<{ items: EmailHistoryItem[] }>(`/admin/bookings/${id}/emails`),
};

export const paymentsApi = {
  queue: () => req<Record<string, unknown>[]>("/admin/payments/queue"),
  approve: (id: string) => req<unknown>(`/admin/payments/${id}/approve`, { method: "POST", body: "{}" }),
  reject: (id: string, reason: string) => req<unknown>(`/admin/payments/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
};

/* ── Konten (CMS) ────────────────────────────────────────── */
export const contentApi = {
  list: () => req<{ key: string; title: string; hasDraft: boolean; hasPublished: boolean }[]>("/admin/content"),
  get: (key: string) => req<{ key: string; title: string; draft: unknown; published: unknown }>(`/admin/content/${key}`),
  saveDraft: (key: string, body: unknown) => req<unknown>(`/admin/content/${key}/draft`, { method: "PUT", body: JSON.stringify({ body }) }),
  publish: (key: string) => req<unknown>(`/admin/content/${key}/publish`, { method: "POST", body: "{}" }),
  revert: (key: string) => req<unknown>(`/admin/content/${key}/revert`, { method: "POST", body: "{}" }),
};

export interface PromoDto {
  id: string; code: string; type: string; value: number; minPax: number;
  validFrom: string | null; validUntil: string | null; maxUses: number | null;
  usedCount: number; active: boolean; packages: string[] | null;
}
export const promosApi = {
  list: () => req<PromoDto[]>("/admin/promos"),
  create: (b: unknown) => req<PromoDto>("/admin/promos", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: unknown) => req<PromoDto>(`/admin/promos/${id}`, { method: "PUT", body: JSON.stringify(b) }),
};

export interface MediaItem { id: string; url: string; alt: string; width: number | null }
export const mediaApi = {
  list: () => req<MediaItem[]>("/admin/media-library"),
  remove: (id: string) => req<{ ok: true }>(`/admin/media-library/${id}`, { method: "DELETE" }),
  upload: async (file: File, alt: string): Promise<MediaItem> => {
    const fd = new FormData();
    fd.append("alt", alt);
    fd.append("file", file);
    const res = await fetch("/api/admin/media-library", { method: "POST", credentials: "include", body: fd });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error?.message || "Gagal mengunggah gambar.");
    return body as MediaItem;
  },
};

export interface DashboardDto {
  bookingsToday: number;
  bookingsTodayCancelled: number;
  awaitingProof: number;
  awaitingSettlement: number;
  seatsSoldNext7Days: number;
  verifiedRevenueThisMonth: number;
  nearestNearlyFull: { id: string; date: string; capacity: number; threshold: number; remaining: number } | null;
  asOf: string;
}
export interface ReportTables {
  monthlyRevenue: { month: string; amount: number }[];
  bookingsByStatus: { status: string; count: number }[];
  seatsPerSchedule: { date: string; capacity: number; sold: number }[];
  underpaidCompleted: { code: string; customerName: string; total: number; ledger: number; shortfall: number; scheduleDate: string }[];
}
export interface NotifTemplate { key: string; label: string; channel: string; subject: string; body: string }
export interface NotifPreview { key: string; channel: string; subject: string; body: string; waLink: string | null; emailTo: string | null; smtpConfigured: boolean }
export interface EmailHistoryItem { id: string; key: string | null; to: string | null; subject: string | null; status: string | null; error: string | null; actorEmail: string | null; createdAt: string }
export const notifApi = {
  list: () => req<NotifTemplate[]>("/admin/notification-templates"),
  update: (key: string, b: unknown) => req<NotifTemplate>(`/admin/notification-templates/${key}`, { method: "PUT", body: JSON.stringify(b) }),
  smtpStatus: () => req<{ configured: boolean }>("/admin/notifications/smtp-status"),
  preview: (bookingId: string, key: string) => req<NotifPreview>(`/admin/bookings/${bookingId}/notify/preview`, { method: "POST", body: JSON.stringify({ key }) }),
  sendEmail: (bookingId: string, key: string) => req<{ ok: true; to: string; subject: string }>(`/admin/bookings/${bookingId}/notify/email`, { method: "POST", body: JSON.stringify({ key }) }),
};

export const reportsApi = {
  dashboard: () => req<DashboardDto>("/admin/reports/dashboard"),
  tables: () => req<ReportTables>("/admin/reports/tables"),
};
