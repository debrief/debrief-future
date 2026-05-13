---
description: "Task list for feature 222 — Promote MCP transport envelopes to LinkML"
---

# Tasks: Promote MCP transport envelopes to LinkML

**Input**: Design documents from `/specs/222-linkml-mcp-envelopes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — spec FR-006 mandates round-trip / schema-comparison / negative tests for every new class.

**Organization**: Tasks are grouped by the three priority slices from spec.md (P1 envelopes → P2 discovery → P3 replay). Each slice is independently shippable and ends with a `task verify` gate.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that demonstrate the migration is complete, the schema build still works, and no consumer regressed. Used in the PR description and the feature blog post.

**Evidence Directory**: `specs/222-linkml-mcp-envelopes/evidence/`
**Media Directory**: `specs/222-linkml-mcp-envelopes/media/`

### Feature classification

This is a **Schema Change** / **Infrastructure** feature. Per the Quality Rubric, the minimum evidence is:

- **Round-trip proof** (Python → JSON → TypeScript → JSON → Python) — `evidence/round-trip-evidence.md`
- **Configuration sample + validation output** — `evidence/type-audit-before-after.md`, `evidence/mcp-schema-sample.json`

It is **not** a UI component feature — no theme screenshots / interaction GIF required. The single Playwright touchpoint (SC-006 calc-tool invocation) is a regression check, not a new test to author.

### Planned Artefacts

| Artefact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | YAML front-matter test-summary template; pytest + vitest + Playwright totals | After Phase N tests pass |
| `evidence/usage-example.md` | Concrete example: edit `mcp.yaml`, `task schemas:build`, observe new field in both Python and TS | After P1 lands |
| `evidence/round-trip-evidence.md` | Python `model_dump()` → JSON → TS `JSON.parse + ajv.validate` → JSON → Python `model_validate()` for one representative class per group (envelope, discovery, replay) | After all three slices land |
| `evidence/type-audit-before-after.md` | `pnpm tsx scripts/audits/type-audit/scan.ts ...` re-run output showing §3.1 rows attributed to #222 dropping from 17 → 0 and §3.2 `ToolParameter` rows dropping from 2 → 0 | After all migrations complete |
| `evidence/mcp-schema-sample.json` | Excerpt of `shared/schemas/src/generated/json-schema/mcp.schema.json` showing the four envelope classes + the `$defs` entry count | After `task schemas:build` succeeds |
| `evidence/calc-tool-regression.md` | Notes on the SC-006 Playwright calc-tool invocation regression check (path + status) | After Phase N E2E pass |
| `evidence/opening-context.md` | Cached opener — already created during `/speckit.plan` (DO NOT regenerate) | Pre-existing |

### Media Content

| Artefact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | Already cached |
| `media/shipped-post.md` | Feature post combining cached opener verbatim + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | PR in debrief-future with evidence + migration diff | Final task (Polish) |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new schema file scaffolding, fixture directories, and test-file stubs so subsequent phases just fill them in. No consumer code changes here.

- [x] T001 Create empty LinkML source file with frontmatter only (id, name, title, prefixes, default_prefix, default_range, imports: `linkml:types` + `tool` — per `contracts/mcp.linkml.yaml.draft.md` lines 14–36) `shared/schemas/src/linkml/mcp.yaml`
- [x] T002 [P] Create fixture directory tree for the cluster (`valid/`, `invalid/` subdirs per class group) `shared/schemas/fixtures/mcp/.gitkeep`
- [x] T003 [P] Create empty test module stub for round-trip tests (imports `pytest` + helpers from `shared/schemas/tests/helpers/`, one placeholder test marked `xfail` to anchor collection) `shared/schemas/tests/test_mcp_roundtrip.py`
- [x] T004 [P] Create empty test module stub for golden + negative fixture tests `shared/schemas/tests/test_mcp_fixtures.py`
- [x] T005 Verify `task schemas:build` still completes successfully (sanity baseline before adding classes — establishes pre-feature build time for NFR-001 comparison; record duration in shell scratch)
- [x] T006 Update backlog row for #222 from `specified` → `implementing` and commit `chore(backlog): mark item 222 as implementing` `BACKLOG.md`

**Checkpoint**: New `mcp.yaml` file exists (empty class set), fixture + test scaffolding in place, schema build still green.

---

---

## Phase 2: Foundation (Enums, Build Wiring, Test Scaffolds)

**Purpose**: Add the four permissible-values enums and the shared TS-only aliases module **before** any classes reference them. These foundation pieces unblock all three user stories.

**⚠️ CRITICAL**: No user-story phase can begin until Phase 2 is complete — every class references at least one enum or the aliases module.

- [x] T010 Add `SessionMCPToolName` permissible-values enum (11 entries — see `data-model.md` §"Permissible-value enums") to `shared/schemas/src/linkml/mcp.yaml`
- [x] T011 [P] Add `MCPContentItemTypeEnum` permissible-values enum (`text`, `resource_link`, `image`, `structured`) to `shared/schemas/src/linkml/mcp.yaml`
- [x] T012 [P] Add `MCPParamTypeEnum` permissible-values enum (`string`, `number`, `integer`, `boolean`, `array`, `object`) to `shared/schemas/src/linkml/mcp.yaml`
- [x] T013 [P] Add `ReplayStatusEnum` permissible-values enum (`unchanged`, `version_drift`, `tool_removed`) to `shared/schemas/src/linkml/mcp.yaml`
- [x] T014 Run `task schemas:build` and verify generated artefacts `shared/schemas/src/generated/python/mcp.py`, `shared/schemas/src/generated/typescript/mcp.ts`, `shared/schemas/src/generated/json-schema/mcp.schema.json` are emitted with the four enums
- [x] T015 [P] Extend `@debrief/schemas` TS export barrel to re-export the new enums and (forward-declared) classes `shared/schemas/src/typescript/index.ts`
- [x] T016 [P] Extend `debrief_schemas` Python re-export module to expose the new enums and (forward-declared) classes `shared/schemas/src/python/debrief_schemas/__init__.py`
- [x] T017 [P] Create empty TS-only function-alias module (no aliases yet — populated in Phase 5; see research R-002) `shared/schemas/src/typescript/aliases/mcp-functions.ts`
- [x] T018 [P] [test] Extend the schema-comparison helper to register the new file so `test_schema_compare.py` discovers it `shared/schemas/tests/test_schema_compare.py`
- [x] T019 Run `uv run pytest shared/schemas/tests/test_regen_idempotent.py shared/schemas/tests/test_schema_compare.py -v` and confirm green (build wiring sound, no classes asserted yet)

**Checkpoint**: All four enums generated for both Python and TypeScript; build is reproducible; re-export barrels surface the new symbols; aliases module file in place.

---

---

## Phase 3: User Story 1 — Envelopes (Priority: P1)

**Goal**: Promote the four core JSON-RPC envelope shapes (`MCPRequest`, `MCPContentItem`, `MCPToolResponse`, `MCPErrorResponse`) to LinkML, delete every hand-typed copy under `shared/utils/src/mcp-types.ts` and the `MCPRequest` site at `services/session-state/src/server/mcp.ts`, and prove no consumer breaks.

**Independent Test**: After this phase, re-run the type-audit scanner per `quickstart.md` Step 3. The four envelope rows MUST disappear from §3.1 and the count attributed to #222 MUST drop by exactly four. `task verify` MUST pass standalone.

### Tests for User Story 1 (REQUIRED — FR-006) ⚠️

> Tests are authored first as failing assertions against the generated types, then turn green as the LinkML classes appear and consumer sites migrate.

- [x] T020 [P] [US1] [test] Golden + negative fixtures for `MCPRequest` (1 valid, 2 invalid — unknown tool name, missing input) `shared/schemas/fixtures/mcp/MCPRequest/valid/example.json` + `invalid/unknown-tool.json` + `invalid/missing-input.json`
- [x] T021 [P] [US1] [test] Golden + negative fixtures for `MCPContentItem` (1 valid per type variant, 1 invalid missing `type`) `shared/schemas/fixtures/mcp/MCPContentItem/`
- [x] T022 [P] [US1] [test] Golden + negative fixtures for `MCPToolResponse` (1 valid with mixed content array, 1 invalid empty-content) `shared/schemas/fixtures/mcp/MCPToolResponse/`
- [x] T023 [P] [US1] [test] Golden + negative fixtures for `MCPErrorResponse` (1 valid, 1 invalid missing `code`) `shared/schemas/fixtures/mcp/MCPErrorResponse/`
- [x] T024 [P] [US1] [test] Add round-trip + schema-compare assertions for the four envelope classes `shared/schemas/tests/test_mcp_roundtrip.py`
- [x] T025 [P] [US1] [test] Add golden + negative fixture assertions parameterised over the four envelopes `shared/schemas/tests/test_mcp_fixtures.py`

### Implementation for User Story 1

- [x] T030 [US1] Add `MCPRequest` class (slots: `tool`, `input` — see `data-model.md` Group 1 and `contracts/mcp.linkml.yaml.draft.md` lines 89–99) `shared/schemas/src/linkml/mcp.yaml`
- [x] T031 [US1] Add `MCPContentItem` class (6 slots, discriminator `type`) `shared/schemas/src/linkml/mcp.yaml`
- [x] T032 [US1] Add `MCPToolResponse` class (multivalued `content`, optional `is_error`, free-form `structured_content`) `shared/schemas/src/linkml/mcp.yaml`
- [x] T033 [US1] Add `MCPErrorResponse` class (`code`, `message`, free-form `data`) `shared/schemas/src/linkml/mcp.yaml`
- [x] T034 [US1] Run `task schemas:build`; confirm `mcp.py`, `mcp.ts`, `mcp.schema.json` regenerate with four new classes and that `$defs` count increases by 4
- [x] T035 [P] [US1] Delete hand-typed `MCPRequest` interface at `services/session-state/src/server/mcp.ts:23` and replace consumer imports with `import { MCPRequest } from '@debrief/schemas'`
- [x] T036 [P] [US1] Delete hand-typed `MCPContentItem` interface at `shared/utils/src/mcp-types.ts:30` and replace with re-export from `@debrief/schemas`
- [x] T037 [P] [US1] Delete hand-typed `MCPToolResponse` interface at `shared/utils/src/mcp-types.ts:42` and replace with re-export from `@debrief/schemas`
- [x] T038 [P] [US1] Delete hand-typed `MCPErrorResponse` interface at `shared/utils/src/mcp-types.ts:50` and replace with re-export from `@debrief/schemas`
- [x] T039 [US1] Run `uv run pytest shared/schemas/tests/test_mcp_roundtrip.py shared/schemas/tests/test_mcp_fixtures.py -v` and confirm all envelope tests green
- [x] T040 [US1] Run `pnpm -r typecheck` and `pnpm lint` and confirm no consumer site broke (each migrated import resolves to a generated type identical in shape to the deleted hand-type)
- [x] T041 [US1] Run the type-audit scanner (per `quickstart.md` Step 3) and confirm §3.1 rows for `MCPRequest`/`MCPContentItem`/`MCPToolResponse`/`MCPErrorResponse` are gone; record before/after counts in shell scratch (input to Phase 6 evidence task)
- [x] T042 [US1] Commit P1 slice: `feat(schemas): promote MCP envelope shapes to LinkML (P1)` — single commit per research R-005 (bisect-friendliness)

**Checkpoint**: Four envelope classes generated, six consumer sites migrated, all tests green, audit shows four fewer rows attributed to #222.

---

---

## Phase 4: User Story 2 — Discovery (Priority: P2)

**Goal**: Promote the seven tool-discovery shapes (`MCPParamSchema`, `MCPSelectionRequirement`, `MCPToolDefinition`, `ToolParameter`, `ToolParameterMeta`, `ToolDefinition`, `ToolResult`) to LinkML, collapse the `ToolParameter` drift cluster onto a single canonical class, and confirm the ToolMatch parameter form renders identically.

**Independent Test**: After this phase, the audit's §3.1 rows for `MCPParamSchema`/`MCPToolDefinition`/`MCPSelectionRequirement`/`ToolParameterMeta`/`ToolDefinition`/`ToolResult` MUST be gone (count drops by 6 more) and §3.2 `ToolParameter` MUST be gone (count drops by 2 drift members). Visual snapshot for the ToolMatch story MUST match pre-feature byte-for-byte.

### Tests for User Story 2 (REQUIRED — FR-006) ⚠️

- [x] T050 [P] [US2] [test] Fixtures for `MCPParamSchema` including a recursive `items` example (closes data-model §"items: recursive") `shared/schemas/fixtures/mcp/MCPParamSchema/`
- [x] T051 [P] [US2] [test] Fixtures for `MCPSelectionRequirement` (track / point / polygon variants) `shared/schemas/fixtures/mcp/MCPSelectionRequirement/`
- [x] T052 [P] [US2] [test] Fixtures for `MCPToolDefinition` (with and without optional slots) `shared/schemas/fixtures/mcp/MCPToolDefinition/`
- [x] T053 [P] [US2] [test] Fixtures for `ToolParameter` covering BOTH legacy hand-type shapes (one with `validation`, one with `hint` — drift reconciliation per data-model line 134) `shared/schemas/fixtures/mcp/ToolParameter/`
- [x] T054 [P] [US2] [test] Fixtures for `ToolParameterMeta`, `ToolDefinition`, `ToolResult` (1 valid + 1 invalid each) `shared/schemas/fixtures/mcp/{ToolParameterMeta,ToolDefinition,ToolResult}/`
- [x] T055 [US2] [test] Extend `test_mcp_roundtrip.py` with discovery-class assertions (round-trip + schema-compare for the seven discovery classes) `shared/schemas/tests/test_mcp_roundtrip.py`
- [x] T056 [US2] [test] Extend `test_mcp_fixtures.py` with parameterised golden + negative cases for discovery classes `shared/schemas/tests/test_mcp_fixtures.py`

### Implementation for User Story 2

- [x] T060 [US2] Add `MCPParamSchema` class (recursive `items`, free-form `default`) `shared/schemas/src/linkml/mcp.yaml`
- [x] T061 [US2] Add `MCPSelectionRequirement` class `shared/schemas/src/linkml/mcp.yaml`
- [x] T062 [US2] Add `MCPToolDefinition` class (references `MCPParamSchema`, `MCPSelectionRequirement`, `ToolCategoryEnum` from `tool.yaml` via `imports:`) `shared/schemas/src/linkml/mcp.yaml`
- [x] T063 [US2] Add canonical `ToolParameter` class (union of both legacy hand-types — additive, both `validation` and `hint` slots present; see data-model line 133) `shared/schemas/src/linkml/mcp.yaml`
- [x] T064 [US2] Add `ToolParameterMeta`, `ToolDefinition`, `ToolResult` classes `shared/schemas/src/linkml/mcp.yaml`
- [x] T065 [US2] Run `task schemas:build` and confirm seven new classes regenerate cleanly in all three output targets
- [x] T066 [P] [US2] Delete `MCPParamSchema` interface at `shared/components/src/ToolMatch/mcpAdapter.ts:50` and import from `@debrief/schemas`
- [x] T067 [P] [US2] Delete `MCPParamSchema` interface at `apps/vscode/src/services/mcpToolAdapter.ts:16` and import from `@debrief/schemas`
- [x] T068 [P] [US2] Delete `MCPSelectionRequirement` interface at `shared/utils/src/mcp-types.ts:65` and re-export from `@debrief/schemas`
- [x] T069 [P] [US2] Delete `MCPToolDefinition` interface at `shared/utils/src/mcp-types.ts:76` and re-export from `@debrief/schemas`
- [x] T070 [P] [US2] Delete `ToolParameter` interface at `shared/components/src/ToolMatch/types.ts:34` and import from `@debrief/schemas` (drift cluster member 1)
- [x] T071 [P] [US2] Delete `ToolParameter` interface at `apps/vscode/src/types/tool.ts:26` and import from `@debrief/schemas` (drift cluster member 2)
- [x] T072 [P] [US2] Delete `ToolParameterMeta` interface at `apps/web-shell/src/mocks/calcService.ts:138` and import from `@debrief/schemas`
- [x] T073 [P] [US2] Delete `ToolDefinition` interface at `apps/web-shell/src/mocks/calcService.ts:145` and import from `@debrief/schemas`
- [x] T074 [P] [US2] Delete `ToolResult` interface at `apps/web-shell/src/mocks/calcService.ts:26` and import from `@debrief/schemas`
- [x] T075 [US2] Run `uv run pytest shared/schemas/tests/test_mcp_roundtrip.py shared/schemas/tests/test_mcp_fixtures.py -v` and confirm all discovery tests green
- [x] T076 [US2] Run `pnpm --filter @debrief/components test` (catches ToolMatch story regression — vitest snapshot) and `pnpm -r typecheck`
- [x] T077 [US2] Run the type-audit scanner and confirm §3.1 lost six more rows and §3.2 lost both `ToolParameter` rows; record running total
- [x] T078 [US2] Commit P2 slice: `feat(schemas): promote MCP discovery shapes to LinkML and collapse ToolParameter drift (P2)`

**Checkpoint**: Both Stories 1 and 2 work; ToolMatch parameter form unchanged visually; audit count down by 10 rows in §3.1 and 2 rows in §3.2.

---

---

## Phase 5: User Story 3 — Replay & Logging (Priority: P3)

**Goal**: Promote the three replay/logging shapes (`ToolResultForLog`, `ToolExecutionResultForReplay`, `ToolsUpdateMessage`) to LinkML; move the two function-type aliases (`ToolExecutor`, `ToolVersionResolver`) into the schemas package; retype the `TOOLS` const at the MCP framing site using `SessionMCPToolName`; close out the audit.

**Independent Test**: After this phase, replaying every committed log fixture under `services/session-state/**/__fixtures__/` MUST succeed unchanged (FR-011). The audit re-run MUST show **zero** rows in §3.1 attributed to #222 — i.e. the cluster is fully resolved.

### Tests for User Story 3 (REQUIRED — FR-006 + FR-011) ⚠️

- [ ] T080 [P] [US3] [test] Fixtures for `ToolResultForLog` (1 success-path with `result`, 1 error-path with `error`, 1 negative violating `result XOR error`) `shared/schemas/fixtures/mcp/ToolResultForLog/`
- [ ] T081 [P] [US3] [test] Fixtures for `ToolExecutionResultForReplay` covering each `ReplayStatusEnum` value `shared/schemas/fixtures/mcp/ToolExecutionResultForReplay/`
- [ ] T082 [P] [US3] [test] Fixtures for `ToolsUpdateMessage` (1 valid `type=tools:update`, 1 invalid `type=other`) `shared/schemas/fixtures/mcp/ToolsUpdateMessage/`
- [ ] T083 [US3] [test] Extend `test_mcp_roundtrip.py` with replay-class assertions plus a Pydantic `model_validator` assertion for `result XOR error` on `ToolResultForLog` `shared/schemas/tests/test_mcp_roundtrip.py`
- [ ] T084 [US3] [test] Add a fixture-replay-compatibility test that loads every JSON file under `services/session-state/**/__fixtures__/` matching `*tool*log*.json` / `*replay*.json` and validates it against the new generated Pydantic class — proves FR-011 (schema is a superset of all currently-shipped log shapes) `shared/schemas/tests/test_mcp_log_fixture_compat.py`

### Implementation for User Story 3

- [ ] T090 [US3] Add `ToolResultForLog` class (8 slots — see data-model Group 3) with Pydantic `model_validator` enforcing `result XOR error` (post-generation hook in `shared/schemas/scripts/` if the generator does not emit validators directly — fall back to a thin wrapper in `shared/schemas/src/python/debrief_schemas/validators/mcp.py`) `shared/schemas/src/linkml/mcp.yaml`
- [ ] T091 [US3] Add `ToolExecutionResultForReplay` class (inherits from `ToolResultForLog` via `is_a:`) `shared/schemas/src/linkml/mcp.yaml`
- [ ] T092 [US3] Add `ToolsUpdateMessage` class with `equals_string: tools:update` on the `type` slot `shared/schemas/src/linkml/mcp.yaml`
- [ ] T093 [US3] Run `task schemas:build` and confirm three new classes + the enum-derived imports regenerate cleanly
- [ ] T094 [US3] Add `ToolExecutor` and `ToolVersionResolver` function-type aliases (one-line TS expressions importing generated parameter/return types from `@debrief/schemas`; module is treated as schema-rooted by audit R4) `shared/schemas/src/typescript/aliases/mcp-functions.ts`
- [ ] T095 [P] [US3] Delete `ToolResultForLog` interface at `services/session-state/src/log/types.ts:89` and import from `@debrief/schemas`
- [ ] T096 [P] [US3] Delete `ToolExecutionResultForReplay` interface at `services/session-state/src/log/types.ts:271` and import from `@debrief/schemas`
- [ ] T097 [P] [US3] Delete `ToolExecutor` function-type alias at `services/session-state/src/log/types.ts:281` and import from `@debrief/schemas`
- [ ] T098 [P] [US3] Delete `ToolVersionResolver` function-type alias at `services/session-state/src/log/types.ts:299` and import from `@debrief/schemas`
- [ ] T099 [P] [US3] Delete `ToolsUpdateMessage` interface at `apps/vscode/src/webview/web/activityPanel.tsx:52` and import from `@debrief/schemas`
- [ ] T100 [US3] Retype the `TOOLS` const at `services/session-state/src/server/mcp.ts:31-47` as `Record<SessionMCPToolName, ToolHandler>` and delete the local `type ToolName = keyof typeof TOOLS` at `:49` — replace consumer imports with `import type { SessionMCPToolName as ToolName } from '@debrief/schemas'` where needed `services/session-state/src/server/mcp.ts`
- [ ] T101 [US3] Run `uv run pytest shared/schemas/tests/test_mcp_roundtrip.py shared/schemas/tests/test_mcp_fixtures.py shared/schemas/tests/test_mcp_log_fixture_compat.py -v` and confirm all replay tests green AND every existing log fixture validates
- [ ] T102 [US3] Run `pnpm --filter @debrief/session-state test` and confirm replay-engine unit tests still pass
- [ ] T103 [US3] Run the type-audit scanner and confirm §3.1 rows attributed to #222 are now **zero** (SC-001) AND §3.2 `ToolParameter` is zero (SC-002); capture the full report excerpt for evidence
- [ ] T104 [US3] Commit P3 slice: `feat(schemas): promote MCP replay/log shapes to LinkML and close #222 cluster (P3)`

**Checkpoint**: All three slices complete; audit cluster fully resolved; replay subsystem still loads every committed log fixture.

---

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wrap up — documentation, full-stack verification, evidence collection, feature post, PR.

### Documentation & Cross-Cutting

- [ ] T110 [P] Append a new §5 changelog entry to `docs/type-audit-2026.md` recording the before/after row counts for §3.1 (17 → 0 attributed to #222) and §3.2 (2 → 0 for `ToolParameter`), the merge git-SHA placeholder, and a link to this spec (FR-010 / SC-007) `docs/type-audit-2026.md`
- [ ] T111 [P] Add a worked-example section for the MCP cluster to `shared/schemas/README.md` alongside the existing GeoJSON / session-state / styling examples (NFR-003) `shared/schemas/README.md`
- [ ] T112 [P] Spot-check there are no new `as any`, `// @ts-expect-error`, `# type: ignore`, or `Any` casts in the migration diff except the two enumerated free-form fields (`MCPContentItem.structuredContent`, `MCPErrorResponse.data`) — `git diff main...HEAD` review per FR-009 / SC-005

### Full-Suite Verification (REQUIRED)

> The full `task verify` pipeline MUST pass on the feature branch before evidence is captured (CLAUDE.md § Before Pushing).

- [ ] T120 [test] Run `task verify` (or the four-step fallback) and capture totals — lint + typecheck + pytest + vitest + Playwright E2E all green
- [ ] T121 [test] Re-run the type-audit scanner per `quickstart.md` Step 3 and capture the regenerated `tmp/type-audit-report.md` for evidence (SC-001 / SC-002 final proof)
- [ ] T122 [test] Run the calc-tool Playwright regression (path resolved per research R-007 — locate the test that exercises ToolMatch → invoke → LogPanel in `apps/web-shell/playwright/tests/`; run via `cd apps/web-shell && node run-playwright.mjs <test-name>`). If no E2E exists, document the substitution per R-007 outcome contingency and rely on the existing Storybook + vitest visual-regression coverage for SC-006

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip T122. The web-shell runner at `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` binary. Full details: `docs/project_notes/playwright-installation-research.md`

### Evidence Collection (REQUIRED)

- [ ] T130 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md` (YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body breaks down by suite — pytest schemas / pytest session-state / vitest / Playwright) `specs/222-linkml-mcp-envelopes/evidence/test-summary.md`
- [ ] T131 [P] Write usage demonstration showing the "add a field to `MCPToolResponse`" workflow (edit `mcp.yaml` → `task schemas:build` → field appears in both Python and TS — matches User Story 1 acceptance scenario 1) `specs/222-linkml-mcp-envelopes/evidence/usage-example.md`
- [ ] T132 [P] Capture round-trip proof for one representative class per group (envelope: `MCPToolResponse`; discovery: `MCPParamSchema` with recursive items; replay: `ToolExecutionResultForReplay`) — Python `model_dump()` JSON pasted side-by-side with TS `JSON.parse + ajv.validate` JSON pasted side-by-side with re-validated Python instance `specs/222-linkml-mcp-envelopes/evidence/round-trip-evidence.md`
- [ ] T133 [P] Capture before/after type-audit report excerpts (the §3.1 #222 attribution section, before commit `01166d6e` vs. after merge) `specs/222-linkml-mcp-envelopes/evidence/type-audit-before-after.md`
- [ ] T134 [P] Capture the four-envelope `$defs` excerpt from the generated JSON Schema as a configuration-sample artefact (per Quality Rubric "Configuration sample + validation output") `specs/222-linkml-mcp-envelopes/evidence/mcp-schema-sample.json`
- [ ] T135 [P] Document the SC-006 calc-tool regression outcome — path of the test run (or substitution if no E2E exists per R-007), pass/fail status, screenshot if applicable `specs/222-linkml-mcp-envelopes/evidence/calc-tool-regression.md`

### Media Content (REQUIRED)

- [ ] T140 Create feature blog post using the Content Specialist agent — reads `evidence/opening-context.md` verbatim for the first three sections (What We're Building, How It Fits, Key Decisions), then synthesises remaining sections (By the Numbers — 17 hand-types removed, 15 LinkML classes added, 4 enums added; Lessons Learned; What's Next — pointer to sibling clusters #223–#227). Title prefixed with `Building ` `specs/222-linkml-mcp-envelopes/media/shipped-post.md`

### Backlog Bookkeeping

- [ ] T150 Strike through the BACKLOG.md row for #222 (wrap each cell in `~~`) and commit `chore(backlog): mark item 222 as complete` `BACKLOG.md`

### PR Creation

- [ ] T160 Create PR and publish blog: run /speckit.pr

**Task T160 must run last. It depends on T100–T150 being complete.**

**Checkpoint**: All evidence captured, blog post drafted, BACKLOG.md updated, feature PR + blog PR open for review.

---

---

## Dependencies

### Phase ordering

- **Phase 1 (Setup)**: no upstream dependency; T006 (backlog status) can run in parallel with T001–T005.
- **Phase 2 (Foundation)**: depends on Phase 1. **Blocks all user stories** — every class in P1/P2/P3 references at least one enum from this phase, and the function-aliases module must exist (even if empty) before Phase 5 fills it.
- **Phase 3 (US1 — Envelopes, P1)**: depends on Phase 2. Must complete and pass `task verify` before Phase 4 begins.
- **Phase 4 (US2 — Discovery, P2)**: depends on Phase 3 (because `MCPToolDefinition` does not reference envelope classes directly, but the cluster's audit count must monotonically decrease per research R-005, so P2 is rebased on P1's tree).
- **Phase 5 (US3 — Replay, P3)**: depends on Phase 4 (because `ToolResultForLog.result` references `MCPToolResponse` from P1 and `error` references `MCPErrorResponse` from P1; `ToolsUpdateMessage.tools` references `MCPToolDefinition` from P2).
- **Phase 6 (Polish)**: depends on Phase 5 — evidence + audit re-run must reflect the fully-resolved cluster. Documentation tasks (T110–T112) can begin once P3 commits land. Verification (T120–T122) and evidence (T130–T135) and media (T140) must all complete before T160 (PR creation).

### Per-task dependencies within phases

- Phase 2: T010–T013 (enums) all parallel; T014 (schema build) depends on T010–T013; T015–T018 depend on T014; T019 depends on T015–T018.
- Phase 3: fixtures (T020–T023) parallel; test scaffolds (T024–T025) parallel and depend on fixtures; classes (T030–T033) sequential within `mcp.yaml` (single file); T034 depends on T033; consumer-site deletions (T035–T038) parallel and depend on T034; T039–T041 sequential.
- Phase 4: identical pattern — fixtures parallel (T050–T054); tests parallel (T055–T056); classes sequential within `mcp.yaml` (T060–T064); build (T065) gates consumer deletions; deletions parallel (T066–T074); verification sequential (T075–T077).
- Phase 5: fixtures parallel (T080–T082); test scaffolds (T083–T084); classes sequential (T090–T092); build (T093); aliases module (T094); consumer deletions parallel (T095–T099); `TOOLS` retype (T100) depends on T094; verification (T101–T103) sequential.
- Phase 6: T110–T112 parallel; T120–T122 sequential (T120 must pass before T121/T122); T130 depends on T120 (test counts); T131–T135 parallel after T120; T140 depends on T130–T135 (reads evidence as input); T150 must precede T160; T160 must be the final task.

### File-collision notes (impacts on `[P]` markers)

- All LinkML class additions touch the same file (`shared/schemas/src/linkml/mcp.yaml`) and CANNOT be parallel within a phase — hence T030–T033, T060–T064, T090–T092 are sequential despite the conceptual independence.
- All `shared/utils/src/mcp-types.ts` deletions touch one file; T036–T038 (P1) and T068–T069 (P2) are listed `[P]` because they are independent edits within different interfaces, but in practice should be batched into one edit pass per phase.
- T035 (`server/mcp.ts` MCPRequest) and T100 (`server/mcp.ts` TOOLS const) touch the same file in different phases — no overlap.

---

---

## Implementation Strategy

### Incremental delivery — one PR, three commits

Per research R-005, this feature ships as **a single PR with one commit per slice**: P1 envelopes → P2 discovery → P3 replay. Each commit is independently bisect-safe:

1. **Setup + Foundation** (Phases 1–2) → unblocks all three slices. May be folded into the P1 commit if the diff stays under ~400 lines.
2. **P1 commit** (Phase 3 complete) → schema build green, `task verify` green, audit shows §3.1 row count down by 4. Reviewable in isolation.
3. **P2 commit** (Phase 4 complete) → audit down by another 6 rows in §3.1 + 2 rows in §3.2. ToolMatch visual unchanged.
4. **P3 commit** (Phase 5 complete) → cluster fully resolved, replay fixtures still load.
5. **Polish commit** (Phase 6 docs + evidence + PR) — separate from the slice commits so the audit changelog (T110) lands at the same SHA as the final cluster state.

### Why this order

- **Envelopes first** because every other class in this feature references one of them — `ToolResultForLog.result` is an `MCPToolResponse`, `ToolResultForLog.error` is an `MCPErrorResponse`, `ToolsUpdateMessage.tools` is `MCPToolDefinition[]`.
- **Discovery second** because the discovery cluster is the most visible at the UI surface; landing it second confirms ToolMatch keeps working before we touch the (much lower-traffic) replay subsystem.
- **Replay last** because (a) it's the lowest-risk slice — single producer, single consumer — and (b) it depends on classes from both prior slices.

### Validation gates (each slice)

After every slice commit:

1. `task schemas:build` succeeds in ≤ +20% of baseline runtime (NFR-001).
2. `uv run pytest shared/schemas/tests/test_mcp_*` is fully green.
3. `pnpm -r typecheck && pnpm lint` is fully green.
4. `pnpm tsx scripts/audits/type-audit/scan.ts ...` reports a monotonically-decreasing §3.1 count attributed to #222.

A slice that fails any gate is reverted, not patched in-place — keeps bisect clean.

### Parallel team strategy

Single developer is most efficient here — the LinkML file is one source of truth and the consumer-site deletions are mechanical. If split across two developers, one owns Phases 1–3 (envelopes + scaffolding) while the second pairs on Phase 5 (replay/log) since it has the heaviest test footprint (FR-011 log-fixture compat).

---

## Notes

- Each user-story phase is independently `task verify`-able — every checkpoint commit MUST pass the full pipeline.
- The two enumerated free-form fields (`MCPContentItem.structuredContent`, `MCPErrorResponse.data`) are the **only** allowed `range: Any` additions; review T112 confirms no other `Any` casts crept in.
- Evidence is not optional — T130 (test-summary), T131 (usage-example), T132 (round-trip), T133 (audit before/after), T134 (schema sample), T135 (calc-tool regression) MUST all be present before T160 runs.
- T160 (`/speckit.pr`) MUST be the final task and depends on all prior tasks being complete; partial PR creation is acceptable only if the blog publish step fails (feature PR succeeds, blog PR retried manually).
- Author/edit fixtures, NEVER edit committed log fixtures under `services/session-state/**/__fixtures__/` — the schema widens to accept them, never the reverse (FR-011).
