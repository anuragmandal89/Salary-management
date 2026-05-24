import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Employees table.
 *
 * - `salary` is stored in MINOR currency units (e.g. cents) as INTEGER to
 *   avoid floating-point drift in aggregates.
 * - `country` holds an ISO-3166 alpha-2 code; display names are derived in
 *   the UI from `src/lib/countries.ts`.
 * - `hire_date` is an ISO date string (YYYY-MM-DD) for portability.
 */
export const employees = sqliteTable(
  "employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fullName: text("full_name").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    jobTitle: text("job_title").notNull(),
    department: text("department").notNull(),
    country: text("country").notNull(),
    salary: integer("salary").notNull(),
    currency: text("currency").notNull().default("USD"),
    employmentType: text("employment_type", {
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT"],
    }).notNull(),
    hireDate: text("hire_date").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_employees_country").on(t.country),
    index("idx_employees_job_title").on(t.jobTitle),
    index("idx_employees_country_job_title").on(t.country, t.jobTitle),
  ]
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
