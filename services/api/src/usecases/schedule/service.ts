import type {
  ScheduleGeneratorInput,
  ScheduleInput,
  ScheduleStatus,
} from "@nena/shared";
import { AppError } from "../../lib/errors.js";
import * as repo from "../../repos/schedules.repo.js";
import type { ScheduleRow } from "../../repos/schedules.repo.js";
import { record, type ActorContext } from "../audit.js";

export interface ScheduleDto {
  id: string;
  date: string;
  capacity: number;
  threshold: number;
  departureTime: string | null;
  meetingPoint: string | null;
  status: string;
  publicNote: string | null;
  closedReason: string | null;
  availablePackages: string[] | null;
  used: number;
  remaining: number;
  belowThreshold: boolean;
}

function toDto(s: ScheduleRow): ScheduleDto {
  const used = repo.usedSeats(s.id);
  const remaining = s.capacity - used;
  return {
    id: s.id,
    date: s.date,
    capacity: s.capacity,
    threshold: s.threshold,
    departureTime: s.departureTime,
    meetingPoint: s.meetingPoint,
    status: s.status,
    publicNote: s.publicNote,
    closedReason: s.closedReason,
    availablePackages: s.availablePackages
      ? (JSON.parse(s.availablePackages) as string[])
      : null,
    used,
    remaining,
    belowThreshold: remaining <= s.threshold,
  };
}

export function list(filter: {
  monthFrom?: string;
  monthTo?: string;
  status?: string;
}): ScheduleDto[] {
  return repo.listAdmin(filter).map(toDto);
}

export function getOne(id: string): ScheduleDto {
  const s = repo.findById(id);
  if (!s) throw AppError.notFound("Jadwal tidak ditemukan.");
  return toDto(s);
}

function valuesFrom(input: ScheduleInput) {
  return {
    date: input.date,
    capacity: input.capacity,
    threshold: input.threshold,
    departureTime: input.departureTime ?? "07:00",
    meetingPoint: input.meetingPoint ?? "Pantai Pangaradan, Anyer",
    status: input.status,
    publicNote: input.publicNote ?? null,
    closedReason: input.closedReason ?? null,
    availablePackages: input.availablePackages
      ? JSON.stringify(input.availablePackages)
      : null,
  };
}

export function create(input: ScheduleInput, ctx: ActorContext): ScheduleDto {
  const s = repo.insert(valuesFrom(input));
  record(ctx, {
    action: "schedule_created",
    entity: "schedule",
    entityId: s.id,
    data: { date: s.date, capacity: s.capacity, status: s.status },
  });
  return toDto(s);
}

export function update(
  id: string,
  input: ScheduleInput,
  ctx: ActorContext,
): ScheduleDto {
  const before = repo.findById(id);
  if (!before) throw AppError.notFound("Jadwal tidak ditemukan.");
  // Kapasitas tidak boleh turun di bawah kursi terjual (dari seat_ledger).
  const used = repo.usedSeats(id);
  if (input.capacity < used) {
    throw AppError.validation(
      `Kapasitas tidak boleh di bawah kursi terjual (${used}).`,
    );
  }
  const after = repo.update(id, valuesFrom(input));
  record(ctx, {
    action: "schedule_updated",
    entity: "schedule",
    entityId: id,
    before: { capacity: before.capacity, status: before.status, date: before.date },
    after: { capacity: after.capacity, status: after.status, date: after.date },
  });
  return toDto(after);
}

export function setStatus(
  id: string,
  status: ScheduleStatus,
  ctx: ActorContext,
): ScheduleDto {
  const before = repo.findById(id);
  if (!before) throw AppError.notFound("Jadwal tidak ditemukan.");
  const after = repo.update(id, { status });
  record(ctx, {
    action: "schedule_status_changed",
    entity: "schedule",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return toDto(after);
}

export function bulkStatus(
  ids: string[],
  status: ScheduleStatus,
  ctx: ActorContext,
): number {
  let n = 0;
  for (const id of ids) {
    if (repo.findById(id)) {
      repo.update(id, { status });
      n++;
    }
  }
  record(ctx, {
    action: "schedule_bulk_status",
    entity: "schedule",
    data: { count: n, status },
  });
  return n;
}

export function duplicate(
  id: string,
  newDate: string,
  ctx: ActorContext,
): ScheduleDto {
  const src = repo.findById(id);
  if (!src) throw AppError.notFound("Jadwal tidak ditemukan.");
  const s = repo.insert({
    date: newDate,
    capacity: src.capacity,
    threshold: src.threshold,
    departureTime: src.departureTime,
    meetingPoint: src.meetingPoint,
    status: "draft",
    publicNote: src.publicNote,
    availablePackages: src.availablePackages,
  });
  record(ctx, {
    action: "schedule_duplicated",
    entity: "schedule",
    entityId: s.id,
    data: { from: id, date: newDate },
  });
  return toDto(s);
}

export function remove(id: string, ctx: ActorContext): void {
  const s = repo.findById(id);
  if (!s) throw AppError.notFound("Jadwal tidak ditemukan.");
  if (repo.activeBookingCount(id) > 0) {
    throw AppError.conflict(
      'Jadwal punya booking aktif — tidak bisa dihapus. Gunakan "Tutup" untuk menutup pendaftaran.',
    );
  }
  repo.remove(id);
  record(ctx, { action: "schedule_deleted", entity: "schedule", entityId: id });
}

function datesBetween(from: string, to: string, weekdays: number[]): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  const set = new Set(weekdays);
  let guard = 0;
  while (d <= end && guard < 1000) {
    if (set.has(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
    guard++;
  }
  return out;
}

export function generatePreview(input: ScheduleGeneratorInput): {
  date: string;
  exists: boolean;
}[] {
  return datesBetween(input.from, input.to, input.weekdays).map((date) => ({
    date,
    exists: repo.existsByDate(date),
  }));
}

export function generateCommit(
  input: ScheduleGeneratorInput,
  ctx: ActorContext,
): { created: number; skipped: number } {
  const dates = datesBetween(input.from, input.to, input.weekdays);
  let created = 0;
  let skipped = 0;
  for (const date of dates) {
    if (repo.existsByDate(date)) {
      skipped++; // idempoten
      continue;
    }
    repo.insert({
      date,
      capacity: input.capacity,
      threshold: input.threshold,
      status: input.status,
      departureTime: "07:00",
      meetingPoint: "Pantai Pangaradan, Anyer",
    });
    created++;
  }
  record(ctx, {
    action: "schedule_generated",
    entity: "schedule",
    data: { created, skipped, from: input.from, to: input.to },
  });
  return { created, skipped };
}
