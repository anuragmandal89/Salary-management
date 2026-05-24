# Salary Management

A minimal, production-quality salary management tool for HR managers, designed
to comfortably handle a 10,000-employee dataset.

Built end-to-end with Next.js 16, SQLite (via Drizzle), and shadcn/ui. The
seed script loads 10,000 deterministic employees in ~110 ms.

## What you get

- **CRUD over employees** — name, job title, department, country, salary,
  currency, employment type, hire date, email.
- **Server-paged employees list** with name/email search and country, department,
  and job-title filters; row-level edit and delete via a slide-over drawer and
  destructive confirm dialog.
- **Insights dashboard** with headline KPIs, an avg-salary-by-country chart,
  and per-country drill-down (job titles, departments, salary distribution
  histogram).
- **Fast, idempotent seed script** with deterministic output via a seeded
  PRNG — see [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
- **61 unit and integration tests** running in ~14 s.

## Stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Next.js 16 (App Router) + TypeScript    |
| UI components  | Tailwind v4 + shadcn/ui (Base UI under) |
| Charts         | Recharts                                |
| Forms          | React Hook Form + Zod resolver          |
| Database       | SQLite via `better-sqlite3`             |
| ORM            | Drizzle ORM                             |
| Validation     | Zod (shared between API + forms)        |
| Tests          | Vitest with in-memory SQLite            |
| Lint / format  | ESLint + Next.js + React Compiler rules |

See [docs/DECISIONS.md](docs/DECISIONS.md) for the rationale behind these
choices and the trade-offs they imply.

## Getting started

```bash
npm install
npm run db:migrate     # create the SQLite file + schema
npm run seed           # 10,000 deterministic employees, ~110 ms
npm run dev            # http://localhost:3000
```

Then open `http://localhost:3000/employees`.

## Scripts

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Next.js dev server (Turbopack) on `:3000`      |
| `npm run build`     | Production build                                |
| `npm run start`     | Run the production build                       |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run db:generate` | Generate a Drizzle migration from schema     |
| `npm run db:migrate`  | Apply pending migrations                      |
| `npm run db:studio`   | Open Drizzle Studio (DB browser)              |
| `npm run seed`        | Seed 10,000 employees (idempotent)            |
| `npm test`            | Run the test suite                            |
| `npm run test:watch`  | Vitest in watch mode                          |
| `npm run test:coverage` | Vitest with v8 coverage                    |

### Seed knobs

```bash
SEED_COUNT=50000 npm run seed   # custom row count
SEED_RNG=7 npm run seed         # different deterministic dataset
DATABASE_FILE=/tmp/x.db npm run seed   # write somewhere else
```

## Project layout

```
.
├── data/
│   ├── first_names.txt          # seed input (~250 names, multinational mix)
│   ├── last_names.txt           # seed input (~250 names)
│   └── salary.db                # local SQLite file (gitignored)
├── drizzle/                     # auto-generated migrations
├── docs/                        # design notes, decisions, prompts, perf
├── scripts/
│   └── seed.ts                  # fast prepared-insert seed
├── src/
│   ├── app/
│   │   ├── (root) /employees    # list, search, filter, paginate, edit, delete
│   │   ├── (root) /insights     # KPIs, country chart, drill-down panels
│   │   └── api/                 # REST handlers for employees + insights
│   ├── components/              # app-specific React components
│   ├── components/ui/           # shadcn/ui components (owned, not vendored)
│   └── lib/                     # db, schema, validation, services, formatters
├── tests/                       # seed script tests + in-memory db helpers
└── vitest.config.ts
```

## API surface

All under `/api/`.

| Method | Path                                                    | Purpose                              |
| ------ | ------------------------------------------------------- | ------------------------------------ |
| GET    | `/employees`                                            | List with `page`, `pageSize`, `q`, `country`, `department`, `jobTitle`, `sort`, `order` |
| POST   | `/employees`                                            | Create (Zod-validated, 409 on dup email) |
| GET    | `/employees/[id]`                                       | Single employee                      |
| PATCH  | `/employees/[id]`                                       | Partial update                       |
| DELETE | `/employees/[id]`                                       | Hard delete, 204 on success          |
| GET    | `/insights/summary`                                     | Headline counts + employment-type breakdown |
| GET    | `/insights/by-country`                                  | Per-country min / max / avg / count  |
| GET    | `/insights/by-country/[country]/by-job-title`           | Avg salary per job title in a country |
| GET    | `/insights/by-country/[country]/by-department`          | Avg salary per department in a country |
| GET    | `/insights/by-country/[country]/distribution?buckets=N` | Salary distribution histogram        |

Salary values on the wire are in **major currency units** (e.g. `100000`
for $100,000). They are stored as integer **minor units** internally — see
[docs/DECISIONS.md](docs/DECISIONS.md#salary-as-integer-minor-units).

## Deployment

This repo is currently local-only. The code is portable — for serverless
deployment, swap `better-sqlite3` for `@libsql/client` (Turso) by changing
only `src/lib/db.ts`. No schema or query changes are required.

## Further reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, request flow, what
  lives where and why.
- [docs/DECISIONS.md](docs/DECISIONS.md) — short ADRs for the consequential
  trade-offs (SQLite vs Postgres, Drizzle vs Prisma, single-table model,
  salary-as-integer, etc.).
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — seed-script benchmarking and
  the engineering behind the 90 k rows/sec figure.
- [docs/PROMPTS.md](docs/PROMPTS.md) — the AI prompts used during the build,
  with notes on where the AI helped and where I overrode it.
