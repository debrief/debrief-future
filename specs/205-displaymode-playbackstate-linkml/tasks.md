# Tasks: Schema-Rooted DisplayMode and PlaybackState Enums

**Input**: Design documents from `specs/205-displaymode-playbackstate-linkml/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/linkml-enums.md, quickstart.md

**Tests**: Tests are INCLUDED. Three explicit test-creation decisions from review: 9A (new `persistence.test.ts` load-boundary cases), 10A (new `PlaybackControls.test.tsx` 3-state coverage), 11B (new `test_regen_idempotent.py`). Schema adherence tests (golden, round-trip, schema-compare) are mandatory per Article II.2.

**Organization**: Tasks are grouped by user story (US1 = P1 canonical vocabulary end to end, US2 = P2 deletion of duplicates + translators + IPC retypes, US3 = P3 guard rails + documented `stopped ≡ paused` rule). Each user story is an independent increment within the single atomic PR (SC-009).

**Review decisions incorporated**: All 15 round-1 decisions (1A, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 9A, 10A, 11B, 12A, D1, D2, D3) plus 4 round-2 decisions (R2-1A LoadResult return-pattern, R2-2A guard-script emoji style, R2-3A LoadResult assertion shape, R2-4A `tmp_path` idempotency test). Total: **19 review decisions**.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, the shipped blog post, and the ADR.

**Evidence Directory**: `specs/205-displaymode-playbackstate-linkml/evidence/`
**Media Directory**: `specs/205-displaymode-playbackstate-linkml/media/`

### Feature-type classification

This is a **Schema Change** feature (LinkML enum vocabulary rename + TypeScript type-duplicate deletion + IPC retypes + load-boundary validation hardening). Required evidence per the Quality Rubric:

- **Round-trip proof**: Python → JSON → TypeScript → JSON → Python byte-identical for 5 canonical fixtures (one per permissible value) (SC-008)
- Plus the mandatory `test-summary.md` and `usage-example.md`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Full CI pass/fail counts from `task verify`, with YAML front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct). Highlights: schema adherence (5 valid + 2+ invalid fixtures); 3 new `PlaybackControls.test.tsx` cases; new `persistence.test.ts` legacy-rejection cases; `test_regen_idempotent.py` pass. | After all tests pass |
| `evidence/usage-example.md` | Minimal TypeScript snippet showing `import { DisplayMode, PlaybackState } from '@debrief/schemas'` + assignment using the canonical vocabulary. Shows both the template-literal string-literal assignability AND the enum-member form. | After Phase 4 complete |
| `evidence/round-trip-evidence.md` | 5-fixture round-trip table (Python validate → dump → TS parse → stringify → Python validate); byte-identical column per permissible value (SC-008). Plus 2 invalid-fixture entries showing validation rejection. | After T0XX (schema fixtures green) |
| `evidence/grep-before-after.txt` | `grep -rnE '^(export\s+)?type\s+(DisplayMode\|PlaybackState)\b' apps/ shared/ services/` on main vs on PR branch; shows 4 hits on main, 0 hits on PR branch. Plus the legacy-vocabulary translator grep (SC-001, SC-002). | After Phase 4 complete |
| `evidence/regen-idempotency-proof.txt` | Output of `uv run pytest shared/schemas/tests/test_regen_idempotent.py -v`; confirms two consecutive `generate.py all` runs produce byte-identical sandboxed output (SC-014; R2-4A tmp_path sandbox so working tree is clean). | After the idempotency test is green |
| `evidence/load-boundary-validation.md` | Transcript of the three new `persistence.test.ts` negative cases firing — legacy `snailTrail`, legacy `normal`, typo `palying` — each returning `LoadResult { success: false, error: '...' }` with the expected error-string regex match (R2-1A + R2-3A). | After T0XX green |
| `evidence/guard-script-transcripts.txt` | `scripts/check-no-hand-typed-temporal-enums.sh` pass + simulated-fail transcripts; `scripts/check-adr-refs.sh` pass transcript showing the new `ADR-NN` reference from `session-state.yaml` resolving cleanly to `decisions.md` (SC-013, SC-016). | After guard scripts green |
| `evidence/ipc-retype-inventory.md` | Before/after for the 5 IPC shapes + 4 callback types in `apps/vscode/` (review 2A) and the deleted silent-narrowing translator at `timeRangeView.ts:241` (review 3A). | After Phase 4 complete |
| `evidence/ci-pipeline.txt` | `task verify` full output on the final commit. | Before PR creation |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | During `/speckit.plan` (already done) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | During `/speckit.plan` (already done) |
| `media/shipped-post.md` | Blog post celebrating completion; includes grep-before-after + round-trip-evidence numbers | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with all evidence attached | Final task (T0XX) |
| Blog PR | PR in debrief.github.io with shipped-post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Verify the baseline is green before the consolidation begins, and create the directory scaffolding for fixtures + evidence. No code changes in this phase.

- [x] T00- [ ] T001 Verify baseline is green on branch `205-displaymode-playbackstate-linkml` — run `task verify` (or the four-step fallback from CLAUDE.md "Before Pushing" section) and confirm lint + typecheck + all existing tests pass. Halt and investigate any pre-existing failure before proceeding. No file.
- [x] T00- [ ] T002 [P] Create fixture directory scaffolding `shared/schemas/fixtures/temporal-enums/valid/`
- [x] T00- [ ] T003 [P] Create fixture directory scaffolding `shared/schemas/fixtures/temporal-enums/invalid/`
- [x] T00- [ ] T004 [P] Create evidence directory `specs/205-displaymode-playbackstate-linkml/evidence/`
- [x] T00- [ ] T005 [P] Capture pre-change grep inventory (for the round-1 SC-001/SC-002 before/after evidence): run both the hand-typed-decl and translator-ternary greps against the current tree and save the output to `specs/205-displaymode-playbackstate-linkml/evidence/grep-before-after.txt` with a "BEFORE" header; the "AFTER" half is appended in Phase 6.

**Checkpoint**: Baseline green, directories exist, pre-change grep inventory captured. Ready for schema-source edits.

---

## Phase 2: Foundational — Schema + Generator + Regen + Adherence Tests

**Purpose**: Establish the LinkML source edits, extend the generator post-processor, regenerate all derived artefacts, and add the schema-adherence fixtures + tests. Every user story below depends on this being complete and green.

**⚠️ CRITICAL**: No US1/US2/US3 work can begin until Phase 2 passes `uv run pytest shared/schemas/tests/` + `pnpm --filter @debrief/schemas build` + the 9 grep-based acceptance checks (Contract §6 checks 2–5).

### Schema source edit

- [x] T00- [ ] T006 Rename `DisplayModeEnum` permissible values from `normal|snailTrail` to `full|trail` in `shared/schemas/src/linkml/session-state.yaml` (FR-002). Update both value descriptions per contracts/linkml-enums.md §1.
- [x] T00- [ ] T007 Update `PlaybackStateEnum.description` to the short UI-agnostic form citing `See ADR-NN in docs/project_notes/decisions.md` (FR-003 + review 7A + R2-1A locked). `ADR-NN` is a placeholder — finalised in T057. Do NOT embed UI-element language (play button, pause button, playhead) — those details live in the ADR body only. File: `shared/schemas/src/linkml/session-state.yaml`.

### Generator post-processor

- [x] T00- [ ] T008 Extend `shared/schemas/scripts/generate.py` with a new post-processor block that (a) injects `export type PlaybackState = \`${PlaybackStateEnum}\`;` and `export type DisplayMode = \`${DisplayModeEnum}\`;` immediately after their respective `export enum` declarations, (b) narrows `TemporalSlice.playbackState: string` → `PlaybackState` and `TemporalSlice.displayMode: string` → `DisplayMode`, and (c) raises `RuntimeError` if the TemporalSlice field-narrowing sentinel tokens are not found (matching the `RawGeoJSONFeature` rule at `generate.py:517-523`). Follow the exact code shape in contracts/linkml-enums.md §2. Place the new block after the existing Feature 201 `PointShape` block (lines 439-475) and before the `#214` GeoJSONFeature-tagging block (lines 477-484). File: `shared/schemas/scripts/generate.py`.

### Regenerate artefacts

- [x] T00- [ ] T009 Run `uv run python shared/schemas/scripts/generate.py all` from the `shared/schemas/` directory. Commit the regenerated `shared/schemas/src/generated/python/debrief_schemas/__init__.py`, `shared/schemas/src/generated/typescript/types.ts`, and `shared/schemas/src/generated/json-schema/debrief.schema.json` in step. No file — this is a regen command producing the three files above.
- [x] T010 Verify canonical values in generated TypeScript: `grep -E '^\s+(full|trail|stopped|playing|paused) = "' shared/schemas/src/generated/typescript/types.ts` returns exactly 5 matches. Verify `export type PlaybackState = \`${PlaybackStateEnum}\`;` and `export type DisplayMode = \`${DisplayModeEnum}\`;` are present. Verify `TemporalSlice.playbackState: PlaybackState` and `.displayMode: DisplayMode` (not `string`). Verify zero occurrences of legacy `"normal"` or `"snailTrail"` under `shared/schemas/src/generated/`. No file — this is a verification step (covered by Contract §6 checks 2–5).

### Schema fixtures

- [x] T011 [P] Create valid fixture `shared/schemas/fixtures/temporal-enums/valid/playback-state-stopped.json` per contract §5.
- [x] T012 [P] Create valid fixture `shared/schemas/fixtures/temporal-enums/valid/playback-state-playing.json` per contract §5.
- [x] T013 [P] Create valid fixture `shared/schemas/fixtures/temporal-enums/valid/playback-state-paused.json` per contract §5.
- [x] T014 [P] Create valid fixture `shared/schemas/fixtures/temporal-enums/valid/display-mode-full.json` per contract §5.
- [x] T015 [P] Create valid fixture `shared/schemas/fixtures/temporal-enums/valid/display-mode-trail.json` per contract §5.
- [x] T016 [P] Create invalid fixture `shared/schemas/fixtures/temporal-enums/invalid/invalid-display-mode-legacy-snailtrail.json` (regression guard — must fail Pydantic validation).
- [x] T017 [P] Create invalid fixture `shared/schemas/fixtures/temporal-enums/invalid/invalid-playback-state-typo.json` (`"playbackState": "palying"`).

### Schema-adherence tests

- [x] T018 Extend `shared/schemas/tests/test_golden.py` ENTITY_MAP with new entries pointing at the temporal-enum fixtures so the golden-fixture harness covers both enums (FR-008 / SC-005). File: `shared/schemas/tests/test_golden.py`.
- [x] T019 [test] Extend `shared/schemas/tests/test_roundtrip.py` to cover the 5 canonical enum-value fixtures Python → JSON → TypeScript → JSON → Python (SC-008). File: `shared/schemas/tests/test_roundtrip.py`.
- [x] T020 [test] Extend `shared/schemas/tests/test_schema_compare.py` so that for each of `PlaybackStateEnum` and `DisplayModeEnum` the set of permissible values in the LinkML YAML equals the set in the Pydantic `Enum._member_map_` equals the set in the generated JSON Schema `enum` array. File: `shared/schemas/tests/test_schema_compare.py`.

### Regen-idempotency test (review 11B / FR-030 / SC-014; R2-4A)

- [x] T021 [test] Create `shared/schemas/tests/test_regen_idempotent.py` per quickstart.md §3 "New pytest". The test MUST use pytest's `tmp_path` fixture and `shutil.copytree` to sandbox the regen run — the committed `shared/schemas/src/generated/` directory MUST NEVER be mutated by this test (R2-4A). Assert that two consecutive `generate.py all` runs in the sandbox produce byte-identical output. File: `shared/schemas/tests/test_regen_idempotent.py`.

**Checkpoint**: Run `uv run pytest shared/schemas/tests/` — all tests green (including the 5 new valid fixtures, 2+ invalid, round-trip, schema-compare, and regen-idempotency). Zero `"normal"` / `"snailTrail"` strings remain under `shared/schemas/src/generated/`. Ready for US1.

---

## Phase 3: US1 (P1) — Single schema-rooted vocabulary end to end

**Story goal (from spec §US1)**: A developer writing code that touches track display mode or playback state imports `DisplayMode` and `PlaybackState` from `@debrief/schemas` (or its workspace-level re-exports). One vocabulary per concept, generated from LinkML, consistent across Python, TypeScript, and JSON Schema.

**Independent test criterion**: Regenerate Pydantic + TypeScript from the updated LinkML schema. Import `DisplayMode` + `PlaybackState` from `@debrief/schemas` and their Pydantic equivalents from `debrief_schemas`. Construct a `TemporalSlice`-like value using every permissible enum value (`full`, `trail`, `stopped`, `playing`, `paused`) and confirm both languages accept it without casts. Schema round-trip tests pass for all 5 fixtures.

**Status**: The generated enums ship as part of Phase 2 (T009). The US1-specific tasks below confirm the canonical type surface is exported cleanly from `@debrief/schemas` and re-exported from the component + session-state barrels so that US2's consumer migration (Phase 4) has zero friction.

- [x] T022 Verify `@debrief/schemas` barrel re-exports `DisplayModeEnum`, `PlaybackStateEnum`, `DisplayMode`, `PlaybackState`. Check `shared/schemas/src/generated/typescript/index.ts` and the `@debrief/schemas` package's `exports` field in `shared/schemas/package.json`. No file edit expected (the generated TS barrel already re-exports `types.js`) — this is a verification step.
- [x] T023 Add `DisplayMode` / `PlaybackState` re-exports to the `@debrief/components` barrel at `shared/components/src/index.ts` so existing consumers of `@debrief/components` see no import-path churn after US2. File: `shared/components/src/index.ts`.
- [x] T024 Add `DisplayMode` / `PlaybackState` re-exports to the `@debrief/session-state` public surface (if the package has a barrel). Confirm via `grep -rnE "export.*from './types/temporal'" services/session-state/src/index.ts`. File: `services/session-state/src/index.ts` (if needed — may already re-export via `./types/temporal`).
- [x] T025 Run `pnpm -r typecheck` and confirm `@debrief/schemas`, `@debrief/components`, `@debrief/session-state` all build cleanly on the new generated types. No file — verification step only.

**Checkpoint (US1 complete)**: `import type { DisplayMode, PlaybackState } from '@debrief/schemas'` works from any workspace consumer. Schema adherence is green. Ready for US2's bulk migration.

---

## Phase 4: US2 (P2) — Clean deletion of hand-typed copies, translator sites, and IPC drift

**Story goal (from spec §US2)**: Zero hand-typed `type DisplayMode` / `type PlaybackState` declarations remain outside generated artefacts. Every former consumer imports the canonical types from `@debrief/schemas`. All 8 translator ternaries/helpers are gone; the 5 IPC shapes + 4 callback types in `apps/vscode/` are retyped; the silent narrowing at `timeRangeView.ts:241` is deleted; `persistence/load.ts` validates at the boundary and has the two `as never` casts removed.

**Independent test criterion**: Run `grep -rE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' apps/ shared/ services/` (excluding generated) and confirm zero matches. Run `task verify` and confirm lint + typecheck + unit + Playwright all pass.

### Session-state migration

- [x] T026 Delete `export type PlaybackState = 'stopped' | 'playing' | 'paused';` (line 105) and `export type DisplayMode = 'normal' | 'snailTrail';` (line 110) from `services/session-state/src/types/temporal.ts` (FR-012, FR-013). Replace with `import type { PlaybackState, DisplayMode } from '@debrief/schemas';` at the top of the file and `export type { PlaybackState, DisplayMode };` immediately below. Remove the "Not migrated: ... discriminated union literals for type safety" comment block on `TemporalSlice` (FR-014, FR-015). File: `services/session-state/src/types/temporal.ts`.
- [x] T027 Update `DEFAULT_TEMPORAL_SLICE.displayMode` from `'normal'` to `'full'` at `services/session-state/src/types/temporal.ts` line 149 (FR-013 + SC-011).
- [x] T028 Update import in `services/session-state/src/store/slices/temporal.ts` if necessary (likely unchanged since it imports from `../types/temporal`). Verify via `grep -n "PlaybackState\|DisplayMode" services/session-state/src/store/slices/temporal.ts`. File: `services/session-state/src/store/slices/temporal.ts`.

### Load-boundary validation (review 1A + D2 + R2-1A)

- [x] T029 Edit `services/session-state/src/persistence/load.ts` per quickstart.md §1D.2 revised scaffold: (a) add `import { DisplayModeEnum, PlaybackStateEnum, type DisplayMode, type PlaybackState } from '@debrief/schemas';` near the top; (b) add the `validateEnumMember<T extends string>(value, permissible): T | null` helper function; (c) replace the `as never` cast at line 117 (`setStepSize(temporal.stepSize as never)`) with `setStepSize(temporal.stepSize as TimeStep)`; (d) replace the `as never` cast at line 123 with the validation branch that short-circuits via `return { success: false, error: 'Invalid temporal.displayMode: ...' }` on failure per the `LoadResult` return-convention (R2-1A — **no `SessionLoadError` class, no `throw`**); (e) add the parallel playbackState-validation branch guarded by `if (temporal.playbackState !== undefined)`. File: `services/session-state/src/persistence/load.ts`.

### Session-state test-assertion updates (review 8A)

- [x] T030 Update three specific test-assertion sites to the canonical vocabulary (review 8A): `services/session-state/tests/unit/slices/temporal.test.ts` line 44 (`expect(...).toBe('normal')` → `toBe('full')`); same file line 146 (same substitution); `services/session-state/tests/unit/persistence.test.ts` line 207 (fixture literal `displayMode: 'normal'` → `'full'`). These are the ONLY three sites carrying the legacy literal (verified by grep). File (singular edit spread across two files): `services/session-state/tests/unit/slices/temporal.test.ts` + `services/session-state/tests/unit/persistence.test.ts`.

### Session-state new test cases for load-boundary validation (review 9A / FR-028 / R2-3A)

- [x] T031 [test] Extend `services/session-state/tests/unit/persistence.test.ts` with the `describe('loadSessionState — temporal enum validation (Feature 205 / FR-023a)', ...)` block from quickstart.md §3 "New persistence.test.ts cases". Four cases: three negatives asserting `result.success === false` + `result.error` regex match (for legacy `snailTrail`, legacy `normal`, typo `palying`); one positive iterating every canonical permissible-value combination asserting `result.success === true` + `result.error === undefined`. **MUST NOT use `rejects.toThrow` — assertions on `LoadResult` structure only** (R2-3A). File: `services/session-state/tests/unit/persistence.test.ts`.

### Component package — hand-typed declaration deletion + widening

- [x] T032 Delete `export type DisplayMode = 'full' | 'trail';` at `shared/components/src/utils/types.ts` line 80 (FR-010). Add `export type { DisplayMode } from '@debrief/schemas';` in its place so package consumers keep seeing the symbol via the same import path. File: `shared/components/src/utils/types.ts`.
- [x] T033 Edit `shared/components/src/TimeController/types.ts` per quickstart.md §1B (corrected recipe, review 5A): replace the two import lines at the top so `DisplayMode` + `PlaybackState` come from `@debrief/schemas` while `TimeExtent` continues to come from `../utils/types`. Delete line 17 (`export type PlaybackState = 'playing' | 'paused';`) (FR-011). Widen `PlaybackControlsProps.playbackState` and `UseTimePlaybackResult.playbackState` to the three-state `PlaybackState` (FR-016). File: `shared/components/src/TimeController/types.ts`.
- [x] T034 Widen `ActivityPanel/types.ts` line 94 prop from `playbackState?: 'playing' | 'paused'` to `playbackState?: PlaybackState` (FR-016). Add `PlaybackState` import from `@debrief/schemas` at the top. File: `shared/components/src/ActivityPanel/types.ts`.

### Component package — useTimePlayback internal narrowing comment (FR-024)

- [x] T035 Add a one-line doc comment to `shared/components/src/TimeController/useTimePlayback.ts` above the `const [playbackState, setPlaybackStateInternal] = useState<PlaybackState>('paused');` declaration explaining why the internal state is narrowed to two values (public surface accepts three; the hook never receives `'stopped'` because its own setters only write `'playing'` / `'paused'`). Reference the ADR via its ID (FR-024). File: `shared/components/src/TimeController/useTimePlayback.ts`.

### Component package — import-rename-only files (parallel)

- [x] T036 [P] Update import in `shared/components/src/TimeController/TimeController.tsx` to pull `DisplayMode` + `PlaybackState` via the local `./types` re-export (which now points at `@debrief/schemas`). No behavioural change. File: `shared/components/src/TimeController/TimeController.tsx`.
- [x] T037 [P] Update import in `shared/components/src/TimeController/DisplayModeToggle.tsx` (no value change — already uses `'full'` / `'trail'` literals). File: `shared/components/src/TimeController/DisplayModeToggle.tsx`.
- [x] T038 [P] Update import in `shared/components/src/TimeController/PlaybackControls.tsx`; confirm the existing `isPlaying = playbackState === 'playing'` derivation still correctly treats `'stopped'` identically to `'paused'` (FR-023). File: `shared/components/src/TimeController/PlaybackControls.tsx`.
- [x] T039 [P] Update import in `shared/components/src/TimeController/TimeController.test.tsx`. File: `shared/components/src/TimeController/TimeController.test.tsx`.
- [x] T040 [P] Update import in `shared/components/src/TimeController/useTimePlayback.test.ts`. File: `shared/components/src/TimeController/useTimePlayback.test.ts`.
- [x] T041 [P] Update import in `shared/components/src/TimeController/TimeController.stories.tsx` (also extended in T054). File: `shared/components/src/TimeController/TimeController.stories.tsx`.
- [x] T042 [P] Update import in `shared/components/src/MapView/MapView.tsx`. File: `shared/components/src/MapView/MapView.tsx`.
- [x] T043 [P] Update import in `shared/components/src/MapView/TemporalTrackLayer.tsx`. File: `shared/components/src/MapView/TemporalTrackLayer.tsx`.
- [x] T044 [P] Update import in `shared/components/src/MapView/useTemporalTrack.ts`. File: `shared/components/src/MapView/useTemporalTrack.ts`.
- [x] T045 [P] Update import in `shared/components/src/MapView/SensorBearingLayer.tsx`. File: `shared/components/src/MapView/SensorBearingLayer.tsx`.
- [x] T046 [P] Update import in `shared/components/src/MapView/sensor-utils.ts`. File: `shared/components/src/MapView/sensor-utils.ts`.
- [x] T047 [P] Update imports in the four MapView stories — `ExerciseAlpha.stories.tsx`, `PositionStyling.stories.tsx`, `SensorRendering.stories.tsx`, `TemporalTrack.stories.tsx`. Files: `shared/components/src/MapView/{ExerciseAlpha,PositionStyling,SensorRendering,TemporalTrack}.stories.tsx` (4 files).
- [x] T048 [P] Update import in `shared/components/src/ActivityPanel/ActivityPanel.tsx`. File: `shared/components/src/ActivityPanel/ActivityPanel.tsx`.

### VS Code extension — translator deletions + IPC retypes + silent-narrowing deletion (review 2A + 3A + 4A)

- [x] T049 Edit `apps/vscode/src/views/activityPanelView.ts` per quickstart.md §1C + §1D.1: (a) retype `TemporalDisplayModeMessage.payload.mode: 'full' | 'trail'` at lines 47–49 to `DisplayMode` (FR-022 bullet 1); (b) delete the four DisplayMode translation ternaries at lines 210, 252, 434, 467 — replace with direct pass-through (FR-018). Add `DisplayMode` import from `@debrief/schemas` at the top. File: `apps/vscode/src/views/activityPanelView.ts`.
- [x] T050 Edit `apps/vscode/src/views/timeRangeView.ts` per quickstart.md §1D.1 (broadest scope — five edits): (a) retype `PlaybackStateChangeMessage.state` at lines 28–31 to `PlaybackState` (FR-022 bullet 2); (b) retype `DisplayModeChangeMessage.mode` at lines 33–36 to `DisplayMode` (FR-022 bullet 3); (c) widen both private callback types at lines 64–65 (FR-022 bullet 4); (d) widen both public method types at lines 322 and 329 (FR-022 bullet 4); (e) **delete the silent-narrowing translator at line 241** (`state.setPlaybackState(message.state === 'playing' ? 'playing' : 'paused')` → `state.setPlaybackState(message.state)`) per FR-022a / review 3A; (f) delete the single DisplayMode translation ternary at line 253 (FR-019). Add `DisplayMode` + `PlaybackState` imports from `@debrief/schemas`. File: `apps/vscode/src/views/timeRangeView.ts`.
- [x] T051 Edit `apps/vscode/src/webview/mapPanel.ts`: delete the three DisplayMode translation ternaries at lines 688, 704, 873 — replace each with a direct pass-through of the session-state value (FR-020). Ensure the `setDisplayMode` message construction uses the schema-rooted value directly. File: `apps/vscode/src/webview/mapPanel.ts`.
- [x] T052 Edit `apps/vscode/src/webview/messages.ts` line 126: retype `SetDisplayModeMessage.displayMode: 'full' | 'trail'` → `DisplayMode` (FR-022 bullet 5 / review 4A — this is the canonical host→webview setter contract, prerequisite for T051's translator removals landing cleanly). Add `DisplayMode` import from `@debrief/schemas`. File: `apps/vscode/src/webview/messages.ts`.
- [x] T053 [P] Update imports in the remaining `apps/vscode/src/` files that reference `DisplayMode` / `PlaybackState`: `commands/index.ts`, `webview/web/mapView.tsx`, `webview/web/activityPanel.tsx`, `webview/web/timeController.tsx`. No value changes; import-source substitution only. Files: 4 files under `apps/vscode/src/`.

### Web-shell migration

- [x] T054 Edit `apps/web-shell/src/App.tsx` lines 96–100: delete `toComponentMode` and `toStoreMode` helper functions together with the "Map between session-state DisplayMode ... — the two enums diverged historically." comment (FR-021). Update every call site to pass the session-state value directly to the component prop (grep for `toComponentMode(` / `toStoreMode(` in the file to find all call sites). File: `apps/web-shell/src/App.tsx`.
- [x] T055 [P] Update Playwright assertion literals in `apps/web-shell/playwright/tests/time-controller.spec.ts` — replace any `'snailTrail'` → `'trail'` and `'normal'` → `'full'` in test assertions. File: `apps/web-shell/playwright/tests/time-controller.spec.ts`.
- [x] T056 [P] Update Playwright assertion literals in `apps/web-shell/playwright/tests/undo-redo-split.spec.ts` — same substitution as T055. File: `apps/web-shell/playwright/tests/undo-redo-split.spec.ts`.
- [x] T057 [P] Update import in `apps/web-shell/playwright/components/TimeController.ts`. File: `apps/web-shell/playwright/components/TimeController.ts`.

### Verification

- [x] T058 Run `pnpm -r typecheck` — must pass cleanly. Confirms the migrated types compile end-to-end.
- [x] T059 Run the 9 grep-based acceptance checks from contracts/linkml-enums.md §6 — all must pass. (Canonical enum values exported, no legacy strings in generated, template-literal types present, TemporalSlice narrowed, etc.)
- [x] T060 Run the 8 post-review acceptance checks from contracts/linkml-enums.md §6 checks 10–17 (the `as never` grep, silent-narrow grep, IPC retype grep, PlaybackControls test, persistence.test.ts, regen-idempotency test, drift-prevention guard, ADR-ref guard). All must pass except T0XX-prerequisites (the two new guard scripts don't exist until Phase 5).

**Checkpoint (US2 complete)**: All 4 hand-typed declarations deleted. All 8 translator sites + the silent-narrowing translator deleted. All 5 IPC shapes + 4 callback types retyped. Both `as never` casts removed. All tests green. Ready for US3 guard rails.

---

## Phase 5: US3 (P3) — Guard rails and the documented `stopped ≡ paused` rule

**Story goal (from spec §US3)**: Future contributors don't re-introduce the drift because (a) a lint-time guard fails when a hand-typed `type DisplayMode` or `type PlaybackState` reappears, (b) a lint-time guard resolves LinkML `See ADR-NN` cross-references, (c) the component-side `stopped ≡ paused` rendering rule is documented in the ADR and asserted by `PlaybackControls.test.tsx`, and (d) the LinkML `PlaybackStateEnum` description cites the ADR via FR-032's convention.

**Independent test criterion**: Invoke both guard scripts (`check-no-hand-typed-temporal-enums.sh`, `check-adr-refs.sh`) and observe exit-0 on the clean tree; deliberately introduce a violating pattern on a throwaway branch and observe the guard failing with a clear message. Read the ADR entry and the LinkML description; confirm the `See ADR-NN` reference resolves. Run `PlaybackControls.test.tsx` — all 3 cases green.

### PlaybackControls behavioural test (review 10A / FR-029 / SC-015)

- [x] T061 [test] Create `shared/components/src/TimeController/PlaybackControls.test.tsx` per quickstart.md §1D. Three cases using `it.each` for the `stopped` + `paused` pair (both render play glyph + `aria-label="Play"`) plus one case for `'playing'` (pause glyph + `aria-label="Pause"`). All three cases invoke `onToggle` on click and assert it was called once. Uses `@testing-library/react` (already in `shared/components/package.json` — verified). File: `shared/components/src/TimeController/PlaybackControls.test.tsx`.

### Storybook `stopped` regression guard

- [x] T062 Add a `StoppedPlayback` story to `shared/components/src/TimeController/TimeController.stories.tsx` demonstrating `playbackState === 'stopped'`. Visually indistinguishable from the existing `Paused` story by design (FR-025). Include a `parameters.docs.description.story` note explaining the story is a regression guard for the `stopped ≡ paused` rendering rule documented in the ADR. File: `shared/components/src/TimeController/TimeController.stories.tsx`.

### Drift-prevention + ADR-ref guard scripts (review D1 + D3 + R2-2A)

- [x] T063 Create `scripts/check-no-hand-typed-temporal-enums.sh` per quickstart.md §4.1 (R2-2A style — `✅` / `❌` emoji + "regression guard failed!" header matching `check-no-geojson-feature.sh`). Script fails if hand-typed `type DisplayMode` / `type PlaybackState` or a legacy-vocabulary translation ternary reappears outside `shared/schemas/src/generated/` (FR-031 / SC-013). `chmod +x` the file. File: `scripts/check-no-hand-typed-temporal-enums.sh`.
- [x] T064 Create `scripts/check-adr-refs.sh` per quickstart.md §4.1 (same R2-2A style). Script extracts `ADR-NN` references from LinkML YAMLs under `shared/schemas/src/linkml/` and fails if any referenced ADR-ID does not resolve to a `## ADR-NN:` heading in `docs/project_notes/decisions.md` (FR-032 / SC-016). `chmod +x` the file. File: `scripts/check-adr-refs.sh`.
- [x] T065 Edit `Taskfile.yml` to add the two new guard scripts to the `task lint` recipe, alongside the existing `bash scripts/check-no-geojson-feature.sh` entry at line 112. Three bash invocations total after this edit. File: `Taskfile.yml`.

### ADR entry + LinkML cross-reference finalisation

- [x] T066 Append the Feature 205 ADR entry to `docs/project_notes/decisions.md` per quickstart.md §4 (expanded body). Heading format: `## ADR-NN: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21` where `NN` is the next available two-digit number (verify by scanning the existing headings in `decisions.md` for the highest `ADR-NN` currently used — likely ADR-022 assuming #204 took ADR-021). The ADR body carries the UI-element-level rendering detail (static playhead, play button enabled, pause button disabled / no-op) that FR-003 moves out of the LinkML description. File: `docs/project_notes/decisions.md`.
- [x] T067 Update `shared/schemas/src/linkml/session-state.yaml` `PlaybackStateEnum.description` to substitute the placeholder `ADR-NN` with the actual number assigned in T066. Re-run `uv run python shared/schemas/scripts/generate.py all` to propagate the updated description into the generated TS + Pydantic docstrings. File: `shared/schemas/src/linkml/session-state.yaml`.
- [x] T068 Run `bash scripts/check-adr-refs.sh` and confirm it exits 0 — the ADR reference in `session-state.yaml` must resolve cleanly to the `## ADR-NN:` heading in `decisions.md`.
- [x] T069 Run `bash scripts/check-no-hand-typed-temporal-enums.sh` and confirm it exits 0 on the clean tree.

**Checkpoint (US3 complete)**: Both guard scripts pass on the clean tree. `PlaybackControls.test.tsx` passes all 3 cases. ADR entry exists and the LinkML description resolves to it. The `stopped ≡ paused` rule is documented + asserted. Ready for Polish.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence artefacts, create the shipped post + LinkedIn summary, and open the PR. No code changes beyond test-evidence capture scripts.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The Playwright E2E tasks in Phase 4 (T055/T056) use `@sparticuz/chromium` via `node apps/web-shell/run-playwright.mjs`. Standard browser CDN downloads are blocked (403), but the bundled Linux Chromium binary works fully. Full details: `docs/project_notes/playwright-installation-research.md`.

### Full-pipeline verification

- [x] T070 Run the full CI verify pipeline — `task verify` (or the four-step fallback from CLAUDE.md). Capture the full stdout/stderr to `specs/205-displaymode-playbackstate-linkml/evidence/ci-pipeline.txt`. Confirm all of lint + typecheck + unit + Playwright E2E pass. File: `specs/205-displaymode-playbackstate-linkml/evidence/ci-pipeline.txt`.

### Evidence collection

- [x] T071 Append the "AFTER" half of the grep-before-after evidence started in T005 — both greps must now return zero matches on the PR branch. File: `specs/205-displaymode-playbackstate-linkml/evidence/grep-before-after.txt`.
- [x] T072 [P] Capture `uv run pytest shared/schemas/tests/test_regen_idempotent.py -v` output and save to `specs/205-displaymode-playbackstate-linkml/evidence/regen-idempotency-proof.txt`. Confirm two consecutive `generate.py all` runs in the `tmp_path` sandbox produce byte-identical output (SC-014 + R2-4A). File: `specs/205-displaymode-playbackstate-linkml/evidence/regen-idempotency-proof.txt`.
- [x] T073 [P] Capture the load-boundary validation evidence to `specs/205-displaymode-playbackstate-linkml/evidence/load-boundary-validation.md`: transcript of the three new `persistence.test.ts` negative cases firing (legacy `snailTrail`, legacy `normal`, typo `palying`) each returning `LoadResult { success: false, error: '...' }` with the expected error-string regex match (R2-1A + R2-3A). Include the positive-case iteration output too. File: `specs/205-displaymode-playbackstate-linkml/evidence/load-boundary-validation.md`.
- [x] T074 [P] Capture guard-script transcripts to `specs/205-displaymode-playbackstate-linkml/evidence/guard-script-transcripts.txt`: (a) `check-no-hand-typed-temporal-enums.sh` pass on the clean tree; (b) `check-adr-refs.sh` pass on the clean tree; (c) a simulated-fail transcript for each (deliberately introduce a violating pattern on a throwaway branch, capture the failure output, then revert). Demonstrates SC-013 + SC-016 are durable. File: `specs/205-displaymode-playbackstate-linkml/evidence/guard-script-transcripts.txt`.
- [x] T075 [P] Capture IPC retype inventory to `specs/205-displaymode-playbackstate-linkml/evidence/ipc-retype-inventory.md`: before/after snippets for the 5 IPC message shapes + 4 callback/method types in `apps/vscode/src/views/{activityPanelView,timeRangeView}.ts` and `apps/vscode/src/webview/messages.ts` (review 2A), plus the deleted silent-narrowing translator at `timeRangeView.ts:241` (review 3A). File: `specs/205-displaymode-playbackstate-linkml/evidence/ipc-retype-inventory.md`.
- [x] T076 Capture round-trip evidence to `specs/205-displaymode-playbackstate-linkml/evidence/round-trip-evidence.md`: 5-row table showing each permissible value's Python → JSON → TypeScript → JSON → Python byte-identical round trip (one row per fixture from T011–T015). Plus two rows for the invalid fixtures showing validation rejection. Cite SC-008. File: `specs/205-displaymode-playbackstate-linkml/evidence/round-trip-evidence.md`.
- [x] T077 Create usage demonstration at `specs/205-displaymode-playbackstate-linkml/evidence/usage-example.md`: minimal TypeScript snippet showing `import { DisplayMode, PlaybackState } from '@debrief/schemas'` + assignment using the canonical vocabulary. Demonstrate both the template-literal string-literal assignability (`const m: DisplayMode = 'full';`) AND the enum-member form (`const s: PlaybackState = PlaybackStateEnum.playing;`). Include the expected TypeScript output: no casts, no widening warnings. File: `specs/205-displaymode-playbackstate-linkml/evidence/usage-example.md`.
- [x] T078 Capture test summary at `specs/205-displaymode-playbackstate-linkml/evidence/test-summary.md` using the template at `.specify/templates/evidence/test-summary-template.md`. MUST include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body highlights: schema adherence extensions (5 valid + 2+ invalid fixtures); `test_regen_idempotent.py` pass; 3 new `PlaybackControls.test.tsx` cases; 4 new `persistence.test.ts` load-boundary cases. File: `specs/205-displaymode-playbackstate-linkml/evidence/test-summary.md`.

### Media content

- [x] T079 Create shipped blog post at `specs/205-displaymode-playbackstate-linkml/media/shipped-post.md` by spawning the Content Specialist agent (`.claude/agents/media/content.md` via Task tool with `subagent_type: general-purpose`). Provide: the feature goal from spec.md; concrete numbers from `evidence/grep-before-after.txt` (4 declarations deleted, 8 translator sites deleted, 5 IPC shapes + 4 callback types retyped, 2 `as never` casts removed); the Article I.3 + XV + IV + VIII closures from the ADR; the `stopped ≡ paused` story beat; a reference to the #203/#204/#205 audit-programme run. Follow the Shipped Post template in the agent definition. File: `specs/205-displaymode-playbackstate-linkml/media/shipped-post.md`.
- [x] T080 [P] Create LinkedIn shipped summary at `specs/205-displaymode-playbackstate-linkml/media/linkedin-shipped.md`. 150–200 words, hook opening, link placeholder for the shipped post. Concrete framing: "eight translator sites, four hand-typed declarations, two as-never casts, one vocabulary." Same Content Specialist agent. File: `specs/205-displaymode-playbackstate-linkml/media/linkedin-shipped.md`.

### PR creation

- [ ] T081 Create PR and publish blog: run `/speckit.pr`. This task MUST be the final task. It (a) creates the feature PR in `debrief-future` attaching all evidence from `specs/205-displaymode-playbackstate-linkml/evidence/`; (b) publishes `media/shipped-post.md` to `debrief.github.io` via a cross-repo PR; (c) returns both PR URLs for review.

**Task T081 must run last. All preceding tasks (T001–T080) must be complete before this runs.**

---

## Dependencies

### Phase gates

```
Phase 1 (T001–T005)         Baseline verified, directories exist
    ▼
Phase 2 (T006–T021)         Schema source + generator + regen + adherence tests + idempotency pytest
    ▼                        (blocks all US — schema-rooted types must exist before any consumer migration)
Phase 3 = US1 (T022–T025)   Confirm canonical vocabulary is exported from @debrief/schemas + re-exported from barrels
    ▼                        (lightweight; re-exports enable Phase 4 to change import paths without consumer thrash)
Phase 4 = US2 (T026–T060)   Bulk migration — declaration deletions, IPC retypes, translator deletions, load-boundary validation, test fixture updates
    ▼                        (bulk of the work; may parallelize internally — see "Parallel opportunities" below)
Phase 5 = US3 (T061–T069)   Guard rails — PlaybackControls test, Storybook story, guard scripts, ADR, LinkML cross-ref finalisation
    ▼
Phase 6 (T070–T081)         Evidence + media + PR
```

### Task-level dependencies

**Phase 2 internal order** (must be sequential within this cluster):
- T006 + T007 (LinkML edits) → T008 (generator post-processor) → T009 (regen) → T010 (verify regen)
- T009 → T011–T017 (fixtures consume generated enum values indirectly; creating them before regen is fine, but their validation in T018–T020 requires the regenerated Pydantic models)
- T009 → T018–T021 (test files exercise the regenerated artefacts)

**Phase 4 internal order**:
- T026–T028 (session-state type-file edit) before any `apps/vscode/` or `apps/web-shell/` consumer migration (those files import from `@debrief/session-state` or `@debrief/schemas` and the session-state types MUST compile cleanly first).
- T029 (load.ts validation) + T031 (new persistence.test.ts cases) must land together — the test verifies the validation behaviour.
- T030 (three named literal substitutions) is independent of T029/T031 — can run in parallel, but both MUST be green before T058 typecheck.
- T032–T035 (component package edits) before T036–T048 (component consumers) — the `types.ts` changes must compile cleanly first.
- T049 (activityPanelView.ts) + T050 (timeRangeView.ts) + T052 (messages.ts retype) MUST land together because T051 (mapPanel.ts translator deletions) references the retyped `SetDisplayModeMessage` from T052.
- T054 (App.tsx helper deletion) independent of T049–T053 but SHOULD land after those to avoid a window where the web-shell speaks one vocabulary and the VS Code host still speaks the translated one.

**Phase 5 internal order**:
- T066 (ADR entry) MUST precede T067 (LinkML cross-ref finalisation) — the ADR must exist before the LinkML description cites it.
- T066 + T067 MUST precede T068 (`check-adr-refs.sh` pass verification).
- T069 (`check-no-hand-typed-temporal-enums.sh` pass) runs on the tree that is already clean (Phase 4 completed); the script just confirms it stays clean.
- T061 + T062 + T063 + T064 + T065 can run in any order among themselves (each is a single-file create/edit).

**Phase 6 internal order**:
- T070 (full CI verify) must be green before any evidence-capture tasks start (T071–T078).
- T071–T078 parallelize as marked with [P]; T076–T078 depend on T070's outputs.
- T079 (shipped post) depends on T071–T078 (pulls concrete numbers from evidence/).
- T081 (PR creation) depends on EVERYTHING else.

### Parallel opportunities

**Phase 2 fixtures**: T011, T012, T013, T014, T015, T016, T017 — all seven fixture files run in parallel (`[P]` tag).

**Phase 4 component imports**: T036–T048 — 13 import-rename-only tasks run in parallel once the declaration deletions (T032–T034) have landed.

**Phase 4 web-shell tests**: T055, T056, T057 — three Playwright-adjacent files run in parallel.

**Phase 6 evidence capture**: T072, T073, T074, T075 — four evidence artefacts run in parallel once T070 has produced the CI log.

---

## Implementation Strategy

### Incremental delivery within a single atomic PR (SC-009)

This feature ships as **one** PR, but the task breakdown supports an incremental commit-by-commit path so a reviewer doing `git log` on the merge commit sees a clean narrative:

1. **Phase 1–2** — "Schema + regen + adherence". One or two commits. Produces a tree where schema adherence tests pass, the generated artefacts are updated, and nothing else has changed yet. At this intermediate point `task verify` fails on typecheck (consumers still reference old types) — that's expected; Phase 4 cleans it up.
2. **Phase 3** — "Barrel re-exports". One commit. Tiny — only the `@debrief/components` + `@debrief/session-state` barrels. No typecheck regression yet because no consumer file has changed.
3. **Phase 4** — "Bulk migration". The largest phase. Recommended sub-commits:
   - 4a. Session-state type-file edit + test-assertion substitutions (T026–T028 + T030).
   - 4b. Load-boundary validation + new `persistence.test.ts` cases (T029 + T031).
   - 4c. Component package — declaration deletions + widening (T032–T035).
   - 4d. Component package — import renames (T036–T048; parallelizable).
   - 4e. VS Code extension — translator deletions + IPC retypes + silent-narrowing deletion (T049–T053).
   - 4f. Web-shell migration (T054–T057).
   - 4g. Verification (T058–T060).
4. **Phase 5** — "Guard rails + ADR". One commit or two (PlaybackControls test + Storybook + guard scripts + ADR + LinkML cross-ref finalisation).
5. **Phase 6** — "Evidence + media + PR". Final commit batch; `/speckit.pr` at the end.

### Intermediate-state caveat

The atomic PR is squash-merged by convention, so intermediate commit order matters only for reviewer bisect-friendliness — not for CI gates. `task verify` on any Phase 4 sub-commit may fail because consumer files still reference the old vocabulary while declarations are being removed. The full `task verify` gate applies only to the final pre-PR state (T070).

### Rollback

Because the rename ships atomically, rollback is a straight `git revert` of the merge commit. No LinkML schema version field was bumped (pre-v4.0.0 Article XIV), so reverting restores the drifted state without additional migration. Any branch cut during the Feature 205 window that revert-conflicts must rebase over main post-revert and reintroduce the translator ternaries — per Article XIV pre-release freedom, no grace period is owed.

### Evidence capture timing

Evidence tasks (T071–T078) run AFTER T070's full-pipeline verify confirms green — never before. Capturing evidence on a partially-green tree pollutes the artefact set. The grep-before-after evidence (T005 + T071) is the exception: the BEFORE half is captured in Phase 1 on the untouched tree; the AFTER half is captured in Phase 6 on the completed tree.

### Review-decision traceability

Every non-trivial task cites the originating review decision ID (1A, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 9A, 10A, 11B, 12A, D1, D2, D3, R2-1A, R2-2A, R2-3A, R2-4A) and the associated FR/SC number. A reviewer verifying the PR against the 19 review decisions + 16 SCs can grep `tasks.md` for the decision ID and trace it to a concrete task.

### User-story independence within the atomic PR

Although the PR is atomic, the user-story structure is preserved for reviewer mental model:
- **US1** — "canonical vocabulary exists" — satisfied by Phase 2 + Phase 3.
- **US2** — "drift eliminated" — satisfied by Phase 4.
- **US3** — "guard rails + documentation" — satisfied by Phase 5.

A reviewer can read the PR as three stacked slices, even though git history shows one merge commit.
