# Backlog Navigator — fixed E2E fixture (replace live BACKLOG.md)

**Item**: #245 (Tech Debt, Low complexity, proposed)
**Predecessor**: spec 242 (the desktop Backlog Navigator)
**Estimate**: 0.5–1 dev-day
**Trigger**: live data drift broke `apps/backlog-navigator/e2e/realWrite.spec.ts` mid-merge on 2026-05-02; root-caused in commit `8cba5705` and tactically mitigated by changing the target status from `approved` → `clarified`. The architectural fix is captured here.

## Context

Spec 242 ships four Playwright E2E specs that read the live `BACKLOG.md` from the repo working tree (`readFileSync` of `../../../BACKLOG.md`), base64-encode it, and serve it via `page.route()` as the mocked GitHub Contents API response. The tests then `selectOption('approved')` on the first row's status cell and assert that the Push Changes button enables.

This pattern coupled the test fixture to whatever `BACKLOG.md` happened to be on the branch at test-run time. When commit `cf9bdc25` flipped items 244 + 243 to `approved` via the deployed navigator (eat-your-own-dogfood) the highest-ID row's status became `approved`, and `selectOption('approved')` on that row was a no-op (`before === after`). The Push Changes button stayed disabled, the click timed out at 30s, and CI failed.

The tactical fix (`8cba5705`) swapped the target to `clarified` — a workflow state nobody manually sets — to dodge collisions. That works **today** but doesn't solve the underlying problem: any change to the Items table that affects the highest-ID row's `status` could break the suite again. As the navigator gets used, this drift becomes more likely.

## Capability

Replace the live `BACKLOG.md` fixture with a small, hand-curated fixture file checked into `apps/backlog-navigator/e2e/fixtures/`. Structure:

```text
apps/backlog-navigator/e2e/fixtures/
├── backlog-fixture.md        # post-refactor 12-column format, ~10 items + 2 epics
└── README.md                 # what each row exists for
```

The fixture should:
- Cover one row per workflow state (`proposed`, `approved`, `complete`, …) — so any test that wants to flip a status from X to Y can pick a row guaranteed to be in state X.
- Cover one row per category (Feature / Tech Debt / Enhancement / Bug / Infrastructure / Documentation / Research Spike) — so the Category filter has variety to exercise.
- Cover at least 2 epics (E01, E02) plus at least 1 unaffiliated row — so group-by-Epic and the "(unassigned)" group both render.
- Cover one row with a complete strikethrough — so the strikethrough rendering / parser path is exercised.
- Cover one row whose Description contains a Markdown link, an `[[E##]` epic tag, and a `\|`-escaped pipe — so the parser's edge cases are exercised.
- Be small enough (~10 rows) that tests run fast and assertions can hard-code row IDs.

Tests update to:
- Read `e2e/fixtures/backlog-fixture.md` instead of `../../../BACKLOG.md`.
- Assert against known IDs and known statuses (e.g. "select row with id 1 whose status is `proposed`, change to `approved`, expect 1 pending edit").
- Keep `liveBacklog.roundtrip.test.ts` (the Vitest CI gate) reading the real file — that test's job IS to verify the round-trip against production data, so it's the right place for "live" coupling.

## Out of scope

- **Automatic fixture regeneration**. The fixture is hand-curated and stays small; no need for a generator.
- **Replacing the unit-test fixture in `parseBacklog.test.ts`**. That already uses an inline fixture (`const FIXTURE = ...`), so it's fine.
- **Replacing the round-trip live gate**. `liveBacklog.roundtrip.test.ts` MUST keep reading the real `BACKLOG.md` — that's the whole point of the gate.

## Acceptance scenarios

1. **Given** a fresh checkout, **When** the developer runs `cd apps/backlog-navigator && pnpm test:e2e:cloud`, **Then** all 12 E2E specs pass against the fixture without depending on the state of repo-root `BACKLOG.md`.
2. **Given** an analyst flips an arbitrary status in `BACKLOG.md` via the deployed navigator, **When** CI re-runs the E2E suite on a subsequent PR, **Then** the Playwright suite still passes (no test-data drift).
3. **Given** the parser's contract changes (e.g. a new column is added), **When** the developer updates the fixture to reflect the new contract, **Then** the round-trip test (Vitest) and the E2E suite both pass against the new format.
4. **Given** the fixture intentionally includes a row with a `\|`-escaped pipe in its description, **When** the parser parses it, **Then** the cell value is correctly unescaped and the round-trip restores the escape.

## Why Low complexity

- Hand-write ~10 rows of well-formed 12-column markdown — ~40 lines.
- Replace `readFileSync('../../../BACKLOG.md')` with `readFileSync('./fixtures/backlog-fixture.md')` in 4 spec files.
- Update test assertions to use known-ID + known-status — straightforward refactor of the staging step.
- Restore the test target to `approved` (the originally intended value, blocked only by the drift) — cleaner expression of intent.
- Round-trip CI gate against the live file is unchanged.

Estimate: 0.5–1 dev-day including the fixture authorship + updating the four E2E specs + verifying.

## Notes

- The existing 51 Vitest unit tests (the CI's primary correctness gate) are unaffected — they use inline fixtures or the live round-trip gate, both of which are deliberate.
- A helpful side-effect: an explicit fixture documents the parser's expected input, which is useful both for new contributors and for the navigator's documentation.
