import { z } from "zod";
import { COUNTRIES } from "./countries";

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;

/** Wire format for an employee. Salary in MAJOR currency units. */
export const employeeCreateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email").max(254),
  jobTitle: z.string().trim().min(1, "Job title is required").max(120),
  department: z.string().trim().min(1, "Department is required").max(120),
  country: z.enum(countryCodes, {
    message: "Unsupported country",
  }),
  /** Annual salary in major currency units (e.g. 100000 = $100,000). */
  salary: z
    .number({ message: "Salary must be a number" })
    .int("Salary must be a whole number")
    .positive("Salary must be greater than 0")
    .max(100_000_000, "Salary out of range"),
  /** ISO-4217 alpha-3 currency code. If omitted, derived from country. */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Currency must be a 3-letter code")
    .optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Hire date must be YYYY-MM-DD"),
});

/** Partial update — every field optional, but at least one must be present. */
export const employeeUpdateSchema = employeeCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "No fields to update" }
);

/** Query parameters for the list endpoint. */
export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().min(1).max(120).optional(),
  country: z.enum(countryCodes).optional(),
  jobTitle: z.string().trim().min(1).max(120).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  sort: z
    .enum([
      "fullName",
      "salary",
      "hireDate",
      "country",
      "jobTitle",
      "createdAt",
    ])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
