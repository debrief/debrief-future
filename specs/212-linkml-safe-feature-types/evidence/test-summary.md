---
feature: "212-linkml-safe-feature-types"
captured_at: "2026-06-01T21:12:45Z"
git_sha: "899c5ee"
tests_passed: 3438
tests_failed: 0
tests_skipped: 2
coverage_pct: null
---

# Test Summary: Replace hand-written `Safe*` GeoJSON feature types with schema-derived equivalents

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 3440 (+ 1 xfail) |
| Passed | 3438 |
| Failed | 0 |
| Skipped | 2 |
| Coverage | n/a (type-system refactor) |

Counts cover the suites that gate this change. The pre-existing,
environment-flaky `styling-tools` web-shell spec is excluded (see Known Issues).

## Test Breakdown

### TypeScript typecheck (atomic gate — `pnpm -r typecheck`)

| Check | Status |
|-------|--------|
| All 16 workspace packages `tsc --noEmit` | Pass |

### Lint + regression guard (`pnpm lint` + `scripts/check-no-geojson-feature.sh`)

| Check | Status |
|-------|--------|
| ESLint across all packages (0 errors) | Pass |
| Guard: clean run (no hand-written Safe*/GeoJSONFeature) | Pass |
| Guard: rejects a planted `interface SafeFeature {}` | Pass |

### Unit / type tests

| Suite | Tests | Status |
|-------|-------|--------|
| `@debrief/schemas` (vitest, incl. `ingress-feature.test.ts` derivation type-test) | 23 | Pass |
| `@debrief/utils` (vitest, incl. `bounds.types.test-d.ts` + MultiPolygon bounds) | 301 | Pass |
| `debrief-vscode` (vitest, incl. new stacService null-geometry + Multi*-bbox tests) | 828 | Pass |
| `@debrief/web-shell` unit (vitest, incl. `toolResponse` + `bufferZoneGenerator`) | 128 | Pass |
| Python (`uv run pytest`) | 2162 | Pass (+2 skipped, +1 xfail) |

### Web-shell E2E (behaviour-preservation regression — `node run-playwright.mjs`)

| Spec | Tests | Status |
|------|-------|--------|
| `plot-load` (loadGeoJson → IngressFeature boundary) | 6 | Pass |
| `tool-execution` (calcService result → IngressFeatureCollection → render) | 6 | Pass |

## Key Scenarios Verified

- **Derivation invariant (SC-005):** `RawGeoJSONFeature` is assignable to
  `IngressFeature`; `IngressFeature['geometry']` equals
  `RawGeoJSONFeature['geometry'] | null` — pinned by an `expectTypeOf`
  type-test so a future hand-rewrite or schema growth surfaces at `tsc`.
- **Null-geometry preservation (VR-1 / SC-004):** a `geometry: null`
  SYSTEM_RECORD feature is written (not dropped) through the migrated
  `addFeatures` → `writeGeoJson` boundary, and is excluded from the bbox.
- **Multi\* bbox correctness (VR-3):** `addFeatures` now produces a correct
  bbox for a MultiPolygon feature (the deleted `extractCoordinates` silently
  omitted Multi* geometries); verified by a dedicated unit test.
- **No schema drift (FR-009 / SC-006):** `git diff` of
  `shared/schemas/src/generated/` shows only the hand-maintained `unions.ts`
  changed; generated artefacts untouched.
- **Behaviour preservation (US4):** plot load + tool execution E2E flows render
  unchanged; result layers (carried on the schema-derived
  `IngressFeatureCollection`) display as before.
- **Regression guard (FR-007):** `check-no-geojson-feature.sh` blocks
  reintroduction of any hand-written `Safe(Feature|Geometry|FeatureCollection)`.

## Known Issues

- **`styling-tools` web-shell E2E is pre-existing flaky/failing** — not a
  regression from this change. Verified by running the *unmodified* spec
  against the pre-implementation baseline commit (`e39a87c`, `Safe*` still
  present): it fails the same selection-activation assertions there
  (6 failed / 5 passed), with a non-deterministic failure set across runs
  (4→7 failed). The spec is unchanged on this branch, and the three web-shell
  runtime files this feature touches are all in the tool-*execution* path,
  whereas the failing assertions are tool-*activation* (CSS class) checks
  gated by `selectTrackViaFeatureList` + tight 2 s timeouts. The migrated
  runtime paths are covered green by `plot-load` and `tool-execution`.
- 2 Python tests skipped + 1 xfail — pre-existing, unrelated to this feature.

## Environment

- Runner: pytest 8.x / vitest 1.6 / Playwright 1.58 (`@sparticuz/chromium`)
- Branch: `claude/speckit-implement-212-9qlKb` (feature dir resolved via `.specify/.active-feature`)
- Date: 2026-06-01
