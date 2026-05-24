/**
 * Insight aggregation queries. Kept HTTP-free so they're easy to test.
 *
 * Salary values returned from these functions are in MAJOR currency units
 * (e.g. 100000 for $100,000) — internal minor-unit storage is converted at
 * the query boundary via division by 100.
 *
 * Multi-currency caveat: cross-country aggregates would require FX
 * conversion to be meaningful, so the headline summary intentionally
 * does not include a global "total payroll" figure. All money figures
 * are reported in the country's local currency.
 */
import { eq, sql } from "drizzle-orm";
import { db as defaultDb } from "./db";
import { employees } from "./schema";
import { MINOR_UNITS_PER_MAJOR } from "./money";

type DB = typeof defaultDb;
const MINOR = MINOR_UNITS_PER_MAJOR;

export interface Summary {
  totalEmployees: number;
  totalCountries: number;
  totalDepartments: number;
  totalJobTitles: number;
  byEmploymentType: { type: string; count: number }[];
}

export async function getSummary(db: DB = defaultDb): Promise<Summary> {
  const [totals, byType] = await Promise.all([
    db
      .select({
        totalEmployees: sql<number>`count(*)`.mapWith(Number),
        totalCountries: sql<number>`count(distinct ${employees.country})`.mapWith(
          Number
        ),
        totalDepartments: sql<number>`count(distinct ${employees.department})`.mapWith(
          Number
        ),
        totalJobTitles: sql<number>`count(distinct ${employees.jobTitle})`.mapWith(
          Number
        ),
      })
      .from(employees),
    db
      .select({
        type: employees.employmentType,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(employees)
      .groupBy(employees.employmentType)
      .orderBy(sql`count(*) desc`),
  ]);
  return { ...totals[0], byEmploymentType: byType };
}

export interface CountryAggregate {
  country: string;
  currency: string;
  count: number;
  min: number;
  max: number;
  avg: number;
}

export async function getByCountry(
  db: DB = defaultDb
): Promise<CountryAggregate[]> {
  // We pick a representative currency per country with MIN() — the seed
  // assigns one currency per country, so this is stable. The MIN aggregate
  // is just a SQL trick to lift a non-grouped column into the result.
  const rows = await db
    .select({
      country: employees.country,
      currency: sql<string>`min(${employees.currency})`,
      count: sql<number>`count(*)`.mapWith(Number),
      min: sql<number>`min(${employees.salary}) / ${MINOR}`.mapWith(Number),
      max: sql<number>`max(${employees.salary}) / ${MINOR}`.mapWith(Number),
      avg: sql<number>`round(avg(${employees.salary})) / ${MINOR}`.mapWith(
        Number
      ),
    })
    .from(employees)
    .groupBy(employees.country)
    .orderBy(sql`count(*) desc`);
  return rows;
}

export interface JobTitleAggregate {
  jobTitle: string;
  count: number;
  avg: number;
  min: number;
  max: number;
}
export interface ByJobTitleResult {
  country: string;
  currency: string;
  items: JobTitleAggregate[];
}

export async function getByJobTitleInCountry(
  country: string,
  db: DB = defaultDb
): Promise<ByJobTitleResult | null> {
  // Cheap existence check first so we can return 404 cleanly upstream.
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(employees)
    .where(eq(employees.country, country));
  if (n === 0) return null;

  const rows = await db
    .select({
      jobTitle: employees.jobTitle,
      currency: sql<string>`min(${employees.currency})`,
      count: sql<number>`count(*)`.mapWith(Number),
      avg: sql<number>`round(avg(${employees.salary})) / ${MINOR}`.mapWith(
        Number
      ),
      min: sql<number>`min(${employees.salary}) / ${MINOR}`.mapWith(Number),
      max: sql<number>`max(${employees.salary}) / ${MINOR}`.mapWith(Number),
    })
    .from(employees)
    .where(eq(employees.country, country))
    .groupBy(employees.jobTitle)
    .orderBy(sql`avg(${employees.salary}) desc`);

  const currency = rows[0].currency;
  return {
    country,
    currency,
    items: rows.map((r) => ({
      jobTitle: r.jobTitle,
      count: r.count,
      avg: r.avg,
      min: r.min,
      max: r.max,
    })),
  };
}

export interface DistributionBucket {
  min: number;
  max: number;
  count: number;
}
export interface DistributionResult {
  country: string;
  currency: string;
  bucketCount: number;
  buckets: DistributionBucket[];
}

const DEFAULT_BUCKETS = 10;

export async function getSalaryDistribution(
  country: string,
  bucketCount = DEFAULT_BUCKETS,
  db: DB = defaultDb
): Promise<DistributionResult | null> {
  const [stats] = await db
    .select({
      currency: sql<string>`min(${employees.currency})`,
      min: sql<number>`min(${employees.salary})`.mapWith(Number),
      max: sql<number>`max(${employees.salary})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(employees)
    .where(eq(employees.country, country));
  if (stats.count === 0) return null;

  const { min: minS, max: maxS } = stats;
  // SQLite uses integer division for INTEGER / INTEGER. Guard against
  // a zero-width range when min == max (everyone earns the same — unlikely
  // with 10k rows but cheap to handle).
  const width = Math.max(1, Math.ceil((maxS - minS + 1) / bucketCount));

  // SQLite cannot reference a SELECT alias in GROUP BY, so we build the
  // bucket expression once and reuse it in both clauses.
  //
  // The explicit CAST is load-bearing: better-sqlite3 binds JS Numbers as
  // REAL even when they're integer-valued, which makes the parameterized
  // division floating-point. Casting collapses every row in a bucket back
  // to the same integer index.
  const bucketExpr = sql<number>`min(${bucketCount - 1}, CAST((${employees.salary} - ${minS}) / ${width} AS INTEGER))`;
  const rows = await db
    .select({
      bucket: bucketExpr.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(employees)
    .where(eq(employees.country, country))
    .groupBy(bucketExpr)
    .orderBy(bucketExpr);

  // Materialize buckets including empty ones for a contiguous histogram.
  const filled = new Map(rows.map((r) => [r.bucket, r.count]));
  const buckets: DistributionBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const min = (minS + i * width) / MINOR;
    const max = (minS + (i + 1) * width - 1) / MINOR;
    buckets.push({ min, max, count: filled.get(i) ?? 0 });
  }

  return {
    country,
    currency: stats.currency,
    bucketCount,
    buckets,
  };
}

export interface DepartmentAggregate {
  department: string;
  count: number;
  avg: number;
}
export interface ByDepartmentResult {
  country: string;
  currency: string;
  items: DepartmentAggregate[];
}

/** Bonus metric — avg salary per department within a country. */
export async function getByDepartmentInCountry(
  country: string,
  db: DB = defaultDb
): Promise<ByDepartmentResult | null> {
  const rows = await db
    .select({
      department: employees.department,
      currency: sql<string>`min(${employees.currency})`,
      count: sql<number>`count(*)`.mapWith(Number),
      avg: sql<number>`round(avg(${employees.salary})) / ${MINOR}`.mapWith(
        Number
      ),
    })
    .from(employees)
    .where(eq(employees.country, country))
    .groupBy(employees.department)
    .orderBy(sql`avg(${employees.salary}) desc`);
  if (rows.length === 0) return null;
  return {
    country,
    currency: rows[0].currency,
    items: rows.map((r) => ({
      department: r.department,
      count: r.count,
      avg: r.avg,
    })),
  };
}
