---
feature: "267-tolerant-playhead-import"
captured_at: "2026-05-29T10:34:31Z"
git_sha: "8f47bbc"
tests_passed: 1566
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Tolerant import for out-of-window saved playhead

Behavioural amendment to spec-261's strict-on-import rule. No schema change, no
new dependency. Counts below are the suites this feature touched/added to (the
full repo lint + typecheck + test gate is green at the captured SHA).

## Results

| Metric | Value |
|--------|-------|
| `@debrief/session-state` (vitest) | 714 passed |
| `debrief-vscode` (vitest) | 850 passed |
| web-shell E2E `playhead-clamp` (Playwright) | 2 passed |
| Schema adherence `shared/schemas` (pytest) | 1071 passed, 1 skipped, 1 xfailed |
| Lint (ruff + ESLint) | clean |
| Typecheck (pyright + tsc -r) | clean |
| Failed | 0 |

## Test Breakdown

### Foundation — `validate.ts` severity split (`__tests__/validate.test.ts`, 17 tests)

| Test | Status |
|------|--------|
| `ok` for in-window / absent / start-boundary / end-boundary `current_time` | Pass |
| `recoverable-playhead` (edge `start`) when `current_time < start_time` | Pass |
| `recoverable-playhead` (edge `end`) when `current_time > end_time` | Pass |
| single-instant window (`start == end`) clamps to the instant | Pass |
| `fatal` for `start > end` (incoherent window) | Pass |
| `fatal` precedence when incoherent window AND out-of-range `current_time` | Pass |
| `fatal` for unparseable `start_time` / `end_time` / `current_time` | Pass |

### Foundation — `read.ts` clamp + explicit return (`__tests__/read.test.ts`)

| Test | Status |
|------|--------|
| out-of-window `current_time` → no throw; `map.temporal.current_time` clamped; one diagnostic | Pass |
| clamp to window start when `current_time < start_time` (edge + original reported) | Pass |
| input FeatureCollection not mutated when clamping | Pass |
| in-window `current_time` → no clamp (byte-identical to 261) | Pass |
| `start > end` still throws `cross-field-invariant` (FR-004) | Pass |
| both defects → throws before clamp (precedence, FR-005) | Pass |
| unparseable start/end/current → throws (fatal) | Pass |
| existing read behaviours (duplicate / missing-discriminator / unknown / malformed) | Pass (unchanged) |

### Foundation — `store-bridge.ts` return (`__tests__/store-bridge.test.ts`, 3 tests)

| Test | Status |
|------|--------|
| `hydrateStoreFromFeatures` returns one diagnostic + sets store `currentTime` to edge | Pass |
| returns `[]` for an in-window (clean) plot, honours saved playhead | Pass |
| returns `[]` for a plot with no SystemState features | Pass |

### Host — VS Code (`apps/vscode/tests/unit/`)

| Test | Status |
|------|--------|
| `systemStateBridge`: orphaned playhead does NOT throw, returns a clamp; store on edge | Pass |
| `systemStateBridge`: malformed feature still throws `SystemStateLoadError` | Pass (unchanged) |
| `playheadClampNotice`: `buildPlayheadClampMessage` null for `[]`, names the edge | Pass |
| `playheadClampNotice`: shows `showWarningMessage`, NOT `showErrorMessage` (review 3A) | Pass |

### Host — web-shell E2E (`playwright/tests/playhead-clamp.spec.ts`)

| Test | Status |
|------|--------|
| US1 tolerant: orphaned playhead opens, clamps to window end, non-blocking toast | Pass |
| US2 guard: incoherent window (`start > end`) does NOT open, structured error surface | Pass |

## Key Scenarios Verified

- **Tolerant recovery (US1, SC-001/002/003):** a coherent window with an
  out-of-range `current_time` opens; the playhead lands on the nearest edge; one
  non-blocking notification fires; no dirty marker.
- **Guard rail (US2, SC-002):** incoherent window and unparseable timestamps
  still hard-fail with `cross-field-invariant`; both-defects case fails before
  any clamp (precedence).
- **Both-host parity (SC-007):** the clamp rule is single-sourced in
  `hydrateStoreFromFeatures`; VS Code and web-shell exercise the same logic.
- **No regression (SC-006):** valid plots unchanged; schema adherence suite and
  existing session-state/vscode suites pass without modification.

## Known Issues

- None. (`shared/schemas` reports 1 pre-existing skipped + 1 xfailed test,
  unrelated to this feature.)

## Environment

- Runner: vitest (unit) + pytest (schema adherence) + Playwright (web-shell E2E, bundled @sparticuz/chromium)
- Branch: claude/youthful-turing-G0O4L
- Date: 2026-05-29
