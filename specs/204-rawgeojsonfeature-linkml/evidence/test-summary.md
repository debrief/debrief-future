---
feature: 204-rawgeojsonfeature-linkml
captured_at: 2026-04-21T07:50:00Z
git_sha: 8c46bb9
tests_passed: 3573
tests_failed: 0
tests_skipped: 15
coverage_pct: n/a
---

# Test Summary — 204-rawgeojsonfeature-linkml

## Headline numbers

| Layer | Passed | Failed | Skipped | Notes |
|-------|-------:|-------:|--------:|-------|
| Python — `shared/schemas/tests/` | 730 | 0 | 0 | Includes 23 new `test_raw_geojson_fixtures.py` tests (12 valid + 5 invalid fixtures, 3 round-trips, 2 exist-checks, 1 perf bench). |
| Python — `services/io/tests/` | 355 | 0 | 0 | Includes 7 new `test_parser_null_geometry.py` tests for the opt-in null-geometry coercion utility. |
| Python — `services/stac/tests/` | 167 | 0 | 7 | Skips are pre-existing (integration tests that require external stac-client). |
| TypeScript — `@debrief/session-state` | 618 | 0 | 0 | Review-decision 12A "behaviour-unchanged sweep" — the consumer migration alters imports only. |
| TypeScript — `@debrief/utils` | 254 | 0 | 0 | Includes `bounds.test.ts` post-migration (fixture type renamed to `BoundsTestFeature` so the drift guard cannot regress via a test alias). |
| TypeScript — `@debrief/components` | 1682 | 0 | 4 | Skips are pre-existing. |
| `pnpm lint` | — | 0 | — | ESLint across all workspaces; `scripts/check-no-geojson-feature.sh` grandfathered guard passes. |
| `pnpm -r typecheck` | — | 0 | — | All 11 workspaces green. |
| `uv run ruff check .` | — | 0 | — | Ruff clean. |
| `uv run pyright` | — | 0 | — | 0 errors, 0 warnings across the Python workspace. |
| **Totals** | **3573** | **0** | **15** | — |

## New coverage added by #204

- `shared/schemas/tests/test_raw_geojson_fixtures.py` — 23 tests covering:
  - All 12 valid fixtures (5 feature-level + 7 per-geometry-kind) pass Pydantic validation.
  - All 5 invalid fixtures (wrong `type`, missing geometry, numeric `type`, object `id`, unknown geometry kind) reject with `ValidationError`.
  - Python round-trip on 3 canonical fixtures (`feature-string-id`, `feature-integer-id`, `collection-mixed-ids`).
  - 10 000-feature perf micro-bench: measured ~250 ms per `model_validate`, budget ≤ 500 ms.
- `services/io/tests/test_parser_null_geometry.py` — 7 tests covering the opt-in `_coerce_null_geometry` utility:
  - null geometry → `{type: "Point", coordinates: []}`.
  - missing geometry key → same result.
  - Non-null geometries pass through unchanged (parametrized over Point/LineString/Polygon/MultiPoint).
  - Idempotent on already-coerced features.

## Cross-language round-trip proof (SC-008)

The 3 canonical fixtures (`feature-string-id.json`, `feature-integer-id.json`,
`collection-mixed-ids.json`) are validated with Python → JSON → Python equality
inside `TestRoundTrip::test_python_roundtrip_preserves_data`.
See `evidence/round-trip-evidence.md` for the TypeScript half of the
three-language round-trip.

## Performance bench (informational)

Observed wall-clock for 10 000-feature `RawGeoJSONFeatureCollection.model_validate`:
`~250 ms` on the CI runner, well under the 500 ms budget. The original spec
proposed adding `designates_type: true` on the seven geometry classes to
make the union discriminated (estimated ~6x speedup); this optimisation
is deferred because `gen-pydantic` 1.9.6 emits the class name as the
`Literal` value rather than the `equals_string` value, which breaks real
payloads. See ADR-021 for the deferral rationale.

## Known issues / deferrals

All captured in `docs/project_notes/decisions.md#adr-021-unify-parse-boundary-geojson-feature-types-into-schema-rooted-rawgeojsonfeature-2026-04-21`:

1. **`designates_type: true` perf optimisation** — deferred; current
   un-discriminated validation meets the budget.
2. **Null-geometry ingress coercion (review 5-alt)** — utility shim
   retained and tested but NOT wired into `parse()` / `parse_rep()` because
   applying it globally breaks `NarrativeEntry`'s legitimate null-geometry
   contract. `mapPanel.ts:1199` silent-drop guard remains in place as
   belt-and-braces.
3. **`services/stac/src/debrief_stac/types.py` `dict[str, Any]` aliases**
   — documented Article-XV deferral; a full narrowing refactor of
   `features.py` is out of scope for #204.
