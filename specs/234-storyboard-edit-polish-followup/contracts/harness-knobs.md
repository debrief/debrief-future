# Contract — Harness Knobs + Story-only Mock-Handlers API

**Feature**: 234-storyboard-edit-polish-followup
**Date**: 2026-04-26 (revised 2026-04-27)
**Architecture pivot:** ADR-027 — this contract replaces the original PortContext + mock-port API with a simpler callback-adapter helper. See `research.md` R10b. The `__testing__/` boundary + FR-044 ESLint enforcement are unchanged.

This document is the contract for the two new test-time surfaces this feature introduces:

1. The web-shell harness query-string knobs `?induceCopyFailure=<sceneId>` + `?induceRefreshFailure=<sceneId>`.
2. The shared story-only mock-handlers helper `useStoryOnlyMockHandlers`.

Both surfaces are test-only — they MUST NOT appear in any production-bundled code path.

---

## 1. Web-shell harness query-string knob

### Surface

Extends `apps/web-shell/src/storyboard-edit-harness-querystring.ts` (existing) with one additional optional field.

### Existing input shape (recap, pre-#234)

```ts
export interface StoryboardEditHarnessInitialState {
  storyboards: SceneEditFixtureSeed['storyboards'];
  activeStoryboardId: StoryboardId;
}
```

### Extended input shape (post-#234)

```ts
export interface StoryboardEditHarnessInitialState {
  storyboards: SceneEditFixtureSeed['storyboards'];
  activeStoryboardId: StoryboardId;
  /** When set, the copy-to-other handler routes the matching sceneId to the deep-copy failure branch.
   *  Test-only knob. Parsed from `?induceCopyFailure=<sceneId>`. */
  induceCopyFailure?: SceneId;
  /** When set, refresh-thumbnail / refresh-all-stale routes the matching sceneId to the per-Scene
   *  failure branch. Used by the bulk-refresh-partial-failure scenario.
   *  Test-only knob. Parsed from `?induceRefreshFailure=<sceneId>`. */
  induceRefreshFailure?: SceneId;
}
```

### Query-string parsing rule

| Param | Type | Validation | Behaviour when invalid |
|-------|------|------------|------------------------|
| `induceCopyFailure` | string (URL-decoded) | Non-empty after decode | Field omitted (treated as no-knob); harness logs a single console warning so flaky test runs are debuggable |
| `induceRefreshFailure` | string (URL-decoded) | Non-empty after decode | Same as above — empty value drops the field with a console warning |

Both knobs are independent — a URL may set neither, either, or both. When both are set with the **same** sceneId, both failure branches fire when their respective actions dispatch (this is the deliberate "everything's broken for this scene" scenario, used to assert that error handling does not interfere across action types).

### Wiring

```
URL ?induceCopyFailure=sceneB&induceRefreshFailure=sceneC
  → parseStoryboardEditHarnessQueryString()
  → StoryboardEditHarnessInitialState {
      ..., induceCopyFailure: "sceneB", induceRefreshFailure: "sceneC"
    }
  → StoryboardEditHarness.tsx mount
  → createStoryOnlyMockPort(seed, {
      induceCopyFailure: "sceneB", induceRefreshFailure: "sceneC"
    })
  → mock-port.copyToOtherHandler(sceneId)
      if (sceneId === knobs.induceCopyFailure) → dispatch sceneCopyFailed
      else → dispatch sceneCopiedToOther
  → mock-port.refreshHandler(sceneId)
      if (sceneId === knobs.induceRefreshFailure) → dispatch sceneRefreshFailed
      else → dispatch sceneRefreshed
```

### Backwards compatibility
Both new fields are optional; URLs that omit them behave exactly as before. No existing test breaks. The pre-#234 single-knob form (`?induceCopyFailure=...`) continues to work unchanged.

---

## 2. Story-only mock-handlers API

### Location
`shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockHandlers.ts` (new file).

### Public API

```ts
import { useStoryboardEditReducer } from '../useStoryboardEditReducer';
import type {
  StoryboardEditAction,
  StoryboardEditReducerState,
  StoryboardPanelProps,
} from '../types';

export interface MockPortKnobs {
  /** When set, the copy-to-other handler routes the matching sceneId to the
   *  deep-copy failure branch. Type retained as MockPortKnobs (data-model §1)
   *  even though the architecture is callback-adapter, not port. */
  induceCopyFailure?: string;
  /** When set, refresh-thumbnail / refresh-all-stale routes the matching
   *  sceneId to the per-Scene failure branch. */
  induceRefreshFailure?: string;
}

export interface SceneEditFixtureSeed {
  storyboards: ReadonlyArray<{
    storyboardId: string;
    title: string;
    description: string;
    scenes: ReadonlyArray<SceneFixtureSeed>;
  }>;
  activeStoryboardId: string;
}

/**
 * The handler subset of StoryboardPanelProps the helper wires — every
 * callback the panel may fire that has a corresponding reducer action.
 * Composed via Pick<> so adding a new callback to StoryboardPanelProps
 * surfaces here as a TS compile error (helper must implement it).
 */
export type MockHandlers = Pick<
  StoryboardPanelProps,
  | 'onSceneRowClick'
  | 'onSceneRowExpandToggle'
  | 'onSceneOverflowMenuOpen'
  | 'onSceneOverflowMenuClose'
  | 'onSceneEditFormCancel'
  | 'onSceneTitleRenameCommit'
  | 'onSceneDescriptionSubmit'
  | 'onSceneDeleteRequested'
  | 'onSceneUndoDeleteClicked'
  | 'onSceneUpdateToCurrentClicked'
  | 'onSceneDuplicateClicked'
  | 'onSceneCopyToOtherClicked'
  | 'onSceneRefreshThumbnailClicked'
  | 'onStoryboardRefreshAllStaleClicked'
  | 'onStoryboardNameRenameCommit'
  | 'onStoryboardDescriptionSubmit'
  | 'onUndoToastDismiss'
  | 'onCaptureClick'
>;

export interface MockHandlersHandle {
  /** Live state — read in the React component for rendering. */
  readonly state: StoryboardEditReducerState;
  /** Dispatch a reducer action directly (escape hatch for stories that
   *  want to seed state without going through panel UI). Pure sync call. */
  readonly dispatch: (action: StoryboardEditAction) => void;
  /** The handler spread — pass directly into <StoryboardPanel {...handlers} />.
   *  Each handler translates a panel callback into the corresponding reducer
   *  dispatch (post-knob filter for failure injection). */
  readonly handlers: MockHandlers;
}

/** React hook factory — call inside a story or harness mount. */
export function useStoryOnlyMockHandlers(
  seed: SceneEditFixtureSeed,
  knobs?: MockPortKnobs,
): MockHandlersHandle;
```

### Behavioural contract

For every panel callback the helper wires:

| Panel callback | Default dispatch | Knob override |
|----------------|------------------|---------------|
| `onSceneTitleRenameCommit(id, t)` | `{type: 'scene-edit-form-close'}` then a synthesised `scenes-message` with the renamed row | — |
| `onSceneDescriptionSubmit(id, d)` | Update the matching SceneEditViewModel's `description` via a `scenes-message` re-emit | — |
| `onSceneDeleteRequested(id)` | Drop the row + dispatch `{type: 'scene-undo-toast-shown', toast: {sceneId: id, ...}}` | — |
| `onSceneUndoDeleteClicked(id)` | Restore the row + dispatch `{type: 'scene-undo-toast-dismissed'}` | — |
| `onSceneUpdateToCurrentClicked(id)` | Update the matching SceneEditViewModel's thumbnail + visibleFeatureIds | — |
| `onSceneDuplicateClicked(id)` | Insert a duplicated row at an offset timestamp | — |
| `onSceneCopyToOtherClicked(id)` | Mark the row as "copied to other" + log-panel card | If `knobs.induceCopyFailure === id` → dispatch the failure branch instead (rollback, no row added at destination) |
| `onSceneRefreshThumbnailClicked(id)` | Clear the matching `staleFlags` entry | If `knobs.induceRefreshFailure === id` → keep the stale flag (failure branch) |
| `onStoryboardRefreshAllStaleClicked(_)` | Clear all stale flags for the active storyboard | Any scene matching `induceRefreshFailure` retains its flag (partial-failure scenario) |
| `onStoryboardNameRenameCommit(id, n)` | Update `storyboardEditViewModel.name` + matching `storyboards[]` entry | — |
| `onStoryboardDescriptionSubmit(id, d)` | Update `storyboardEditViewModel.description` | — |
| `onSceneRowExpandToggle(id)` | `dispatch({type: 'expand-row-toggle', sceneId: id})` (uses existing reducer action) | — |
| `onSceneOverflowMenuOpen(id, rect)` | `dispatch({type: 'overflow-menu-open', sceneId: id, anchorRect: rect})` | — |
| `onSceneOverflowMenuClose()` | `dispatch({type: 'overflow-menu-close'})` | — |
| `onSceneEditFormCancel(_)` | `dispatch({type: 'scene-edit-form-close'})` | — |
| `onUndoToastDismiss()` | `dispatch({type: 'scene-undo-toast-dismissed'})` | — |
| `onCaptureClick()` | No-op (or dispatch a synthesised in-flight + new-row sequence; story-specific) | — |
| `onSceneRowClick(id)` | Set `currentSceneId` via a synthesised `snapshot-message` | — |

### Wiring in the harness + stories

```tsx
// Harness (apps/web-shell/src/StoryboardEditHarness.tsx) and each upgraded
// story file follow the same pattern:
const seed = makeFixtureSeed(/* ... */);
const knobs = parseHarnessQueryString(window.location.search);
const { state, handlers } = useStoryOnlyMockHandlers(seed, knobs);

return (
  <StoryboardPanel
    scenes={state.sceneRows}
    activeStoryboardName={state.activeStoryboardName}
    activeStoryboardId={state.activeStoryboardId}
    captureInFlight={state.captureInFlight}
    sceneEditViewModels={composeSceneEditViewModels(state)}
    storyboardEditViewModel={state.storyboardEditViewModel ?? undefined}
    pendingUndoToast={state.pendingUndoToast}
    overflowMenuOpenFor={state.overflowMenuOpenFor}
    overflowMenuAnchorRect={state.overflowMenuAnchorRect}
    {...handlers}
  />
);
```

No provider, no context, no production webview change. The harness's existing reducer wiring (`useStoryboardEditReducer()` at `StoryboardEditHarness.tsx:117`) is replaced by `useStoryOnlyMockHandlers` — same reducer, factored through one helper.

### Constraints
- Helper MUST NOT use `setTimeout`, `Promise.resolve().then(...)`, or any async deferral. All dispatches are synchronous so Storybook controls + Playwright `expect` assertions resolve deterministically.
- Helper MUST NOT call `window.postMessage`, `chrome.runtime.*`, or any cross-frame API. It is purely in-memory.
- Helper MUST NOT import from `apps/web-shell/` or `apps/vscode/` — `shared/components` cannot depend on an app (Lerna boundary; lint-enforced via the existing `no-redeclare-components-exports.cjs` family).
- Knobs route their failure branches synchronously (no race window). A `?induceCopyFailure=s1` URL → `handlers.onSceneCopyToOtherClicked('s1')` → failure-branch dispatch in the same React tick.

### TypeScript-level guarantees
- `MockPortKnobs.induceCopyFailure` / `induceRefreshFailure` are typed as `string` (the project's existing sceneId discriminant — feature 234 does not introduce a `SceneId` branded type).
- `MockHandlersHandle.dispatch` accepts only the production `StoryboardEditAction` discriminated union.
- `MockHandlers` is `Pick<StoryboardPanelProps, ...>`. Adding a new callback to `StoryboardPanelProps` widens the helper's contract automatically — TS surfaces the missing implementation as a compile error.

---

## 3. ~~PortContext (production-side change for stories + harness)~~ — **REMOVED 2026-04-27**

> **Removed.** ADR-027 (`docs/project_notes/decisions.md`) records the architecture pivot from `PortContext` to a callback-adapter helper (§2 above). The `PortContext` API, `OutboundMessage` discriminated union, default-thrower port, production webview wrapper change, and `usePanelPort()` hook are **not** introduced. `<StoryboardPanel>` stays purely presentational; production code at `apps/vscode/src/webview/web/storyboardPanel.tsx` is unchanged.
>
> The Article I.3 (no silent failures) goal is met by the existing typed callback-prop surface: a missing handler that the panel actually fires throws a normal React `prop.fn is not a function` at the call site.
>
> See `research.md` R10 (Superseded) and R10b (Adopted) for the design history.

---

## Production safety

| Check | How it's enforced |
|-------|-------------------|
| Production code never imports from `__testing__/` | **FR-044**: ESLint `no-restricted-imports` rule under `apps/vscode/` ESLint config forbids any import path matching `**/__testing__/**` or `@debrief/components/**/__testing__/*`. Exercised by `pnpm lint`. (Earlier drafts incorrectly cited a `no-internal-modules` rule — this rule is being **introduced** by this feature, not inherited.) |
| Harness knobs never execute in the VS Code panel | `StoryboardEditHarness` is a web-shell-only component; the VS Code panel mounts `StoryboardPanel` directly under `<PortContext.Provider value={acquireVsCodeApi()}>` without the harness wrapper |
| Knob query-string params ignored outside web-shell | Parsing logic lives in `apps/web-shell/src/`; not bundled into the VS Code extension |
| ffmpeg system-binary dependency surfaced | **FR-045**: `task verify:ffmpeg` (or inline check) fails fast with a remediation message when ffmpeg is missing locally |

The harness-isolation constraints existed already from #230's harness work; this feature inherits them. The ESLint rule + ffmpeg check + PortContext are new in this feature.
