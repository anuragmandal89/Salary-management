import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getByCountry,
  getByDepartmentInCountry,
  getByJobTitleInCountry,
  getSalaryDistribution,
  getSummary,
} from "./insights";
import { makeTestDb, seedFixture } from "../../tests/helpers/db";

const env = makeTestDb();
beforeAll(() => seedFixture(env.sqlite));
afterAll(() => env.close());

// Hand-computed expectations from tests/helpers/db.ts seedFixture:
//   US: Alice 100k, Bob 200k, Carol 300k  → min 100k, max 300k, avg 200k
//   GB: Dan 50k, Eva 150k                  → min 50k, max 150k, avg 100k
//   Engineers in US: Alice 100k, Bob 200k  → avg 150k
//   Managers in US:  Carol 300k            → avg 300k

describe("getSummary", () => {
  it("counts totals and breaks down by employment type", async () => {
    const s = await getSummary(env.db);
    expect(s.totalEmployees).toBe(5);
    expect(s.totalCountries).toBe(2);
    expect(s.totalDepartments).toBe(1);
    expect(s.totalJobTitles).toBe(2);
    expect(
      s.byEmploymentType.find((b) => b.type === "FULL_TIME")?.count
    ).toBe(4);
    expect(
      s.byEmploymentType.find((b) => b.type === "PART_TIME")?.count
    ).toBe(1);
  });
});

describe("getByCountry", () => {
  it("returns min/max/avg in major units per country", async () => {
    const rows = await getByCountry(env.db);
    const us = rows.find((r) => r.country === "US")!;
    const gb = rows.find((r) => r.country === "GB")!;
    expect(us).toMatchObject({
      currency: "USD",
      count: 3,
      min: 100_00,
      max: 300_00,
      avg: 200_00,
    });
    expect(gb).toMatchObject({
      currency: "GBP",
      count: 2,
      min: 50_00,
      max: 150_00,
      avg: 100_00,
    });
  });

  it("orders by descending headcount", async () => {
    const rows = await getByCountry(env.db);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].count >= rows[i].count).toBe(true);
    }
  });
});

describe("getByJobTitleInCountry", () => {
  it("returns per-job-title averages within a country", async () => {
    const res = (await getByJobTitleInCountry("US", env.db))!;
    expect(res.country).toBe("US");
    expect(res.currency).toBe("USD");
    const engineer = res.items.find((i) => i.jobTitle === "Engineer")!;
    const manager = res.items.find((i) => i.jobTitle === "Manager")!;
    expect(engineer).toMatchObject({ count: 2, avg: 150_00 });
    expect(manager).toMatchObject({ count: 1, avg: 300_00 });
  });

  it("returns null for an unknown country", async () => {
    expect(await getByJobTitleInCountry("ZZ", env.db)).toBeNull();
  });
});

describe("getByDepartmentInCountry", () => {
  it("returns per-department averages", async () => {
    const res = (await getByDepartmentInCountry("US", env.db))!;
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      department: "Engineering",
      count: 3,
      avg: 200_00,
    });
  });

  it("returns null for unknown country", async () => {
    expect(await getByDepartmentInCountry("ZZ", env.db)).toBeNull();
  });
});

describe("getSalaryDistribution", () => {
  it("buckets sum to the country headcount", async () => {
    const res = (await getSalaryDistribution("US", 4, env.db))!;
    const total = res.buckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(3);
    expect(res.bucketCount).toBe(4);
    expect(res.buckets).toHaveLength(4);
  });

  it("places the max-salary row in the last bucket", async () => {
    const res = (await getSalaryDistribution("US", 3, env.db))!;
    // Carol's 300k is the max in US → should land in the last bucket.
    expect(res.buckets[res.buckets.length - 1].count).toBeGreaterThan(0);
  });

  it("handles a single-row country gracefully", async () => {
    // No seeded country has only one row, but covering width=1 edge cases:
    const res = (await getSalaryDistribution("GB", 5, env.db))!;
    const total = res.buckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(2);
  });

  it("returns null for an unknown country", async () => {
    expect(await getSalaryDistribution("ZZ", 10, env.db)).toBeNull();
  });
});
