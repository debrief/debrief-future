# Skip-Guard Proof — FR-011

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Requirement**: FR-011 — repository MUST include a CI-gated lint check that fails
when `tests/e2e/test-log-panel.spec.ts` contains any `test.skip(`, `test.fixme(`,
`test.describe.skip(`, or `test.describe.fixme(` call.

## Implementation path

Chosen: **grep-based step in the Taskfile `lint` target** (via
`scripts/check-log-panel-skip-guard.sh`).

Rationale over the ESLint `no-restricted-syntax` override path:

- The repository already wires four sibling guard scripts (`check-no-geojson-feature.sh`,
  `check-no-hand-typed-temporal-enums.sh`, `check-adr-refs.sh`,
  `check-eslint-drift-wiring.cjs`) into `task lint` via bash — matching that
  pattern keeps the guard discoverable and consistent with existing conventions.
- The ESLint path would require wiring `@typescript-eslint/parser` into the
  `tests/e2e/` tree (which is not currently linted by ESLint — only by ruff/pnpm
  at the package boundary) and adding an `overrides` block scoped to a single
  file, which is a heavier footprint than the 22-line bash script.
- The guard check is a single regex against a single file — bash + grep is the
  correct weight.

## Wiring

`Taskfile.yml` `lint` target appends:

```yaml
- bash scripts/check-log-panel-skip-guard.sh
```

Script logic:

```bash
VIOLATIONS=$(grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' "$TARGET" || true)
if [ -n "$VIOLATIONS" ]; then
  echo "❌ Log-panel skip-guard failed!"
  echo "$VIOLATIONS"
  exit 1
fi
```

## Negative test (guard fails when `.fixme` is reintroduced)

Procedure: inject a `test.fixme('temp negative-test', async () => {});` line
just after the `test.describe('Log Panel', () => {` opener, run the guard,
confirm non-zero exit, then restore.

Captured transcript:

```
--- Running skip-guard (expect FAIL) ---
❌ Log-panel skip-guard failed!

tests/e2e/test-log-panel.spec.ts must not contain test.skip, test.fixme,
test.describe.skip, or test.describe.fixme — see spec 210 FR-011.
Offending lines:

12:  test.fixme('temp negative-test', async () => {});
Got expected non-zero exit
```

Exit code: `1` (expected failure — guard caught the reintroduced `.fixme`).

## Positive test (guard passes on the clean source)

After reverting the spike, the same script was run against the cleaned-up
source file:

```
--- Running skip-guard after revert (expect PASS) ---
✅ Log-panel skip-guard passed (tests/e2e/test-log-panel.spec.ts has no skip/fixme)
```

Exit code: `0` (expected success — clean source).

## Coverage of the regex

The pattern `^\s*test(\.describe)?\.(skip|fixme)\s*\(` matches every variant
FR-011 enumerates:

| Call form                       | Matched? |
|---------------------------------|----------|
| `test.skip(...)`                | ✅ |
| `test.fixme(...)`               | ✅ |
| `test.describe.skip(...)`       | ✅ |
| `test.describe.fixme(...)`      | ✅ |

It deliberately does **not** match `.only(...)` — that is out of scope
for this requirement and is caught by the existing `pnpm lint` rules.

## User Story 2 — Independent Test Outcome

> Temporarily re-introduce `test.describe.fixme(...)` on a throwaway branch,
> run `task lint` (or `pnpm lint` depending on implementation path), confirm
> it exits non-zero with a clear error pointing at the offending file and line.

**Result**: Passes the independent test. The guard exits non-zero on
`test.fixme(` reintroduction and prints the offending line number plus the
file path (`tests/e2e/test-log-panel.spec.ts`). The transcript above
captures both halves of the round-trip.
