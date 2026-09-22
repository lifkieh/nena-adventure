import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLogs, users } from "../db/schema.js";

export function insert(input: {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
}): void {
  db.insert(auditLogs)
    .values({
      actorUserId: input.actorUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: input.details == null ? null : JSON.stringify(input.details),
      ip: input.ip,
      userAgent: input.userAgent,
    })
    .run();
}

export interface AuditQueryParams {
  entity?: string;
  entityId?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export function query(params: AuditQueryParams): {
  rows: {
    id: string;
    actorUserId: string | null;
    actorEmail: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    ip: string | null;
    userAgent: string | null;
    details: string | null;
    createdAt: string;
  }[];
  total: number;
} {
  const conds = [];
  if (params.entity) conds.push(eq(auditLogs.entity, params.entity));
  if (params.entityId) conds.push(eq(auditLogs.entityId, params.entityId));
  if (params.actorUserId)
    conds.push(eq(auditLogs.actorUserId, params.actorUserId));
  if (params.from) conds.push(gte(auditLogs.createdAt, params.from));
  if (params.to) conds.push(lte(auditLogs.createdAt, params.to));
  const where = conds.length ? and(...conds) : undefined;

  const total = db
    .select({ n: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where)
    .get();

  const rows = db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorEmail: users.email,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      ip: auditLogs.ip,
      userAgent: auditLogs.userAgent,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize)
    .all();

  return { rows, total: total?.n ?? 0 };
}
