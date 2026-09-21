import { createReadStream } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  auditQuerySchema,
  bulkScheduleStatusSchema,
  createUserInputSchema,
  ownerSettingsSchema,
  packageInputSchema,
  packageTypeSchema,
  paymentSchemeSchema,
  type Permission,
  resetPasswordInputSchema,
  saveDraftSchema,
  scheduleGeneratorSchema,
  scheduleInputSchema,
  scheduleStatusSchema,
  setActiveInputSchema,
  tierInputSchema,
  updateUserRoleInputSchema,
} from "@nena/shared";
import { toUserDto } from "../lib/dto.js";
import { actorFromReq, requireAuth, requirePermission } from "../plugins/auth.js";
import * as usersUseCase from "../usecases/users.js";
import { queryLogs } from "../usecases/audit.js";
import * as bookingService from "../usecases/booking/service.js";
import { toBookingDto } from "../usecases/booking/dto.js";
import * as paymentService from "../usecases/payment/service.js";
import * as voucherService from "../usecases/voucher/service.js";
import { getMedia } from "../usecases/media.js";
import { exportZurich } from "../usecases/export-zurich.js";
import { summary as reportSummary } from "../usecases/reports.js";
import * as scheduleService from "../usecases/schedule/service.js";
import * as packageService from "../usecases/package/service.js";
import * as settingsService from "../usecases/settings/service.js";
import * as contentService from "../usecases/content/service.js";
import * as mediaLibrary from "../usecases/media-library.js";

const bookingListQuerySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const manualBookingSchema = z.object({
  scheduleId: z.string().min(1),
  packageKey: packageTypeSchema,
  meetingPoint: z.string().min(1),
  pax: z.number().int().positive().max(30),
  paymentScheme: paymentSchemeSchema,
  customer: z.object({
    name: z.string().min(3),
    phone: z.string().min(8),
    email: z.string().email(),
  }),
  participants: z
    .array(
      z.object({
        name: z.string().min(2),
        birthDate: z.string().optional(),
        idNumber: z.string().optional(),
      }),
    )
    .min(1),
  priceOverride: z.number().int().optional(),
  priceOverrideReason: z.string().optional(),
});

const transitionSchema = z.object({
  action: z.enum([
    "submit_proof",
    "approve_dp",
    "approve_full",
    "reject",
    "complete",
  ]),
  reason: z.string().optional(),
});

/**
 * Semua route /api/admin/** wajib sesi valid (requireAuth) DAN mendeklarasikan
 * izin lewat config.permission + requirePermission. Test route-permission
 * gagal bila ada route admin tanpa deklarasi izin.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  /* ── Pengguna & peran (user:manage) ─────────────────────── */
  app.get(
    "/users",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async () => usersUseCase.list().map(toUserDto),
  );

  app.post(
    "/users",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req, reply) => {
      const input = createUserInputSchema.parse(req.body);
      const user = usersUseCase.create(input, actorFromReq(req));
      reply.status(201);
      return toUserDto(user);
    },
  );

  app.patch(
    "/users/:id/role",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { role } = updateUserRoleInputSchema.parse(req.body);
      return toUserDto(usersUseCase.updateRole(id, role, actorFromReq(req)));
    },
  );

  app.patch(
    "/users/:id/active",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { active } = setActiveInputSchema.parse(req.body);
      return toUserDto(usersUseCase.setActive(id, active, actorFromReq(req)));
    },
  );

  app.post(
    "/users/:id/reset-password",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { newPassword } = resetPasswordInputSchema.parse(req.body);
      usersUseCase.resetPassword(id, newPassword, actorFromReq(req));
      return { ok: true };
    },
  );

  app.post(
    "/users/:id/revoke-sessions",
    { config: { permission: "user:manage" }, preHandler: [requirePermission("user:manage")] },
    async (req) => {
      const { id } = req.params as { id: string };
      usersUseCase.revokeSessions(id, actorFromReq(req));
      return { ok: true };
    },
  );

  /* ── Audit log (user:read) ──────────────────────────────── */
  app.get(
    "/audit-logs",
    { config: { permission: "user:read" }, preHandler: [requirePermission("user:read")] },
    async (req) => queryLogs(auditQuerySchema.parse(req.query)),
  );

  /* ── Booking (list/detail/history: booking:read) ────────── */
  app.get(
    "/bookings",
    { config: { permission: "booking:read" }, preHandler: [requirePermission("booking:read")] },
    async (req) => bookingService.listBookings(bookingListQuerySchema.parse(req.query)),
  );

  app.get(
    "/bookings/:id",
    { config: { permission: "booking:read" }, preHandler: [requirePermission("booking:read")] },
    async (req) => {
      const { id } = req.params as { id: string };
      return bookingService.getBookingDetail(id);
    },
  );

  // Buka PII utuh (NIK/tgl lahir) — audit tiap pembukaan.
  app.get(
    "/bookings/:id/pii",
    {
      config: { permission: "participant:read_pii" },
      preHandler: [requirePermission("participant:read_pii")],
    },
    async (req) => {
      const { id } = req.params as { id: string };
      return bookingService.openParticipantPii(id, actorFromReq(req));
    },
  );

  app.get(
    "/bookings/:id/history",
    { config: { permission: "booking:read" }, preHandler: [requirePermission("booking:read")] },
    async (req) => {
      const { id } = req.params as { id: string };
      return bookingService.getBookingHistory(id);
    },
  );

  /* ── Booking (buat manual + transisi: booking:write) ────── */
  app.post(
    "/bookings",
    { config: { permission: "booking:write" }, preHandler: [requirePermission("booking:write")] },
    async (req, reply) => {
      const input = manualBookingSchema.parse(req.body);
      const booking = bookingService.createManualBooking({
        ...input,
        ctx: actorFromReq(req),
      });
      reply.status(201);
      return toBookingDto(booking);
    },
  );

  app.post(
    "/bookings/:id/send-invoice",
    { config: { permission: "booking:write" }, preHandler: [requirePermission("booking:write")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { dueAt } = z
        .object({ dueAt: z.string().optional() })
        .parse(req.body ?? {});
      return toBookingDto(bookingService.applyTransition(id, "send_invoice", {
        dueAt,
        ctx: actorFromReq(req),
      }));
    },
  );

  app.post(
    "/bookings/:id/transition",
    { config: { permission: "booking:write" }, preHandler: [requirePermission("booking:write")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { action, reason } = transitionSchema.parse(req.body);
      return toBookingDto(bookingService.applyTransition(id, action, {
        reason,
        ctx: actorFromReq(req),
      }));
    },
  );

  /* ── Batal (booking:cancel) ─────────────────────────────── */
  app.post(
    "/bookings/:id/cancel",
    { config: { permission: "booking:cancel" }, preHandler: [requirePermission("booking:cancel")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { reason } = z
        .object({ reason: z.string().min(1, "Alasan wajib diisi.") })
        .parse(req.body);
      return toBookingDto(bookingService.applyTransition(id, "cancel", {
        reason,
        ctx: actorFromReq(req),
      }));
    },
  );

  /* ── Terbitkan ulang voucher (booking:write) ────────────── */
  app.post(
    "/bookings/:id/reissue-voucher",
    { config: { permission: "booking:write" }, preHandler: [requirePermission("booking:write")] },
    async (req) => {
      const { id } = req.params as { id: string };
      return voucherService.issueForBooking(id, actorFromReq(req));
    },
  );

  /* ── Media bukti (payment:read) — file di luar direktori publik ── */
  app.get(
    "/media/:id",
    { config: { permission: "payment:read" }, preHandler: [requirePermission("payment:read")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const m = getMedia(id);
      reply.header("content-disposition", `inline; filename="${m.filename}"`);
      reply.type(m.mime);
      return reply.send(createReadStream(m.path));
    },
  );

  /* ── Pembayaran ─────────────────────────────────────────── */
  app.get(
    "/payments/queue",
    { config: { permission: "payment:read" }, preHandler: [requirePermission("payment:read")] },
    async () => paymentService.listQueue(),
  );
  app.get(
    "/payments/:id",
    { config: { permission: "payment:read" }, preHandler: [requirePermission("payment:read")] },
    async (req) => paymentService.getDetail((req.params as { id: string }).id),
  );
  app.post(
    "/payments/:id/approve",
    { config: { permission: "payment:verify" }, preHandler: [requirePermission("payment:verify")] },
    async (req) =>
      paymentService.approve((req.params as { id: string }).id, actorFromReq(req)),
  );
  app.post(
    "/payments/:id/reject",
    { config: { permission: "payment:verify" }, preHandler: [requirePermission("payment:verify")] },
    async (req) => {
      const { id } = req.params as { id: string };
      const { reason } = z
        .object({ reason: z.string().min(1, "Alasan penolakan wajib diisi.") })
        .parse(req.body);
      return paymentService.reject(id, reason, actorFromReq(req));
    },
  );

  /* ── Export Zurich (participant:export) ─────────────────── */
  app.get(
    "/exports/zurich",
    { config: { permission: "participant:export" }, preHandler: [requirePermission("participant:export")] },
    async (req, reply) => {
      const { date } = z
        .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid.") })
        .parse(req.query);
      const { csv } = exportZurich(date, actorFromReq(req));
      reply.header("content-disposition", `attachment; filename="zurich-${date}.csv"`);
      reply.type("text/csv; charset=utf-8");
      return csv;
    },
  );

  /* ── Laporan (report:read) ──────────────────────────────── */
  app.get(
    "/reports/summary",
    { config: { permission: "report:read" }, preHandler: [requirePermission("report:read")] },
    async (req) => {
      const { from, to } = z
        .object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .parse(req.query);
      return reportSummary(from, to);
    },
  );

  /* ── Jadwal (schedule:read / schedule:write) ────────────── */
  const rd = (p: Permission) => ({ config: { permission: p }, preHandler: [requirePermission(p)] });
  app.get("/schedules", rd("schedule:read"), async (req) =>
    scheduleService.list(
      z.object({ monthFrom: z.string().optional(), monthTo: z.string().optional(), status: z.string().optional() }).parse(req.query),
    ),
  );
  app.get("/schedules/:id", rd("schedule:read"), async (req) =>
    scheduleService.getOne((req.params as { id: string }).id),
  );
  app.post("/schedules", rd("schedule:write"), async (req, reply) => {
    reply.status(201);
    return scheduleService.create(scheduleInputSchema.parse(req.body), actorFromReq(req));
  });
  app.patch("/schedules/:id", rd("schedule:write"), async (req) =>
    scheduleService.update((req.params as { id: string }).id, scheduleInputSchema.parse(req.body), actorFromReq(req)),
  );
  app.delete("/schedules/:id", rd("schedule:write"), async (req) => {
    scheduleService.remove((req.params as { id: string }).id, actorFromReq(req));
    return { ok: true };
  });
  app.post("/schedules/:id/duplicate", rd("schedule:write"), async (req) => {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
    return scheduleService.duplicate((req.params as { id: string }).id, date, actorFromReq(req));
  });
  app.post("/schedules/:id/status", rd("schedule:write"), async (req) => {
    const { status } = z.object({ status: scheduleStatusSchema }).parse(req.body);
    return scheduleService.setStatus((req.params as { id: string }).id, status, actorFromReq(req));
  });
  app.post("/schedules/bulk-status", rd("schedule:write"), async (req) => {
    const { ids, status } = bulkScheduleStatusSchema.parse(req.body);
    return { updated: scheduleService.bulkStatus(ids, status, actorFromReq(req)) };
  });
  app.post("/schedules/generate/preview", rd("schedule:write"), async (req) =>
    ({ items: scheduleService.generatePreview(scheduleGeneratorSchema.parse(req.body)) }),
  );
  app.post("/schedules/generate/commit", rd("schedule:write"), async (req) =>
    scheduleService.generateCommit(scheduleGeneratorSchema.parse(req.body), actorFromReq(req)),
  );

  /* ── Paket & harga (package:read / package:write) ───────── */
  app.get("/packages", rd("package:read"), async () => packageService.list());
  app.post("/packages", rd("package:write"), async (req, reply) => {
    reply.status(201);
    return packageService.create(packageInputSchema.parse(req.body), actorFromReq(req));
  });
  app.put("/packages/:id", rd("package:write"), async (req) =>
    packageService.update((req.params as { id: string }).id, packageInputSchema.parse(req.body), actorFromReq(req)),
  );
  app.delete("/packages/:id", rd("package:write"), async (req) => {
    packageService.remove((req.params as { id: string }).id, actorFromReq(req));
    return { ok: true };
  });
  app.post("/packages/:id/tiers", rd("package:write"), async (req) =>
    packageService.addTier((req.params as { id: string }).id, tierInputSchema.parse(req.body), actorFromReq(req)),
  );
  app.put("/tiers/:id", rd("package:write"), async (req) =>
    packageService.updateTier((req.params as { id: string }).id, tierInputSchema.parse(req.body), actorFromReq(req)),
  );
  app.delete("/tiers/:id", rd("package:write"), async (req) => {
    packageService.removeTier((req.params as { id: string }).id, actorFromReq(req));
    return { ok: true };
  });

  /* ── Pengaturan owner-only (settings:read / settings:write) ── */
  app.get("/settings/owner", rd("settings:read"), async () => settingsService.getOwnerSettings());
  app.put("/settings/owner", rd("settings:write"), async (req) =>
    settingsService.setOwnerSettings(ownerSettingsSchema.parse(req.body), actorFromReq(req)),
  );

  /* ── CMS konten (content:read / content:write / content:publish) ── */
  app.get("/content", rd("content:read"), async () => contentService.listSections());
  app.get("/content/:key", rd("content:read"), async (req) =>
    contentService.getSection((req.params as { key: string }).key),
  );
  app.put("/content/:key/draft", rd("content:write"), async (req) => {
    const { body } = saveDraftSchema.parse(req.body);
    return contentService.saveDraft((req.params as { key: string }).key, body, actorFromReq(req));
  });
  app.post("/content/:key/publish", rd("content:publish"), async (req) =>
    contentService.publish((req.params as { key: string }).key, actorFromReq(req)),
  );
  app.post("/content/:key/revert", rd("content:publish"), async (req) =>
    contentService.revert((req.params as { key: string }).key, actorFromReq(req)),
  );

  /* ── Media library publik (content:read / content:write) ── */
  app.get("/media-library", rd("content:read"), async () => mediaLibrary.listLibrary());
  app.post("/media-library", rd("content:write"), async (req) => {
    const { alt } = z.object({ alt: z.string().min(1, "Teks alt wajib.") }).parse(req.query);
    const file = await req.file();
    if (!file) throw new Error("File wajib.");
    const buffer = await file.toBuffer();
    return mediaLibrary.uploadImage({ buffer, alt, ctx: actorFromReq(req) });
  });
}
