/**
 * Salaries are stored as INTEGER minor units (always multiplied by 100)
 * for consistent aggregate math, regardless of the real-world subdivision
 * of the currency. This is a deliberate simplification — see
 * docs/DECISIONS.md for the rationale.
 */
export const MINOR_UNITS_PER_MAJOR = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

export function toMajor(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

export function formatSalary(
  minor: number,
  currency: string,
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(toMajor(minor));
}
