import { describe, expect, it } from "vitest";
import { serializeEmployee } from "./serialize";
import type { Employee } from "./schema";

const row: Employee = {
  id: 42,
  fullName: "Test Person",
  firstName: "Test",
  lastName: "Person",
  email: "test@x.com",
  jobTitle: "Engineer",
  department: "Engineering",
  country: "US",
  salary: 100_000 * 100, // minor units in DB
  currency: "USD",
  employmentType: "FULL_TIME",
  hireDate: "2024-01-15",
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_500,
};

describe("serializeEmployee", () => {
  it("converts salary to major units", () => {
    expect(serializeEmployee(row).salary).toBe(100_000);
  });

  it("converts timestamps to ISO strings", () => {
    const s = serializeEmployee(row);
    expect(s.createdAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(s.updatedAt).toBe(new Date(1_700_000_500 * 1000).toISOString());
  });

  it("preserves identity fields", () => {
    const s = serializeEmployee(row);
    expect(s.id).toBe(42);
    expect(s.fullName).toBe("Test Person");
    expect(s.email).toBe("test@x.com");
    expect(s.currency).toBe("USD");
  });
});
