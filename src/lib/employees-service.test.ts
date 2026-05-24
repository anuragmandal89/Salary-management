import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from "./employees-service";
import { employeeListQuerySchema } from "./validation";
import { makeTestDb, seedFixture } from "../../tests/helpers/db";

const env = makeTestDb();
afterAll(() => env.close());

beforeEach(() => {
  env.sqlite.exec(
    "DELETE FROM employees; DELETE FROM sqlite_sequence WHERE name='employees';"
  );
  seedFixture(env.sqlite);
});

const defaultQuery = (overrides: Record<string, unknown> = {}) =>
  employeeListQuerySchema.parse(overrides);

describe("listEmployees", () => {
  it("returns all rows with default pagination", async () => {
    const r = await listEmployees(defaultQuery(), env.db);
    expect(r.total).toBe(5);
    expect(r.items).toHaveLength(5);
  });

  it("filters by country", async () => {
    const r = await listEmployees(defaultQuery({ country: "US" }), env.db);
    expect(r.total).toBe(3);
    expect(r.items.every((e) => e.country === "US")).toBe(true);
  });

  it("filters by department and jobTitle together", async () => {
    const r = await listEmployees(
      defaultQuery({ department: "Engineering", jobTitle: "Manager" }),
      env.db
    );
    expect(r.total).toBe(2);
    expect(r.items.map((e) => e.fullName).sort()).toEqual([
      "Carol Cox",
      "Eva Estrada",
    ]);
  });

  it("does fuzzy search over name and email", async () => {
    const byName = await listEmployees(defaultQuery({ q: "Bob" }), env.db);
    expect(byName.total).toBe(1);
    const byEmail = await listEmployees(
      defaultQuery({ q: "carol@" }),
      env.db
    );
    expect(byEmail.total).toBe(1);
  });

  it("paginates and reports an accurate total", async () => {
    const r = await listEmployees(
      defaultQuery({ pageSize: 2, page: 2 }),
      env.db
    );
    expect(r.total).toBe(5);
    expect(r.items).toHaveLength(2);
    expect(r.page).toBe(2);
  });

  it("sorts by salary ascending when requested", async () => {
    const r = await listEmployees(
      defaultQuery({ sort: "salary", order: "asc" }),
      env.db
    );
    const salaries = r.items.map((e) => e.salary);
    expect(salaries).toEqual([...salaries].sort((a, b) => a - b));
  });
});

describe("getEmployee", () => {
  it("returns a single row by id", async () => {
    const e = await getEmployee(1, env.db);
    expect(e?.fullName).toBe("Alice Adams");
  });

  it("returns undefined for unknown id", async () => {
    expect(await getEmployee(9999, env.db)).toBeUndefined();
  });
});

describe("createEmployee", () => {
  it("inserts with currency derived from country when omitted", async () => {
    const created = await createEmployee(
      {
        firstName: "Frank",
        lastName: "Foster",
        email: "frank@x.com",
        jobTitle: "Engineer",
        department: "Engineering",
        country: "DE",
        salary: 70_000,
        employmentType: "FULL_TIME",
        hireDate: "2025-01-01",
      },
      env.db
    );
    expect(created.currency).toBe("EUR"); // derived from DE
    expect(created.fullName).toBe("Frank Foster");
    expect(created.salary).toBe(70_000 * 100); // stored in minor units
  });

  it("rejects a duplicate email at the DB layer (unique constraint)", async () => {
    await expect(
      createEmployee(
        {
          firstName: "Dup",
          lastName: "Email",
          email: "alice@x.com", // already in fixture
          jobTitle: "Engineer",
          department: "Engineering",
          country: "US",
          salary: 100_000,
          employmentType: "FULL_TIME",
          hireDate: "2025-01-01",
        },
        env.db
      )
    ).rejects.toThrow(/UNIQUE constraint failed/i);
  });
});

describe("updateEmployee", () => {
  it("updates a single field without disturbing others", async () => {
    const updated = await updateEmployee(1, { salary: 250_000 }, env.db);
    expect(updated?.salary).toBe(250_000 * 100);
    expect(updated?.fullName).toBe("Alice Adams"); // unchanged
  });

  it("recomputes fullName when first or last name changes", async () => {
    const updated = await updateEmployee(1, { firstName: "Alicia" }, env.db);
    expect(updated?.fullName).toBe("Alicia Adams");
  });

  it("switches currency to match new country unless overridden", async () => {
    const updated = await updateEmployee(1, { country: "DE" }, env.db);
    expect(updated?.country).toBe("DE");
    expect(updated?.currency).toBe("EUR");
  });

  it("respects an explicit currency override", async () => {
    const updated = await updateEmployee(
      1,
      { country: "DE", currency: "USD" },
      env.db
    );
    expect(updated?.currency).toBe("USD");
  });

  it("returns undefined for unknown id", async () => {
    expect(await updateEmployee(9999, { salary: 1 }, env.db)).toBeUndefined();
  });
});

describe("deleteEmployee", () => {
  it("deletes an existing row and returns true", async () => {
    const ok = await deleteEmployee(1, env.db);
    expect(ok).toBe(true);
    expect(await getEmployee(1, env.db)).toBeUndefined();
  });

  it("returns false when nothing was deleted", async () => {
    expect(await deleteEmployee(9999, env.db)).toBe(false);
  });
});
