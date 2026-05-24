/**
 * Seed 10,000 employees into the SQLite database.
 *
 * Hot path: a single prepared INSERT statement reused inside a single
 * transaction. better-sqlite3's synchronous API skips event-loop overhead,
 * and one fsync per transaction (instead of per row) is what keeps this
 * to sub-second on a laptop.
 *
 * Idempotent: `DELETE FROM employees` runs first, so engineers can re-run
 * the script without accumulating rows.
 *
 * Deterministic: pass `SEED_RNG=<int>` to get reproducible output (default
 * is 42). The PRNG is Mulberry32 — `Math.random` is not seedable.
 *
 * Usage:
 *   npm run seed                    # 10,000 rows, seed=42
 *   SEED_COUNT=50000 npm run seed   # custom row count
 *   SEED_RNG=7 npm run seed         # different deterministic dataset
 */
import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH =
  process.env.DATABASE_FILE ??
  path.join(process.cwd(), "data", "salary.db");
const COUNT = Number(process.env.SEED_COUNT ?? 10_000);
const SEED = Number(process.env.SEED_RNG ?? 42);

// ---------- deterministic PRNG ----------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const rand = mulberry32(SEED);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

// ---------- inputs ----------------------------------------------------------

function loadLines(file: string): string[] {
  const lines = fs
    .readFileSync(path.join(process.cwd(), file), "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`No entries in ${file}`);
  }
  return lines;
}

const firstNames = loadLines("data/first_names.txt");
const lastNames = loadLines("data/last_names.txt");

// Countries with synthetic base annual salaries (in MAJOR currency units).
// Bases are deliberately wide-ranging to make insight charts interesting.
interface CountryGen {
  code: string;
  currency: string;
  base: number;
  weight: number;
}
const COUNTRIES: readonly CountryGen[] = [
  { code: "US", currency: "USD", base: 110_000, weight: 22 },
  { code: "IN", currency: "INR", base: 1_500_000, weight: 18 },
  { code: "GB", currency: "GBP", base: 65_000, weight: 10 },
  { code: "DE", currency: "EUR", base: 70_000, weight: 8 },
  { code: "CA", currency: "CAD", base: 90_000, weight: 6 },
  { code: "FR", currency: "EUR", base: 55_000, weight: 5 },
  { code: "NL", currency: "EUR", base: 65_000, weight: 4 },
  { code: "AU", currency: "AUD", base: 95_000, weight: 4 },
  { code: "JP", currency: "JPY", base: 7_500_000, weight: 4 },
  { code: "BR", currency: "BRL", base: 90_000, weight: 3 },
  { code: "SG", currency: "SGD", base: 95_000, weight: 3 },
  { code: "ES", currency: "EUR", base: 45_000, weight: 3 },
  { code: "MX", currency: "MXN", base: 420_000, weight: 2 },
  { code: "PL", currency: "PLN", base: 140_000, weight: 2 },
  { code: "IT", currency: "EUR", base: 42_000, weight: 2 },
  { code: "IE", currency: "EUR", base: 68_000, weight: 1 },
  { code: "ZA", currency: "ZAR", base: 650_000, weight: 1 },
  { code: "CH", currency: "CHF", base: 120_000, weight: 1 },
  { code: "SE", currency: "SEK", base: 580_000, weight: 1 },
  { code: "AE", currency: "AED", base: 260_000, weight: 1 },
];

// Weighted lookup table so each pick is O(1).
const WEIGHTED_COUNTRIES: CountryGen[] = COUNTRIES.flatMap((c) =>
  Array<CountryGen>(c.weight).fill(c)
);

// Department → job titles. Each title carries a seniority multiplier that
// scales the country base salary.
interface JobTitle {
  title: string;
  mult: number;
}
const DEPARTMENTS: Record<string, JobTitle[]> = {
  Engineering: [
    { title: "Software Engineer", mult: 1.0 },
    { title: "Senior Software Engineer", mult: 1.4 },
    { title: "Staff Engineer", mult: 1.9 },
    { title: "Engineering Manager", mult: 1.7 },
    { title: "Tech Lead", mult: 1.6 },
    { title: "Frontend Engineer", mult: 1.0 },
    { title: "Backend Engineer", mult: 1.05 },
    { title: "DevOps Engineer", mult: 1.1 },
    { title: "Data Engineer", mult: 1.1 },
    { title: "QA Engineer", mult: 0.9 },
  ],
  Product: [
    { title: "Product Manager", mult: 1.3 },
    { title: "Senior Product Manager", mult: 1.7 },
    { title: "Group Product Manager", mult: 2.0 },
  ],
  Design: [
    { title: "Product Designer", mult: 1.1 },
    { title: "UX Designer", mult: 1.0 },
    { title: "Design Lead", mult: 1.6 },
  ],
  Marketing: [
    { title: "Marketing Manager", mult: 1.2 },
    { title: "Content Strategist", mult: 0.95 },
    { title: "Growth Marketer", mult: 1.15 },
    { title: "SEO Specialist", mult: 0.9 },
  ],
  Sales: [
    { title: "Account Executive", mult: 1.1 },
    { title: "Sales Manager", mult: 1.4 },
    { title: "Sales Development Rep", mult: 0.75 },
    { title: "Solutions Engineer", mult: 1.3 },
  ],
  Finance: [
    { title: "Financial Analyst", mult: 1.0 },
    { title: "Controller", mult: 1.6 },
    { title: "Accountant", mult: 0.9 },
  ],
  People: [
    { title: "HR Manager", mult: 1.2 },
    { title: "Recruiter", mult: 0.95 },
    { title: "People Operations Lead", mult: 1.4 },
  ],
  Operations: [
    { title: "Operations Manager", mult: 1.3 },
    { title: "Project Manager", mult: 1.15 },
    { title: "Office Manager", mult: 0.8 },
  ],
  "Customer Success": [
    { title: "Customer Success Manager", mult: 1.1 },
    { title: "Support Engineer", mult: 1.0 },
    { title: "Technical Account Manager", mult: 1.3 },
  ],
  Legal: [
    { title: "Legal Counsel", mult: 1.7 },
    { title: "Paralegal", mult: 0.9 },
  ],
};

const DEPT_NAMES = Object.keys(DEPARTMENTS);

// Employment-type weights — same trick as countries.
const EMPLOYMENT_TYPES: readonly ("FULL_TIME" | "PART_TIME" | "CONTRACT")[] = [
  ...Array<"FULL_TIME">(85).fill("FULL_TIME"),
  ...Array<"CONTRACT">(10).fill("CONTRACT"),
  ...Array<"PART_TIME">(5).fill("PART_TIME"),
];

// ---------- write ----------------------------------------------------------

console.log(
  `seeding ${COUNT.toLocaleString()} employees → ${DB_PATH} (SEED_RNG=${SEED})`
);

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
// `NORMAL` is safe with WAL and noticeably faster for bulk writes.
sqlite.pragma("synchronous = NORMAL");

const t0 = performance.now();

sqlite.exec(
  "DELETE FROM employees; DELETE FROM sqlite_sequence WHERE name='employees';"
);

const insert = sqlite.prepare(`
  INSERT INTO employees (
    full_name, first_name, last_name, email,
    job_title, department, country,
    salary, currency, employment_type, hire_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Deterministic "today" so re-runs with the same SEED_RNG produce
// identical hire dates.
const TODAY = new Date("2026-05-24T00:00:00Z");
const dayMs = 24 * 60 * 60 * 1000;

const insertMany = sqlite.transaction(() => {
  for (let i = 1; i <= COUNT; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const fullName = `${first} ${last}`;
    // Sequence number guarantees email uniqueness even when names collide.
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${i}@example.com`;

    const country = pick(WEIGHTED_COUNTRIES);
    const deptName = pick(DEPT_NAMES);
    const job = pick(DEPARTMENTS[deptName]);

    // ±20% jitter on top of (base × seniority).
    const jitter = 0.8 + rand() * 0.4;
    const salaryMajor = Math.round(country.base * job.mult * jitter);
    const salaryMinor = salaryMajor * 100;

    // Hire within the last 5 years.
    const days = between(0, 365 * 5);
    const hireDate = new Date(TODAY.getTime() - days * dayMs)
      .toISOString()
      .slice(0, 10);

    insert.run(
      fullName,
      first,
      last,
      email,
      job.title,
      deptName,
      country.code,
      salaryMinor,
      country.currency,
      pick(EMPLOYMENT_TYPES),
      hireDate
    );
  }
});

insertMany();

const elapsedMs = performance.now() - t0;
const rps = Math.round((COUNT / elapsedMs) * 1000);
const countRow = sqlite
  .prepare("SELECT COUNT(*) as n FROM employees")
  .get() as { n: number };

console.log(
  `✓ seeded ${countRow.n.toLocaleString()} rows in ${elapsedMs.toFixed(0)}ms ` +
    `(${rps.toLocaleString()} rows/sec)`
);

sqlite.close();
