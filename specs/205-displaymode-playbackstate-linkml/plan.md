# Implementation Plan: Schema-Rooted DisplayMode and PlaybackState Enums

**Branch**: `205-displaymode-playbackstate-linkml` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/205-displaymode-playbackstate-linkml/spec.md`

## Summary

Collapse two drifted hand-typed TypeScript enums (2× `DisplayMode` + 2× `PlaybackState`, four declarations total across `shared/components/` and `services/session-state/`) and the 7+ inline translation ternaries that bridge them (`apps/vscode/src/views/{activityPanelView.ts,timeRangeView.ts}`, `apps/vscode/src/webview/mapPanel.ts`, `apps/web-shell/src/App.tsx:96–100`) into **two** schema-rooted enums generated from LinkML. The enums already exist in `shared/schemas/src/linkml/session-state.yaml` lines 24–40; this plan (a) **renames** `DisplayModeEnum` permissible values from `normal|snailTrail` to the canonical component vocabulary `full|trail` (the labels users already see on the `DisplayModeToggle` buttons), (b) keeps `PlaybackStateEnum` as-is (`stopped|playing|paused`) with a short UI-agnostic ADR reference in its description (review 7A — UI-specific rendering detail moves to the ADR body), (c) extends `shared/schemas/scripts/generate.py` with one post-processing rule to narrow `TemporalSlice.playbackState`/`.displayMode` from the current `string` emission to schema-rooted template-literal types `PlaybackState`/`DisplayMode` derived from the enums — matching the existing `PointShape = \`${PointShapeEnum}\`` precedent at `generate.py:439-476` (Feature 201 / FR-014), (d) deletes the four hand-typed TS declarations plus every translator ternary, widens the component-side `PlaybackState` surface to three states with the documented `stopped ≡ paused` rendering rule, (e) flips the `DEFAULT_TEMPORAL_SLICE.displayMode` default from `'normal'` to `'full'`, (f) retypes **five** IPC message shapes and **four** callback/method-type declarations across `activityPanelView.ts`, `timeRangeView.ts`, and `webview/messages.ts` so vocabulary matches are enforced at every message-bus and public-API crossing (review 2A), (g) deletes the silent `'playing' | 'paused'` narrowing translator at `timeRangeView.ts:241` that today collapses `'stopped'` → `'paused'` (review 3A), (h) adds runtime validation at `persistence/load.ts` and replaces the two `as never` casts at lines 117 and 123 with typed setter calls (review 1A + D2 — Article I.3 silent-failure closure + Article XV strict-type-safety closure), (i) adds three new tests (a `persistence.test.ts` extension for legacy-value rejection — review 9A; a new `PlaybackControls.test.tsx` with 3-state coverage — review 10A; a new `test_regen_idempotent.py` pytest — review 11B), (j) adds two new guard scripts wired into `task lint` — `scripts/check-no-hand-typed-temporal-enums.sh` (drift prevention, following the #214 / `check-no-geojson-feature.sh` precedent — review D1) and `scripts/check-adr-refs.sh` (LinkML `See ADR-NN` convention validation — review D3), and (k) records the consolidation rationale plus the UI rendering rule in `docs/project_notes/decisions.md` under the `## ADR-NN` heading that FR-032's convention cites. No installed-base JSON fixtures carry legacy `"displayMode"` values (verified by grep), so the rename ships as a single atomic PR with no staged rollout.

## Technical Context

**Language/Version**: Python 3.11 (schema source, Pydantic generation, schema-adherence tests), TypeScript 5.x (generated types, consumer apps + shared packages, webview code, web-shell React app)
**Primary Dependencies**: LinkML ≥ 1.7.0 (`gen-pydantic`, `gen-typescript`, `gen-json-schema`), Pydantic v2, existing `@debrief/schemas` package, existing `shared/schemas/scripts/generate.py` post-processor (gets one new rule)
**Storage**: N/A — no persistence format changes. Session-state JSON would carry `displayMode` / `playbackState`, but there are no installed-base files outside the repo, and no in-repo `.json` fixtures reference these fields (verified via `grep -rE '"displayMode"|"playbackState"' --include='*.json'`).
**Testing**: `pytest` (schema adherence via `shared/schemas/tests/test_golden.py`, `test_roundtrip.py`, `test_schema_compare.py` — each extended with per-enum-value fixtures), `vitest` (consumer tests — no assertion-level changes; imports renamed), `pnpm exec tsc --noEmit` via `typecheck` (generated TS compiles cleanly and consumers type-check against the new enum types), Playwright E2E covering `shared/components/src/TimeController/*` and `apps/web-shell/playwright/tests/time-controller.spec.ts` + `undo-redo-split.spec.ts` (unchanged scenarios; import-source migration only)
**Target Platform**: Cross-platform dev (Linux, macOS, Windows); CI runs on Ubuntu via the standard `task verify` pipeline described in `CLAUDE.md`
**Project Type**: Monorepo (pnpm workspace for TypeScript + uv workspace for Python). Touches `shared/schemas/` (source + generator + artefacts), `shared/components/` (TimeController + MapView + ActivityPanel), `services/session-state/` (temporal slice + tests), `apps/vscode/` (host views + webview), `apps/web-shell/` (App shell + Playwright tests)
**Performance Goals**: N/A — type consolidation. CI time delta expected within noise; no runtime hot-path changes.
**Constraints**:
- **Single atomic PR** — LinkML rename + regen diff + generator post-processor change + 4 declaration deletions + 8+ translator removals + consumer migration reviewed together (SC-009)
- **Zero new `any`/`as` casts** at migration sites (Article XV); the chosen template-literal post-processing preserves string-literal assignability without widening callers
- **Byte-identical round-trip** for 5 canonical enum-value fixtures (SC-008)
- **No user-observable UI changes** — `DisplayModeToggle` buttons still read "Full"/"Trail"; playback controls behave identically (`stopped` rendered as `paused` — documented)
- **Constitution Article II (Schema Integrity)** is the driver — no hand-typed copies of schema-rooted enums may survive past merge
**Scale/Scope**: 1 LinkML enum rename (2 permissible-value strings + 2 descriptions + ADR-ref convention), 0 new LinkML classes, 1 generator post-processor rule extended, ~30 TypeScript files migrated across 4 workspaces, **9 IPC/callback/method-type retypes** across 3 files (review 2A), **1 silent-narrowing translator deletion** at `timeRangeView.ts:241` (review 3A), **1 load-boundary validation module** with 2 `as never` casts replaced (review 1A + D2), 0 Python consumer migrations (Pydantic auto-regenerates), **3 new test files / extensions** (review 9A + 10A + 11B), **2 new guard scripts** wired into `task lint` (review D1 + D3), 1 ADR entry with ADR-ref convention adopted, 5+ new schema fixtures (one per permissible value plus ≥ 2 invalid cases), 1 `Taskfile.yml` edit (adds the two guard scripts to `task lint`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | **Direct (post-review)** | ✅ Pass — strengthened | Pre-review the plan was indirect. Post-review (decisions 1A + D2 + 3A), the plan now closes an Article I.3 silent-failure vector: the `as never` cast at `load.ts:123` silently accepts legacy vocabulary values; the silent narrowing at `timeRangeView.ts:241` silently collapses `'stopped'` → `'paused'` in session-state. Both are eliminated with runtime validation + typed setters + direct pass-through. |
| II. Schema Integrity | **Direct driver** | ✅ Pass — uphold | The feature exists to eliminate hand-typed drift on two schema-rooted enums and restore single-source-of-truth. Adherence tests extended per FR-008. |
| III. Data Sovereignty | N/A | ✅ Pass | No provenance, storage, or export changes. |
| IV. Architectural Boundaries | **Direct (post-review)** | ✅ Pass — strengthened | Two reinforcements from review. (a) **Five** IPC shapes + **four** callback/method types now strictly typed, not just `TemporalDisplayModeMessage` (review 2A). (b) Review 7A removes UI-specific rendering language from the LinkML `PlaybackStateEnum` description — the schema sits one layer beneath services and should not name buttons. UI detail stays in the ADR only. |
| V. Extensibility | Indirect | ✅ Pass | Contrib extensions that consume `@debrief/schemas` gain typed enums; migration only renames values on an already-exported enum. |
| VI. Testing | **Direct** | ✅ Pass — strengthened | Schema-adherence suite extended with ≥ 5 valid + ≥ 2 invalid fixtures (FR-008); round-trip cycles added (SC-008). Post-review three new tests added: `persistence.test.ts` legacy-rejection cases (FR-028 / review 9A), new `PlaybackControls.test.tsx` with 3-state coverage (FR-029 / review 10A), new `test_regen_idempotent.py` pytest (FR-030 / review 11B). Existing `useTimePlayback` / `ActivityPanel` / `web-shell` test suites remain green after import-rename. |
| VII. Test-Driven AI Collaboration | **Direct** | ✅ Pass | Spec + checklist + contract docs precede implementation. Completion measured against SC-001…SC-011. |
| VIII. Documentation | **Direct** | ✅ Pass — strengthened | ADR entry required in `docs/project_notes/decisions.md` (FR-026) with UI-rendering detail that FR-003 moves out of the schema description. Generated enum declarations pick up the LinkML `description` as a docstring (FR-003). Review D3 adds a machine-readable ADR-ref convention (`See ADR-NN in docs/project_notes/decisions.md`) with a `check-adr-refs.sh` guard (FR-032 / SC-016) — schema ↔ ADR links are validated at lint time, not just human-readable. |
| IX. Dependencies | N/A | ✅ Pass | No new dependencies. Only existing LinkML / Pydantic / TS toolchain used. |
| X. Security | N/A | ✅ Pass | No secrets, no network, no classification surface. |
| XI. Internationalisation | N/A | ✅ Pass | No user-facing strings change. `DisplayModeToggle` button labels ("Full" / "Trail") are unchanged; the underlying enum identifier now matches the visible label but the label itself is an existing externalisable UI string. |
| XII. Community Engagement | Indirect | ✅ Pass | Covered by the standard planning-post + LinkedIn summary generated in Phase 2 of this command. |
| XIII. Contribution Standards | **Direct** | ✅ Pass | Atomic PR, review required, CI must pass — standard flow. |
| XIV. Pre-Release Freedom | Enabling | ✅ Pass | Pre-v4.0.0 — breaking enum-value renames are permitted without a deprecation period. The `normal`/`snailTrail` values vanish from the repo entirely in the same PR. |
| XV. Strict Type Safety | **Direct driver** | ✅ Pass — strengthened | Pre-review: we replace hand-typed string-literal unions with generator-narrowed schema-rooted types; `any` / `as` casts remain zero at migration sites. Post-review (decision 1A + D2): we also remove two inherited `as never` casts at `persistence/load.ts:117` and `:123` that pre-existed this feature; these were silent-bypass escape hatches at the persistence load boundary. The chosen template-literal pattern (`export type DisplayMode = \`${DisplayModeEnum}\``) preserves string-literal assignability without widening callers — the same pattern Feature 201 established for `PointShape`. Review D1 + D3 add two lint-time guard scripts so the Article XV posture is durable beyond the PR merge window. |

**Outcome**: No violations. Complexity Tracking table remains empty.

**Post-design re-check (2026-04-21, after research + data-model + contracts + quickstart)**: All 15 articles remain ✅ Pass. Research §1 confirms the template-literal post-processor mirrors the existing Feature 201 `PointShape` precedent (no new mechanism, no new dependency, no new abstraction). Research §2 documents the installed-base check (`grep -rE '"displayMode"' --include='*.json' .` returned zero matches) that eliminates the only Article III concern a vocabulary rename could raise. Contract §2 makes the generator edit auditable line-for-line and Contract §6 pins 9 grep-based acceptance checks that are runnable from the repo root — Article VII (Test-Driven AI Collaboration) has a verifiable completion contract. Article XV is reinforced rather than compromised: the chosen template-literal emission keeps zero `as` casts and zero `any` escape hatches at migration sites. The plan remains coherent with the spec; no scope creep was introduced during Phase 1. Agent-context refresh confirmed no new technologies were added (the feature reuses LinkML, Pydantic, and TypeScript toolchains already tracked). No Complexity Tracking entries required.

**Post-round-2-review re-check (2026-04-21, after the second `/speckit.review` pass — decisions R2-1A/R2-2A/R2-3A/R2-4A applied)**: All 15 articles still ✅ Pass. Four refinements landed on top of the round-1 work:

- **R2-1A (Article IV)** — load-boundary validation uses the existing `LoadResult` return-pattern (`{ success: false, error: '...' }`) instead of introducing a throwing `SessionLoadError` class. Honours the established persistence-module contract; callers (Electron loader, VS Code extension) continue to see a resolved `Promise<LoadResult>`.
- **R2-2A (Article VIII / CI UX)** — both new guard scripts match the existing `check-no-geojson-feature.sh` output style (`✅`/`❌` emoji + prescriptive guidance block). CI output is consistent across all three lint-time guard scripts.
- **R2-3A (Article VI)** — `persistence.test.ts` new negative cases assert on `result.success` + `result.error` (string match), not `rejects.toThrow`. Tests now match what the function actually returns rather than testing against an imaginary throwing behaviour.
- **R2-4A (Article I.4 reproducibility)** — `test_regen_idempotent.py` operates on pytest's `tmp_path` fixture (copies sources + scripts into a sandbox, regenerates there, compares sandbox output to itself). The working-tree `shared/schemas/src/generated/` is never mutated by the test. Local `uv run pytest` is safe for developers with uncommitted schema changes.

**Round-1 post-review re-check (2026-04-21, after `/speckit.review` Sections 5A–5D and the 15 applied decisions 1A/2A/3A/4A/5A/6A/7A/8A/9A/10A/11B/12A/D1/D2/D3)**: All 15 articles remain ✅ Pass. Three articles are now *explicitly strengthened* (table above annotated accordingly):

- **Article I.3 (No silent failures)** is now a direct driver, not indirect. The two previously-silent failure vectors uncovered by the review — `persistence/load.ts:123` `as never` cast accepting legacy values, and `timeRangeView.ts:241` silently collapsing `'stopped'` → `'paused'` in session-state — are now explicitly closed with runtime validation + typed setters + direct pass-through (FR-023a, FR-023b, FR-022a). The load-boundary validation has dedicated test coverage (FR-028 / review 9A).
- **Article IV (Architectural Boundaries)** is reinforced on two axes: (a) five IPC shapes + four callback/method types are now strictly typed rather than just one (review 2A broadens the FR-022 scope); (b) the LinkML `PlaybackStateEnum.description` no longer names UI elements (review 7A — schema sits beneath services and should not describe buttons), with the UI-rendering detail moved to the ADR body.
- **Article VIII (Documentation)** gains the machine-validated `See ADR-NN in docs/project_notes/decisions.md` cross-reference convention (FR-032 / review D3), enforced by `scripts/check-adr-refs.sh` at lint time. Schema ↔ ADR links are no longer human-discoverable only; they are a linted contract.

The review additions do not add new Complexity Tracking entries. The scope growth is bounded by concrete counts (the 4 architecture issues are file-by-file; the 4 design-quality issues are line-level; the 3 test additions are small files; the 2 guard scripts follow an established pattern from #204/#214). The feature remains a consolidation, not a multi-abstraction build-out — deletion-to-addition ratio is net-negative in code (4 hand-typed types removed, 8 translators removed, 2 `as never` casts removed vs. 1 generator rule, 3 test files, 2 guard scripts added). Constitution check passes cleanly with no violations.

## Project Structure

### Documentation (this feature)

```text
specs/205-displaymode-playbackstate-linkml/
├── plan.md                 # This file
├── research.md             # Phase 0: LinkML mechanism choices + consumer inventory + generator post-processor design
├── data-model.md           # Phase 1: the two LinkML enums in abstract form + TemporalSlice slot narrowing
├── quickstart.md           # Phase 1: migration recipe (before/after) for TS consumers + translator deletions
├── contracts/
│   └── linkml-enums.md     # Phase 1: exact LinkML YAML edits + expected generator outputs (pre- and post- post-processor)
├── checklists/
│   └── requirements.md     # From /speckit.specify
├── media/
│   ├── planning-post.md    # Phase 2
│   └── linkedin-planning.md # Phase 2
└── spec.md                 # From /speckit.specify
```

### Source Code (repository root)

This feature touches existing paths only — no new packages or directories are created.

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   └── session-state.yaml         # EDIT: rename DisplayModeEnum permissible_values (normal→full, snailTrail→trail) + update descriptions (FR-002)
│   └── generated/                     # Fully regenerated in step
│       ├── python/debrief_schemas/__init__.py     # DisplayModeEnum members change; TemporalSlice unchanged shape; old values vanish
│       ├── typescript/types.ts                     # DisplayModeEnum emits {full, trail}; post-processor narrows TemporalSlice.playbackState / .displayMode to template-literal types
│       └── json-schema/debrief.schema.json         # DisplayModeEnum enum values change
├── scripts/generate.py                # EDIT: extend TS post-processor with TemporalSlice enum-slot narrowing (mirrors Feature 201 / FR-014 PointShape precedent at lines 439-476)
├── fixtures/                          # EXTEND: add 5 enum-value fixtures + 2+ invalid fixtures (see contracts/linkml-enums.md)
└── tests/
    ├── test_golden.py                 # EXTENDED: enum-value fixtures added to ENTITY_MAP for both enums
    ├── test_roundtrip.py              # EXTENDED: Python → JSON → TS → JSON → Python cycle per permissible value (5 cycles)
    ├── test_schema_compare.py         # EXTENDED: confirm JSON-Schema-derived enum == LinkML-source enum for both enums
    └── test_regen_idempotent.py       # NEW file (review 11B / FR-030 / SC-014): run `generate.py all` twice in a pytest tmp_path; assert byte-identical output under src/generated/; locks in regen determinism so future LinkML-toolchain updates cannot silently introduce ordering drift. Stylistic neighbour: test_enum_parity.py (same file layout). Runs per-PR in CI (review 12A accepts ~20-30 s cost)

shared/components/src/
├── utils/types.ts                     # REMOVE hand-typed `export type DisplayMode = 'full' | 'trail'` (line 80); re-export DisplayMode from @debrief/schemas for package-level ergonomics
├── TimeController/
│   ├── types.ts                       # REMOVE `export type PlaybackState = 'playing' | 'paused'` (line 17); retarget `export type { DisplayMode }` re-export (line 15) at @debrief/schemas; widen PlaybackControlsProps / UseTimePlaybackResult to full PlaybackState (FR-016)
│   ├── TimeController.tsx             # Import path change only (DisplayMode/PlaybackState from @debrief/schemas)
│   ├── DisplayModeToggle.tsx          # No behavioural change — already uses 'full'|'trail' string literals; retype prop `mode: DisplayMode` via @debrief/schemas re-export
│   ├── PlaybackControls.tsx           # Confirm `stopped ≡ paused` rendering rule (FR-023); widen `playbackState` prop to three values; add explicit comment
│   ├── PlaybackControls.test.tsx      # NEW file (review 10A / FR-029): three test cases covering every PlaybackState value, each asserting `aria-label`, icon glyph, and `onClick` behaviour. `'stopped'` and `'paused'` assertions are identical (documenting the rendering rule); `'playing'` differs only in aria-label/glyph. testing-library + vitest
│   ├── useTimePlayback.ts             # Internal `useState<PlaybackState>('paused')` stays; update animation-tick condition on line 91 (already `!== 'playing'` — robust to `'stopped'`); public result keeps narrowed two-state union with doc comment (FR-024)
│   ├── TimeController.test.tsx        # Import rename only
│   ├── TimeController.stories.tsx     # Import rename; add one story demonstrating `stopped` state (regression guard for FR-025)
│   └── useTimePlayback.test.ts        # Import rename only
├── ActivityPanel/
│   ├── types.ts                       # WIDEN playbackState prop (line 94) from `'playing' | 'paused'` to `PlaybackState` (FR-016)
│   └── ActivityPanel.tsx              # Import path change only
├── MapView/
│   ├── MapView.tsx                    # Import rename only (DisplayMode already used as string-literal)
│   ├── TemporalTrackLayer.tsx         # Import rename only
│   ├── useTemporalTrack.ts            # Import rename only
│   ├── SensorBearingLayer.tsx         # Import rename only
│   ├── sensor-utils.ts                # Import rename only
│   ├── ExerciseAlpha.stories.tsx      # Import rename only
│   ├── PositionStyling.stories.tsx    # Import rename only
│   ├── SensorRendering.stories.tsx    # Import rename only
│   └── TemporalTrack.stories.tsx      # Import rename only
└── index.ts                           # Barrel: re-export DisplayMode / PlaybackState from @debrief/schemas so existing @debrief/components consumers see no import-path churn

services/session-state/src/
├── types/temporal.ts                  # REMOVE `export type PlaybackState = 'stopped' | 'playing' | 'paused'` (line 105) + `export type DisplayMode = 'normal' | 'snailTrail'` (line 110); import both from @debrief/schemas; update DEFAULT_TEMPORAL_SLICE.displayMode from 'normal' to 'full' (FR-013, SC-011); remove the "discriminated union literals for type safety" comment on TemporalSlice (FR-014, FR-015)
├── store/slices/temporal.ts           # Import rename only
└── persistence/load.ts                # EDIT (review 1A + D2 / FR-023a + FR-023b): add runtime validation against the generated enum permissible-value sets for inbound temporal.displayMode (line 123) and temporal.playbackState (if present in payload). Reject legacy 'normal' / 'snailTrail' / unknown playback states with a clear typed error naming the field and value. REPLACE the `as never` cast at line 117 (`setStepSize(temporal.stepSize as never)`) AND at line 123 (`setDisplayMode(temporal.displayMode as never)`) with typed setter calls once validation has narrowed the runtime value. Other as-coercions in the same file (parse-boundary narrowing on lines 62, 64, 98, 103–113, 138, 140–141, 194, 229–232) remain untouched — out of scope per spec Out-of-Scope bullet.

services/session-state/tests/unit/
├── slices/temporal.test.ts            # Update three specific assertion sites to use canonical vocabulary (review 8A): line 44 `expect(store.getState().displayMode).toBe('normal')` → `...toBe('full')`; line 146 same substitution; any 'stopped'/'playing'/'paused' literals unchanged
├── dirty.test.ts                      # Import rename only (no literal 'normal' / 'snailTrail' found)
├── persistence.test.ts                # (a) Update fixture literal at line 207 from `displayMode: 'normal'` to `displayMode: 'full'` (review 8A). (b) EXTEND with at least two new cases (review 9A / FR-028): one asserts that loading a payload with `"displayMode": "snailTrail"` (or `"normal"`) fails with a typed error; one asserts that loading a payload covering every canonical permissible value succeeds
└── undo.test.ts                       # Import rename only (no literal 'normal' / 'snailTrail' found)

apps/vscode/src/
├── commands/index.ts                  # Import rename only
├── views/
│   ├── activityPanelView.ts           # DELETE 4 DisplayMode translation ternaries (lines 210, 252, 434, 467) (FR-018); RETYPE TemporalDisplayModeMessage.payload.mode (lines 47-49) to DisplayMode (FR-022 bullet 1); pass state.displayMode directly to payload
│   └── timeRangeView.ts               # DELETE 1 DisplayMode translation ternary at line 253 (FR-019). DELETE the silent PlaybackState narrowing at line 241 `state.setPlaybackState(message.state === 'playing' ? 'playing' : 'paused')` — replace with direct pass-through `state.setPlaybackState(message.state)` (review 3A / FR-022a). RETYPE `PlaybackStateChangeMessage` (lines 28–31) and `DisplayModeChangeMessage` (lines 33–36) to use PlaybackState / DisplayMode (review 2A / FR-022 bullets 2–3). RETYPE the two private callback fields `_onPlaybackStateChangeCallback` / `_onDisplayModeChangeCallback` (lines 64–65) and the two public methods `onPlaybackStateChange` / `onDisplayModeChange` (lines 322, 329) to accept the widened types (review 2A / FR-022 bullet 4)
├── webview/
│   ├── mapPanel.ts                    # DELETE 3 DisplayMode translation ternaries (lines 688, 704, 873) (FR-020); pass state.displayMode / temporal.displayMode / initialState.displayMode directly to the setDisplayMode message
│   ├── messages.ts                    # RETYPE `SetDisplayModeMessage.displayMode: 'full' | 'trail'` at line 126 to `DisplayMode` (review 4A / FR-022 bullet 5 — this is the canonical host→webview setter contract and is the prerequisite for the mapPanel.ts / activityPanelView.ts / timeController.tsx deletions landing cleanly)
│   └── web/
│       ├── mapView.tsx                # Change `useState<DisplayMode>('full')` — no value change; update DisplayMode import source
│       ├── activityPanel.tsx          # Import rename only
│       └── timeController.tsx         # Import rename only

apps/web-shell/
├── src/App.tsx                        # DELETE toComponentMode / toStoreMode helpers (lines 96-100) + their comment (FR-021); call sites pass session-state value directly to component prop
└── playwright/
    ├── components/TimeController.ts   # Update display-mode-related assertions: 'full'/'trail' unchanged; 'snailTrail'/'normal' references removed
    ├── tests/time-controller.spec.ts  # Update any `'snailTrail'` / `'normal'` assertion literals to `'full'` / `'trail'`
    └── tests/undo-redo-split.spec.ts  # Same

scripts/
├── check-no-hand-typed-temporal-enums.sh  # NEW file (review D1 / FR-031 / SC-013): bash guard, follows the shape of `check-no-geojson-feature.sh`. Fails if `type DisplayMode` / `type PlaybackState` or legacy-vocabulary translation ternary (`=== 'snailTrail'` / `=== 'normal'` / `'normal'` default in session-state code) reappears outside `shared/schemas/src/generated/`. Exits 0 on post-change tree; non-zero on any future reintroduction
└── check-adr-refs.sh                      # NEW file (review D3 / FR-032 / SC-016): bash guard, follows the same shape. Greps LinkML YAML files under `shared/schemas/src/linkml/` for `See ADR-NN` references; for each match, asserts that `docs/project_notes/decisions.md` contains a heading `## ADR-NN` (case-sensitive, two-digit). Fails with a clear message naming the dangling reference

Taskfile.yml                           # EDIT: add the two new scripts to the `task lint` target alongside the existing `check-no-geojson-feature.sh` entry at line 112 — three script calls total after this feature

docs/project_notes/
└── decisions.md                       # APPEND dated ADR entry (FR-026): heading `## ADR-NN: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21` (NN assigned during implementation; currently next available is ADR-022 assuming #204 took ADR-021). Body names the 4 deleted hand-typed declarations; records canonical vocabularies (DisplayMode=full|trail, PlaybackState=stopped|playing|paused); records stopped≡paused component rendering rule WITH the UI-element detail (static playhead, play button enabled, pause button disabled / no-op) that FR-003 moves out of the LinkML description (review 7A); links to this spec. The LinkML `PlaybackStateEnum.description` cites this ADR via the `See ADR-NN in docs/project_notes/decisions.md` convention (FR-032)
```

**Structure Decision**: Monorepo — no new packages introduced. The LinkML enums already exist (`session-state.yaml:24-40`) and feed both Pydantic and TypeScript generation; this change is a vocabulary edit plus consumer migration. The generator post-processor acquires one new rule that follows the existing Feature-201 precedent (template-literal narrowing for enum-ranged slots on `TemporalSlice`), keeping the post-processing mechanism singular and auditable rather than scattering enum-slot narrowing across ad-hoc rules.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| — | — | — | — |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**None — backend/infrastructure feature.** This is a LinkML enum vocabulary rename + TypeScript type-duplicate deletion. There are no new user-facing components, no visual changes, and no interactive demos. Existing Storybook stories (`TimeController.stories.tsx`, `ExerciseAlpha.stories.tsx`, etc.) get one import-source change; their rendered output is structurally unchanged. A single new `TimeController.stories.tsx` variant demonstrating `playbackState === 'stopped'` is added per FR-025 as a regression guard, but it is visually indistinguishable from the existing `'paused'` story by design.

## Storybook E2E Testing

**None — no interactive UI change.** The migration does not add or modify interactive behaviour. Existing `TimeController` tests + stories continue to run under `pnpm test` (vitest) and the Storybook bundle continues to render as before. The one new `'stopped'`-state story added per FR-025 is a vitest-rendering regression guard, not a user-interaction spec. No new Playwright spec is required for Storybook coverage.

## VS Code Webview E2E Testing

**None — no extension workflow change.** All `apps/vscode/` edits are import-source substitutions plus translator deletions; no new user-reachable workflow. Existing `apps/web-shell/playwright/tests/time-controller.spec.ts` and `undo-redo-split.spec.ts` exercise the TimeController round-trip — they stay green after the migration (assertion literals updated to the canonical vocabulary where they referenced `'snailTrail'` / `'normal'`) and act as the regression-guard for FR-017's 7+ file consumer sweep. No new webview E2E spec is created.

## Complexity Tracking

*No entries — Constitution Check passes cleanly with no violations.*
