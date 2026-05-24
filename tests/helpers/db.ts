/**
 * Test helpers for spinning up an in-memory SQLite instance with the
 * same schema as production. Each test file gets its own database so
 * tests can run in parallel without interference.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/schema";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Read and apply every `.sql` migration in the drizzle folder, in order. */
function applyMigrations(sqlite: Database.Database) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    // drizzle splits on `--> statement-breakpoint`; we replicate that here.
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) sqlite.exec(stmt);
  }
}

export function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = MEMORY");
  applyMigrations(sqlite);
  const db = drizzle(sqlite, { schema, casing: "snake_case" });
  return { db, sqlite, close: () => sqlite.close() };
}

/** Insert a small, hand-computed fixture so aggregate assertions are obvious. */
export function seedFixture(sqlite: Database.Database) {
  const insert = sqlite.prepare(`
    INSERT INTO employees (
      full_name, first_name, last_name, email,
      job_title, department, country,
      salary, currency, employment_type, hire_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // 5 rows, two countries, two job titles each — small enough to hand-verify.
  const rows: Array<[string, string, string, string, string, string, string, number, string, string, string]> = [
    ["Alice Adams", "Alice", "Adams", "alice@x.com", "Engineer", "Engineering", "US", 100_00 * 100, "USD", "FULL_TIME", "2023-01-15"],
    ["Bob Brown", "Bob", "Brown", "bob@x.com", "Engineer", "Engineering", "US", 200_00 * 100, "USD", "FULL_TIME", "2024-01-15"],
    ["Carol Cox", "Carol", "Cox", "carol@x.com", "Manager", "Engineering", "US", 300_00 * 100, "USD", "FULL_TIME", "2025-01-15"],
    ["Dan Davis", "Dan", "Davis", "dan@x.com", "Engineer", "Engineering", "GB", 50_00 * 100, "GBP", "PART_TIME", "2023-06-01"],
    ["Eva Estrada", "Eva", "Estrada", "eva@x.com", "Manager", "Engineering", "GB", 150_00 * 100, "GBP", "FULL_TIME", "2024-06-01"],
  ];
  for (const row of rows) insert.run(...row);
}
