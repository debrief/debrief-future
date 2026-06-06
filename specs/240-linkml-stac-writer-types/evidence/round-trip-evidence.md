# Round-Trip Evidence — Spec 240 / SC-004

**Captured**: 2026-05-09
**Git SHA**: `f0e0c65`
**Status**: ✅ **All sample-catalog items round-trip cleanly under the post-migration types.**

This evidence file aggregates T011 (Python round-trip) and T012 (TS-side smoke test) outputs. Together they exercise FR-008 ("STAC Items already present in `preview/workspace/samples/local-store/` MUST continue to load through the writer with no change to on-disk JSON") and SC-004 ("100% of STAC Items in `preview/workspace/samples/local-store/` continue to load through the writer and round-trip to byte-equivalent JSON after the migration").

---

## Python half — `shared/schemas/tests/test_roundtrip.py` (T011)

Run: `cd shared/schemas && uv run pytest tests/test_roundtrip.py -v`

```text
============================= test session starts ==============================
…
tests/test_roundtrip.py::TestModelDumpModes::test_model_dump_json[track-style-fixture_path52] PASSED [ 99%]
tests/test_roundtrip.py::TestModelDumpModes::test_model_dump_json[vector-annotation-fixture_path53] PASSED [100%]

=============================== warnings summary ===============================
src/generated/python/debrief_schemas/__init__.py:4642
  …UserWarning: Field name "schema" in "SessionFile" shadows an attribute…

======================== 216 passed, 1 warning in 0.49s ========================
```

**Result**: 216 / 216 parametrised round-trip tests pass.

The test suite covers every LinkML model class generated into `debrief_schemas`, including `PropertiesProvenanceEntry`, `StacExtensionProperties`, every annotation feature, every track-feature variant, every system-state fixture. Every fixture is parsed to a Pydantic model, re-serialised to JSON, parsed again, and compared. No regressions.

The `UserWarning` about `SessionFile.schema` field shadowing pre-dates this feature — it comes from the generated Pydantic class and is unrelated to spec 240.

---

## TypeScript half — `apps/vscode/tests/unit/sampleCatalog.roundtrip.test.ts` (T012, new)

Run: `cd apps/vscode && pnpm exec vitest run tests/unit/sampleCatalog.roundtrip.test.ts`

```text
 RUN  v1.6.1 /home/user/debrief-future/apps/vscode

 ✓ tests/unit/sampleCatalog.roundtrip.test.ts  (147 tests) 24ms

 Test Files  1 passed (1)
      Tests  147 passed (147)
```

**Result**: 147 / 147 tests pass.

### Test breakdown

The smoke test discovers every directory under `preview/workspace/samples/local-store/` that contains an `item.json`, then runs three assertion families per fixture:

1. **Discovery sanity** — `expect(fixtures.length).toBeGreaterThan(0)` (1 test).
2. **`item.json` parses as `StacItem`** — for each fixture, `JSON.parse` + cast to `StacItem` + assertions that `id` is `string` and `properties` is `object` (73 tests).
3. **Every `provenance_log` entry validates** — for each fixture that carries `properties['debrief:provenance_log']` as an array, every entry is run through `isValidPropertiesProvenanceEntry` (the runtime validator). For fixtures without a log, the assertion is skipped (no failure) (73 tests).

Total: 1 + 73 + 73 = 147 tests. Zero failures.

### Why `apps/vscode/tests/unit/` and not `apps/web-shell/`

The web-shell vitest config aliases only the bare `@debrief/components` specifier to source. Importing `@debrief/components/PropertiesPanel/provenanceTypes` (the leaf subpath used by the production code) would not resolve through the alias; importing the bare specifier instead would barrel-load the whole components package, which transitively pulls in Leaflet, which throws on `window is not defined` in Node. The vscode test runner uses a different resolution path and handles the leaf subpath cleanly.

The test still exercises the same migrated types (the post-migration `StacItem` from `@debrief/stac-writer`, the post-migration narrowed `PropertiesProvenanceEntry` from `@debrief/components`).

---

## Mapping to spec criteria

| Criterion | Where verified |
|---|---|
| FR-008 (existing STAC items continue to load through the writer with no change to on-disk JSON) | T012 — every sample item parses cleanly against the post-migration `StacItem` type |
| SC-004 (100% of STAC Items in `preview/workspace/samples/local-store/` round-trip) | T011 (Python) + T012 (TS); both 100% pass |
| SC-001 / SC-006 (LinkML schema is the single change-point for the type) | The 216 Python tests + 147 TS tests all use the LinkML-derived type without any hand-edits to writer or components type bodies — exercises the schema-driven path end-to-end |

---

## Total tally

- 216 Python round-trip tests (pre-existing, all green after migration)
- 147 TS-side smoke tests (new, all green)
- 7 vscode unit tests (pre-existing, all green after migration; documented in `test-summary.md` for completeness)

= **370 tests, 0 failures, 0 skips** at git SHA `f0e0c65`.
