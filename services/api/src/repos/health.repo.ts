import type { MigrationStatus } from "@nena/shared";
import { sqliteConn } from "../db/client.js";
import { getMigrationStatus } from "../db/migration-status.js";

/** Query lapisan repo: status migrasi dari DB + journal. */
export function migrationStatus(): MigrationStatus {
  return getMigrationStatus(sqliteConn);
}
