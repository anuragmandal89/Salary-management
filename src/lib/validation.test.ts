import { describe, expect, it } from "vitest";
import {
  employeeCreateSchema,
  employeeListQuerySchema,
  employeeUpdateSchema,
} from "./validation";

const validInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "GB",
  salary: 80_000,
  employmentType: "FULL_TIME",
  hireDate: "2024-03-01",
};

describe("employeeCreateSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(employeeCreateSchema.parse(validInput)).toMatchObject(validInput);
  });

  it("rejects negative salary", () => {
    const r = employeeCreateSchema.safeParse({ ...validInput, salary: -1 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["salary"]);
  });

  it("rejects non-integer salary", () => {
    const r = employeeCreateSchema.safeParse({ ...validInput, salary: 80_000.5 });
    expect(r.success).toBe(false);
  });

  it("rejects unsupported countries", () => {
    const r = employeeCreateSchema.safeParse({ ...validInput, country: "ZZ" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["country"]);
  });

  it("rejects invalid email", () => {
    const r = employeeCreateSchema.safeParse({ ...validInput, email: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejects bad hire date format", () => {
    const r = employeeCreateSchema.safeParse({
      ...validInput,
      hireDate: "Mar 1 2024",
    });
    expect(r.success).toBe(false);
  });

  it("normalizes email to lowercase and trims names", () => {
    const r = employeeCreateSchema.parse({
      ...validInput,
      email: "ADA@example.com",
      firstName: "  Ada  ",
    });
    expect(r.email).toBe("ada@example.com");
    expect(r.firstName).toBe("Ada");
  });

  it("uppercases currency when provided", () => {
    const r = employeeCreateSchema.parse({ ...validInput, currency: "usd" });
    expect(r.currency).toBe("USD");
  });

  it("rejects currency of wrong length", () => {
    const r = employeeCreateSchema.safeParse({
      ...validInput,
      currency: "US",
    });
    expect(r.success).toBe(false);
  });
});

describe("employeeUpdateSchema", () => {
  it("accepts a single field update", () => {
    expect(employeeUpdateSchema.parse({ salary: 99_000 })).toEqual({
      salary: 99_000,
    });
  });

  it("rejects an empty patch", () => {
    const r = employeeUpdateSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects invalid fields even in partial mode", () => {
    const r = employeeUpdateSchema.safeParse({ country: "ZZ" });
    expect(r.success).toBe(false);
  });
});

describe("employeeListQuerySchema", () => {
  it("applies defaults for page/pageSize/sort/order", () => {
    expect(employeeListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 25,
      sort: "createdAt",
      order: "desc",
    });
  });

  it("coerces string-encoded numbers from URL", () => {
    const r = employeeListQuerySchema.parse({ page: "3", pageSize: "10" });
    expect(r.page).toBe(3);
    expect(r.pageSize).toBe(10);
  });

  it("caps pageSize at 100", () => {
    const r = employeeListQuerySchema.safeParse({ pageSize: 500 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown sort columns", () => {
    const r = employeeListQuerySchema.safeParse({ sort: "salaryx" });
    expect(r.success).toBe(false);
  });
});
