# Tasks: Tool Manifest Lookup for Log Panel Category Resolution

**Input**: Design documents from `/specs/207-tool-manifest-categories/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included per Constitution Article VI (all service code requires unit tests, schema changes require adherence tests) and Article VII (tests define "done" for AI-assisted work).

**Organization**: Tasks are grouped by user story. Foundational plumbing lands first; each user story is then independently testable. The two-commit migration from research R6 maps onto phases: Phase 2 + US1/US2/US4 sit on Commit A (additive); US3 is Commit B (retire the shim).

---

## Evidence Requirements

**Evidence Directory**: `specs/207-tool-manifest-categories/evidence/`
**Media Directory**: `specs/207-tool-manifest-categories/media/`

### Planned Artifacts

| Artifact | Feature-type match | Description | Captured when |
|---|---|---|---|
| `test-summary.md` | REQUIRED (all features) | Aggregated pytest + vitest + Playwright counts; uses front-matter template | After full suite passes post-US3 + US4 |
| `usage-example.md` | REQUIRED (all features) | Concrete "declare a category, see the icon" demo — Python + TypeScript snippets + rendered screenshot | After US1 green |
| `round-trip-evidence.md` | Schema Change | LinkML `ToolCategoryEnum` round-trips: Python → JSON → TypeScript → JSON → Python with identity preserved | After Phase 2 generator run |
| `screenshots/logpanel-manifest-light.png` | UI Component | Log Panel with manifest-fed categories, light theme | After US3 green |
| `screenshots/logpanel-manifest-dark.png` | UI Component | Log Panel with manifest-fed categories, dark theme | After US3 green |
| `screenshots/logpanel-manifest-vscode.png` | UI Component | Log Panel with manifest-fed categories, VS Code theme | After US3 green |
| `screenshots/interaction.gif` | UI Component | GIF showing a new tool's log entry appearing with correct colour (< 5 s, < 2 MB) | After US1 green |
| `e2e-summary.md` | Integration | Playwright + VS Code webview E2E pass/fail rollup | After Polish E2E run |
| `manifest-sample.json` | Integration | Captured `tools/list` MCP response showing `debrief:uiCategory` in the wild | After US1 green |
| `invalid-category-coercion.md` | Integration | Transcript showing an invalid value being coerced to `null` + warning logged | After US4 green |

### Media Content

| Artifact | Description | Created when |
|---|---|---|
| `media/planning-post.md` | Planning Post (momentum track) | During `/speckit.plan` — **already created** |
| `media/linkedin-planning.md` | LinkedIn planning summary | During `/speckit.plan` — **already created** |
| `media/shipped-post.md` | Shipped Post (credibility track) | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | Polish phase |

### PR Creation

| Action | Description | Created when |
|---|---|---|
| Feature PR | PR in `debrief-future` with evidence + media + `/speckit.pr` description | Final task |
| Blog PR | Cross-repo PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Create the evidence scaffold and confirm the branch + feature directory are ready. No new packages, no new lint configs — all toolchain is already established.

- [x] T001 Create evidence directory `specs/207-tool-manifest-categories/evidence/`
- [x] T002 [P] Create evidence screenshots directory `specs/207-tool-manifest-categories/evidence/screenshots/`
- [x] T003 [P] Confirm working on branch `207-tool-manifest-categories` (run `git branch --show-current`; fail if not) `N/A — shell check`
- [x] T004 [P] Confirm CLAUDE.md `Recent Changes` reflects this feature (already updated by `/speckit.plan`) `CLAUDE.md`

**Checkpoint**: Evidence scaffold exists, branch is correct. Proceed to Foundation.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Land the schema + generated types + wire-format contract + delivery plumbing — additively, without retiring the static shim. Every user story below depends on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. At the end of this phase, the static `TOOL_ID_TO_CATEGORY` map is still in place and still the authoritative source — the manifest path is a *parallel* resolution route that returns the same answer for the 16 tools currently in the map.

### Schema (LinkML source of truth)

- [x] T005 [test] Write golden fixtures for `ToolCategoryEnum` — valid (`import`, `style`, `calc`, `filter`, `snapshot`, null, absent) and invalid (`geometry`, `calcs`, empty string) `shared/schemas/fixtures/tool/{valid,invalid}/*.json`
- [x] T006 [test] Write schema-adherence test asserting `ToolCategoryEnum` accepts only the five canonical values + null `shared/schemas/tests/test_tool_category_fixtures.py`
- [x] T007 Add `ToolCategoryEnum` (five `permissible_values`) and `Tool.category` attribute (optional, range `ToolCategoryEnum`) to `shared/schemas/src/linkml/tool.yaml` — T005/T006 tests must go from red → green `shared/schemas/src/linkml/tool.yaml`
- [x] T008 [P][test] Write round-trip evidence test: Python Pydantic → JSON → JSON-Schema validation → Pydantic preserves category value for each of the five values + null `shared/schemas/tests/test_tool_category_round_trip.py`
- [x] T009 Regenerate all derived artefacts (`make generate`) so `debrief_schemas.ToolCategoryEnum` and TS `ToolCategoryEnum` exist `shared/schemas/src/generated/python/debrief_schemas/__init__.py`, `shared/schemas/src/generated/typescript/types.ts`, `shared/schemas/src/generated/json-schema/Tool.schema.json`
- [x] T010 [test] Verify generated Python `ToolCategoryEnum` is a `str, Enum` with exactly five members (one per canonical value); TypeScript compiles clean (`pnpm exec tsc --noEmit --project src/generated/typescript/tsconfig.json`) `N/A — verification only`

### Python service — tool model + registry

- [ ] T011 [test] Write test: `Tool(category=ToolCategory.CALC, …)` constructs successfully; `Tool(category="geometry", …)` raises `ValidationError` `services/calc/tests/test_models.py`
- [ ] T012 [test] Write test: `Tool.to_mcp_tool()` emits `annotations["debrief:uiCategory"] == "calc"` when `category=ToolCategory.CALC`, and omits the key entirely when `category is None` `services/calc/tests/test_models_mcp.py`
- [ ] T013 Add `category: ToolCategory | None = None` field to the Pydantic `Tool` class in `services/calc/debrief_calc/models.py`; extend `to_mcp_tool()` to emit `debrief:uiCategory` when set (see `contracts/mcp-annotations.md`) — T011/T012 go red → green `services/calc/debrief_calc/models.py`
- [ ] T014 Extend the `@tool(…)` decorator in `services/calc/debrief_calc/registry.py` to accept `category: ToolCategory | None = None` and forward it to the `Tool` constructor `services/calc/debrief_calc/registry.py`
- [ ] T015 [test] Write decorator test: `@tool(name=…, category=ToolCategory.FILTER, …)` registers a `Tool` whose `category` is `ToolCategory.FILTER` `services/calc/tests/test_registry.py`

### TypeScript — MCP annotation type + adapter boundary

- [ ] T016 Add optional `'debrief:uiCategory'?: ToolCategory` field to the `annotations` shape in `shared/utils/src/mcp-types.ts` (import `ToolCategory` from `@debrief/schemas`) `shared/utils/src/mcp-types.ts`
- [ ] T017 [test] Write adapter tests: `mcpAdapter` extracts `'debrief:uiCategory': 'style'` → `{ category: 'style' }`; missing key → `{ category: null }`; invalid string → `{ category: null }` + `console.warn` called once `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts`
- [ ] T018 Extend `adaptMCPToolsForMatching` (and the legacy-fallback path in `calcService`) to parse `debrief:uiCategory` through a whitelist of the five canonical values; coerce non-matching to `null` with a dev-visible `console.warn` — T017 goes red → green `shared/components/src/ToolMatch/mcpAdapter.ts`, `apps/vscode/src/services/calcService.ts`

### Webview message + extension host delivery

- [ ] T019 Add `ToolsManifestMessage` (`type: 'tools:manifest'`, payload `{ categories: Readonly<Record<string, ToolCategory | null>> }`) to the extension→webview union in `apps/vscode/src/webview/logPanelMessages.ts` `apps/vscode/src/webview/logPanelMessages.ts`
- [ ] T020 [test] Write test: `calcService.getToolCategoryMap()` returns `Record<toolId, ToolCategory | null>` derived from the cached tools list `apps/vscode/src/services/__tests__/calcService.test.ts`
- [ ] T021 Add `getToolCategoryMap(): ToolCategoryMap` helper on `calcService.ts` that walks the cached `listTools()` result and projects the category field `apps/vscode/src/services/calcService.ts`
- [ ] T022 Push a `tools:manifest` message to the webview from the LogPanel provider on session start + whenever `listTools()` cache refreshes `apps/vscode/src/panels/logPanelProvider.ts`
- [ ] T023 [test] Write test: webview reducer stores manifest on `tools:manifest` receive; starts as `undefined` `apps/vscode/src/webview/web/__tests__/logPanel.test.tsx`
- [ ] T024 Handle `tools:manifest` in `apps/vscode/src/webview/web/logPanel.tsx`: store in local state, pass to `<LogPanel toolCategories={…} />` — T023 goes red → green `apps/vscode/src/webview/web/logPanel.tsx`

### LogPanel component — accept manifest map (static shim still in place)

- [ ] T025 [P][test] Write unit test for `resolveToolCategory(name, map)`: with map present → returns manifest value; with map undefined → falls back to current static behaviour; with map defined but tool absent → grey fallback `shared/components/src/LogPanel/__tests__/toolCategories.test.ts`
- [ ] T026 Extend `resolveToolCategory` in `shared/components/src/LogPanel/toolCategories.ts` to accept an optional `categories` map argument; when provided and the tool has a category, use that; otherwise fall back to the current static path. **Keep `TOOL_ID_TO_CATEGORY` for now** — removal happens in US3 `shared/components/src/LogPanel/toolCategories.ts`
- [ ] T027 Add optional `toolCategories?: Readonly<Record<string, ToolCategory | null>>` to `LogPanelProps` + `ToolCategoryIconProps` in `shared/components/src/LogPanel/types.ts` `shared/components/src/LogPanel/types.ts`
- [ ] T028 Thread `toolCategories` through `LogPanel` → `LogTimeline`/`LogByFeature` → `LogEntry` → `ToolCategoryIcon` (passing the map down; no lookups outside `ToolCategoryIcon` + the `snapshot` check in `LogEntry`) `shared/components/src/LogPanel/LogPanel.tsx`, `shared/components/src/LogPanel/LogEntry.tsx`, `shared/components/src/LogPanel/ToolCategoryIcon.tsx`

### Parallel execution example for Phase 2

```bash
# After schema tests (T005–T010) are red, run LinkML edits + regen serially (T007 → T009),
# then launch the independent parallel tracks:
Task: "T011 Pydantic Tool model test"      # Python track
Task: "T017 mcpAdapter test"                # TypeScript boundary track
Task: "T023 webview reducer test"           # Webview track
Task: "T025 resolveToolCategory test"       # Component track

# And the implementation tracks (after their respective red tests):
Task: "T013 Add category to Tool model"     # Python
Task: "T018 Parse debrief:uiCategory"       # TypeScript boundary
Task: "T024 Handle tools:manifest"          # Webview
Task: "T026 Extend resolveToolCategory"     # Component
```

**Checkpoint**: Plumbing end-to-end. A `Tool(category=ToolCategory.CALC)` declared in Python flows through MCP → extension → webview → LogPanel prop → `resolveToolCategory`. Static shim still provides the answer for the 16 listed tools. No visible UI change.

---

## Phase 3: User Story 1 — New tools get correct icon colour (P1)

**Goal**: A tool author adds a new tool declaring a `category` at the registration site; the Log Panel renders the card icon with the declared colour without any edit under `shared/components/`.

**Independent Test**: Register a new calc tool `__test-tool-filter` with `category=ToolCategory.FILTER` behind a test-only registration path; create a synthetic log entry for it; assert the rendered `ToolCategoryIcon` uses the `filter` background colour (`#fff7ed`) and glyph (`⧖`). Diff-check that no file in `shared/components/src/LogPanel/` was modified between the tool-registration commit and the render assertion.

### Tests for User Story 1 (P1)

- [ ] T029 [P][test] [US1] Write Python end-to-end test: register a throwaway tool with `category=ToolCategory.FILTER`, invoke `registry.list_all()[…].to_mcp_tool()`, assert `annotations["debrief:uiCategory"] == "filter"` `services/calc/tests/test_first_party_categories.py`
- [ ] T030 [P][test] [US1] Write component test: render `<LogPanel entries={[…]} toolCategories={{'demo-filter': 'filter'}} />` and assert the `ToolCategoryIcon` for a `demo-filter` entry has the `filter` background style `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`
- [ ] T031 [P][test] [US1] Write webview integration test: push `{type: 'tools:manifest', payload: {categories: {'demo-filter': 'filter'}}}`, then `{type: 'timeline:update', payload: {entries: […demo-filter…]}}`, and assert the rendered DOM has the `filter` class on the icon `apps/vscode/src/webview/web/__tests__/logPanel.test.tsx`

### E2E Tests for User Story 1 (REQUIRED for UI components) 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T032 [P][US1] Add a new `ManifestCategories` story to `LogPanel.stories.tsx` showing five cards (one per category, fed from a fixture `toolCategories` map) plus a sixth card with an unknown tool name to demonstrate grey fallback `shared/components/src/LogPanel/LogPanel.stories.tsx`
- [ ] T033 [P][test][US1] Create Playwright test for the new story across `light`, `dark`, `vscode` themes asserting the computed background colour of each icon matches the expected SRD value `shared/components/e2e/LogPanel.manifest-categories.spec.ts`
- [ ] T034 [US1] Run component E2E: `pnpm --filter @debrief/components test:e2e LogPanel.manifest-categories` `N/A — shell run`

### Implementation for User Story 1

- [ ] T035 [US1] Add a minimal "hello-world" test-only tool demonstrating the author workflow: declare `category=ToolCategory.FILTER` in a Python tool file under a test-gated path; confirm its category flows through `to_mcp_tool()` `services/calc/debrief_calc/tools/_test_fixtures/filter_hello.py`
- [ ] T036 [US1] Mirror with a TypeScript example: add a test-only VS Code tool file declaring `'debrief:uiCategory': 'filter'` and confirm the adapter extracts it `apps/vscode/src/tools/_test_fixtures/filterHello.ts`
- [ ] T037 [US1] Verify SC-001 acceptance: the author's diff for the new tool touches exactly one file (the tool file itself) and zero files under `shared/components/src/LogPanel/` — document the diff in evidence `specs/207-tool-manifest-categories/evidence/usage-example.md`

**Checkpoint**: US1 acceptance green. Authors can add new tools and see coloured icons with zero LogPanel-source edits.

---

## Phase 4: User Story 2 — Contrib / third-party tools get coloured icons (P1)

**Goal**: An operator adds a tool via the contrib registration path. The Log Panel renders the card icon with the declared colour identically to first-party tools, with no PR to `shared/components/` and no explicit registration in upstream code.

**Independent Test**: Register a fixture contrib tool `contrib-acme-importer` with `category=ToolCategory.IMPORT` via the contrib-registration entry point; feed a log entry for that tool through the standard pipeline; assert the rendered icon matches the `import` colour (`#dbeafe`) and glyph (`⬇`).

### Tests for User Story 2 (P1)

- [ ] T038 [P][test][US2] Write test: a contrib-registered tool (registered by calling `registry.register(Tool(…))` directly — emulating the contrib load path) appears in `list_all()` and its category is preserved in `to_mcp_tool()` `services/calc/tests/test_contrib_registration.py`
- [ ] T039 [P][test][US2] Write test: a contrib tool with `category=None` still registers successfully and its `to_mcp_tool()` omits the `debrief:uiCategory` key (contrib tools MAY omit category per spec A3) `services/calc/tests/test_contrib_registration.py`
- [ ] T040 [P][test][US2] Write component test: fixture contrib tool's entry renders correctly when included in `toolCategories` map `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`

### Implementation for User Story 2

- [ ] T041 [US2] Add a contrib-fixture tool file under a test-only path demonstrating the contrib registration shape (Python `Tool(...)` constructor + explicit `registry.register(…)`, not the `@tool` decorator) `services/calc/tests/fixtures/contrib_acme_importer.py`
- [ ] T042 [US2] Document the contrib contract in `quickstart.md` — confirm the "Contrib / third-party tools" section is accurate post-implementation; add note about `None` category behaviour if not already covered `specs/207-tool-manifest-categories/quickstart.md`
- [ ] T043 [US2] Verify SC-004 acceptance: the contrib fixture's diff touches only files under `services/calc/tests/fixtures/` and zero files under `shared/components/` — capture in evidence `specs/207-tool-manifest-categories/evidence/contrib-workflow.md`

**Checkpoint**: US2 acceptance green. Contrib tools can declare categories via the standard registration path with no upstream edits required.

---

## Phase 5: User Story 3 — No regression for existing first-party tools (P1) — Commit B

**Goal**: All existing first-party tools render with their expected category colours after the static `TOOL_ID_TO_CATEGORY` map is deleted. Analysts see no visual change for the tools they already use.

**Independent Test**: Freeze a baseline render (Storybook + VS Code webview fixture) against the end of Phase 2 (static shim still in place). Apply Phase 5 changes. Compare icon-by-icon — every previously-coloured icon remains the same colour.

### Baseline capture (before changes)

- [ ] T044 [US3] Capture baseline Storybook screenshot for the existing `LogPanel` "Recent Log Entries" story at current HEAD (post-Phase 2, static shim still authoritative) — three themes `specs/207-tool-manifest-categories/evidence/screenshots/baseline-light.png`, `baseline-dark.png`, `baseline-vscode.png`
- [ ] T045 [US3] Save `git rev-parse HEAD` to baseline marker `specs/207-tool-manifest-categories/evidence/baseline-sha.txt`

### Migrate existing Python tools (calc)

- [ ] T046 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/track_stats.py` `services/calc/debrief_calc/tools/track_stats.py`
- [ ] T047 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/range_bearing.py` `services/calc/debrief_calc/tools/range_bearing.py`
- [ ] T048 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/area_summary.py` `services/calc/debrief_calc/tools/area_summary.py`
- [ ] T049 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/reference/classification.py` and `generation.py` `services/calc/debrief_calc/tools/reference/classification.py`, `services/calc/debrief_calc/tools/reference/generation.py`
- [ ] T050 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py` `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [ ] T051 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/shape/manipulation/enlarge_shape.py` and `move_shape.py` (mirrors existing `move-track` mapping `calc`) `services/calc/debrief_calc/tools/shape/manipulation/enlarge_shape.py`, `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T052 [P][US3] Declare `category=ToolCategory.CALC` on `services/calc/debrief_calc/tools/track/manipulation/generate_courses_speeds.py` (mirrors existing `course-speed-from-positions` mapping `calc`) `services/calc/debrief_calc/tools/track/manipulation/generate_courses_speeds.py`
- [ ] T053 [P][US3] Declare `category=ToolCategory.STYLE` on all four tools in `services/calc/debrief_calc/tools/track/styling/` (`apply_symbol_style.py`, `label_interval.py`, `set_track_color.py`, `symbol_interval.py`) `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`, etc.

### Migrate existing TypeScript tools (VS Code extension)

- [ ] T054 [P][US3] Declare `'debrief:uiCategory': 'calc'` on `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts` `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts`
- [ ] T055 [P][US3] Declare `'debrief:uiCategory': 'calc'` on `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts` `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts`
- [ ] T056 [P][US3] Declare `'debrief:uiCategory': 'calc'` on `apps/vscode/src/tools/shape/manipulation/enlargeShape.ts` and `moveShape.ts` `apps/vscode/src/tools/shape/manipulation/enlargeShape.ts`, `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T057 [P][US3] Declare `'debrief:uiCategory': 'calc'` on `apps/vscode/src/tools/track/manipulation/generateCoursesSpeeds.ts` `apps/vscode/src/tools/track/manipulation/generateCoursesSpeeds.ts`
- [ ] T058 [P][US3] Declare `'debrief:uiCategory': 'style'` on all four `apps/vscode/src/tools/track/styling/*.ts` (`applySymbolStyle`, `labelInterval`, `setTrackColor`, `symbolInterval`) `apps/vscode/src/tools/track/styling/applySymbolStyle.ts`, etc.

### First-party coverage tests (gate for regressions)

- [ ] T059 [test][US3] Write Python test that iterates `registry.list_all()` and asserts every tool has `tool.category is not None` — excluding test fixtures under `_test_fixtures/` `services/calc/tests/test_first_party_categories.py`
- [ ] T060 [test][US3] Write TypeScript test that imports every exported `MCPToolDefinition` from `apps/vscode/src/tools/` (excluding `_test_fixtures/`) and asserts each has `annotations['debrief:uiCategory']` set to a canonical value `apps/vscode/src/tools/__tests__/first-party-categories.test.ts`
- [ ] T061 [US3] Run `task verify` locally — lint, typecheck, all tests green `N/A — shell run`

### Retire the static shim

- [ ] T062 [US3] Delete `TOOL_ID_TO_CATEGORY` constant from `shared/components/src/LogPanel/toolCategories.ts`; simplify `resolveToolCategory` to consult only the passed-in map (argument becomes required — or keep optional with grey fallback when absent) `shared/components/src/LogPanel/toolCategories.ts`
- [ ] T063 [US3] Search the codebase for any remaining references to `TOOL_ID_TO_CATEGORY` and verify none exist (`grep -rn "TOOL_ID_TO_CATEGORY" /home/user/debrief-future/`); update any tests that imported the constant `N/A — verification + cleanup`
- [ ] T064 [test][US3] Update `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` test `uses resolveToolCategory icon for all 5 categories` — now passes a `toolCategories` prop instead of relying on the static map `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`
- [ ] T065 [test][US3] Update `shared/components/src/LogPanel/__tests__/ToolCategoryIcon.test.tsx` similarly `shared/components/src/LogPanel/__tests__/ToolCategoryIcon.test.tsx`

### Regression verification (after Commit B)

- [ ] T066 [US3] Re-capture Storybook screenshots for the existing `LogPanel` "Recent Log Entries" story post-Commit B, three themes `specs/207-tool-manifest-categories/evidence/screenshots/post-commit-b-light.png`, `post-commit-b-dark.png`, `post-commit-b-vscode.png`
- [ ] T067 [US3] Visual-diff baseline vs post-Commit B screenshots; document the diff (expect: identical for tools previously in the static map; some previously-grey tools now coloured) `specs/207-tool-manifest-categories/evidence/regression-diff.md`

**Checkpoint**: US3 acceptance green. Static shim retired, no visible regression for tools previously hand-listed, new Python + TS tools land correctly. **This is Commit B.**

---

## Phase 6: User Story 4 — Invalid / unknown category values fail closed (P2)

**Goal**: A typo or bespoke value in one tool's manifest declaration does not crash the Log Panel, does not masquerade as a known category, and is surfaced to developers. The misdeclared tool's card falls back to grey while siblings render correctly.

**Independent Test**: Inject a synthetic tool-manifest entry with an invalid category value (e.g. `"category": "geometry"`). Verify: (a) the card renders with grey fallback; (b) other cards are unaffected; (c) a developer-visible warning is logged at the extension→webview boundary; (d) `task verify` catches the misdeclaration when made on a first-party tool.

### Tests for User Story 4 (P2)

- [ ] T068 [P][test][US4] Write boundary test: `mcpAdapter` receives `'debrief:uiCategory': 'geometry'`, coerces to `null`, calls `console.warn` exactly once with a message naming the tool and the invalid value (extends T017 coverage) `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts`
- [ ] T069 [P][test][US4] Write component test: `<ToolCategoryIcon toolName="broken" toolCategories={{ 'broken': null }} />` renders the grey fallback icon `shared/components/src/LogPanel/__tests__/ToolCategoryIcon.test.tsx`
- [ ] T070 [P][test][US4] Write integration test: a `tools:manifest` payload containing one valid + one invalid category renders both cards correctly (coloured + grey) without crashing `apps/vscode/src/webview/web/__tests__/logPanel.test.tsx`
- [ ] T071 [P][test][US4] Write Python test: constructing `Tool(category="geometry", …)` raises `ValidationError` pointing at the `category` field `services/calc/tests/test_models.py`
- [ ] T072 [P][test][US4] Write TypeScript typecheck fixture: a tool file declaring `'debrief:uiCategory': 'geometry'` fails `pnpm typecheck`; document expected compiler error in a `.expected` fixture for manual verification `apps/vscode/src/tools/__tests__/fixtures/invalid-category.ts.expected`

### Implementation for User Story 4

- [ ] T073 [US4] Confirm `adaptMCPToolsForMatching` boundary coercion landed in Phase 2 (T018) covers the US4 scenario; if the warning message is missing the tool name or invalid value, upgrade it `shared/components/src/ToolMatch/mcpAdapter.ts`
- [ ] T074 [US4] Document the fail-closed behaviour in evidence — capture a transcript of the warning + grey render `specs/207-tool-manifest-categories/evidence/invalid-category-coercion.md`

**Checkpoint**: US4 acceptance green. Bad manifest data degrades one card, not the panel; misdeclarations on first-party tools fail `task verify`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, cross-cutting tests, documentation, media, PR creation. Final phase before merge.

### Quickstart validation

- [ ] T075 [P] Re-read `specs/207-tool-manifest-categories/quickstart.md` end-to-end against the delivered code; correct any drift between the author instructions and actual APIs `specs/207-tool-manifest-categories/quickstart.md`
- [ ] T076 Run `task verify` (the project's CI gate: lint + typecheck + unit tests + E2E) and confirm green on this branch `N/A — shell run`

### Evidence Collection (REQUIRED)

- [ ] T077 Capture test summary using template `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/207-tool-manifest-categories/evidence/test-summary.md`
- [ ] T078 Record usage demonstration: Python `@tool(category=…)` snippet + TypeScript `'debrief:uiCategory': …` snippet + rendered screenshot side-by-side `specs/207-tool-manifest-categories/evidence/usage-example.md`
- [ ] T079 [P] Capture round-trip evidence: run the schema round-trip harness (Python → JSON → TS → JSON → Python) for each of the five category values + null, record inputs/outputs `specs/207-tool-manifest-categories/evidence/round-trip-evidence.md`
- [ ] T080 [P] Capture `tools/list` MCP response after migration showing `debrief:uiCategory` populated on every first-party tool (truncate to representative sample, annotate) `specs/207-tool-manifest-categories/evidence/manifest-sample.json`

### E2E Evidence Collection (REQUIRED for UI components) 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T081 Run full component E2E: `pnpm --filter @debrief/components test:e2e` and capture console output `specs/207-tool-manifest-categories/evidence/e2e-output.txt`
- [ ] T082 [P] Capture theme screenshots from the new `ManifestCategories` Storybook story — `light`, `dark`, `vscode` `specs/207-tool-manifest-categories/evidence/screenshots/logpanel-manifest-light.png`, `logpanel-manifest-dark.png`, `logpanel-manifest-vscode.png`
- [ ] T083 [P] Capture interaction GIF (< 5 s, < 2 MB) showing a newly-declared tool's log entry appearing with the correct category colour — use Playwright `recordVideo` then convert to GIF `specs/207-tool-manifest-categories/evidence/screenshots/interaction.gif`
- [ ] T084 Document E2E results in rollup summary (component + webview suites) `specs/207-tool-manifest-categories/evidence/e2e-summary.md`

### VS Code Webview E2E Evidence Collection (REQUIRED for extension workflows) 🖥️

- [ ] T085 Run webview E2E: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-log-panel-manifest-categories` `tests/e2e/test-log-panel-manifest-categories.spec.ts`
- [ ] T086 [P] Capture workflow screenshot: VS Code extension with a loaded sample session, showing the Log Panel full of coloured icons (no grey except for intentional unknowns) `specs/207-tool-manifest-categories/evidence/screenshots/vscode-workflow.png`
- [ ] T087 Document webview E2E results `specs/207-tool-manifest-categories/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T088 Create shipped blog post using the Content Specialist agent — read `.claude/agents/media/content.md` then spawn via Task tool. Sections: *What We Built*, *Screenshots* (embed the three theme shots + interaction GIF), *By the Numbers* (pull from `test-summary.md` front matter), *Lessons Learned* (two-commit migration, LinkML-first enum), *What's Next* (pointer to backlog item for destructive-bucket conversation) `specs/207-tool-manifest-categories/media/shipped-post.md`
- [ ] T089 [P] Create LinkedIn shipped summary (150–200 words, hook-first opening, link to shipped post, 2–3 tags) `specs/207-tool-manifest-categories/media/linkedin-shipped.md`

### Project Memory

- [ ] T090 [P] Log this feature in `docs/project_notes/issues.md` with ticket ID (BACKLOG #207), branch, PR URL (filled after PR created), evidence-dir link `docs/project_notes/issues.md`
- [ ] T091 [P] If any architectural decision during implementation deviated from `research.md` (e.g. the delivery path changed), record an ADR entry in `docs/project_notes/decisions.md`; otherwise skip `docs/project_notes/decisions.md`

### PR Creation

- [ ] T092 Create PR and publish blog: run `/speckit.pr` `N/A — slash command`

**Task T092 must run last. It depends on T077–T091 being complete (all evidence, media, project-memory updates landed).**

---

## Dependencies

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies. Can start immediately.
- **Phase 2 (Foundation)**: Depends on Phase 1. **Blocks every user story.**
- **Phase 3 (US1)**: Depends on Phase 2 complete.
- **Phase 4 (US2)**: Depends on Phase 2 complete. Independent of US1 (different author workflows demonstrated in parallel).
- **Phase 5 (US3)**: Depends on Phase 2 complete **and** US1/US2 green (baseline screenshots need the Phase-2 implementation to be working via the static shim to produce a meaningful baseline).
- **Phase 6 (US4)**: Depends on Phase 2 complete. Independent of US1/US2/US3; can run in parallel with them.
- **Phase 7 (Polish)**: Depends on all user stories being complete.

### User story ordering

Recommended sequencing:

1. **Phase 2** (land plumbing additively) — must complete before any user story.
2. **Phase 3 (US1) + Phase 4 (US2) + Phase 6 (US4) in parallel** — all three can land on Commit A. US1/US2 demonstrate the author workflows; US4 adds boundary defence. The static shim is still in place; no visible change to end-users.
3. **Phase 5 (US3)** — Commit B. Migrate all existing tools, delete the static shim, gate first-party coverage. After this commit the LinkML path is the sole source of truth.
4. **Phase 7 (Polish)** — evidence + media + PR.

### Within-phase dependencies

- Tests (red) before implementation (green) — Article VII.
- LinkML edit (T007) before codegen (T009) before downstream Python/TS work (T011+, T016+).
- Migration task pairs (T044/T067 baseline and post-migration screenshot) bracket the risky retirement of the static shim — both must run.
- T092 (`/speckit.pr`) is always last.

### Parallel opportunities

- T001–T004 (Phase 1): all in parallel.
- Phase 2 has four independent tracks after the schema edit lands: Python (T011–T015), TypeScript boundary (T016–T018), webview (T019–T024), component (T025–T028).
- Phase 3 and Phase 4 can run in parallel after Phase 2.
- Phase 5 task T046–T053 (Python migrations) and T054–T058 (TypeScript migrations) are all marked `[P]` — one task per file.
- Phase 6 (US4) is independent of US1/US2/US3 after Phase 2 — can run in parallel with them.
- Polish evidence tasks T077–T091 are mostly `[P]` (different files).

---

## Implementation Strategy

### Incremental delivery (two-commit migration per research R6)

1. **Commit A — Additive plumbing** (Phase 2 + Phase 3 + Phase 4 + Phase 6):
   - LinkML enum added, types regenerated, Python `@tool` decorator extended, MCP annotation emitted, webview message delivered, `LogPanel` component accepts the new prop.
   - Static `TOOL_ID_TO_CATEGORY` still authoritative for existing tools.
   - US1 (new tools), US2 (contrib tools), US4 (invalid values) all green.
   - **Observable user impact at this commit**: zero — the static shim still covers every listed tool.
   - Safety checkpoint: run full visual-regression suite against Storybook. Baseline = before Commit A, post = Commit A. Expected diff: none.

2. **Commit B — Retire the shim** (Phase 5):
   - Every existing first-party Python + TypeScript tool updated to declare its category at the registration site.
   - `TOOL_ID_TO_CATEGORY` deleted.
   - First-party-coverage tests turned on.
   - **Observable user impact at this commit**: visible colour reappears on any tool that had been removed from the static map or added after #176 shipped. Otherwise identical to Commit A.
   - Safety checkpoint: run visual-regression suite against baseline captured in T044. Expected diff: only previously-grey icons gaining correct colours.

3. **Commit C — Evidence, media, PR** (Phase 7):
   - Evidence captured, shipped post drafted, LinkedIn summary drafted, project-memory updated.
   - `/speckit.pr` creates the feature PR + the cross-repo blog PR.

### Parallel team strategy

With multiple contributors:

1. One developer lands Phase 1 + T005–T010 (schema foundation) solo — the LinkML edit + regen is a choke point.
2. Once regen lands:
   - Developer A: Python track (T011–T015) + US1 Python tasks + US2 Python tasks
   - Developer B: TypeScript boundary + webview + component (T016–T028) + US1 TS tasks + US4 boundary test
   - Developer C: Prepare for Commit B — enumerate existing tools + map categories (dry run of Phase 5 before it starts)
3. All three converge on the Phase 5 migration — one task per file; very parallelisable.
4. One developer owns Phase 7 polish + PR creation.

### Risk management

- **Schema round-trip regression**: schema tests (T005/T006/T008) gate the LinkML edit. If round-trip fails, fix generators before proceeding.
- **Webview race on session start**: covered by research R4 decision (undefined-sentinel state). T023 tests this explicitly.
- **Typo in migration**: the literal union / `StrEnum` catches it at typecheck time. T059/T060 catch the "forgot to declare" variant.
- **Semantically odd classifications** (e.g. `delete-features` staying as `style`): preserved verbatim per spec A6. Not a blocker for this feature; captured in evidence for the follow-up conversation.
