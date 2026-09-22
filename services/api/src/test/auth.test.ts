import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loginCookie, makeUser } from "./helpers.js";
import { _clearAll } from "../lib/rate-limit.js";
import { generateSessionToken, hashSessionToken } from "../lib/session-token.js";
import { resolveSession } from "../usecases/session.js";
import * as sessionsRepo from "../repos/sessions.repo.js";
import * as usersRepo from "../repos/users.repo.js";
import * as auditRepo from "../repos/audit.repo.js";

function auditHas(action: string, actorUserId?: string): boolean {
  const { rows } = auditRepo.query({ page: 1, pageSize: 200 });
  return rows.some(
    (r) => r.action === action && (!actorUserId || r.actorUserId === actorUserId),
  );
}

describe("autentikasi & otorisasi", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => _clearAll());

  it("login sukses set cookie httpOnly + kembalikan profil", async () => {
    const u = makeUser({ email: "s1@t.local", password: "Password123", role: "owner" });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: u.email, password: "Password123" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(u.email);
    const setCookie = String(res.headers["set-cookie"]);
    expect(setCookie).toMatch(/nena_session=/);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(auditHas("login_success", u.id)).toBe(true);
  });

  it("login gagal SERAGAM untuk email tak ada vs password salah", async () => {
    makeUser({ email: "s2@t.local", password: "Password123", role: "viewer" });
    const wrongPw = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "s2@t.local", password: "salah" },
      remoteAddress: "10.0.0.2",
    });
    const noUser = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "tidakada@t.local", password: "apa" },
      remoteAddress: "10.0.0.3",
    });
    expect(wrongPw.statusCode).toBe(401);
    expect(noUser.statusCode).toBe(401);
    expect(wrongPw.json().error.message).toBe("Email atau kata sandi salah.");
    expect(noUser.json().error.message).toBe("Email atau kata sandi salah.");
    expect(auditHas("login_failed")).toBe(true);
  });

  it("rate limit: 429 setelah 5 kegagalan (IP+email)", async () => {
    makeUser({ email: "rl@t.local", password: "Password123", role: "viewer" });
    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "rl@t.local", password: "salah" },
        remoteAddress: "10.9.9.9",
      });
    for (let i = 0; i < 5; i++) {
      const r = await attempt();
      expect(r.statusCode).toBe(401);
    }
    const sixth = await attempt();
    expect(sixth.statusCode).toBe(429);
    expect(sixth.headers["retry-after"]).toBeDefined();
  });

  it("akun nonaktif ditolak login (pesan seragam)", async () => {
    makeUser({ email: "off@t.local", password: "Password123", role: "admin", active: false });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "off@t.local", password: "Password123" },
      remoteAddress: "10.0.0.4",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.message).toBe("Email atau kata sandi salah.");
  });

  it("GET /me mengembalikan izin efektif", async () => {
    makeUser({ email: "me@t.local", password: "Password123", role: "keuangan" });
    const cookie = await loginCookie(app, "me@t.local", "Password123", "10.0.0.5");
    const res = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
    expect(res.statusCode).toBe(200);
    expect(res.json().permissions).toContain("payment:verify");
    expect(res.json().permissions).not.toContain("user:manage");
  });

  it("logout mencabut sesi", async () => {
    makeUser({ email: "lo@t.local", password: "Password123", role: "viewer" });
    const cookie = await loginCookie(app, "lo@t.local", "Password123", "10.0.0.6");
    const out = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie: cookie! } });
    expect(out.statusCode).toBe(200);
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
    expect(me.statusCode).toBe(401);
    expect(auditHas("logout")).toBe(true);
  });

  it("401 tanpa sesi, 403 tanpa izin, 200 untuk yang berizin", async () => {
    makeUser({ email: "own@t.local", password: "Password123", role: "owner" });
    makeUser({ email: "vw@t.local", password: "Password123", role: "viewer" });

    const noAuth = await app.inject({ method: "GET", url: "/api/admin/users" });
    expect(noAuth.statusCode).toBe(401);

    const vwCookie = await loginCookie(app, "vw@t.local", "Password123", "10.0.0.7");
    const forbidden = await app.inject({ method: "GET", url: "/api/admin/users", headers: { cookie: vwCookie! } });
    expect(forbidden.statusCode).toBe(403);

    const ownCookie = await loginCookie(app, "own@t.local", "Password123", "10.0.0.8");
    const ok = await app.inject({ method: "GET", url: "/api/admin/users", headers: { cookie: ownCookie! } });
    expect(ok.statusCode).toBe(200);
  });

  it("ganti password mencabut sesi LAIN, sesi sekarang tetap", async () => {
    makeUser({ email: "cp@t.local", password: "OldPass123", role: "admin" });
    const cookieA = await loginCookie(app, "cp@t.local", "OldPass123", "10.0.0.9");
    const cookieB = await loginCookie(app, "cp@t.local", "OldPass123", "10.0.0.9");
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: { cookie: cookieA! },
      payload: { currentPassword: "OldPass123", newPassword: "NewPass456" },
    });
    expect(res.statusCode).toBe(200);
    const meB = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookieB! } });
    const meA = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookieA! } });
    expect(meB.statusCode).toBe(401); // sesi lain dicabut
    expect(meA.statusCode).toBe(200); // sesi sekarang tetap
    expect(auditHas("password_changed")).toBe(true);
  });

  it("sesi absolute-expired ditolak & dihapus", () => {
    const u = makeUser({ email: "abs@t.local", password: "x", role: "viewer" });
    const token = generateSessionToken();
    sessionsRepo.create({
      userId: u.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(resolveSession(token)).toBeNull();
    expect(sessionsRepo.findByTokenHash(hashSessionToken(token))).toBeUndefined();
  });

  it("sesi idle-expired ditolak & dihapus", () => {
    const u = makeUser({ email: "idle@t.local", password: "x", role: "viewer" });
    const token = generateSessionToken();
    const s = sessionsRepo.create({
      userId: u.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    // lastSeen 9 jam lalu (idle default 8 jam)
    sessionsRepo.touchLastSeen(s.id, new Date(Date.now() - 9 * 3600_000).toISOString());
    expect(resolveSession(token)).toBeNull();
    expect(sessionsRepo.findByTokenHash(hashSessionToken(token))).toBeUndefined();
  });

  it("owner aktif terakhir tidak bisa dinonaktifkan/diturunkan", async () => {
    const owner = makeUser({ email: "lastowner@t.local", password: "Password123", role: "owner" });
    const cookie = await loginCookie(app, "lastowner@t.local", "Password123", "10.0.1.1");
    // Pastikan target satu-satunya owner aktif (test lain sempat buat owner lain).
    for (const o of usersRepo.listAll()) {
      if (o.role === "owner" && o.active && o.id !== owner.id) {
        usersRepo.setActive(o.id, false);
      }
    }

    const deact = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${owner.id}/active`,
      headers: { cookie: cookie! },
      payload: { active: false },
    });
    expect(deact.statusCode).toBe(409);
    expect(deact.json().error.message).toContain("Owner aktif terakhir");

    const demote = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${owner.id}/role`,
      headers: { cookie: cookie! },
      payload: { role: "admin" },
    });
    expect(demote.statusCode).toBe(409);
  });

  it("perubahan role tercatat di audit", async () => {
    makeUser({ email: "ro@t.local", password: "Password123", role: "owner" });
    const target = makeUser({ email: "target@t.local", password: "Password123", role: "viewer" });
    const cookie = await loginCookie(app, "ro@t.local", "Password123", "10.0.1.2");
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${target.id}/role`,
      headers: { cookie: cookie! },
      payload: { role: "operasional" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe("operasional");
    expect(auditHas("role_changed")).toBe(true);
  });
});
