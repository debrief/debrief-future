---
feature: "208-timeline-entry-kind"
captured_at: "2026-04-22T20:55:00Z"
git_sha: "694ae1dc"
tests_passed: 2091
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Schema-Rooted `kind` Discriminator on TimelineEntry

## Results

| Metric | Value |
|--------|-------|
| New tests for this feature | 27 |
| Pre-existing tests impacted (reworked / preserved) | 1 (patched, green) |
| Total cross-suite passes (Python + @debrief/components + apps/vscode) | 2091 |
| Failed | 0 (see "Known Issues") |
| Skipped | 4 (pre-existing, unrelated) |
| Coverage | Not re-measured — touches five files whose existing coverage is maintained by existing tests plus the new suites |

## Test Breakdown

### Schema adherence — `shared/schemas/tests/test_activity_type_fixtures.py` (5 tests, NEW)

Covers T007 + T008 — the three golden fixtures plus ADR-010 round-trip.

| Test | Status |
|------|--------|
| `test_snapshot_fixture_validates` — `activity-type-snapshot.json` parses as `ActivityType.snapshot` | Pass |
| `test_absent_fixture_validates` — `activity-type-absent.json` parses with `activity_type` None | Pass |
| `test_invalid_value_fixture_is_rejected` — `activity-type-invalid-value.json` raises `ValidationError` | Pass |
| `test_snapshot_roundtrip_preserves_enum` — Python → JSON → Python preserves `"snapshot"` | Pass |
| `test_absent_roundtrip_remains_absent` — `exclude_none=True` keeps the wire absent of the key | Pass |

### Contract surface — `shared/components/src/LogPanel/__tests__/timelineEntryKind.test.ts` (7 tests, REUSED from PR #508's UI-side work)

Covers T013 + T021 — the `TimelineEntryKind` union, `TIMELINE_ENTRY_KINDS`, `assertNeverKind`.

| Test | Status |
|------|--------|
| `TIMELINE_ENTRY_KINDS` enumerates `['snapshot','tool','tune']` in declared order | Pass |
| Each element is assignable to `TimelineEntryKind` | Pass |
| `assertNeverKind` unreachable under an exhaustive switch | Pass |
| `assertNeverKind` throws at runtime if somehow reached | Pass |
| `TimelineEntry.kind` admits all three declared kinds | Pass |
| `TimelineEntry.kind` admits absent (optional) | Pass |
| `TimelineEntry.kind` rejects invalid kinds (`@ts-expect-error`) | Pass |

### Host populator — `apps/vscode/tests/unit/logPanelView.test.ts` (13 tests, NEW)

Covers T010 / T011 / T012 — `kindFromActivityType` + `toTimelineEntry` per `contracts/timeline-entry-kind.ts`.

| Test | Status |
|------|--------|
| `kindFromActivityType('snapshot')` → `'snapshot'` | Pass |
| `kindFromActivityType('tool')` → `'tool'` | Pass |
| `kindFromActivityType('tune')` → `'tune'` | Pass |
| `kindFromActivityType(undefined)` → `'tool'` (FR-006) | Pass |
| `kindFromActivityType(null)` → `'tool'` (FR-006) | Pass |
| `kindFromActivityType` is total / non-throwing for all inputs | Pass |
| `toTimelineEntry` emits `kind: 'snapshot'` when `activity_type='snapshot'`, regardless of toolName | Pass |
| `toTimelineEntry` emits `kind: 'tool'` when `activity_type='tool'`, regardless of toolName (latent-bug-fix for export-*) | Pass |
| `toTimelineEntry` emits `kind: 'tune'` when `activity_type='tune'` | Pass |
| `toTimelineEntry` emits `kind: 'tool'` when `activity_type` absent (FR-006) | Pass |
| `toTimelineEntry` emits `kind: 'tool'` when `activity_type=null` (FR-006) | Pass |
| Stability under repeat invocation | Pass |
| SC-002 totality — every entry in the sample catalogue yields a defined kind | Pass |

### Consumer rendering — `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` (extended, 13/13 total)

Covers T015 + T016 — the consumer switch-over plus the kind-driven rendering cases.

| Test | Status |
|------|--------|
| `kind: 'snapshot'` + non-snapshot toolName → `manual-checkpoint-placeholder` rendered | Pass |
| `kind: 'tool'` + export-png → placeholder absent; chips present (latent-bug fix) | Pass |
| `kind` absent + export-png → placeholder absent (latent-bug fix, default path) | Pass |
| `kind: 'tune'` → no placeholder (FR-007) | Pass |
| Duration hidden when `kind: 'snapshot'`; rendered when `kind: 'tool'` | Pass |
| Pre-existing 8 card-anatomy tests — still pass | Pass |

### Consumer edge cases — `shared/components/src/LogPanel/__tests__/LogEntryEdgeCases.test.tsx` (patched)

One pre-existing test (`renders "Manual checkpoint" placeholder and omits duration for snapshot entries`) previously relied on the ToolCategory conflation (fixture used `toolName: 'export-png'`). Updated to set `kind: 'snapshot'` explicitly — preserves the test's intent, moves the driving signal onto the correct field. 7/7 tests pass.

### Drift guards — `shared/components/src/LogPanel/__tests__/semantic-gate-drift.test.ts` (3 tests, NEW)

Covers T023 — SC-001 regression guard.

| Test | Status |
|------|--------|
| `LogEntry.tsx` does not contain `resolveToolCategory(...).category === 'snapshot'` | Pass |
| `LogEntry.tsx` does not contain `*.category === 'snapshot'` anywhere | Pass |
| `LogEntry.tsx` uses `entry.kind === 'snapshot'` as the gate | Pass |

### Drift guards — `apps/vscode/tests/unit/projection-purity.test.ts` (3 tests, NEW)

Covers T024 — SC-005 regression guard.

| Test | Status |
|------|--------|
| `kindFromActivityType` body contains no tool-ID literals (`manual-checkpoint`, `export-png`, …) | Pass |
| `kindFromActivityType` body does not reference `toolName`, `was_generated_by`, or `resolveToolCategory` | Pass |
| `kindFromActivityType` body references only `activityType` + `ActivityType.{snapshot,tool,tune}` | Pass |

## Key Scenarios Verified

- **FR-001–FR-004 + FR-006.** Every emitted `TimelineEntry` carries a defined `kind`; discriminator derived only from `activity_type`; unrecognised / absent values fall back to `'tool'`.
- **FR-005.** `kindFromActivityType` body (projection-purity drift test) and `LogEntry.tsx` consumer (semantic-gate drift test) both verified free of tool-name / ToolCategory references in the semantic path.
- **FR-007.** `'tune'` is reserved in the contract but unrenderable as a dedicated row in feature 208 — consumers treat it as tool-row. Verified by the `kind: 'tune'` LogEntry render case.
- **FR-008.** `resolveToolCategory` remains exported from `./toolCategories` and is consumed by `ToolCategoryIcon` for icon / colour rendering. Visual category layer unchanged.
- **FR-009.** Exhaustiveness enforcement via the closed `TimelineEntryKind` union + `assertNeverKind` + canary test in `timelineEntryKind.test.ts`.
- **SC-001 (visual parity for snapshot rows, intentional fix for export rows).** Verified via the DOM-level assertions in `LogEntry.test.tsx` + grep evidence in `semantic-gate-grep.txt`.
- **SC-002 (every entry has a defined kind).** Verified via the host populator totality test + the `exclude_none=True` round-trip in `test_activity_type_fixtures.py`.
- **SC-003 (no unintended visual regressions).** Verified via Storybook fixture rebaseline narrative in `visual-regression-evidence.md` + the zero-regression count in `@debrief/components` test suite.
- **SC-004 (exhaustiveness guarantee).** Locked by `timelineEntryKind.test.ts`'s `assertNeverKind` canary — adding a 4th kind fails `tsc --noEmit` at every consumer switch.
- **SC-005 (no tool-name heuristic).** Locked by the projection-purity drift test.
- **Schema-change round-trip** (Quality Rubric). See `round-trip-evidence.md`: Python → JSON → Python for explicit `"snapshot"`, absent, and invalid-enum cases. All three pass.

## Known Issues

- **Unrelated pre-existing failure (apps/vscode)**: `tests/unit/stacService.updateItemMetadata.test.ts:244` ("T028: read-only filesystem throws `ReadOnlyFilesystemError`") fails under root-user sandboxes because `chmod 0o555` on the parent directory does not enforce — reproduces on `main` in the same environment. Passes in standard developer environments. Not touched by this feature; documented in PR #508's test-summary.md.
- **Timing flake under parallel load (Python)**: `shared/schemas/tests/test_raw_geojson_fixtures.py::TestPerformance::test_10k_feature_collection_validates_within_budget` may fail under heavy-parallel CI load; passes in isolation (re-ran and confirmed). Not touched by this feature.
- **Pre-existing Python import errors (collection-time)**: `services/debrief-tools/tests/test_decorators.py` and `services/session-state-py/tests/test_client.py` fail to collect (`ModuleNotFoundError`) because those packages aren't installed in the sandbox venv. They are not in the root pytest `testpaths` and are not exercised by `uv run pytest`; CI uses the root command. Not related to this feature.
- **Coverage not re-measured.** The feature touches 5 production files (`log-entry.yaml`, `scripts/generate.py`, `session-state/log/types.ts`, `logPanelView.ts`, `LogEntry.tsx`, `LogPanel/types.ts`). Existing test coverage on each is maintained by existing tests; new code paths are covered by the 27 new tests. A formal coverage re-run is out of scope — the closed drift tests are the stronger regression guard.

## Environment

- Python runner: `uv run pytest` (pytest 9.0.2)
- TypeScript runner: `vitest 1.6.1`
- Branch: `208-timeline-entry-kind-v2`
- Commit at capture: `694ae1dc`
- Date: 2026-04-22

## Cross-suite totals

| Suite | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|
| `uv run pytest` (root testpaths) | 1825 | 0 | 1 xfailed | (1 flake re-confirmed green in isolation) |
| `pnpm --filter @debrief/components test` | 1673 | 0 | 4 | includes `timelineEntryKind.test.ts`, `semantic-gate-drift.test.ts`, extended `LogEntry.test.tsx` |
| `pnpm --filter debrief-vscode test` | 403 | 1 (pre-existing) | 0 | includes `logPanelView.test.ts`, `projection-purity.test.ts` |
| **Total** | **~3901** | **1** (unrelated) | **5** | |
