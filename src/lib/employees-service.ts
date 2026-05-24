/**
 * Data-access layer for employees. Kept free of HTTP / framework concerns
 * so the API routes stay thin and these functions are easy to unit-test
 * against an in-memory SQLite instance.
 */
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db as defaultDb } from "./db";
import { employees, type Employee } from "./schema";
import { getCurrency } from "./countries";
import { toMinor } from "./money";
import type {
  EmployeeCreateInput,
  EmployeeListQuery,
  EmployeeUpdateInput,
} from "./validation";

type DB = typeof defaultDb;

const SORT_COLUMNS = {
  fullName: employees.fullName,
  salary: employees.salary,
  hireDate: employees.hireDate,
  country: employees.country,
  jobTitle: employees.jobTitle,
  createdAt: employees.createdAt,
} as const;

export interface ListResult {
  items: Employee[];
  page: number;
  pageSize: number;
  total: number;
}

export async function listEmployees(
  query: EmployeeListQuery,
  db: DB = defaultDb
): Promise<ListResult> {
  const filters = [];
  if (query.q) {
    const term = `%${query.q}%`;
    filters.push(
      or(like(employees.fullName, term), like(employees.email, term))!
    );
  }
  if (query.country) filters.push(eq(employees.country, query.country));
  if (query.jobTitle) filters.push(eq(employees.jobTitle, query.jobTitle));
  if (query.department) filters.push(eq(employees.department, query.department));

  const where = filters.length ? and(...filters) : undefined;
  const sortCol = SORT_COLUMNS[query.sort];
  const orderFn = query.order === "asc" ? asc : desc;

  const offset = (query.page - 1) * query.pageSize;

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(where)
      .orderBy(orderFn(sortCol), asc(employees.id))
      .limit(query.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(employees)
      .where(where),
  ]);

  return { items, page: query.page, pageSize: query.pageSize, total: count };
}

export async function getEmployee(
  id: number,
  db: DB = defaultDb
): Promise<Employee | undefined> {
  const rows = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return rows[0];
}

export async function createEmployee(
  input: EmployeeCreateInput,
  db: DB = defaultDb
): Promise<Employee> {
  const currency = input.currency ?? getCurrency(input.country);
  const fullName = `${input.firstName} ${input.lastName}`;

  const rows = await db
    .insert(employees)
    .values({
      fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      jobTitle: input.jobTitle,
      department: input.department,
      country: input.country,
      salary: toMinor(input.salary),
      currency,
      employmentType: input.employmentType,
      hireDate: input.hireDate,
    })
    .returning();
  return rows[0];
}

export async function updateEmployee(
  id: number,
  input: EmployeeUpdateInput,
  db: DB = defaultDb
): Promise<Employee | undefined> {
  const patch: Partial<typeof employees.$inferInsert> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };
  if (input.firstName !== undefined) patch.firstName = input.firstName;
  if (input.lastName !== undefined) patch.lastName = input.lastName;
  if (input.firstName !== undefined || input.lastName !== undefined) {
    // full_name is denormalized — recompute when either part changes
    const current = await getEmployee(id, db);
    if (!current) return undefined;
    patch.fullName = `${input.firstName ?? current.firstName} ${
      input.lastName ?? current.lastName
    }`;
  }
  if (input.email !== undefined) patch.email = input.email;
  if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle;
  if (input.department !== undefined) patch.department = input.department;
  if (input.country !== undefined) {
    patch.country = input.country;
    // If country changes and currency wasn't explicitly set, follow country.
    if (input.currency === undefined) patch.currency = getCurrency(input.country);
  }
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.salary !== undefined) patch.salary = toMinor(input.salary);
  if (input.employmentType !== undefined)
    patch.employmentType = input.employmentType;
  if (input.hireDate !== undefined) patch.hireDate = input.hireDate;

  const rows = await db
    .update(employees)
    .set(patch)
    .where(eq(employees.id, id))
    .returning();
  return rows[0];
}

export async function deleteEmployee(
  id: number,
  db: DB = defaultDb
): Promise<boolean> {
  const rows = await db
    .delete(employees)
    .where(eq(employees.id, id))
    .returning({ id: employees.id });
  return rows.length > 0;
}
