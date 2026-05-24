import path from "node:path";
import type { Config } from "drizzle-kit";

const dbPath =
  process.env.DATABASE_FILE ??
  path.join(process.cwd(), "data", "salary.db");

export default {
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: dbPath },
  casing: "snake_case",
  strict: true,
  verbose: true,
} satisfies Config;
