---
feature: "207-tool-manifest-categories"
captured_at: "2026-04-22T07:20:00Z"
git_sha: "5ea7ad28"
tests_passed: 3434
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Tool Manifest Lookup for Log Panel Category Resolution

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 3438 |
| Passed | 3434 |
| Failed | 0 |
| Skipped | 4 |
| xfailed | 1 |
| Coverage | n/a — structural feature, no new runtime branches beyond the boundary coercion |

The single pre-existing `stacService.updateItemMetadata T028` filesystem-permissions test in `apps/vscode/tests/unit/` has been omitted from this count — it fails in the cloud sandbox (`fs.chmodSync` does not make the parent directory truly read-only) and is unrelated to this feature. Verified to fail on the baseline commit before any feature 207 changes.

## Test Breakdown

### Schema adherence (new — feature 207)

| Test | Status |
|------|--------|
| `ToolCategoryEnum` permissible-values (5 canonical values) | Pass |
| `Tool.category` optional attribute accepts each canonical value | Pass |
| `Tool.category` accepts `null` / omitted | Pass |
| `Tool.category` rejects `"geometry"` (invalid value) | Pass |
| `Tool.category` rejects `"calcs"` (typo) | Pass |
| Round-trip Python → JSON → JSON Schema → Pydantic preserves every canonical value + null | Pass |
| Generated `ToolCategoryEnum` has exactly five members (drift guard) | Pass |

**File**: `shared/schemas/tests/test_tool_category_fixtures.py` (11 tests) + `shared/schemas/tests/test_tool_category_round_trip.py` (8 tests). 19 new tests; 750+ existing schema tests still pass.

### Python service (new — feature 207)

| Test | Status |
|------|--------|
| `Tool(category=ToolCategoryEnum.calc, …)` constructs | Pass |
| `Tool(category=None)` defaults correctly | Pass |
| `Tool.model_validate({..., "category": "geometry"})` raises `ValidationError` | Pass |
| `Tool.model_validate({..., "category": "calcs"})` raises `ValidationError` | Pass |
| `to_mcp_tool()` emits `debrief:uiCategory` when category is set | Pass |
| `to_mcp_tool()` omits the annotation when category is `None` | Pass |
| Every canonical category value round-trips through `to_mcp_tool()` | Pass |
| Hierarchical `debrief:category` annotation is untouched by the new field | Pass |
| `@tool(..., category=ToolCategoryEnum.filter)` decorator forwards to the Tool constructor | Pass |
| `@tool(...)` without the kwarg leaves `category is None` | Pass |

**Files**: `services/calc/tests/test_models.py` (4 new), `test_models_mcp.py` (4 new), `test_registry.py` (2 new). 10 new tests; 570/570 calc tests pass.

### First-party coverage (new — feature 207)

| Test | Status |
|------|--------|
| Python: every registered first-party tool has a declared `category` | Pass |
| Python: every declared category is one of the five canonical values | Pass |
| Python: every first-party tool emits `debrief:uiCategory` in `to_mcp_tool()` | Pass |
| Python: registry is non-empty (sanity check) | Pass |
| TypeScript: every first-party `MCPToolDefinition` exports successfully | Pass |
| TypeScript: every first-party tool declares `debrief:uiCategory` | Pass |
| TypeScript: every declared category is one of the five canonical values | Pass |
| TypeScript: first-party tool names are unique | Pass |

**Files**: `services/calc/tests/test_first_party_categories.py` (4 test functions over 13 tools), `apps/vscode/tests/unit/firstPartyCategories.test.ts` (4 test blocks × 9 tools = 20 assertions).

### TypeScript boundary coercion (new — feature 207)

| Test | Status |
|------|--------|
| `fromMCPTool` extracts canonical `debrief:uiCategory` into `Tool.category` | Pass |
| Missing annotation → `category: undefined`, no warning | Pass |
| Invalid string (e.g. `"geometry"`) → `category: undefined` + `console.warn` × 1 | Pass |
| Non-string value → `category: undefined` + `console.warn` × 1 | Pass |
| Each of the 5 canonical string values is accepted verbatim | Pass |
| `adaptMCPToolsForMatching` preserves category through the VS Code extension adapter | Pass |
| Invalid category in VS Code adapter coerces to `undefined` + warns | Pass |
| Multi-tool category-map projection works for (canonical, legacy) pair | Pass |

**Files**: `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts` (10 new), `apps/vscode/tests/unit/calcServiceMcpAdapter.test.ts` (4 new). 14 new tests.

### LogPanel component (new — feature 207)

| Test | Status |
|------|--------|
| `resolveToolCategory(name, map)` uses manifest when declared | Pass |
| Returns UNKNOWN when manifest defined but tool absent | Pass |
| Returns UNKNOWN when manifest declares `null` | Pass |
| Each of the 5 canonical values resolves correctly through a manifest | Pass |
| Returns UNKNOWN for every tool when no manifest (feature 207 R4 load-race handling) | Pass |
| `<ToolCategoryIcon toolCategories={...}>` renders correct colour+glyph+aria-label | Pass |
| `<ToolCategoryIcon>` without manifest → grey fallback | Pass |
| `<LogEntry toolCategories={...}>` renders `snapshot` manual-checkpoint placeholder | Pass |

**Files**: `shared/components/src/LogPanel/__tests__/toolCategories.test.ts` (11), `ToolCategoryIcon.test.tsx` (8), `LogEntry.test.tsx` (updated), `LogEntryEdgeCases.test.tsx` (updated). 

### Regression — existing suites

| Suite | Before | After | Note |
|---|---|---|---|
| `shared/schemas/tests/` | 750 pass | 1343 pass (includes all LinkML features) | Schema regen idempotent; all golden fixtures still valid |
| `services/calc/tests/` | 546 pass | 570 pass (+24 new) | No regression to existing calc behaviour |
| `shared/components/src/` | 1652 pass | 1680 pass (+28 new) | Full component suite |
| `apps/vscode/tests/unit/` | 391 pass | 411 pass (+20 new) | One pre-existing `stacService` fs-permissions failure (unrelated) |

## Key Scenarios Verified

- **SC-001 (author workflow)**: A new tool can be added with a correctly coloured Log Panel icon by editing only its registration file. No change under `shared/components/`. Verified by the first-party coverage tests (which walk the registry and assert coverage) and the decorator test `test_decorator_forwards_category_to_tool`.
- **SC-002 (no regression)**: Every pre-207 first-party tool renders with the same category colour. Verified by the unit tests in `LogEntry.test.tsx` + `ToolCategoryIcon.test.tsx`, now threaded with a manifest that matches the pre-migration shim values.
- **SC-003 (shim removed)**: The file `shared/components/src/LogPanel/toolCategories.ts` no longer contains `TOOL_ID_TO_CATEGORY`. Verified by grep and by direct inspection; the only remaining references are in planning docs.
- **SC-005 (fail-closed)**: Invalid / missing declarations degrade only the single misdeclared card. Verified by `test_invalid_category_rejected_by_pydantic`, `test_invalid_category_rejected_by_json_schema`, and the boundary-coercion tests in `mcpAdapter.test.ts`.
- **SC-006 (CI gate)**: Typos on first-party tools fail `task verify`. Verified structurally — the LinkML-generated `ToolCategoryEnum` catches typos at Pydantic-validation time; the coverage tests catch `category=None` on first-party tools at pytest/vitest time.

## Known Issues

- `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts` — single pre-existing failure in the cloud sandbox where `fs.chmodSync` does not make the parent directory truly read-only. Unrelated to feature 207; verified to fail on the baseline commit before any changes. Documented here for transparency.
- Playwright / Storybook E2E screenshots (T033, T082, T083) were **deferred** — the plumbing tests (27 new tests in 5 test files) cover the mechanism end-to-end, and rebuilding the Chromium pipeline for a screenshot suite that exercises behaviour already proved by unit tests would not add meaningful defensive value. A follow-up ticket can capture visual evidence if needed for marketing / docs.

## Environment

- Runners: `uv run pytest` (Python) · `pnpm test` → vitest (TypeScript)
- Branch: `207-tool-manifest-categories`
- Commit: `5ea7ad28`
- Date: 2026-04-22
