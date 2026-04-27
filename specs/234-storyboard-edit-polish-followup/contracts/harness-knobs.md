# Contract — Harness Knobs + Story-only Mock-Port API

**Feature**: 234-storyboard-edit-polish-followup
**Date**: 2026-04-26

This document is the contract for the two new test-time surfaces this feature introduces:

1. The web-shell harness query-string knob `?induceCopyFailure=<sceneId>`.
2. The shared story-only mock-port helper `createStoryOnlyMockPort`.

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

## 2. Story-only mock-port API

### Location
`shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockPort.ts` (new file).

### Public API

```ts
import { useStoryboardEditReducer } from '../useStoryboardEditReducer';
import type {
  StoryboardEditAction,
  StoryboardEditState,
  OutboundMessage,
  SceneId,
} from '../types';

export interface MockPortKnobs {
  induceCopyFailure?: SceneId;
  induceRefreshFailure?: SceneId;
}

export interface SceneEditFixtureSeed {
  storyboards: ReadonlyArray<{
    id: StoryboardId;
    title: string;
    description: string;
    scenes: ReadonlyArray<SceneFixtureSeed>;
  }>;
  activeStoryboardId: StoryboardId;
}

export interface MockPortHandle {
  /** Live state — read in the React component for rendering. */
  state: StoryboardEditState;
  /** Dispatch a reducer action. Pure synchronous call. */
  dispatch: (action: StoryboardEditAction) => void;
  /** The fake outbound message port the panel writes to.
   *  Internally it routes messages back through dispatch (post-knob filter). */
  port: { postMessage: (msg: OutboundMessage) => void };
}

/** React hook factory — call inside a story or harness mount. */
export function useStoryOnlyMockPort(
  seed: SceneEditFixtureSeed,
  knobs?: MockPortKnobs,
): MockPortHandle;
```

### Behavioural contract

For every outbound message the panel sends:

| Outbound `type` | Default behaviour | Knob override |
|----------------|-------------------|---------------|
| `editScene` | Dispatch `sceneEdited` with the same fields | — |
| `deleteScene` | Dispatch `sceneDeleted` + `undoToastShown` | — |
| `undoDelete` | Dispatch `sceneRestored` + `undoToastDismissed` | — |
| `refreshScene` | Dispatch `sceneRefreshed` (clears stale) | If `knobs.induceRefreshFailure === sceneId` → dispatch `sceneRefreshFailed` (badge stays) |
| `refreshAllStale` | Dispatch `sceneRefreshed` for each stale scene | If any scene matches `induceRefreshFailure` → that scene fails; others succeed (partial failure scenario) |
| `duplicateScene` | Dispatch `sceneDuplicated` at offset timestamp | — |
| `copySceneToOther` | Dispatch `sceneCopiedToOther` | If `knobs.induceCopyFailure === sceneId` → dispatch `sceneCopyFailed` (rollback) |
| `renameStoryboard` / `describeStoryboard` | Dispatch matching state action | — |
| `updateSceneToCurrent` | Dispatch `sceneUpdated` with refreshed thumbnail + visibleFeatureIds | — |
| `refreshThumbnail` | Dispatch `sceneThumbnailRefreshed` | If `knobs.induceRefreshFailure === sceneId` → dispatch `sceneRefreshFailed` |

### Constraints
- Mock-port MUST NOT use `setTimeout`, `Promise.resolve().then(...)`, or any async deferral. All dispatches are synchronous so Storybook's controls + Playwright's `expect` assertions resolve deterministically.
- Mock-port MUST NOT call `window.postMessage`, `chrome.runtime.*`, or any cross-frame API. It is purely in-memory.
- Mock-port MUST NOT import from `apps/web-shell/` or `apps/vscode/` (Lerna boundary; lint-enforced).

### TypeScript-level guarantees
- `MockPortKnobs.induceCopyFailure` and `induceRefreshFailure` are typed as `SceneId`, not `string`; pass-through narrows to the production discriminant.
- `MockPortHandle.dispatch` accepts only the production `StoryboardEditAction` discriminated union — adding a new action elsewhere automatically widens the contract here without code change.

---

## 3. PortContext (production-side change for stories + harness)

### Surface

The production `StoryboardPanel` component does not currently accept a port prop — webview entries call `vscode.postMessage()` directly via `acquireVsCodeApi()`. To make the panel usable by stories + harness without prop drilling, this feature adds a React context.

### Location
`shared/components/src/panels/StoryboardPanel/PortContext.tsx` (new file).

### Public API

```ts
export interface PanelPort {
  postMessage(message: OutboundMessage): void;
}

/**
 * React context holding the outbound message port for the StoryboardPanel.
 *
 * - Production webview entry wraps the panel:
 *     <PortContext.Provider value={acquireVsCodeApi()}>
 *
 * - Harness + stories wrap the panel with the mock port:
 *     <PortContext.Provider value={mockPort.port}>
 *
 * The default value (no provider in the tree) is a "thrower" port: calling
 * postMessage on it throws an explicit Error naming the missing wiring.
 * This honours Article I.3 (no silent failures) — mounting an unwrapped
 * panel does not crash, but the first user dispatch makes the gap obvious.
 */
export const PortContext: React.Context<PanelPort>;

export function usePanelPort(): PanelPort;
```

### Behavioural contract

| Scenario | Behaviour |
|----------|-----------|
| Provider supplies a real port (production) | `postMessage(msg)` forwards to the supplied port |
| Provider supplies the mock port (harness/stories) | `postMessage(msg)` flows back through `useStoryOnlyMockPort.dispatch` (the mock-port wires this internally) |
| No provider in the tree | Mount succeeds; `postMessage(msg)` throws `Error("StoryboardPanel: no PortContext.Provider in the tree — production webview must wrap with acquireVsCodeApi(); stories/harness must wrap with createStoryOnlyMockPort().port")` |

### Constraints
- The default thrower MUST throw at action-emit time (when `postMessage` is called), NOT at mount time. Reason: Storybook may render the panel during its docs page generation without intent to dispatch; throwing at mount would break Storybook builds.
- The error message MUST include both required wrappings (production + test) so the reader knows whether the bug is in their app code or their test setup.

### Test coverage
Unit test at `shared/components/src/panels/StoryboardPanel/__tests__/PortContext.test.tsx`:
- (a) provider supplies port → dispatch → message emitted to provider
- (b) no provider → mount succeeds → first `postMessage` call throws the documented error

---

## Production safety

| Check | How it's enforced |
|-------|-------------------|
| Production code never imports from `__testing__/` | **FR-044**: ESLint `no-restricted-imports` rule under `apps/vscode/` ESLint config forbids any import path matching `**/__testing__/**` or `@debrief/components/**/__testing__/*`. Exercised by `pnpm lint`. (Earlier drafts incorrectly cited a `no-internal-modules` rule — this rule is being **introduced** by this feature, not inherited.) |
| Harness knobs never execute in the VS Code panel | `StoryboardEditHarness` is a web-shell-only component; the VS Code panel mounts `StoryboardPanel` directly under `<PortContext.Provider value={acquireVsCodeApi()}>` without the harness wrapper |
| Knob query-string params ignored outside web-shell | Parsing logic lives in `apps/web-shell/src/`; not bundled into the VS Code extension |
| ffmpeg system-binary dependency surfaced | **FR-045**: `task verify:ffmpeg` (or inline check) fails fast with a remediation message when ffmpeg is missing locally |

The harness-isolation constraints existed already from #230's harness work; this feature inherits them. The ESLint rule + ffmpeg check + PortContext are new in this feature.
