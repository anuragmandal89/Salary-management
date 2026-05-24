import { describe, expect, it } from "vitest";
import { formatSalary, toMajor, toMinor, MINOR_UNITS_PER_MAJOR } from "./money";

describe("money", () => {
  it("converts major to minor and back losslessly for integer salaries", () => {
    for (const value of [0, 1, 100, 50_000, 1_500_000]) {
      expect(toMinor(value)).toBe(value * MINOR_UNITS_PER_MAJOR);
      expect(toMajor(toMinor(value))).toBe(value);
    }
  });

  it("rounds toMinor to avoid float drift", () => {
    expect(toMinor(100.005)).toBe(10001);
    expect(toMinor(99.994)).toBe(9999);
  });

  it("formatSalary outputs a currency-symbolled string for USD", () => {
    expect(formatSalary(100_000, "USD")).toMatch(/\$100,000/);
  });

  it("formatSalary respects currency code", () => {
    expect(formatSalary(50_000, "EUR")).toMatch(/€/);
    expect(formatSalary(7_500_000, "JPY")).toMatch(/¥|JPY/);
  });

  it("formatSalary truncates fractions", () => {
    expect(formatSalary(99_999.6, "USD")).not.toMatch(/\./);
  });
});
