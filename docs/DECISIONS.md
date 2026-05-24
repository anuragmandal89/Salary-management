# Design Decisions

Short, ADR-style notes for the consequential trade-offs.

## SQLite (not Postgres)

The brief allows SQLite, and for 10k rows on a single laptop it's the right
choice: no infra, zero setup, file-based, and `better-sqlite3`'s synchronous
API is dramatically faster than any async driver for bulk seeding (~90k
rows/sec, see PERFORMANCE.md).

**What we give up**: real concurrency on writes, network access, and managed
ops. None of those matter at this scale.

**Migration path**: the only SQLite-specific code is in `src/lib/db.ts` and
in the integer-CAST hack inside the distribution query (`insights.ts`).
Swapping to LibSQL (Turso, drop-in for `better-sqlite3`) for a Vercel
deployment is a single-file change.

## Drizzle ORM (not Prisma)

- **Tiny runtime, type-first.** Prisma drags a ~50MB engine binary and a
  generation step; Drizzle is a thin layer over `better-sqlite3` with
  inferred types from the schema directly.
- **Mixes cleanly with raw SQL.** Insight aggregations use the `sql`
  template tag for readability — the same query plan as if you'd written
  raw SQL, but still type-safe at the result-row boundary.
- **Honest about the underlying DB.** Drizzle doesn't pretend to abstract
  every dialect, which means we never end up fighting an over-abstraction
  for something SQLite-specific (e.g. the CAST trick).

## Single `employees` table (not normalized)

Department, country, and job title could each be their own lookup tables.
For 10k rows we don't normalize because:

- All three are bounded enums in practice (tens of distinct values).
- The brief asks for minimal.
- HR users add custom job titles freely; a strict FK list would slow that
  down.
- Filter dropdowns are populated via `SELECT DISTINCT` queries, which are
  fast against the indexed columns.

The model is denormalized in one specific way: `full_name` is materialized
on insert/update so the list page never has to concatenate at query time.
The service layer recomputes it whenever first or last name changes.

## Salary as integer minor units

All salaries are stored as `INTEGER` in a single unit (× 100 of the major
unit), regardless of the currency's real-world subdivision. Aggregates over
INTEGER are exact; floating-point AVG would drift on millions of rows.

**Caveat**: real-world JPY and KRW have no fractional unit. We store `100 ×
salary_in_yen` anyway and divide back for display. This means our seeded JPY
salaries look fine but are technically inflated by 100×. Documented here
because it would matter in production.

The wire format converts to major units at the API boundary (`serialize.ts`),
so client code never sees the inflation.

## URL is the source of truth for filter state

`EmployeesFilters` reads directly from `useSearchParams()` rather than
mirroring filter state into local React state. Avoids two problems:

1. The `setState`-in-`useEffect` lint warning that React 19's new rules now
   flag.
2. Out-of-sync state when the user uses browser Back/Forward.

The only field with local state is the search text input, because it
intentionally delays applying until the form is submitted.

## API speaks major units; storage speaks minor

Two-layer money model:

- DB and aggregates use minor units (`INTEGER`).
- API and forms use major units (`number`).

Conversion happens in exactly two places: `toMinor`/`toMajor` in
`src/lib/money.ts`. Client code, form schemas, and chart components only
ever see major units.

## RouteHandlers ARE the public API; pages bypass them

The brief asks for both a UI and a backend. We chose **not** to make the UI
call its own API as middleware. Server components query the service layer
directly — one round-trip, no JSON serialization in the middle. The API
routes exist as a stable contract for any future external consumer (or
external integration tests), and for the client-side form submissions.

This is the Next.js App Router recommendation and the right shape for this
size of app.

## shadcn/ui v4 over Radix-based v3

The shadcn v4 release moved from Radix to Base UI. Two consequences:

- `asChild` is gone — components expose a `render` prop instead.
- `Select.onValueChange` passes `string | null`, not `string`.

Both surfaced in this codebase; both are documented inline where they
matter. Going with v4 because it's the current default for new projects and
because Base UI is a more honest primitive set.

## React Hook Form + Zod resolver (not Server Actions)

Server Actions would avoid a manual `fetch` in the form submit. We didn't
use them because:

- The form already needs client-side validation (RHF) for the inline error
  messages.
- The same Zod schemas need to run both client- and server-side; routing
  them through a Server Action obscures that.
- Standard `fetch + JSON` keeps the API surface explicit and matches the
  CRUD endpoints we already needed for external consumers.

## Tests run against a real SQLite, not mocks

Tests use `new Database(':memory:')` and replay the actual Drizzle migration
files. This catches schema/SQL bugs (we hit one — the missing CAST in the
distribution query) that mocked DB tests would silently let through.

## What we deferred

- **Auth.** Brief doesn't require it; would add `users` table, NextAuth, and
  a middleware that rejects unauthenticated API calls.
- **Soft delete + audit log.** HR-realistic but adds scope.
- **FX-normalized cross-country aggregates.** Needs an FX rate source and a
  policy for handling stale rates. Per-country aggregates are FX-free and
  cover the brief.
- **Deployment.** Code is portable; pick Turso or Postgres at deploy time
  and change `src/lib/db.ts` accordingly.
