/**
 * Countries supported by the app. Codes are ISO-3166 alpha-2.
 * Currencies are ISO-4217 alpha-3 and used for display formatting.
 */
export interface Country {
  code: string;
  name: string;
  currency: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
];

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country | undefined {
  return COUNTRY_BY_CODE.get(code);
}

export function getCountryName(code: string): string {
  return COUNTRY_BY_CODE.get(code)?.name ?? code;
}

export function getCurrency(code: string): string {
  return COUNTRY_BY_CODE.get(code)?.currency ?? "USD";
}
