/**
 * Tests for the seed script. Each test spawns `tsx scripts/seed.ts` against
 * a throwaway DB file, so we cover the same code path engineers actually run.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let tmpDb: string;
const SCRIPT = "tsx scripts/seed.ts";

beforeEach(() => {
  tmpDb = path.join(
    os.tmpdir(),
    `salary-seed-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  );
  // Bring up an empty schema so the seed script's DELETE doesn't fail.
  const sqlite = new Database(tmpDb);
  const migration = fs
    .readFileSync(
      path.join(process.cwd(), "drizzle", "0000_young_overlord.sql"),
      "utf8"
    )
    .split("--> statement-breakpoint");
  for (const stmt of migration) {
    const s = stmt.trim();
    if (s) sqlite.exec(s);
  }
  sqlite.close();
});

afterEach(() => {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const f = tmpDb + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

function runSeed(env: Record<string, string> = {}) {
  execSync(SCRIPT, {
    env: { ...process.env, DATABASE_FILE: tmpDb, ...env },
    stdio: "pipe",
  });
}

describe("seed script", () => {
  it("inserts the requested number of rows", () => {
    runSeed({ SEED_COUNT: "100" });
    const db = new Database(tmpDb, { readonly: true });
    const n = (db.prepare("SELECT COUNT(*) AS n FROM employees").get() as {
      n: number;
    }).n;
    db.close();
    expect(n).toBe(100);
  });

  it("produces deterministic output for a fixed seed", () => {
    runSeed({ SEED_COUNT: "50", SEED_RNG: "7" });
    const db1 = new Database(tmpDb, { readonly: true });
    const first = db1
      .prepare("SELECT full_name, country, salary FROM employees ORDER BY id")
      .all();
    db1.close();

    runSeed({ SEED_COUNT: "50", SEED_RNG: "7" });
    const db2 = new Database(tmpDb, { readonly: true });
    const second = db2
      .prepare("SELECT full_name, country, salary FROM employees ORDER BY id")
      .all();
    db2.close();

    expect(second).toEqual(first);
  });

  it("produces different output for a different seed", () => {
    runSeed({ SEED_COUNT: "50", SEED_RNG: "1" });
    const db1 = new Database(tmpDb, { readonly: true });
    const a = db1
      .prepare("SELECT full_name FROM employees ORDER BY id")
      .all();
    db1.close();

    runSeed({ SEED_COUNT: "50", SEED_RNG: "2" });
    const db2 = new Database(tmpDb, { readonly: true });
    const b = db2
      .prepare("SELECT full_name FROM employees ORDER BY id")
      .all();
    db2.close();

    expect(b).not.toEqual(a);
  });

  it("is idempotent across runs (count stays at N, not 2N)", () => {
    runSeed({ SEED_COUNT: "30" });
    runSeed({ SEED_COUNT: "30" });
    const db = new Database(tmpDb, { readonly: true });
    const n = (db.prepare("SELECT COUNT(*) AS n FROM employees").get() as {
      n: number;
    }).n;
    db.close();
    expect(n).toBe(30);
  });

  it("never produces an empty full_name or email", () => {
    runSeed({ SEED_COUNT: "200" });
    const db = new Database(tmpDb, { readonly: true });
    const bad = (db
      .prepare(
        "SELECT COUNT(*) AS n FROM employees WHERE full_name = '' OR email = '' OR full_name IS NULL OR email IS NULL"
      )
      .get() as { n: number }).n;
    db.close();
    expect(bad).toBe(0);
  });
});
