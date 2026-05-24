# Architecture

A single Next.js 16 application, full-stack, with server components rendering
pages and route handlers exposing the same data as JSON for any future external
consumers.

## Layers, top-down

```
        ┌────────────────────────────────────────────────────────┐
        │  pages / forms / charts  (src/app, src/components)     │   UI
        └────────────────────────────────────────────────────────┘
                              │                       │
                              │  direct call          │  fetch()
                              ▼                       ▼
        ┌────────────────────────────────────────────────────────┐
        │  route handlers          (src/app/api/**/route.ts)     │   API
        │  - JSON in/out, Zod-validated, HTTP status codes       │
        └────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────────────────┐
        │  services + insights aggregators  (src/lib/*)          │   DOMAIN
        │  - pure data functions, no framework imports           │
        │  - accept an optional `db` for testability             │
        └────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────────────────┐
        │  Drizzle ORM + raw sql template                        │   DATA
        │  src/lib/db.ts (singleton, WAL), src/lib/schema.ts     │
        └────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────────────────┐
        │  SQLite (better-sqlite3)  data/salary.db               │
        └────────────────────────────────────────────────────────┘
```

The two arrows from UI matter: **server components call the domain layer
directly** (no HTTP hop), while **client components fetch the route handlers**.
The route handlers exist for client-side mutations, and as a stable JSON API
for hypothetical external consumers — they are not internal middleware on the
read path.

## Why this shape

- **Routes are thin.** Each handler: parse → validate (Zod) → call service →
  serialize → return. No business logic lives in `route.ts` files.
- **Services are HTTP-free.** Functions in `src/lib/employees-service.ts` and
  `src/lib/insights.ts` accept a `db` argument (default to the singleton).
  Tests pass an in-memory `:memory:` DB; no mocking required.
- **Validation is shared.** The same Zod schemas in `src/lib/validation.ts`
  power API request parsing and the React Hook Form resolver — schema drift
  between client and server is structurally impossible.
- **Money is integer-only inside the system.** `src/lib/money.ts` is the only
  place that converts between minor (storage / aggregates) and major (wire /
  display). Aggregates over INTEGER are exact; no floating-point drift.

## File map

| Path                                       | Role                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `src/app/layout.tsx`                       | Root layout + Toaster + AppShell                                     |
| `src/app/employees/page.tsx`               | List page — server-fetches via `listEmployees()` directly            |
| `src/app/insights/page.tsx`                | Dashboard — server-fetches all aggregates in parallel                |
| `src/app/api/employees/route.ts`           | GET (list) + POST (create)                                           |
| `src/app/api/employees/[id]/route.ts`      | GET, PATCH, DELETE for a single employee                             |
| `src/app/api/insights/**/route.ts`         | Aggregates exposed as JSON                                           |
| `src/lib/db.ts`                            | Singleton SQLite connection with WAL + dev-mode HMR cache            |
| `src/lib/schema.ts`                        | Drizzle table definition + indexes                                   |
| `src/lib/validation.ts`                    | Zod schemas shared by API + forms                                    |
| `src/lib/employees-service.ts`             | CRUD operations (HTTP-free)                                          |
| `src/lib/insights.ts`                      | All aggregation queries (raw `sql` template for clarity)             |
| `src/lib/employees-meta.ts`                | Distinct lookups for filter dropdowns                                |
| `src/lib/serialize.ts`                     | DB row → wire format (minor → major salary, ISO timestamps)          |
| `src/lib/api-errors.ts`                    | Consistent JSON error responses                                      |
| `src/lib/countries.ts`                     | ISO-3166 list with currency mapping                                  |
| `src/lib/money.ts`                         | Integer ↔ major conversion + `Intl.NumberFormat` wrapper             |
| `src/components/employees-table.tsx`       | Server-rendered table; client `EmployeeRowActions` slot              |
| `src/components/employees-filters.tsx`     | Client — URL is the source of truth for filter state                 |
| `src/components/employee-form-sheet.tsx`   | RHF + Zod resolver, slide-over for create/edit                       |
| `src/components/employee-delete-dialog.tsx`| AlertDialog for destructive confirm                                  |
| `src/components/country-salary-chart.tsx`  | Recharts bar chart with multi-currency caveat in the tooltip         |
| `src/components/distribution-histogram.tsx`| Recharts histogram, currency-aware tick labels                       |
| `scripts/seed.ts`                          | 10k-row seed (see PERFORMANCE.md)                                    |
| `tests/helpers/db.ts`                      | Spins up a `:memory:` DB and replays the real Drizzle migrations     |

## Request flow examples

**Viewing the employees list** (`/employees?country=US&page=2`):

1. Next.js routes the request to `src/app/employees/page.tsx` (a server
   component).
2. The page awaits `searchParams`, runs them through
   `employeeListQuerySchema.safeParse`, falls back to defaults on failure.
3. It calls `listEmployees(query)` and the distinct-lookup helpers in parallel.
4. Rows are serialized (`serializeEmployee`) into the wire shape so the same
   data type is used everywhere downstream.
5. The page renders the server `EmployeesTable`, the client `EmployeesFilters`
   (hydrated with URL params), and `PaginationBar` Links.

**Deleting an employee** (row action → confirm):

1. User clicks Delete in the row dropdown → opens `EmployeeDeleteDialog`.
2. On confirm, the client fires `DELETE /api/employees/{id}`.
3. The handler resolves the dynamic param (`params` is a Promise in Next 16),
   coerces and validates the id, calls `deleteEmployee(id)`, returns 204 or
   404.
4. The client toasts success and calls `router.refresh()`, which re-runs the
   server component so the table reflects the new state.

## What's intentionally not here

- **Auth** — out of scope for the brief. Adding NextAuth or similar would
  introduce a `users` table and a session check in API/middleware. Noted in
  DECISIONS.md.
- **Soft delete / audit log** — useful for HR, but not asked for. Easy to add
  later: add `deleted_at`, a `WHERE deleted_at IS NULL` filter helper, and an
  `employee_audit` table.
- **Cross-country money aggregates** — would require FX conversion to be
  meaningful. The summary deliberately omits a global "total payroll" figure.
