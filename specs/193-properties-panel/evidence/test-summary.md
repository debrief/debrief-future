---
feature: "193-properties-panel"
captured_at: "2026-04-17T14:26:30Z"
git_sha: "60159e0e"
tests_passed: 78
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Properties Panel for STAC Plot & Catalog Metadata

## Results

| Metric | Value |
|--------|-------|
| Total Properties-Panel tests | 78 |
| Passed | 78 |
| Failed | 0 |
| Skipped | 0 |

## Test Breakdown

### Schema (pytest — `shared/schemas/tests/`)

| Suite | Tests | Status |
|-------|-------|--------|
| `test_properties_panel_roundtrip.py` | 7 | Pass |
| `test_properties_panel_structural.py` | 6 | Pass |

Covers: LinkML additions (`debrief:overrides`, `debrief:provenance_log`, `PropertiesProvenanceEntry`), round-trip via Pydantic, structural comparison (Pydantic ↔ JSON Schema), invariant rejection (empty `fields`, bad `tool` sentinel, bad `method` prefix, bad `source`).

### Service (vitest — `apps/vscode/tests/unit/`)

| Suite | Tests | Status |
|-------|-------|--------|
| `stacService.updateItemMetadata.test.ts` | 5 | Pass |
| `stacService.atomicWrite.test.ts` | 1 | Pass |
| `stacService.provenanceRotation.test.ts` | 2 | Pass |
| `stacService.updateTemporalMetadata.test.ts` | 4 | Pass |

Covers: T024 happy path + T025 empty patch + T026 stale mtime + T028 read-only filesystem + T029 atomic write crash-safety + T030/T031 rotation + JSONL archive + T068 override skip + T069 idempotent no-op + T070 mtime stable when all overridden.

### Components (vitest — `shared/components/src/`)

| Suite | Tests | Status |
|-------|-------|--------|
| `PropertiesPanel/__test__/offlineHarness.test.ts` | 2 | Pass |
| `PropertiesPanel/schemaResolver.test.ts` | 15 | Pass |
| `PropertiesPanel/ArrayWidget.test.tsx` | 6 | Pass |
| `PropertiesPanel/DateTimeWidget.test.tsx` | 5 | Pass |
| `PropertiesPanel/BboxWidget.test.tsx` | 6 | Pass |
| `PropertiesPanel/PlatformArrayWidget.test.tsx` | 5 | Pass |
| `PropertiesPanel/PropertiesForm.test.tsx` | 11 | Pass |
| `StacBrowser/BrowserSelectionContext.test.tsx` | 3 | Pass |

Covers: T039 schema resolver branches (incl. `["string","null"]` handling + fallback), T035-T038 widget commit discipline (blur/Enter, add/remove, disabled mode), T040 PropertiesForm dispatch + chips (`auto-derived`, `override`), T073-T075 derivation chip selectors, T061 BrowserSelectionContext Provider + hook + throw-outside-Provider.

## Key Scenarios Verified

- **Atomic item.json write** — a simulated `fs.renameSync` failure after a successful temp write leaves the original `item.json` intact (T029). No partial state is observable.
- **Concurrent external edit rejected** — modifying `item.json` between read and re-stat raises `StaleItemJsonError`; the write is not attempted, no provenance entry is appended (T026).
- **Provenance rotation preserves every entry** — the 501st commit moves the oldest entry from `item.properties["debrief:provenance_log"]` into a sibling `provenance_log_archive.jsonl` (append-only JSONL, atomic). The active log stays at 500 entries (T030, T031).
- **Override respect is monotonic** — once `start_datetime` is overridden, subsequent `updateTemporalMetadata` calls skip it. The non-overridden fields (`end_datetime`, `datetime`) still derive (T068).
- **Idempotent derivation** — `updateTemporalMetadata` no-ops when all derived values already equal the current values (no mtime bump, no spurious dirty mark) (T069, T070).
- **Schema evolution** — adding a field in LinkML surfaces in the generated Pydantic + JSON Schema + TypeScript in one `make generate` invocation; the new field round-trips without code changes to the form resolver (verified by `test_properties_panel_roundtrip.py` on the current additions).

## Known Limitations (captured at 60159e0e)

- **No Playwright webview E2E (T051–T056)** — deferred. The component-level `@testing-library` coverage exercises commit discipline on the widgets; end-to-end proof of the "expand Properties → edit → persistence" flow is a follow-up.
- **No Storybook screenshots (T086)** — deferred; the stories themselves are not yet authored. Follow-up ticket.
- **Host-side hydration hook (T043)** — the `PropertiesForm` props are threaded through `ActivityPanel`, but the extension host does not yet compute `PropertiesFormField[]` from the live item.json. Running the feature end-to-end requires that wiring.
- **StacBrowser GoldenLayout integration (T062–T063)** — `BrowserSelectionProvider` + `PropertiesSidePanel` exist and are exported, but the StacBrowser GoldenLayout tree is not yet wrapped. Consumers can mount the provider explicitly.
- **Pre-existing `services/config/tests/test_core.py` + `test_integration.py` failures** are unrelated state-pollution issues in the XDG config dir. Verified to reproduce on the base branch.

## Reproduction

```sh
# From worktree root
uv run pytest shared/schemas/tests/test_properties_panel_roundtrip.py shared/schemas/tests/test_properties_panel_structural.py
cd apps/vscode && pnpm exec vitest run tests/unit/stacService.updateItemMetadata tests/unit/stacService.atomicWrite tests/unit/stacService.provenanceRotation tests/unit/stacService.updateTemporalMetadata
cd shared/components && pnpm exec vitest run src/PropertiesPanel src/StacBrowser/BrowserSelectionContext
```
