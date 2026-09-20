import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../env.js";
import { schema } from "./schema.js";

mkdirSync(dirname(env.dbPath), { recursive: true });

/** Koneksi SQLite mentah (untuk pragma & query metadata). */
export const sqliteConn: Database.Database = new Database(env.dbPath);
sqliteConn.pragma("journal_mode = WAL");
sqliteConn.pragma("foreign_keys = ON");

/** Instance Drizzle — HANYA boleh dipakai dari lapisan repos/. */
export const db = drizzle(sqliteConn, { schema });

export type DB = typeof db;
