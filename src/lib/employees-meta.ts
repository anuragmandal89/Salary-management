/**
 * Helpers for populating filter dropdowns from current DB content.
 * Cached lightly so the list page doesn't refetch on every request.
 */
import { asc, sql } from "drizzle-orm";
import { db } from "./db";
import { employees } from "./schema";

export async function listDistinctDepartments(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ department: employees.department })
    .from(employees)
    .orderBy(asc(employees.department));
  return rows.map((r) => r.department);
}

export async function listDistinctJobTitles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ jobTitle: employees.jobTitle })
    .from(employees)
    .orderBy(asc(employees.jobTitle));
  return rows.map((r) => r.jobTitle);
}

export async function listDistinctCountries(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ country: employees.country })
    .from(employees)
    .orderBy(asc(employees.country));
  return rows.map((r) => r.country);
}

export async function getEmployeeCount(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(employees);
  return n;
}
