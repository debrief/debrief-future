# Implementation Plan: Overlap Warning for Time-Range Scenes

**Branch**: `271-scene-overlap-warning` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/271-scene-overlap-warning/spec.md`

## Summary

Add a **passive, non-blocking** warning to the Storyboard panel when two or more **time-range Scenes** (`time_range = {start, end}`) within a single Storyboard have overlapping windows. The warning appears on each offending Scene row, names the conflicting Scene(s), and can be dismissed for an intentional overlap. Nothing is reordered, merged, rejected, or blocked.

**Technical approach**: a pure, synchronous detection helper in the shared `storyboard/` module (`detectSceneOverlaps`), mirroring the existing `ordering.ts`/`missing-data.ts` helpers; a presentational `OverlapBadge` component mirroring the existing `StaleBadge`; one new optional field (`overlapsWith`) on the existing `SceneEditViewModel` boundary type; and thin per-host wiring (VS Code `storyboardPanelView` + web-shell `StoryboardPanelMount`) that computes overlaps from the active-Storyboard scene set already in hand and merges them into the view-models they already build. Dismissal is session-scoped panel-local state (a set of dismissed scene-id pairs) held by each host — no persistence, no schema change, no Python.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode — Article XV). No Python.
**Primary Dependencies**: `@debrief/schemas` (`SceneFeature`, `TimeRange`, `isTimeRangeScene` — consumed, not changed), `@debrief/components` (`StoryboardPanel`, `SceneList`, `storyboard/` helpers), React 18.x. No new runtime dependencies.
**Storage**: N/A — derived, read-only computation over the in-memory plot. Dismissal state is ephemeral, in-memory, session-scoped (never persisted).
**Testing**: Vitest (unit for the pure helper + component for the badge/list), Playwright via `@sparticuz/chromium` (Storybook E2E for theme screenshots/evidence).
**Target Platform**: VS Code extension webview + web-shell (browser). Both render the same `@debrief/components` `StoryboardPanel`.
**Project Type**: Web (shared component library + two frontends). No backend touched.
**Performance Goals**: Overlap detection is O(n²) pairwise over time-range Scenes in one Storyboard (n = Scenes per Storyboard, realistically tens). Evaluation MUST be imperceptible (< 16 ms) on every panel refresh.
**Constraints**: Offline (pure client logic). No service call. No persisted state. Must coexist with existing per-row affordances (stale badge, edit form, out-of-range).
**Scale/Scope**: Storyboards hold ~5–50 Scenes; pairwise overlap is trivial at this scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Verdict |
|---------|-----------|---------|
| I. Defence-Grade Reliability (offline) | Pure client-side derived computation; no network. | ✅ Pass |
| II. Schema Integrity | `time_range`/`TimeRange` already exist from #263; **no schema change**. The `SceneEditViewModel` extension is a panel boundary type, not LinkML-derived. | ✅ Pass — no schema work |
| III. Data Sovereignty (provenance) | No data transformation; read-only display derivation. Nothing written to the plot. | ✅ Pass — N/A |
| IV. Architectural Boundaries | Frontend display logic only. **No service touches UI; no frontend persists** — dismissal is ephemeral session UI state, deliberately *not* persisted (IV.2 satisfied by not writing). | ✅ Pass |
| IV.5 (CLAUDE.md) boundary-type derivation | `SceneEditViewModel.overlapsWith` is an **additive optional field**, not a subset-mirror of a typed source — `Pick`/`Omit` rule does not apply. `OverlapPartner.title` is a derived display value, not a re-listed schema subset. | ✅ Pass |
| VI/VII. Testing / TDD | Unit tests for the pure helper define "done" before implementation; component + E2E follow. | ✅ Pass (tests-first) |
| VIII. Documentation | Spec exists; this plan + quickstart document the design. | ✅ Pass |
| IX. Dependencies | Zero new dependencies. | ✅ Pass |
| XV. Strict Type Safety | TS strict, no `any`; new types fully annotated. | ✅ Pass |

**No violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/271-scene-overlap-warning/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── overlap-detection.md   # Pure-helper + view-model + dismissal contract
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── evidence/
    ├── opening-context.md     # Phase 2 cached opener
    └── screenshots/           # Storybook E2E output (overlap-{light,dark,vscode}.png)
```

### Source Code (repository root)

```text
shared/components/src/
├── storyboard/
│   ├── overlap.ts                      # NEW — pure detectSceneOverlaps() + overlapPairKey()
│   └── __tests__/
│       └── overlap.test.ts             # NEW — unit edge cases (vitest)
├── panels/StoryboardPanel/
│   ├── OverlapBadge.tsx                # NEW — presentational badge (mirrors StaleBadge.tsx)
│   ├── SceneList.tsx                   # EDIT — render OverlapBadge from editVm.overlapsWith
│   ├── types.ts                        # EDIT — add SceneEditViewModel.overlapsWith?; add onSceneOverlapDismiss?
│   ├── StoryboardPanel.tsx             # EDIT — thread onSceneOverlapDismiss → SceneList
│   ├── StoryboardPanel.stories.tsx     # EDIT — add "WithOverlapWarnings" story
│   └── __tests__/
│       └── OverlapBadge.test.tsx       # NEW — render + dismiss-callback (vitest + testing-library)
└── index.ts                           # EDIT — export detectSceneOverlaps, OverlapPartner type

shared/components/e2e/
└── StoryboardOverlap.spec.ts           # NEW — Storybook E2E, 3 themes, screenshots → evidence

apps/vscode/src/views/storyboardPanelView.ts   # EDIT — compute overlaps in refresh(); hold dismissedPairs; merge into SceneEditViewModel; handle dismiss message
apps/vscode/src/types/storyboardPanelMessages.ts  # EDIT — add 'scene-overlap-dismiss' inbound message
apps/vscode/src/webview/web/storyboardPanel.tsx    # EDIT — wire onSceneOverlapDismiss → postMessage

apps/web-shell/src/StoryboardPanelMount.tsx        # EDIT — compute overlaps; hold dismissedPairs (useState); merge into sceneEditViewModels; pass onSceneOverlapDismiss
```

**Structure Decision**: Reuse the established Storyboard architecture exactly. Detection lives as a pure helper in `shared/components/src/storyboard/` alongside `ordering.ts`/`missing-data.ts` (sync, no mutation, fully unit-testable). Presentation is a new `OverlapBadge` rendered by `SceneList` in the same slot pattern as `StaleBadge`. The cross-boundary surface grows by exactly one optional view-model field + one optional callback, both defaulted so all existing fixtures/tests keep compiling — the same additive-optional convention #217/#218/#230/#235 used.

## Design Detail

### Detection (shared, pure)

```ts
// shared/components/src/storyboard/overlap.ts
export interface OverlapPartner { readonly sceneId: string; readonly title: string; }

/** Stable, order-independent key for a Scene pair. */
export function overlapPairKey(a: string, b: string): string; // sorted `${lo}|${hi}`

/**
 * Pairwise overlap among TIME-RANGE Scenes of one Storyboard.
 * Returns sceneId → partners it overlaps (post-dismissal). Empty/absent
 * entry = no warning. Instant Scenes are excluded entirely.
 */
export function detectSceneOverlaps(
  plot: StoryboardPlot,
  storyboardId: string,
  dismissedPairs?: ReadonlySet<string>,
): ReadonlyMap<string, readonly OverlapPartner[]>;
```

- **Overlap rule (strict interior, FR-002)**: parse `time_range.start`/`end` via `Date.parse` to epoch ms; A and B overlap iff `aStart < bEnd && bStart < aEnd`. Touching endpoints (`aEnd === bStart`) → **not** overlapping.
- Only Scenes where `isTimeRangeScene(scene)` participate (FR-006). Instant Scenes are skipped.
- Scoped to `storyboard_id === storyboardId` (FR-007).
- `dismissedPairs` suppresses listed pairs; a partner dropped by dismissal is removed from the other's list, and a Scene whose every overlap is dismissed yields an empty list (no badge).

### Dismissal (session-scoped, host-local)

- Each host holds a `Set<string>` of dismissed pair keys (panel-local; **not persisted** — FR-008/FR-009, Assumptions).
- On dismiss, the host adds `overlapPairKey(sceneId, partnerId)` for each named partner and re-pushes.
- On each recompute the host **prunes** dismissed keys that are no longer active overlaps (`dismissed ∩ activePairs`), so a *new* overlap — including a re-created previously-dismissed pair — warns afresh (FR-009).

### Presentation

- `OverlapBadge` (mirrors `StaleBadge`): `role="status"`, accessible label naming the conflicting Scene(s) (FR-012, not colour-only), a Dismiss button, and `data-testid="overlap-badge"`. Rendered by `SceneList` beneath the row when `editVm.overlapsWith?.length` (coexists with the stale badge — FR-013).
- `StoryboardPanel` threads a new optional `onSceneOverlapDismiss?(sceneId, partnerSceneIds)` to `SceneList` → `OverlapBadge`.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StoryboardPanel (overlap state) | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` (new `WithOverlapWarnings` story) | `storyboard-panel-overlap.js` | Demonstrates the passive overlap warning naming the conflicting Scene + the dismiss affordance |

**Inclusion Criteria Applied**:
- [x] New visual component (`OverlapBadge`) + significant visual change to the Storyboard panel
- [x] Significant visual change
- [x] Interactive demo adds narrative value (dismiss interaction)

**Bundleability Verified**:
- [x] Stories exist in Storybook (new story added to the existing `StoryboardPanel.stories.tsx`)
- [x] Components render standalone (panel is headless of VS Code — driven by fixtures)
- [x] Reasonable bundle size expected (< 500KB — presentational only)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-overlap-warnings`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx` → `WithOverlapWarnings` | Badge renders on both offending rows; names the partner; non-overlapping + instant rows are clean; dismiss removes the badge; accessibility (role=status, aria label) | light, dark, vscode | hover row, read badge, click Dismiss, assert badge gone |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (Dismiss)
- [x] Accessibility attributes present (`data-testid="overlap-badge"`, `role="status"`, `aria-label`)
- [x] Screenshots captured for evidence (`evidence/screenshots/overlap-{light,dark,vscode}.png`)

**Test File Location**: `shared/components/e2e/StoryboardOverlap.spec.ts`

**Theme Variant URLs**:
```
/iframe.html?id=panels-storyboardpanel--with-overlap-warnings&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-overlap-warnings&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-overlap-warnings&globals=theme:vscode
```

**Run Command (cloud)**: `cd shared/components && node run-playwright.mjs StoryboardOverlap`

## Web-Shell E2E Testing

None required for this feature — the presentational + detection behaviour is fully exercised by the shared-components Storybook E2E (the evidence/screenshot source of record), and the host wiring is covered by VS Code/web-shell unit tests. Authoring two overlapping *time-range* Scenes through the live web-shell capture flow depends on the #263 range-capture affordance and adds no coverage the Storybook story does not already provide. (If a smoke check is wanted later, a fixture plot with pre-authored overlapping time-range Scenes loaded into the web-shell would suffice.)

## Complexity Tracking

> No Constitution violations — section intentionally empty.
</content>
