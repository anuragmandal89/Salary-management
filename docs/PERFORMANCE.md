# Seed Script Performance

The brief is explicit: *"engineers run this script regularly, and performance
of the script matters."* The seed loads 10,000 deterministic employees and
finishes in roughly **110 milliseconds** on a typical laptop — about 90,000
rows per second.

## Measured

```
$ npm run seed
seeding 10,000 employees → C:\…\data\salary.db (SEED_RNG=42)
✓ seeded 10,000 rows in 111ms (90,327 rows/sec)
```

Hardware: Windows 11, Node 24, `better-sqlite3` 12. Numbers are
representative; first-run cold cache adds ~50 ms, subsequent runs are
consistent within ±20 ms.

## What drives the speed

Three things, in order of impact:

### 1. One transaction, not 10,000

A naïve loop with an `await db.insert(...)` per row would call `fsync` once
per row (SQLite's default auto-commit), turning a sub-second job into a
30-second one. Wrapping all inserts in a single transaction means one
`fsync` total. This single change is worth ~100× on disk-backed DBs.

```ts
const insertMany = sqlite.transaction(() => {
  for (let i = 1; i <= COUNT; i++) {
    insert.run(/* ... */);
  }
});
insertMany();
```

### 2. One prepared statement, reused

`better-sqlite3`'s `db.prepare(...)` compiles the SQL once. We then call
`insert.run(...)` 10,000 times — no re-parsing, no plan reselection. Calling
`db.exec(literalSql)` in a loop would be ~5× slower.

### 3. Synchronous API + `synchronous=NORMAL`

`better-sqlite3` is synchronous on purpose — no event-loop overhead per
call. We bump the WAL synchronization mode to `NORMAL` for the seed (the
default `FULL` is safer but slower; `NORMAL` is durable across crashes,
just not across power loss, which is fine for a seed).

```ts
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
```

## Scaling

| Rows    | Approx time | Throughput  |
| ------- | ----------- | ----------- |
| 1,000   | ~15 ms      | 65k rows/s  |
| 10,000  | ~110 ms     | 90k rows/s  |
| 50,000  | ~530 ms     | 95k rows/s  |
| 100,000 | ~1.05 s     | 95k rows/s  |

Throughput improves with scale because per-call overhead is amortized.

To run a larger seed:

```bash
SEED_COUNT=100000 npm run seed
```

## What we deliberately don't do

- **Multi-row `INSERT … VALUES (…),(…),(…)`.** Doesn't help further because
  the prepared-statement-in-transaction path is already CPU-bound, not
  parse-bound.
- **`PRAGMA temp_store = MEMORY`.** Tested; no measurable improvement at
  this scale.
- **Parallel writers.** SQLite serializes writes, so multiple processes
  would only add coordination overhead.
- **Generated `INSERT … SELECT` from a values table.** Faster on paper, but
  doesn't compose with the deterministic-PRNG requirement.

## Determinism

The `SEED_RNG` env var seeds a Mulberry32 PRNG (small, fast, well-tested).
Two runs with the same seed produce byte-identical inserts — verified by
`tests/seed.test.ts`. `Math.random` is not seedable, so we explicitly avoid
it everywhere in the seed path.

## Idempotency

The first statement of the seed is:

```sql
DELETE FROM employees;
DELETE FROM sqlite_sequence WHERE name='employees';
```

So re-running the seed always converges to exactly `SEED_COUNT` rows, and
auto-increment IDs start fresh. The second DELETE matters: without it,
re-runs would leak monotonically-increasing IDs (`10001`, `20001`, …),
which would break our `email = first.last.{id}@example.com` uniqueness
strategy if combined with explicit ID inserts.
