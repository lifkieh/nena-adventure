import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { UserRole } from "@nena/shared";
import { hashPassword } from "../lib/password.js";
import { db, sqliteConn } from "./client.js";
import { users } from "./schema.js";

/**
 * Seed akun DEMO — satu per role, password acak dicetak ke terminal.
 * HANYA untuk QA. TIDAK dipanggil oleh `npm run seed` (produksi).
 * Jalankan: `npm run seed:demo-users`.
 */
const ROLES: UserRole[] = ["owner", "admin", "operasional", "keuangan", "viewer"];

function randomPassword(): string {
  return randomBytes(9).toString("base64url"); // ~12 char
}

function main(): void {
  console.log("\n=== Akun DEMO (QA) — jangan dipakai di produksi ===\n");
  const created: { email: string; role: UserRole; password: string }[] = [];

  for (const role of ROLES) {
    const email = `demo-${role}@nena-adventure.test`;
    const password = randomPassword();
    const passwordHash = hashPassword(password);
    const existing = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();
    if (existing) {
      db.update(users)
        .set({ passwordHash, role, active: true, updatedAt: new Date().toISOString() })
        .where(eq(users.id, existing.id))
        .run();
    } else {
      db.insert(users)
        .values({
          email,
          name: `Demo ${role}`,
          role,
          passwordHash,
          active: true,
        })
        .run();
    }
    created.push({ email, role, password });
  }

  for (const c of created) {
    console.log(`  ${c.role.padEnd(12)} ${c.email.padEnd(36)} ${c.password}`);
  }
  console.log(
    "\nLogin di http://localhost:3000/panel/login dengan kredensial di atas.\n",
  );
  sqliteConn.close();
}

main();
