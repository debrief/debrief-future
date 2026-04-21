---
feature: "215-storyboarding-schema"
captured_at: "2026-04-20T23:25:31Z"
git_sha: "2b20a37"
tests_passed: 1762
tests_failed: 0
tests_skipped: 5
coverage_pct: null
---

# Test Summary: Storyboarding — Schema + CRUD Core

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1767 |
| Passed | 1762 (Python: 1771 incl. 1 xfailed; TypeScript: 1681) |
| Failed | 0 |
| Skipped | 5 (4 nl-cql2 fixture-recording, 1 storybook visual fixture) |
| Coverage | not collected for this feature |

(Aggregate counts include the entire monorepo. Storyboarding-specific
counts are broken out below.)

## Test Breakdown

### Python — schema adherence (`shared/schemas/tests/`)

| Suite | Tests | Status |
|-------|-------|--------|
| `test_roundtrip.py` (Pydantic round-trip) | 212 (incl. 4 storyboard) | Pass |
| `test_validation.py` (storyboard invariant negative cases) | 4 new (NonNullTimeRange / Bearing / DupTimestamp / Orphan) | Pass |
| `test_schema_compare.py` (Pydantic-vs-LinkML SC-002) | 7 new (Storyboard + Scene + Viewport schemas) | Pass |
| `test_crosslang_roundtrip.py` (Py↔TS SC-001 gate) | 4 new (2 fixtures × 2 assertions) | Pass |

### TypeScript — CRUD module (`shared/components/src/storyboard/__tests__/`)

| Suite | Tests | Status |
|-------|-------|--------|
| `dtg.test.ts` | 6 | Pass |
| `hash.test.ts` | 10 | Pass |
| `crud.test.ts` | 18 | Pass |
| `ordering.test.ts` | 3 | Pass |
| `provenance.test.ts` | 6 | Pass |
| `validate.test.ts` | 6 | Pass |
| `migration.test.ts` | 6 | Pass |
| `missing-data.test.ts` | 7 | Pass |
| `structural-sharing.test.ts` | 4 | Pass |
| `atomicity.test.ts` | 2 | Pass |
| `no-ui-imports.test.ts` | 13 | Pass |
| **Storyboard module total** | **81** | **Pass** |

## Key Scenarios Verified

- **SC-001 lossless round-trip** — Both single-Feature fixtures
  (`storyboard-single-minimal.json`, `storyboard-scene-single-minimal.json`)
  round-trip Python → JSON → TypeScript → JSON → Python with byte-equality.
  Driven by `tests/helpers/crosslang_roundtrip_node.mjs` + pytest harness.
- **SC-002 Pydantic-vs-LinkML schema equality** — Field-for-field equality
  proven by `test_storyboard_pydantic_vs_linkml_schema` over Storyboard,
  Scene, and Viewport.
- **SC-003 invariant coverage** — Every reserved-slot/cross-Feature
  invariant is exercised by both a positive (valid) and a negative
  (invalid) fixture. Negative paths test schema-layer rejection
  (bearing != 0, time_range non-null) and module-layer rejection
  (orphan, duplicate timestamp).
- **SC-005 atomicity** — `copySceneToOtherStoryboard` rejects with
  `ThumbnailDeepCopyFailed` when the consumer-supplied deep-copier
  rejects, leaving the input plot byte-identical to its pre-call state
  (deep-equal snapshot before/after).
- **SC-006 detector purity** — `detectMissingDataForScene` is asserted
  side-effect-free via deep-equal snapshots of all three inputs across
  every classification branch.
- **SC-007 migration hook** — `runPlotOpenMigrations` invokes the v1
  no-op even on plots with zero Storyboards. Chain-by-target-version
  ordering verified with stub registry. Failures wrapped in
  `SchemaMigrationFailed`.
- **SC-008 no UI coupling** — `no-ui-imports.test.ts` walks every `.ts`
  file under `src/storyboard/` (excluding `__tests__/`) and asserts
  zero static or dynamic imports of `react`, `react-dom`,
  `react-leaflet`, `leaflet`, or `vscode`. 13 module files audited.
- **SC-009 offline** — All tests run with no network; harness uses
  Node's `subtle.digest` and a local Node subprocess only.
- **FR-MODULE-022 structural sharing** — After `createStoryboard`,
  `renameStoryboard`, `createScene`, and `updateScene`, every untouched
  Feature in `plot.features` is reference-equal (`===`) to its
  counterpart in the returned plot. Verified for both schema-typed
  Storyboard/Scene Features and pass-through (TRACK) Features.
- **FR-TEST-024 perf bench** — Vitest bench at 100/1k/10k/100k synthetic
  position-report fan-out. p95 < 10ms achieved at 100k positions for
  `updateScene`; p95 ~10–20ms for `createScene` and
  `copySceneToOtherStoryboard`. See `perf-bench-results.md`.

## Known Issues

- VS Code app pre-existing lint errors (100 errors, 24 warnings) are
  outside this feature's scope — they were present on `main` before
  this branch was cut.
- 4 nl-cql2 fixture-recording tests are intentionally `.skip`'d (live
  LLM only) — pre-existing.
- Storyboarding TypeScript module emits 69 ESLint warnings (no errors).
  All warnings fall into two pre-existing patterns the codebase already
  uses elsewhere:
    - `activityId` parameter name vs `activity_id` wire field
      (LogPanel uses the same camelCase convention for in-memory inputs)
    - `as unknown as` casts where `PlotFeature` (loose) is narrowed to
      `SceneFeature`/`StoryboardFeature` (concrete). The narrowing is
      gated by the `isSceneFeature`/`isStoryboardFeature` type guards
      defined in `types.ts`.

## Environment

- Runners: pytest 9.0.2, vitest 1.6.1, Node 20+ (cross-lang harness)
- Branch: `claude/implement-speckit-215-eipwx`
- Date: 2026-04-20
