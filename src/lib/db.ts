import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_FILE ??
  path.join(process.cwd(), "data", "salary.db");

function makeSqlite() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  // WAL is faster + safer for concurrent reads (UI + scripts).
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// Cache the connection on globalThis so Next.js dev-mode HMR doesn't open
// a new handle on every request.
const globalForDb = globalThis as unknown as {
  __sqlite?: Database.Database;
  __db?: ReturnType<typeof drizzle<typeof schema>>;
};

export const sqlite = globalForDb.__sqlite ?? makeSqlite();
export const db =
  globalForDb.__db ?? drizzle(sqlite, { schema, casing: "snake_case" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sqlite = sqlite;
  globalForDb.__db = db;
}
