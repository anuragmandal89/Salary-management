# AI Prompts & Workflow

This is a transparent account of how AI (Claude, in agentic mode) was used to
build this project, what worked, and where I overrode the AI's first
suggestion. The goal is to make the workflow legible — not to claim "AI wrote
it all" or to pretend AI wasn't used.

## High-level approach

I treated Claude as a fast-typing pair: I led on architecture, decisions, and
constraints; Claude executed and surfaced issues I'd otherwise hit later. The
plan that drove all 13 commits is checked in at
`https-incubytein-my-sharepoint-com-w-g-p-distributed-scone.md` (the original
plan file the agent generated).

The non-negotiable rules I set up front:

- **Tests before docs.** No commit was allowed to land if `npm test` failed.
- **Each commit is shippable.** Lint and typecheck clean per commit.
- **One concern per commit.** Reviewer should be able to read the diff list
  and understand the evolution.

## Representative prompts

### Bootstrapping the plan

> *"Build a minimal yet usable salary management tool for an org with 10k
> employees, end-to-end with backend & UI. Plan it before coding — produce
> 13 incremental commits, lock down stack choices, identify perf hot paths."*

What worked: getting a structured plan with an explicit commit cadence.
What I overrode: the AI initially wanted to normalize departments/countries
into lookup tables; I pushed back — for 10k rows it's premature.

### Schema design

> *"Schema for `employees` table. Salary must be exact under aggregation.
> Country is ISO-3166. Employment type is FULL_TIME/PART_TIME/CONTRACT.
> Index for the insight queries we'll write."*

What worked: salary-as-integer-minor-units was Claude's suggestion and I
agreed. The composite `(country, job_title)` index was also AI's idea.
What I overrode: AI initially suggested a separate `salaries` table for
historical changes; that's audit-log territory and out of scope here.

### Seed performance

> *"Seed must do 10k rows in well under 1 second and be idempotent and
> deterministic. Show me the trade-offs."*

What worked: the prepared-statement-in-single-transaction approach with
`better-sqlite3`'s synchronous API. AI also flagged that `Math.random` is not
seedable and proposed Mulberry32.
What I overrode: AI's first proposal used `db.exec(multiRowInsert)`; I
pushed for the prepared statement because parsing is a measurable cost.

### Distribution histogram bug

This one's the most honest moment. AI's first cut of the distribution query
in `insights.ts` looked correct but returned wrong data. We debugged together:

> *"GB has 1022 employees but the histogram total is 15. Something's
> dropping rows. Run the SQL manually and check."*

Root cause: `better-sqlite3` binds JS `Number` as REAL, which forced SQLite
into floating-point division and gave every row a unique bucket. The fix
was `CAST(... AS INTEGER)` in the bucket expression. The comment in
`src/lib/insights.ts` documents this so the next reader (human or AI) won't
re-hit it.

This is the kind of bug AI-generated code is genuinely prone to — it
*looked* correct, lint passed, types passed, and only an integration test
or an end-to-end check would catch it. We caught it via curl + manual SQL,
then added the regression test.

### Next.js 16 surprises

The scaffold's `AGENTS.md` warned that Next.js 16 has breaking changes
relative to anything in training data. I checked the bundled docs in
`node_modules/next/dist/docs/` for two specific things:

- `searchParams` / `params` are now Promises in page and route components —
  confirmed and applied.
- `cookies()` and `headers()` are async — not used in this project but
  noted.

The scaffold's `AGENTS.md` is checked in unchanged; future contributors get
the same warning.

### shadcn v4 surprises

`asChild` is gone (Base UI's `render` prop replaces it) and Select's
`onValueChange` returns `string | null`. The first compile pass produced
several TS errors against these; rather than work around them, I rewrote
the filters to derive state from URL params (cleaner regardless).

## What didn't go through AI

- **The names files** (`data/first_names.txt`, `data/last_names.txt`). AI
  was asked to produce them, then I scanned for obvious gibberish names.
- **Final commit messages.** Drafted by AI, scanned by me, occasionally
  edited for tone.

## Reflections

- **The agentic loop is most useful as a typing accelerator.** I spent more
  time thinking about edge cases (multi-currency aggregation, idempotency,
  CRLF on Windows) than typing code.
- **Tests are non-optional with agentic AI.** The distribution-histogram
  bug is exactly the kind of plausible-looking failure you don't catch by
  reading the diff. Every nontrivial function in `src/lib/` has tests.
- **The schema and decisions docs are load-bearing.** They give the AI (and
  any future human) the constraints needed to make the right call when the
  surface code doesn't reveal them — e.g. *why* salary is stored as
  integer.

## The actual transcripts

The full conversation that produced this codebase is too long to include
verbatim, but the commit log is a tight summary: each commit message
captures the intent of one round of the loop, and the inline code comments
capture the non-obvious "why."
