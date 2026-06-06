# Phase 1 Data Model — Storyboard Edit Suite Polish Follow-up

**Feature**: 234-storyboard-edit-polish-followup
**Date**: 2026-04-26 (revised 2026-04-27)
**Architecture pivot:** ADR-027 — entry §4 (`PanelPort`) **deleted** with the move from `PortContext` to a shared callback-adapter helper. See `research.md` R10b and `contracts/harness-knobs.md` §2.
**Status**: No persistent schema changes. This document records the test-time entities introduced.

---

## Summary

This feature adds **no production data structures, no LinkML changes, no Pydantic models, and no new persisted state**. It introduces three test-time entities + one promoted public-API entry — captured here so reviewers can audit them without spelunking through code.

---

## Test-time entities

### 1. `MockPortKnobs`

Small bag of optional flags consumed by the shared story-only **mock-handlers helper** (R1 + R10b post-pivot, R7). Defined in `shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockHandlers.ts`.

> **Naming.** The type is named `MockPortKnobs` (rather than e.g. `MockHandlerKnobs`) for continuity with the URL-knob contract in `contracts/harness-knobs.md` §1, and because the spec references this name throughout. Post-ADR-027 there is no port; the type name is a vestigial label, not an architectural claim.

**Type:**

```ts
export interface MockPortKnobs {
  /** When set, the copy-to-other handler routes the matching sceneId to the deep-copy failure branch. */
  induceCopyFailure?: string;
  /** When set, the refresh-thumbnail handler routes the matching sceneId to the per-Scene failure branch. */
  induceRefreshFailure?: string;
}
```

**Validation**: both fields are optional. When unset, the helper behaves as the happy path. The fields are case-sensitive sceneId strings (matching the existing string sceneId discriminant — feature 234 does not introduce a branded `SceneId` type).

**Lifetime**: per harness mount or per Storybook story instance. Reset on page reload.

---

### 2. `SceneEditFixtureSeed`

The deterministic seed consumed by `createStoryOnlyMockPort()` to produce the initial `StoryboardEditState`. Defined alongside `MockPortKnobs` in `__testing__/storyOnlyMockPort.ts`.

**Type (composed from production types via `Pick<>` rather than redefining fields):**

```ts
import type {
  SceneRowViewModel,
  StoryboardListViewModel,
} from '../types';

/** Per-scene fixture row: a subset of the production SceneRowViewModel
 *  shape plus two test-only display flags. By Pick<>-ing rather than
 *  redeclaring fields, schema changes to the production scene shape
 *  flow through automatically (Article II — schema integrity). */
export type SceneFixtureSeed =
  & Pick<SceneRowViewModel, 'sceneId' | 'title' | 'timestampIso'>
  & {
      readonly visibleFeatureIds?: ReadonlyArray<string>;
      readonly thumbnailDataUri?: string;
      /** Test-only: render with a stale badge (WithStaleBadge story). */
      readonly stale?: boolean;
      /** Test-only: render with missing-data remediation (WithMissingDataRemediation story). */
      readonly missingData?: boolean;
    };

export interface SceneEditFixtureSeed {
  readonly storyboards: ReadonlyArray<
    & Pick<StoryboardListViewModel, 'storyboardId' | 'title' | 'description'>
    & { readonly scenes: ReadonlyArray<SceneFixtureSeed> }
  >;
  readonly activeStoryboardId: string;
}
```

**Why composition not redefinition**: the previous draft declared every field explicitly (e.g. `id: SceneId; title: string; timestamp: string`). That created a parallel type that would silently drift the moment production added a field. `Pick<SceneRowViewModel, ...>` keeps the fixture shape downstream of the source-of-truth type, so a schema change to `SceneRowViewModel` either propagates automatically or surfaces as a TS compile error in the fixture seed.

**Validation rules**:
- `activeStoryboardId` MUST appear in `storyboards[].storyboardId`.
- Each `scenes[].sceneId` MUST be unique within its storyboard.
- `timestampIso` MUST be a valid ISO 8601 string (the reducer's existing invariants apply).

**Provenance**: each story file declares its own seed inline (kept close to the assertions in spec.md US1 acceptance scenarios). Shared seeds for cross-story scenarios live in `__testing__/fixtures.ts` if the four stories overlap.

---

### 3. A11y report record (markdown + raw JSON)

Per FR-023, the audit produces TWO artefacts:

**3a. `evidence/a11y-report.md` — human-readable report.**

Schema (markdown table row):

| Column | Type | Notes |
|--------|------|-------|
| Surface | string | One of: `harness:overflow-menu`, `harness:edit-form+stale`, `harness:missing-data`, `story:with-edit-form`, `story:with-undo-toast`, `story:with-stale-badge`, `story:with-missing-data-remediation` |
| Theme | string | `light`, `dark`, or `vscode` (story rows iterate; harness rows pick the default theme unless contrast issues warrant repeats) |
| axe version | string | e.g. `4.8.5` (read once from `@axe-core/playwright` package.json at run time) |
| Violations: serious | number | MUST be 0 or test fails |
| Violations: critical | number | MUST be 0 or test fails |
| Violations: moderate | number | Non-zero permitted with a row in the "Accepted Risks" section below |
| Status | string | ✅ Pass / ⚠ Moderate / ❌ Fail |

The report's "Accepted Risks" section enumerates moderate violations with: rule id, surface, rationale, owner, and revisit date.

**3b. `evidence/a11y-results.json` — raw axe output (machine-readable).**

Schema:

```ts
interface A11yResultsFile {
  /** ISO 8601 timestamp of the audit run. */
  capturedAt: string;
  /** axe-core version (from @axe-core/playwright package.json). */
  axeVersion: string;
  /** Git SHA at audit time. */
  gitSha: string;
  /** One entry per audited surface × theme variant. */
  surfaces: ReadonlyArray<{
    surface: string;          // matches "Surface" column above
    theme: 'light' | 'dark' | 'vscode';
    /** Raw axe results object — matches the AxeResults shape from @axe-core/playwright. */
    results: AxeResults;
  }>;
}
```

**Why both**: the markdown report is what humans read in PRs and audit trails; the JSON file is what future re-analysis (different rule sets, regression hunting, cross-PR diffing) consumes. Writing both costs nothing extra at audit time.

---

### 4. ~~`PanelPort` (PortContext value type)~~ — **REMOVED 2026-04-27**

> Removed. ADR-027 records the pivot from `PortContext` to a callback-adapter helper. The `PanelPort` interface, `OutboundMessage` discriminated union, default-thrower port, and `PortContext.tsx` file are not introduced by this feature. See `contracts/harness-knobs.md` §3 (also removed) and `research.md` R10b.

---

### 5. `composeSceneEditViewModels` — promoted to public API contract (FR-046)

Existing function at `shared/components/src/panels/StoryboardPanel/types.ts:325`. This feature does not change the signature; it pins it as a contracted public API surface.

**Signature (pinned)**:

```ts
/**
 * Compose per-Scene edit view-models for the active storyboard.
 *
 * INVARIANT (FR-008 from #230, perf-budgeted by FR-030):
 *   Iterates ONLY the active storyboard's scenes — O(active-storyboard Scenes).
 *   Inactive storyboards are not touched, even if present in `state.storyboards`.
 *
 * PERF BUDGET (FR-030 from #234):
 *   Median wall-clock ≤ 50 ms over 100 iterations against a 50-Scene active
 *   storyboard (5 × 50 fixture in memory). CI tolerance buffer 20 % (60 ms soft).
 *
 * STABILITY:
 *   Public API of @debrief/components per shared/components/CHANGELOG.md.
 *   Adding a new SceneEditViewModel field requires a perf-budget re-baseline.
 */
export function composeSceneEditViewModels(
  state: StoryboardEditReducerState,
): Readonly<Record<string /* sceneId */, SceneEditViewModel>>;
```

**What's new**: nothing in the function itself. What changes:
1. JSDoc above is the in-source truth.
2. `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` (new file) is the canonical contract document — referenced by the perf test's failure message.
3. `shared/components/CHANGELOG.md` gains an "Unreleased — Public API" entry promoting the function from "exported helper" to "public API with perf invariant".

---

## What this feature does *not* change

- LinkML schemas — no new types, no field changes.
- Pydantic models — no service-layer changes.
- TypeScript schema types — generated types unchanged.
- Session-state shape — `LogService` / Storyboard state unchanged.
- STAC asset structure — unchanged.
- VS Code message contract — extended in #230, unchanged here. (The code-server spec exercises existing messages.)

---

## Relationship to #230 / #218 entities

| Existing entity (from prior feature) | This feature's interaction |
|--------------------------------------|----------------------------|
| `useStoryboardEditReducer` (#230) | Wrapped by `createStoryOnlyMockPort` for story interactivity |
| `StoryboardEditAction` discriminated union (#230) | Unchanged; mock-port dispatches it verbatim |
| `SceneEditViewModel` (#218) | The perf test allocates 250 of these — no shape change |
| `SceneUndoToastDescriptor` (#218) | Exercised by the new web-shell scenarios — no shape change |
| `LogEntry` (#215) | Asserted via Log Panel card selector — no shape change |
| `StoryboardEditHarnessInitialState` (#230) | Extended with optional `induceCopyFailure?: SceneId` field — additive only |
