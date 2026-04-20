# Tasks: Consolidate spatial types in LinkML + lat/lon ↔ GeoJSON converters

**Branch**: `203-spatial-types-linkml` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Generated**: 2026-04-20

## Evidence Requirements

**Evidence Directory**: `specs/203-spatial-types-linkml/evidence/`
**Media Directory**: `specs/203-spatial-types-linkml/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Aggregated pytest + vitest + Playwright results with YAML front matter | After Phase 5 (all tests pass) |
| `evidence/usage-example.md` | Code examples: import from `@debrief/schemas`, round-trip via converters, validator usage | After Phase 2 (foundation built) |
| `evidence/round-trip-evidence.md` | Python → JSON → TS → JSON → Python trace for `Coordinate`, `ViewportPolygon`, `TimeFilter` | After Phase 1 (regeneration) |
| `evidence/call-site-audit.md` | Before/after grep of hand-rolled tuple conversions at GeoJSON/Leaflet boundary (FR-016) | After Phase 4 (US2 complete) |
| `evidence/screenshots/vscode-map.png` | VS Code map panel rendering tracks from a REP sample | During FR-019 smoke tests |
| `evidence/screenshots/web-shell-map.png` | Web-shell map panel rendering same sample | During FR-019 smoke tests |
| `evidence/screenshots/viewport-restore.png` | Map after reload showing restored viewport from persisted state | During FR-019 smoke tests |
| `evidence/screenshots/time-filter-drag.png` | Timeline + map + list showing synchronised time filter | During FR-019 smoke tests |
| `evidence/schema-diff.md` | Generated TypeScript diff before/after regeneration (proves shapes converged) | After Phase 1 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning announcement (already created during /speckit.plan) | ✅ Done |
| `media/linkedin-planning.md` | LinkedIn planning summary (already created) | ✅ Done |
| `media/shipped-post.md` | "What we built" post — schema-first win, one-source-of-truth | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence attached | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup — LinkML Source Edit & Regeneration

**Goal**: Apply the two-class LinkML patch (`ViewportPolygon.zoom`, `TimeFilter` → nullable epoch integers) and regenerate all derived artefacts (Pydantic, TypeScript, JSON Schema). After this phase, the generated types under `shared/schemas/generated/` are the canonical shapes the rest of the refactor consumes.

**Checkpoint**: `task verify` may fail (expected — runtime still uses the duplicates). Schema tests from Phase 5 must later pass against these artefacts.

- [x] T001 Patch `ViewportPolygon` to add optional `zoom: float` attribute per `contracts/linkml-diff.md` §Change 1 `shared/schemas/src/linkml/session-state.yaml`
- [x] T002 Patch `TimeFilter` to use `range: integer` nullable attributes per `contracts/linkml-diff.md` §Change 2 (reverses current `TimeInstant`-based shape; `TimeInstant` remains used by `TimeRange`) `shared/schemas/src/linkml/session-state.yaml`
- [x] T003 [P] Add golden fixture exercising optional `zoom` on `ViewportPolygon` `shared/schemas/src/fixtures/valid/viewport-polygon-with-zoom-01.json`
- [x] T004 [P] Add `ViewportPolygon` fixture using object-form coordinates `shared/schemas/src/fixtures/valid/viewport-polygon-valid-01.json`
- [x] T005 [P] Add `TimeFilter` fixtures using nullable epoch-integer shape `shared/schemas/src/fixtures/valid/time-filter-valid-01.json`, `time-filter-unbounded-start-01.json`, `time-filter-empty-01.json`
- [x] T006 Regenerate Pydantic, TypeScript, and JSON Schema artefacts by running `uv run python scripts/generate.py --target all` (with PYTHONUTF8=1) — regenerated files committed under `shared/schemas/src/generated/`
- [x] T007 Verified regeneration produced expected shapes: `Coordinate` unchanged, `ViewportPolygon.zoom?: number` present, `TimeFilter.start?/end?: number` (optional integers) — evidence in `evidence/schema-diff.md`

**Parallel example (after T002 merges)**:
```
T003, T004, T005 in parallel — all touch distinct fixture files.
```


## Phase 2: Foundation — Converters, Validators, and Persistence Helper

**Goal**: Land the new `@debrief/utils` exports (`toGeoJSONCoord`, `fromGeoJSONCoord`, `validateCoordinate`, `validateViewportPolygon`, `calculateViewportCenter`) and the `coerceViewport` persistence helper. These are prerequisites for any story-phase work that swaps imports.

**Checkpoint**: `pnpm --filter @debrief/utils test` is green; new exports are available on the workspace.

### Tests-First (TDD per Constitution Article VII)

- [x] T008 [P][test] Wrote converter round-trip unit tests per `contracts/converter-contracts.md` (10 edge cases incl. antimeridian, poles, London/Tokyo/NY/Sydney, sub-metre precision) `shared/utils/tests/spatial-converters.test.ts`
- [x] T009 [P][test] Wrote validator unit tests per `contracts/validator-contracts.md` (bounds cases for `validateCoordinate`, 4-corner cardinality for `validateViewportPolygon`, centre averaging for `calculateViewportCenter`) `shared/utils/tests/spatial-validators.test.ts`
- [x] T010 [P][test] Wrote `coerceViewport` unit tests per `contracts/persistence-migration.md` §Contract assertions — 6 cases: legacy tuple form, current object form, null/undefined, bad coordinates length, malformed entry, bad zoom `services/session-state/tests/unit/persistence/coerceViewport.test.ts`

### Implementation

- [x] T011 Implemented `toGeoJSONCoord` and `fromGeoJSONCoord` with JSDoc explicitly stating GeoJSON axis order (RFC 7946 §3.1.1) per `contracts/converter-contracts.md` `shared/utils/src/spatial-converters.ts`
- [x] T012 Implemented `validateCoordinate`, `validateViewportPolygon`, `calculateViewportCenter` operating on object-form `Coordinate` per `contracts/validator-contracts.md` `shared/utils/src/spatial-validators.ts`
- [x] T013 Re-exported new modules from the `@debrief/utils` public barrel `shared/utils/src/index.ts`
- [x] T014 Implemented `coerceViewport` as a sibling to `coerceEpoch`; legacy-tuple branch annotated `REMOVABLE:` per `contracts/persistence-migration.md` — not yet hooked up (Phase 3 T021 replaces the blind cast) `services/session-state/src/persistence/load.ts`
- [x] T015 Ran T008, T009, T010 suites — all 32 tests green

**Parallel example**:
```
T008, T009, T010 in parallel — independent test files.
Then T011, T012, T014 in parallel — independent source files.
T013 after T011 + T012.
```


## Phase 3: User Story 1 — Single Source of Truth for Spatial Types (Priority: P1)

**Story goal**: A developer adding a new map-aware feature imports `Coordinate`, `ViewportPolygon`, and `TimeFilter` from `@debrief/schemas` and gets exactly one definition per type. No duplicates remain in hand-authored source.

**Independent test criterion** (from spec §US1): `rg "^export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)" --type ts` returns matches ONLY under `shared/schemas/src/generated/typescript/`.

### Delete duplicates (FR-008, FR-009, FR-010)

- [x] T016 Deleted the entire duplicate file `shared/components/src/utils/spatial-types.ts`
- [x] T017 Removed `Coordinate`, `ViewportPolygon`, validator declarations, and `calculateViewportCenter` from session-state spatial.ts; kept `SpatialSlice`, `SpatialActions`, `DrawingMode`, `DEFAULT_SPATIAL_SLICE`, `normalizeRotation`; re-exports canonical types from `@debrief/schemas` and validators from `@debrief/utils` `services/session-state/src/types/spatial.ts`
- [x] T018 Removed `TimeFilter` declaration; re-exports it from `@debrief/schemas` `services/session-state/src/types/temporal.ts`
- [x] T019 Bumped `SCHEMA_VERSION` from `'1.0.0'` to `'1.1.0'` `services/session-state/src/types/index.ts`
- [x] T020 Extended `SCHEMA_VERSION_HISTORY` to `['1.0.0', '1.1.0']` and added a no-op `'1.0.0'` branch to `migrateSession` (viewport shape migration happens inline via `coerceViewport`) `services/session-state/src/persistence/schema.ts`

### Swap imports & replace blind cast

- [x] T021 Replaced the blind cast at `load.ts:125` with `coerceViewport(spatial.viewport)`; legacy-tuple payloads rehydrate cleanly `services/session-state/src/persistence/load.ts`
- [x] T022 [P] Imports of `ViewportPolygon`/`Coordinate` via `@debrief/schemas`; validators from `@debrief/utils` `services/session-state/src/store/slices/spatial.ts`
- [x] T023 [P] `TimeFilter` imported from `@debrief/schemas` `services/session-state/src/store/slices/temporal.ts`
- [x] T024 [P] `ViewportPolygon` imported from `@debrief/schemas` `services/session-state/src/store/subscriptions.ts`
- [x] T025 [P] `calculateViewportCenter` imported from `@debrief/utils`; input coordinates are object-form `services/session-state/src/server/tools/setViewport.ts`
- [x] T026 [P] `ViewportPolygon`/`TimeFilter` imported from `@debrief/schemas` `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [x] T027 `apps/vscode/src/webview/mapPanel.ts` uses `fromGeoJSONCoord` at the webview → session-state boundary; coordinate indexing uses `.longitude`/`.latitude` `apps/vscode/src/`
- [x] T028 `apps/web-shell/` — no consumers of `Coordinate`/`ViewportPolygon`/`TimeFilter` from the duplicates. Viewport state reaches web-shell via the `@debrief/components` StacBrowser (already swapped) `apps/web-shell/src/`

### Verify independent test criterion

- [x] T029 Ran `rg "^export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)" --type ts` — only `shared/schemas/src/generated/typescript/types.ts` matches; see `evidence/call-site-audit.md` §SC-001 `specs/203-spatial-types-linkml/evidence/call-site-audit.md`

**Parallel example**:
```
T022, T023, T024, T025, T026 in parallel — all independent import swaps in separate files.
T027 and T028 in parallel — separate app packages.
```


## Phase 4: User Story 2 — Safe GeoJSON / Leaflet Interop at the Boundary (Priority: P1)

**Story goal**: Every GeoJSON or Leaflet boundary crossing in touched code uses the named converters. No hand-rolled `[coord.longitude, coord.latitude]` or `[c[0], c[1]]` constructions survive in code this feature touches (FR-016, FR-022).

**Independent test criterion** (from spec §US2): `@debrief/utils` exports `toGeoJSONCoord` and `fromGeoJSONCoord` with round-trip unit tests (already in T008). Adapter code at the boundary calls these helpers. Grep the diff for hand-rolled tuple constructions and see only calls through the helpers.

### Rewrite tuple consumers (FR-011, FR-022, not just import-swap)

- [x] T030 Rewrote `viewportToBounds` from tuple indexing to object-field access; `ViewportPolygon` imported from `@debrief/schemas`; docstring flags 4-corner constraint and the `Math.min(...lons)` scaling trap (FR-022) `shared/components/src/utils/bounds.ts`
- [x] T031 [test] Updated `bounds.test.ts` to use object-form fixtures; added new case asserting correct bounds from object-form coordinates (Sydney-area regression) `shared/components/src/utils/bounds.test.ts`

### Boundary audit (FR-016)

- [x] T032 Audited GeoJSON-facing call sites across apps/vscode, apps/web-shell, shared/components, services/session-state/server — findings in `evidence/call-site-audit.md` §FR-016 `specs/203-spatial-types-linkml/evidence/call-site-audit.md`
- [x] T033 Each replaced site is covered by existing unit tests (spatial.test.ts, bounds.test.ts, useBrowserFilter.test.ts, mcp.test.ts); no additional assertions needed at this stage

### Verify story-level independent test

- [x] T034 Ran `pnpm --filter @debrief/utils test` — 202 tests green post-adoption
- [x] T035 Grep confirms: no hand-rolled `[longitude, latitude]` / `[lon, lat]` constructions outside `spatial-converters.ts` — documented in the audit log

**Parallel example**:
```
T030 and T031 sequential (test drives impl).
T032 is single-threaded audit; T033 can fan out per site if many surface.
```


## Phase 5: User Story 3 — Schema Round-Trip Tests Pass After Regeneration (Priority: P1)

**Story goal**: Golden fixtures + round-trip (Py → JSON → TS → JSON → Py) + schema-comparison adherence tests all pass for `Coordinate`, `ViewportPolygon`, `TimeFilter` against the regenerated artefacts (FR-005, FR-006, FR-007).

**Independent test criterion** (from spec §US3): `uv run pytest shared/schemas/` and `pnpm --filter @debrief/schemas test` both green, covering the three types via the fixtures created/edited in Phase 1.

### Refit existing session-state tests to new shapes

- [x] T036 [P][test] Updated spatial.test.ts to use object-form `Coordinate` fixtures; imports `ViewportPolygon` from `@debrief/schemas` `services/session-state/tests/unit/slices/spatial.test.ts`
- [x] T037 [P][test] Updated temporal.test.ts partial-filter case to use missing-key (undefined) rather than explicit null, per FR-021 `services/session-state/tests/unit/slices/temporal.test.ts`
- [x] T038 [P][test] browser-filter.test.ts uses epoch numbers and string shapes — no refactor required `services/session-state/tests/unit/slices/browser-filter.test.ts`
- [x] T039 [P][test] Added integration case: load v1.0.0 tuple-form payload → rehydrated viewport in object form (mirrors contracts/persistence-migration.md §Integration test) `services/session-state/tests/unit/persistence.test.ts`
- [x] T040 [P][test] tests/unit/temporal.test.ts only covers TimeRange converters — no `TimeFilter` references, no refactor required `services/session-state/tests/unit/temporal.test.ts`
- [x] T041 [P][test] Updated useBrowserFilter.test.ts fixtures to object-form ViewportPolygon via `rectViewport` helper; TimeFilter typed from `@debrief/schemas` `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`

### Run schema adherence suite

- [x] T042 Ran `uv run pytest shared/schemas/tests/test_roundtrip.py shared/schemas/tests/test_schema_compare.py` — **230 passed**. Golden fixtures, round-trip, and Pydantic-vs-LinkML JSON Schema comparison all pass for the three types
- [x] T043 Ran `pnpm --filter @debrief/schemas test` — **11 tests passed**, TS-side adherence suite green
- [x] T044 Full test sweeps: `pnpm -r typecheck` clean; `pnpm --filter '!@debrief/web-shell' test` green; `uv run pytest --ignore=.../test_boundary_enforcement.py` — 1660 passed (6 unrelated config-workflow pre-existing failures verified on main branch, not introduced by feature 203)

### Capture evidence

- [x] T045 Captured Python → JSON → TS → JSON → Python trace for Coordinate, ViewportPolygon, TimeFilter — `evidence/round-trip-evidence.md`
- [x] T046 Schema diff captured — `evidence/schema-diff.md` (already produced in Phase 1)

**Parallel example**:
```
T036, T037, T038, T039, T040, T041 in parallel — independent test files.
T042 and T043 in parallel — separate runners.
```


## Phase 6: User Story 4 — Runtime Map / Viewport / Time Filtering Still Works (Priority: P2)

**Story goal**: Behavioural parity — loading a sample plot in VS Code and web-shell still renders tracks, persists viewport across reload, applies time filtering, and keeps three-view-sync (#132) working.

**Independent test criterion** (from spec §US4): FR-019 smoke-test set executed manually; screenshots saved under `specs/203-spatial-types-linkml/evidence/screenshots/`; Playwright E2E suites still green (covered by `task verify`).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks assuming browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

### Automated regression gate

- [ ] T047 Run `node apps/web-shell/run-playwright.mjs` — confirm the web-shell E2E suite passes end-to-end with the consolidated types
- [ ] T048 [P] Run the VS Code webview E2E suite (per `apps/vscode/` test config) — confirm it passes with the consolidated types

### Manual smoke tests (FR-019) — capture screenshots

- [ ] T049 [P] Smoke test: VS Code map panel — load a REP sample, confirm tracks render; capture `specs/203-spatial-types-linkml/evidence/screenshots/vscode-map.png`
- [ ] T050 [P] Smoke test: web-shell map panel — load same sample, confirm tracks render; capture `specs/203-spatial-types-linkml/evidence/screenshots/web-shell-map.png`
- [ ] T051 Smoke test: viewport persistence — pan/zoom in VS Code map, reload the workspace, confirm viewport is restored; capture `specs/203-spatial-types-linkml/evidence/screenshots/viewport-restore.png`
- [ ] T052 Smoke test: time filter drag — in web-shell, drag the time slider and confirm timeline, map, and feature list all reflect the same filter window; capture `specs/203-spatial-types-linkml/evidence/screenshots/time-filter-drag.png`
- [ ] T053 Smoke test: three-view-sync (#132) — select a feature in map, confirm the timeline highlight and list selection follow; inverse direction too; note in the smoke-test log under evidence
- [ ] T054 Smoke test: legacy tuple-form rehydration — load a session file saved before this feature (version `1.0.0`), confirm viewport rehydrates cleanly without console errors; confirm rewritten file bumps to version `1.1.0`

**Parallel example**:
```
T049, T050 in parallel — distinct hosts.
T051, T052, T053 sequential within a single running session to preserve state.
```


## Phase 7: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T055 Capture aggregated test results using the template at `.specify/templates/evidence/test-summary-template.md` (include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/203-spatial-types-linkml/evidence/test-summary.md`
- [ ] T056 [P] Create usage demonstration: import `Coordinate` / `ViewportPolygon` / `TimeFilter` from `@debrief/schemas`; round-trip a coordinate via `toGeoJSONCoord`/`fromGeoJSONCoord`; validate with `validateViewportPolygon` `specs/203-spatial-types-linkml/evidence/usage-example.md`

### Final Verification

- [ ] T057 Run `task verify` end-to-end (lint, typecheck, test) and confirm green on all packages
- [ ] T058 Confirm SC-001: grep the merged tree for `export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)` — matches only in `shared/schemas/src/generated/typescript/`
- [ ] T059 Confirm SC-006: net line count: deletions ≥ 70 lines of duplication, net additions ≤ +100 lines (record the actual numbers in `evidence/test-summary.md`)

### Media Content

- [ ] T060 Spawn Content Specialist via Task tool (see `.claude/agents/media/content.md`) to create a Shipped Post following the template; include: What We Built (schema as source of truth), Lessons Learned (blind-cast trap at `load.ts:125`, the `viewportToBounds` rewrite hazard), What's Next (4 follow-up items from spec §Follow-up Work) `specs/203-spatial-types-linkml/media/shipped-post.md`
- [ ] T061 [P] Create LinkedIn shipped summary (150-200 words) with hook on "one type, one source of truth" — link placeholder for the blog URL `specs/203-spatial-types-linkml/media/linkedin-shipped.md`

### PR Creation

- [ ] T062 Create PR and publish blog: run `/speckit.pr`

**Task T062 must run last. It depends on all evidence and media tasks being complete.**


## Dependencies

**Phase ordering** (hard dependencies):

```
Phase 1 (Setup: LinkML patch + regenerate)
   │
   ▼
Phase 2 (Foundation: utils exports + coerceViewport)
   │
   ├──────────────────────────────────┐
   ▼                                  ▼
Phase 3 (US1: delete duplicates,     Phase 5 (US3: schema adherence)
         swap imports)                can start in parallel once Phase 1
   │                                  is green, but final run (T042-T044)
   ▼                                  needs Phase 3 import swaps done.
Phase 4 (US2: rewrite viewportToBounds,
         boundary audit)
   │
   ▼
Phase 6 (US4: runtime smoke tests) — requires Phase 3+4+5 all green
   │
   ▼
Phase 7 (Polish + PR) — final
```

**Story-level notes**:

- **US1 (Phase 3) blocks US2 (Phase 4)**: the boundary audit must happen against consolidated imports.
- **US3 (Phase 5) can proceed in parallel with US1** after Phase 1 regeneration, but test-file edits (T036-T041) must land only after the duplicates are removed (T017/T018) — otherwise tests fail mid-flight.
- **US4 (Phase 6) depends on all three P1 stories** — behavioural verification runs last.
- **Phase 7 (Polish)** assumes everything green.

**Critical pinch points**:

- T006 (regeneration) gates everything downstream.
- T015 (utils tests green) gates all import-swap work.
- T021 (replace blind cast at `load.ts:125`) — required for legacy payload rehydration tests in T039 and the FR-018 acceptance scenario in T054.
- T044 (full test sweep) — last gate before smoke tests in Phase 6.


## Implementation Strategy

**Incremental delivery**: each phase leaves the tree more consolidated than the last. The repo is intentionally in a "half-migrated" state between phases — callers compile against the old duplicates until the import swap lands — but no phase should be split across commits; every merge point is a green `task verify`.

**Suggested commit organisation** (atomic per Article XIII):

1. `schema(203): patch ViewportPolygon.zoom + TimeFilter epoch integers` — Phase 1 (T001-T007)
2. `feat(utils): add spatial converters, validators, coerceViewport` — Phase 2 (T008-T015)
3. `refactor(203): consolidate spatial types to @debrief/schemas` — Phase 3 (T016-T029)
4. `refactor(203): rewrite viewportToBounds for object-form coordinates` — Phase 4 (T030-T035)
5. `test(203): refit session-state + components tests to canonical shapes` — Phase 5 (T036-T046)
6. `chore(203): capture evidence + runtime smoke tests` — Phase 6 (T047-T054)
7. `docs(203): shipped post + media + final evidence` — Phase 7 (T055-T061), then T062 opens PR

**MVP slice** (if a partial land becomes necessary): Phases 1 + 2 + 3 + 5 deliver the core "single source of truth" win without the boundary audit. Phase 4 (US2) can be a follow-up commit if scope pressure arrives — but the team already committed to landing it together in review Decision 5A. Keep them bundled.

**Parallel opportunities summary**:

- Phase 1: 3 parallel fixture tasks (T003, T004, T005).
- Phase 2: 3 parallel test files (T008, T009, T010); 3 parallel source files (T011, T012, T014).
- Phase 3: 5 parallel import-swap tasks (T022-T026); 2 parallel app audits (T027, T028).
- Phase 5: 6 parallel test-file refits (T036-T041); 2 parallel adherence runs (T042, T043).
- Phase 6: 2 parallel E2E suites (T047, T048); 2 parallel host smoke tests (T049, T050).
- Phase 7: Shipped post and LinkedIn summary (T060, T061) in parallel.

**Risk-mitigation hooks**:

- After T006, run the regenerated schema adherence tests in isolation before touching any consumer code — catches generator misconfigurations early.
- After T021 (replacing blind cast), add a temporary `console.warn` inside the legacy-tuple branch of `coerceViewport` and run the web-shell locally to verify any real saved state is detected and migrated; remove the warn before merge.
- Before Phase 7, rebase onto `main` to catch regeneration conflicts with items #204/#205 if they land first (see spec §Parallelisation).

