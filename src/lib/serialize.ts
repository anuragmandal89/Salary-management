import type { Employee } from "./schema";
import { toMajor } from "./money";

/**
 * Convert the internal DB row into the API/wire shape:
 * - `salary` exposed in MAJOR units (e.g. 100000 = $100,000)
 * - `createdAt` / `updatedAt` exposed as ISO strings
 */
export function serializeEmployee(e: Employee) {
  return {
    id: e.id,
    fullName: e.fullName,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    jobTitle: e.jobTitle,
    department: e.department,
    country: e.country,
    salary: toMajor(e.salary),
    currency: e.currency,
    employmentType: e.employmentType,
    hireDate: e.hireDate,
    createdAt: new Date(e.createdAt * 1000).toISOString(),
    updatedAt: new Date(e.updatedAt * 1000).toISOString(),
  };
}

export type SerializedEmployee = ReturnType<typeof serializeEmployee>;
