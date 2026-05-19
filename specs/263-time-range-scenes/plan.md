# Implementation Plan: Storyboard Time-Range Scenes

**Branch**: `263-time-range-scenes` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/263-time-range-scenes/spec.md`

## Summary

Lift the v1 `time_range = null` constraint introduced by #215 and make time-range Scenes a first-class capture + playback mode. Schema work: convert the `SceneProperties.time_range` reserved slot into a real `TimeRange` sub-record (with cross-field validity: non-null `time_range` ⇔ non-null `viewport_end`), add a new optional `viewport_end: Viewport` slot, and add an Article II adherence rule that enforces the XOR-coupling between the two slots. Capture work: extend `apps/vscode/src/commands/captureScene.ts` with a "range" affordance (a per-capture mode toggle persisted in transport state, not in the schema) and a two-step flow (capture `t_start, viewport_start` → scrub + reframe → confirm `t_end, viewport_end` → write a single Scene). Playback work: branch `storyboardPlayback.executeTransition` on Scene flavour — for instant Scenes use today's viewport-flyTo + snap-currentTime; for time-range Scenes drive a synchronised RAF tween that advances `currentTime` linearly from `t_start` to `t_end` while the viewport flies linearly from `viewport_start` to `viewport_end` over the same `transition_duration_ms` wall-clock window. Reverse playback reverses both axes symmetrically. **No legacy backfill, no schema-version bump**: the two new fields are additive and optional at the schema layer; the XOR cross-field rule keeps instant-flavour validation on legacy plots unchanged. Article XIV authorises optional additive evolution without ceremony. Linear interpolation only; ease curves and edit-time range adjustment are out of scope. Lands before #264 (briefing renderer) so the renderer can absorb the new playback path in its own engine port without rework.

## Technical Context

**Language/Version**: TypeScript 5.x strict (`shared/components/`, `apps/vscode/`, `apps/web-shell/`); Python 3.11 (LinkML schema authoring + Pydantic generation only — no runtime Python change)
**Primary Dependencies**: LinkML ≥ 1.7.0 (schema source), Pydantic v2 (generated models), `@debrief/schemas` (generated TS types), `@debrief/components` storyboard module (CRUD, validate, ordering — touched), `@debrief/session-state` (`currentTime` and viewport state — read/write), VS Code Extension API ^1.85.0 (`storyboardPlayback`, `captureScene`, `MapPanel.flyToViewport`), `react-leaflet` 4.2 (viewport rendering — untouched)
**Storage**: STAC Items on disk via the existing `stac-writer` abstraction (Article IV.4 — both VS Code and web-shell go through `@debrief/stac-writer`). No new storage shape beyond the two added optional Scene fields.
**Testing**: Vitest (`shared/components/__tests__/`, `apps/vscode/src/services/__tests__/`), pytest (schema fixtures via `shared/schemas/`), Playwright (`apps/web-shell/playwright/tests/` — one new workflow test covering range capture + playback; `shared/components/e2e/` — extend StoryboardPanel stories for range-in-progress and range-badge states)
**Target Platform**: VS Code extension host (primary) + web-shell (browser); both consume the same `@debrief/components` storyboard module and `@debrief/schemas` types
**Project Type**: Monorepo workspace — schema-first, thick services (none touched), thin frontends (capture + playback paths touched; persistence path unchanged)
**Performance Goals**: Time-range scrub MUST hit the same 60 fps target as today's `flyToViewport` viewport tween. Synchronised slider drive runs in the same RAF loop, so per-frame cost is bounded by an additional `currentTime` set and the existing per-frame redraw — no measurable regression expected. Scrub-completion latency MUST stay within the existing `transition_duration_ms + 250 ms` safety budget (per #217 FR-PLAY-008-style ceiling).
**Constraints**: Article XV (strict types — `viewport_end?: Viewport`, `time_range?: TimeRange` in the generated TS, no `any`); Article II (schema-first — both new slots live in LinkML, all derived artefacts regenerate); Article XIV (pre-4.0, additive schema evolution without version bump permitted); Article IV (services never touch UI — the playback engine continues to push state via `MapPanel` + `session.setCurrentTime`, never reading from the DOM); Article XI (the new range banner / cancel affordance strings live in the en-GB messages table)
**Scale/Scope**: 1 LinkML cluster touched (`storyboard.yaml`); 2 new fields + 1 cross-field rule; ~8 TypeScript files touched (crud, validate, ordering, types, storyboardPlayback, captureScene, StoryboardPanel UI for the range badge + in-progress banner, messages); 4 new golden fixtures (2 valid, 2 invalid) + 3 retired (the existing "non-null time_range invalid" / "non-null viewport_end invalid" reserved-slot fixtures from #215 retire here); ~20 new unit tests; 1 new Playwright workflow test; 1 new Storybook story state for `range-in-progress`. No new dependencies.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Verdict | Notes |
|---------|--------|---------|-------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Pass | All paths are local; capture rejects `t_end <= t_start` with a named error (FR-CAP-006); flavour mismatches (FR-SCH-002) surface explicit errors naming both fields. |
| II. Schema Integrity | Single source of truth (LinkML) | ✅ Pass | New slots authored in `storyboard.yaml`; Pydantic + TS + JSON Schema regenerate. Adherence rule added (XOR cross-field). Golden fixtures cover both flavours. |
| II.3 | Breaking changes require version bump + migration | ✅ Pass (under XIV) | Additive only: both new slots are optional. Legacy plots (instant flavour, `time_range = null`, `viewport_end` absent) parse unchanged. No `schema_version` bump needed; documented as ADR-NEW in research.md. |
| III. Data Sovereignty | Provenance, source preservation | ✅ Pass | Capture writes `provenance` per existing CRUD discipline. The two captured viewports + range are explicit user input, recorded verbatim. Reverse playback never rewrites stored data. |
| IV. Architectural Boundaries | Services never touch UI; frontends never persist | ✅ Pass | Playback engine still operates on session state + MapPanel ports. Capture still routes the new Scene through `createScene` in the CRUD module, which routes through `stac-writer` (Article IV.4 persistence boundary). No frontend writes directly to disk. |
| V. Extensibility | Schema compliance for extensions | ✅ Pass | No extension surface touched; contrib readers of Scene properties get the new optional fields with `undefined` defaults — they continue to function. |
| VI. Testing | Tests mandatory | ✅ Pass | Schema adherence tests, CRUD unit tests, playback unit tests, capture command tests, and one Playwright workflow test all updated/added in lockstep. CI gates unchanged. |
| VII. Test-Driven AI Collaboration | Tests define done | ✅ Pass | FR-CAP-001..006, FR-PLAY-001..007, FR-SCH-001..006 each map 1:1 to a test in `tasks.md`. |
| VIII. Documentation | Specs before code | ✅ Pass | Spec exists. One new ADR captures the schema-additive-no-bump decision and the lock-step interpolation primitive. |
| IX. Dependencies | Minimal, vetted | ✅ Pass | Zero new dependencies. RAF + existing `MapPanel.flyToViewport` + existing `session.setCurrentTime` cover the engine. |
| X. Security | No secrets, no network assumptions | ✅ Pass | N/A — pure local feature. |
| XI. Internationalisation | Externalisable strings | ✅ Pass | New strings (range mode label, "range in progress" banner, cancel label, `t_end <= t_start` error) added to the en-GB messages module. |
| XII. Community Engagement | Public by default | ✅ Pass | Spec + PR follow standard flow; blog post planned (opening context cached in Phase 2). |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | ✅ Pass | Will commit in four atomic steps (schema + regen; CRUD/validate/ordering; playback engine; capture command + UI affordance + Playwright). |
| XIV. Pre-Release Freedom | Breaking changes permitted pre-4.0 | ✅ Used | Optional additive schema change adopted under XIV; no migration shim because none needed (additive). |
| XV. Strict Type Safety | No `any`/`Any`; strict mode | ✅ Pass | New types are `TimeRange { start: datetime; end: datetime }` and `viewport_end?: Viewport`. The Scene flavour is discriminated at the boundary by a typed predicate (`isTimeRangeScene(scene): scene is TimeRangeSceneFeature`) — narrowed once, never re-cast. The engine and CRUD code consume only the narrowed type. |

**Result**: All articles pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/263-time-range-scenes/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── scene-flavour.contract.md     # XOR rule + flavour predicate contract
│   └── playback-engine.contract.md   # executeTransition flavour-branch contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── evidence/
│   └── opening-context.md   # Phase 2 output (cached blog opener)
└── tasks.md             # Phase 3 output (/speckit.tasks command — NOT created here)
```

### Source Code (repository root)

```text
shared/schemas/src/linkml/
└── storyboard.yaml                  # Add TimeRange class; convert SceneProperties.time_range range; add viewport_end slot; add XOR adherence rule

shared/schemas/src/fixtures/         # Golden fixtures (Article II)
├── valid/
│   ├── scene-time-range.json        # NEW — time-range flavour canonical
│   └── scene-instant.json           # KEEP (regression anchor)
└── invalid/
    ├── scene-time-range-missing-viewport-end.json    # NEW
    ├── scene-instant-with-viewport-end.json          # NEW
    └── scene-time-range-end-not-after-start.json     # NEW
                                     # RETIRE: scene-time-range-non-null.json (was the "must be null" v1 fixture)
                                     # RETIRE: scene-viewport-end-set.json (was the equivalent reserved-slot fixture)

shared/schemas/tests/                # Schema adherence tests (pytest + vitest)
└── test_storyboard_scene_flavour.py # NEW — round-trips both flavours; rejects all three invalid cases

shared/components/src/storyboard/
├── types.ts                         # NEW: TimeRange, TimeRangeSceneFeature, InstantSceneFeature, isTimeRangeScene predicate
├── crud.ts                          # createScene(input) accepts optional { time_range, viewport_end } pair; enforces FR-SCH-002 XOR; assertViewportBearingZero applied to viewport_end too; updateScene rejects partial flavour edits (FR-SCO-002 lite — capture-and-replace)
├── validate.ts                      # Adds flavourCheck() — both fields present together or both absent; t_end > t_start
├── ordering.ts                      # No code change — confirm anchor key remains timestamp (= t_start by convention); add one assertion-test to lock that
└── __tests__/
    ├── crud.flavour.test.ts         # NEW
    ├── validate.flavour.test.ts     # NEW
    └── types.flavour.test.ts        # NEW — predicate narrowing

apps/vscode/src/services/
├── storyboardPlayback.ts            # Branch executeTransition on flavour; introduce TimeRangeTween primitive (RAF loop driving currentTime + flyToViewport in lock-step); symmetric reverse; abort-on-interrupt
└── __tests__/
    └── storyboardPlayback.timeRange.test.ts   # NEW — covers forward, reverse, abort, interruption coherence

apps/vscode/src/commands/
├── captureScene.ts                  # Branch on transport.rangeArmed; two-step state machine; cancel path; emit createScene input with time_range + viewport_end on confirm
└── __tests__/
    └── captureScene.range.test.ts   # NEW — armed-toggle, step-1, step-2 confirm, cancel, reject t_end<=t_start

apps/vscode/src/views/storyboardPanel/   # Or current location of the Storyboard panel React tree (confirm at Phase 1)
├── StoryboardPanel.tsx              # Add range toggle + in-progress banner + range badge on Scene list rows
└── messages.ts                      # New en-GB strings for the affordance

apps/web-shell/playwright/tests/
└── storyboard-range-scene.spec.ts   # NEW — full workflow: arm range → capture start → scrub → reframe → confirm → play forward → play reverse; screenshots into specs/263-time-range-scenes/evidence/screenshots/

shared/components/e2e/
└── StoryboardPanel-range.spec.ts    # NEW — Storybook E2E for the range-in-progress UI state

shared/components/src/StoryboardPanel/__stories__/
└── StoryboardPanel.stories.tsx      # Extend with rangeArmed + rangeInProgress + mixed-flavour storyboard stories

docs/project_notes/decisions.md      # Append ADR — additive schema evolution + RAF lock-step interpolation primitive
```

**Structure Decision**: Schema-first additive evolution. The single LinkML cluster `storyboard.yaml` gains a `TimeRange` class and a `viewport_end` slot; everything else is downstream regen + branching. Code-side work concentrates in three places (CRUD validation, playback engine, capture command) with a single shared discriminated-union predicate exported from `shared/components/src/storyboard/types.ts`. No new module, no new service, no new app.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StoryboardPanel — `rangeArmedAndInProgress` | `shared/components/src/StoryboardPanel/__stories__/StoryboardPanel.stories.tsx` | `storyboard-panel-range.js` | Demonstrates the two-step capture affordance: armed toggle, in-progress banner with cancel, then a completed time-range Scene with the range badge in the list. |
| StoryboardPanel — `mixedFlavourPlayback` | same file (new story `mixedFlavourPlayback`) | `storyboard-panel-mixed.js` | Demonstrates a Storyboard whose Scene list mixes instant + time-range Scenes, with a synthesized "playing" highlight that walks through forward and reverse. (Non-interactive — illustrates the visual contract.) |

**Inclusion Criteria Applied**:
- [x] New visual component *(the range badge, the in-progress banner, the affordance toggle)*
- [x] Significant visual change *(StoryboardPanel grows the new affordance + per-Scene flavour indicator)*
- [x] Interactive demo adds narrative value *(the two-step capture flow is the most novel UX in the feature)*

**Bundleability Verified**:
- [x] Stories exist in Storybook *(extended from the existing `StoryboardPanel.stories.tsx`)*
- [x] Components render standalone *(StoryboardPanel already renders against in-memory fixtures; no app context required)*
- [x] Reasonable bundle size expected (< 500KB) *(component + fixture data; well under budget)*

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/storyboard-storyboardpanel--range-armed-and-in-progress`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx` → `rangeArmedAndInProgress` | Affordance renders armed; clicking "Start range" begins the in-progress banner; clicking Cancel restores idle | light, dark, vscode | click range toggle, click capture, click cancel |
| `StoryboardPanel.stories.tsx` → `mixedFlavourPlayback` | Both Scene flavours render with their distinct affordances (badge for time-range; nothing for instant) | light, dark, vscode | hover for tooltips; no input drive |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid="storyboard-range-toggle"`, `data-testid="storyboard-range-banner"`, `data-testid="storyboard-scene-row-{id}"`, `aria-pressed`, `aria-live="polite"` on the banner)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/StoryboardPanel-range.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=storyboard-storyboardpanel--range-armed-and-in-progress&globals=theme:light
/iframe.html?id=storyboard-storyboardpanel--range-armed-and-in-progress&globals=theme:dark
/iframe.html?id=storyboard-storyboardpanel--range-armed-and-in-progress&globals=theme:vscode
```

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Capture a time-range Scene and play it back forward + reverse | MapView, TimeController, StoryboardPanel, FeatureList | `.leaflet-container`, `[data-testid="time-slider"]`, `[data-testid="storyboard-range-toggle"]`, `[data-testid="storyboard-capture-button"]`, `[data-testid="storyboard-range-banner"]`, `[data-testid="storyboard-scene-row-${id}"]`, `[data-testid="transport-play"]`, `[data-testid="transport-reverse"]` | open sample plot → arm range → click capture → scrub slider → pan/zoom map → click confirm → verify new Scene appears with range badge → click play → assert slider crawls + viewport tweens in lock-step → at end click reverse → assert symmetric reverse |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for the new StoryboardPanel selectors (reuse `AnalysisPage`; add `StoryboardPanelObject` if not present, kept tight per existing patterns)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/263-time-range-scenes/evidence/screenshots/` from the spec file (follow `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-range-scene.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-range-scene`
- Local: `pnpm --filter @debrief/web-shell test storyboard-range-scene`

## Complexity Tracking

No constitution violations; no entries required.
