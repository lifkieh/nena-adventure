import type { AuditLogDto, AuditQuery, Paginated } from "@nena/shared";
import * as auditRepo from "../repos/audit.repo.js";
import { diff, redact } from "../lib/redact.js";

/** Konteks aktor untuk audit (diisi dari sesi + request). */
export interface ActorContext {
  userId: string | null;
  role: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  /** Data bebas (akan diredaksi). Pakai ini ATAU before/after. */
  data?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Wrapper audit di lapisan usecase (bukan ditempel per endpoint).
 * NIK, password hash, token sesi otomatis diredaksi (lihat lib/redact).
 */
export function record(ctx: ActorContext, entry: AuditEntry): void {
  const change =
    entry.data !== undefined
      ? redact(entry.data)
      : diff(entry.before ?? null, entry.after ?? null);
  auditRepo.insert({
    actorUserId: ctx.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    details: { role: ctx.role, change },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

/** Jalankan fn, catat audit sesudah sukses (diff before/after bila diberikan). */
export async function withAudit<T>(
  ctx: ActorContext,
  entry: AuditEntry,
  fn: () => Promise<T> | T,
): Promise<T> {
  const result = await fn();
  record(ctx, entry);
  return result;
}

/** Query audit log dengan filter + paginasi (untuk endpoint user:read). */
export function queryLogs(params: AuditQuery): Paginated<AuditLogDto> {
  const { rows, total } = auditRepo.query(params);
  const items: AuditLogDto[] = rows.map((r) => ({
    id: r.id,
    actorUserId: r.actorUserId,
    actorEmail: r.actorEmail,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    ip: r.ip,
    userAgent: r.userAgent,
    details: r.details ? (JSON.parse(r.details) as unknown) : null,
    createdAt: r.createdAt,
  }));
  return { items, page: params.page, pageSize: params.pageSize, total };
}
