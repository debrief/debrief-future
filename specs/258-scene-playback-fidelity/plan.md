# Implementation Plan: Storyboard Scene Playback Fidelity & UI Polish

**Branch**: `258-scene-playback-fidelity` (active feature; cloud session running on `claude/start-speckit-258-JAGai`) | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/258-scene-playback-fidelity/spec.md`

## Summary

Close four tightly-coupled gaps in the storyboard-scene workflow exposed by PR #606 field testing:

- **(a) Display mode persistence** — add `display_mode` (`full | trail`) to `SceneProperties` in `shared/schemas/src/linkml/storyboard.yaml`; have both capture commands (`apps/vscode/src/commands/captureScene.ts`, `apps/web-shell/src/commands/captureSceneWeb.ts`) read it from the session-state Zustand slice and pass it into `createScene`; have `storyboardPlayback.executeTransition` (and its web equivalent) call `session.getState().setDisplayMode(scene.properties.display_mode)` alongside the existing `flyToViewport`. Legacy scenes (no `display_mode`) leave the time controller untouched.
- **(b) Viewport polygon fidelity** — replace the `±0.001°` placeholder in `shared/components/src/storyboard/crud.ts:111-123` with a four-corner polygon derived from the actual Leaflet map bounds at capture time. Render-side fallback: when `SceneRectangleLayer` detects the placeholder shape (heuristic: square of ~0.002° side at scene centre), recompute from `(viewport, map.getSize())` so legacy scenes never display the placeholder again.
- **(c) Active-scene halo** — extend the existing `debrief-scene-rect--current` class in `SceneRectangleLayer` so it applies the same `debrief-map-feature--selected` styling already used by `TemporalTrackLayer` (drop-shadow + pulse animation in `MapView.css`). Single-active invariant maintained by the existing `currentSceneId` prop pipeline.
- **(d) FeatureList grouping** — extend `shared/components/src/FeatureList/flattenFeatures.ts` so `STORYBOARD` features become collapsible parent rows whose children are their `STORYBOARD_SCENE` features (matching the same parent/child pattern already used for `Track → Position` rows). Active-scene state propagates to a collapsed parent via the existing `hasChildSelected` helper.

The work crosses LinkML schema, Pydantic + TypeScript regeneration, two frontends (VS Code + web-shell), and one component-library tree. All four gaps ship together (SC-006).

## Technical Context

**Language/Version**: Python 3.11 (schema authoring + Pydantic generation), TypeScript 5.x strict (component library + both frontends — Article XV)
**Primary Dependencies**: LinkML ≥1.7.0 (master schema); Pydantic v2 (generated Python models); `@debrief/schemas` (generated TS types); React 18.x + `react-leaflet` 4.2 (`SceneRectangleLayer`, `MapView`); Leaflet 1.9.x (`map.getSize()`, `map.containerPointToLatLng()`); `@tanstack/react-virtual` (`FeatureList` virtualisation — already in place); Zustand ^5 (`@debrief/session-state` `displayMode` slice at `services/session-state/src/store/slices/temporal.ts`).
**Storage**: STAC items + GeoJSON payloads on the local filesystem (VS Code adaptor) or IndexedDB (web-shell adaptor) via the existing `@debrief/stac-writer` abstraction — Article IV.4 boundary is unchanged.
**Testing**: vitest unit tests for `crud.ts`, `flattenFeatures.ts`, and `SceneRectangleLayer` (existing `__tests__` directories); Playwright web-shell E2E in `apps/web-shell/playwright/tests/storyboard-*.spec.ts` (existing page object `StoryboardEditPage`); schema adherence tests in `shared/schemas/tests/`.
**Target Platform**: VS Code extension (Node host, openvscode-server in cloud) + web-shell (browser, Chromium via `@sparticuz/chromium` for tests) + Storybook (component browser).
**Project Type**: Monorepo — shared `shared/components` + `shared/schemas` library consumed by two host frontends (`apps/vscode`, `apps/web-shell`).
**Performance Goals**: Scene-click transition latency unchanged (≤ `transition_duration_ms`, default 500 ms). FeatureList renders 100+ rows including a 50-scene storyboard at 60 fps via existing virtualisation.
**Constraints**: Offline (Article I.1); strict types throughout (Article XV.1/3); writes only via the writer abstraction (Article IV.4 — unchanged; no new persistence paths); legacy scenes without `display_mode` MUST NOT corrupt time-controller state (FR-003); legacy placeholder polygons MUST NOT visibly remain after migration window (FR-006).
**Scale/Scope**: Typical scenario = 1–2 storyboards × 5–20 scenes. Upper bound: ~50 scenes per storyboard, drawn as polygons on the map and listed in the tree. No expected scale issues — the polygon math is O(scenes) per frame and already handled by the existing layer.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-evaluated post-design (unchanged).*

| Article | Clause | Status | Note |
|---|---|---|---|
| I. Defence-Grade Reliability | I.1 Offline | ✅ | No new network calls. |
| I. Defence-Grade Reliability | I.3 No silent failures | ✅ | Legacy `display_mode`-missing path is documented behaviour, not silent: spec FR-003 + edge case in spec. |
| II. Schema Integrity | II.1 Single source of truth | ✅ | `display_mode` lands in `storyboard.yaml` LinkML; Pydantic + TS regenerated. No hand-written types. |
| II. Schema Integrity | II.2 Schema tests mandatory | ✅ | New round-trip + golden fixture test for `SceneProperties.display_mode` added in `shared/schemas/tests/`. |
| II. Schema Integrity | II.3 Versioning | ✅ (pre-v4.0.0) | Adding an optional slot is additive; Article XIV permits during pre-release. Reader tolerates the missing field for legacy scenes. |
| III. Data Sovereignty | III.1 Provenance | ✅ | No new transformations; existing scene-capture provenance unchanged. |
| III. Data Sovereignty | III.2 Source preservation | ✅ | Stored polygons are recomputed on render when detected as the placeholder; the legacy on-disk value is left untouched unless the scene is next edited — read-time fallback, not in-place migration. |
| IV. Architectural Boundaries | IV.1 Services never touch UI | ✅ | No Python service changes; the Leaflet projection math is a frontend concern. |
| IV. Architectural Boundaries | IV.2 Frontends never persist | ✅ | All writes continue to flow through `@debrief/stac-writer` via the existing `saveSession` path. No new persistence call sites. |
| IV. Architectural Boundaries | IV.4 Persistence-host abstraction | ✅ | No new direct persistence in either host. ESLint `no-direct-persistence-in-frontend` not affected. |
| V. Extensibility | V.2 Schema compliance | ✅ | The new slot is a schema slot; consumers regenerate. |
| VI. Testing | VI.1 Schema tests | ✅ | See Phase 1 contracts. |
| VI. Testing | VI.2 Service tests | N/A | No service code touched. |
| VI. Testing | VI.3 Integration | ✅ | New Playwright covers the capture→play→Trail-restored happy path. |
| VII. Test-Driven AI Collaboration | VII.1 Tests before impl | ✅ | `/speckit.tasks` will sequence test-first under `tasks.md`. |
| VIII. Documentation | VIII.1 Specs before code | ✅ | This plan exists. |
| IX. Dependencies | IX.1 Minimal | ✅ | **No new runtime dependencies.** All needed primitives (`map.getSize`, `containerPointToLatLng`, `react-virtual`, Zustand slice, drop-shadow CSS) already in repo. |
| X. Security | All | ✅ | No secrets, no network. |
| XI. Internationalisation | XI.1 | ✅ | No new user-facing strings besides one (the Storyboard parent row label) — externalisable through the existing FeatureRow label pipeline. |
| XII. Community Engagement | XII.2 Beta previews | ✅ | Heroku review app will host the demo per project default. |
| XIII. Contribution Standards | XIII.1 Atomic commits | ✅ | Tasks will be sliced for one-logical-change commits. |
| XIV. Pre-Release Freedom | All | ✅ | Pre-v4.0.0 — additive schema change is in scope. |
| XV. Strict Type Safety | XV.1–3 | ✅ | LinkML generators emit fully-typed `display_mode` slot; no `any`/`Any`. New Leaflet math is strict-mode-clean. |

**Gate result**: PASS. No violations require Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/258-scene-playback-fidelity/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — design decisions for each of the 4 gaps
├── data-model.md        # Phase 1 output — SceneProperties.display_mode + tree-node entities
├── quickstart.md        # Phase 1 output — local validation walkthrough
├── contracts/
│   └── scene-properties.schema.json   # Generated JSON Schema diff for the new slot
├── checklists/
│   └── requirements.md  # /speckit.specify quality gate (all green)
└── evidence/
    └── opening-context.md   # Phase 2 cached opener (Content Specialist)
```

### Source Code (repository root)

Touched paths only — this feature does not introduce new packages.

```text
shared/schemas/src/
├── linkml/
│   ├── storyboard.yaml                # ADD display_mode slot to SceneProperties (reuses DisplayModeEnum from session-state.yaml)
│   └── session-state.yaml             # READ-ONLY — source of DisplayModeEnum (full|trail)
├── generated/
│   ├── typescript/                    # regenerated via gen-typescript
│   └── python/debrief_schemas/        # regenerated via gen-pydantic
└── tests/
    └── (new) scene_display_mode.test  # round-trip + golden fixture

shared/components/src/
├── storyboard/
│   ├── crud.ts                        # REPLACE viewportToPolygon with real corner math; thread display_mode through createScene
│   └── __tests__/crud.test.ts         # extend with display_mode + polygon-from-bounds cases
├── MapView/
│   ├── SceneRectangleLayer.tsx        # apply debrief-map-feature--selected to current; legacy-placeholder recompute on render
│   ├── MapView.css                    # (existing) selection-halo CSS — reused, no edit needed
│   └── __tests__/SceneRectangleLayer.test.tsx   # extend with halo + recompute cases
└── FeatureList/
    ├── flattenFeatures.ts             # ADD 'storyboard' DisplayItemType; group STORYBOARD_SCENE under STORYBOARD parent
    ├── FeatureRow.tsx                 # if needed: render storyboard parent + indented scene children
    ├── flattenFeatures.test.ts        # extend with grouping cases
    └── FeatureList.test.tsx           # extend with collapse/expand of storyboard parent

apps/vscode/src/
├── commands/captureScene.ts           # READ session.displayMode; pass through to createScene
└── services/storyboardPlayback.ts     # in executeTransition, after flyToViewport: session.setDisplayMode(scene.properties.display_mode)

apps/web-shell/src/
├── commands/captureSceneWeb.ts        # mirror of captureScene.ts
└── (services that own the web playback equivalent — same pattern)

apps/web-shell/playwright/
├── pages/StoryboardEditPage.ts        # extend with display-mode toggle accessor + rectangle-bounds assertion helpers
└── tests/
    ├── storyboard-capture.spec.ts     # extend: capture in Trail → assert display_mode persists
    └── (new) storyboard-playback-fidelity.spec.ts   # capture-then-play-back-restores-Trail-and-correct-bounds
```

**Structure Decision**: Existing monorepo layout. No new packages, no new entry points. The change spreads across one LinkML file, three component-library modules, two command files, one playback service, and the corresponding tests in each location.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StoryboardPlayback | `shared/components/src/panels/StoryboardPanel/StoryboardPlayback.stories.tsx` | `storyboard-playback.js` | Shows capture-then-play with display mode restored; the headline narrative for the post. |
| FeatureList (storyboard grouping) | `shared/components/src/FeatureList/FeatureList.stories.tsx` | `feature-list-storyboard.js` | New story (added by this feature) demonstrating the collapsible Storyboard → Scenes parent. |

**Inclusion Criteria Applied**:
- [x] New visual component — collapsible Storyboard parent in FeatureList is new tree composition.
- [x] Significant visual change — scene-rectangle halo + bounds fidelity is a visible regression-fix.
- [x] Interactive demo adds narrative value — clicking a scene in the panel and watching display-mode + viewport restore is the demo.

**Bundleability Verified**:
- [x] Stories exist in Storybook — `StoryboardPlayback.stories.tsx` already present; `FeatureList.stories.tsx` to be extended.
- [x] Components render standalone — `StoryboardPanel` and `FeatureList` both have existing isolated stories.
- [x] Reasonable bundle size expected (< 500KB) — both already shipped, no new heavy deps.

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel-storyboardplayback` (existing).

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPlayback.stories.tsx` | Rendering of timeline + transport + halo on active rectangle | light, dark, vscode | click scene row → assert halo class applied |
| `FeatureList.stories.tsx` (storyboard-grouping story) | Storyboard parent collapses / expands; nested Scene rows | light, dark, vscode | click chevron → assert child rows hide/show; click child → assert selection |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants — the halo uses `debrief-map-feature--selected` which is already theme-tested.
- [x] Interactive elements respond to user input — chevron expand/collapse + scene-click are new interactions to cover.
- [x] Accessibility attributes present (`data-testid` on parent row + child rows; existing pattern in `FeatureRow`).
- [x] Screenshots captured for evidence — saved into `specs/258-scene-playback-fidelity/evidence/screenshots/`.

**Test File Location**: `shared/components/e2e/FeatureList.spec.ts` (extend), `shared/components/e2e/StoryboardPlayback.spec.ts` (new — covers halo).

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Capture-in-Trail → play-back-restores-Trail | TimeController, StoryboardPanel, MapView, FeatureList | `[data-testid="time-controller-mode"]`, `[data-testid="storyboard-capture-btn"]`, `.debrief-scene-rect--current`, `[data-testid="feature-row-storyboard-*"]` | switch to Trail, capture, switch to Full, click scene in FeatureList, assert mode === 'trail' + rectangle has selected class |
| Polygon-bounds-fidelity | MapView, StoryboardPanel | `.debrief-scene-rect` Leaflet polygon coords | capture two scenes at different zooms, read polygon coords, assert non-equal & non-placeholder |
| Storyboard grouping in FeatureList | FeatureList | `[data-testid="feature-row-STORYBOARD-*"]` parent + child rows | open scenario with 1 storyboard × 5 scenes, assert exactly one top-level storyboard row + 5 children when expanded |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell.
- [x] Page objects in `apps/web-shell/playwright/pages/` extended — `StoryboardEditPage` gains `getDisplayMode()`, `getSceneRectangleBounds(sceneId)`, `getCurrentSceneClassList()`.
- [x] Screenshots written into `specs/258-scene-playback-fidelity/evidence/screenshots/` — the active-scene halo + the FeatureList grouping are the two headline images.

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-playback-fidelity.spec.ts` (new), `storyboard-capture.spec.ts` (extend).

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-playback-fidelity`
- Local: `pnpm --filter @debrief/web-shell test storyboard-playback-fidelity`

## Complexity Tracking

*No Constitution Check violations — section intentionally empty.*
