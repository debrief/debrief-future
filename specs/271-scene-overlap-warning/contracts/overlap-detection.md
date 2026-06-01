# Contract: Overlap Detection + Badge + Dismissal (#271)

No HTTP/RPC surface — this feature is a pure TypeScript helper plus a presentational component contract. These are the testable contracts implementation must satisfy.

## C1 — `detectSceneOverlaps` (pure helper)

```ts
// shared/components/src/storyboard/overlap.ts
export interface OverlapPartner { readonly sceneId: string; readonly title: string; }
export function overlapPairKey(a: string, b: string): string;
export function detectSceneOverlaps(
  plot: StoryboardPlot,
  storyboardId: string,
  dismissedPairs?: ReadonlySet<string>,
): ReadonlyMap<string, readonly OverlapPartner[]>;
```

### Behavioural guarantees

| # | Given | Then |
|---|-------|------|
| C1.1 | Two time-range Scenes A, B in `storyboardId` with `A.start < B.end && B.start < A.end` | result has `A → [{B}]` and `B → [{A}]` |
| C1.2 | Two time-range Scenes that do not overlap | neither appears in the result (or maps to `[]`) |
| C1.3 | `A.end === B.start` (touching) | not overlapping — neither warned |
| C1.4 | One time-range Scene + any number of instant Scenes (`time_range == null`) | empty result; instant Scenes never appear, even if a timestamp sits inside a range |
| C1.5 | A overlaps B and C (B, C disjoint) | `A → [B, C]`, `B → [A]`, `C → [A]` |
| C1.6 | A-B overlap, B-C overlap, A-C disjoint (chain) | `A → [B]`, `B → [A, C]`, `C → [B]` |
| C1.7 | Identical windows A, B | both warned (full overlap) |
| C1.8 | Zero-length window `t` strictly inside another window | overlap; warned. Zero-length window only touching an endpoint | not warned |
| C1.9 | Overlapping Scenes in *different* Storyboards | not compared — empty result for the queried `storyboardId` |
| C1.10 | `dismissedPairs` contains `overlapPairKey(A,B)` | A and B drop each other; a Scene with no remaining live overlap is absent/empty |
| C1.11 | Empty Storyboard / single Scene / only instant Scenes | empty result, no throw |
| C1.12 | Same input twice | identical output (pure, deterministic); partner order stable (Scene order) |

### Invariants
- Pure: no mutation of `plot`, no I/O, synchronous.
- Times compared as `Date.parse(...)` epoch ms.
- Symmetric: `B ∈ result(A).partners ⇔ A ∈ result(B).partners`.
- `overlapPairKey(a,b) === overlapPairKey(b,a)`.

## C2 — `OverlapBadge` (presentational)

```ts
export interface OverlapBadgeProps {
  readonly sceneId: string;
  readonly overlapsWith: readonly OverlapPartner[];   // non-empty when rendered
  readonly onDismiss: () => void;
}
```

| # | Requirement |
|---|-------------|
| C2.1 | Renders only when `overlapsWith.length > 0` (caller-gated in `SceneList`) |
| C2.2 | Names every partner's `title` in visible text and in the accessible name (FR-004, FR-012 — not colour-only) |
| C2.3 | `role="status"`, `data-testid="overlap-badge"`, `data-scene-id={sceneId}` |
| C2.4 | A Dismiss control (button, keyboard-activable) invokes `onDismiss` |
| C2.5 | Theming via existing VS Code CSS tokens (warning fg/bg), passing axe-core colour-contrast in light/dark/vscode |
| C2.6 | Coexists with `StaleBadge` on the same row without overlap/clipping (FR-013) |

## C3 — `SceneList` integration

| # | Requirement |
|---|-------------|
| C3.1 | For each row, render `<OverlapBadge>` iff `sceneEditViewModels[sceneId]?.overlapsWith?.length` |
| C3.2 | Badge `onDismiss` calls `onSceneOverlapDismiss?.(sceneId, overlapsWith.map(p => p.sceneId))` |
| C3.3 | Rows with `pendingDelete` render no badge (consistent with existing hidden-row rule) |
| C3.4 | The stale badge and overlap badge may both render for the same row, in a stable order |

## C4 — Host wiring (VS Code + web-shell)

| # | Requirement |
|---|-------------|
| C4.1 | On every view-model refresh, host computes `detectSceneOverlaps(plot, activeStoryboardId, dismissedPairs)` and sets each `SceneEditViewModel.overlapsWith` from it |
| C4.2 | Host holds `dismissedOverlapPairs: Set<string>` (session-scoped, **not persisted**) |
| C4.3 | On `onSceneOverlapDismiss(sceneId, partners)`, host adds `overlapPairKey(sceneId, p)` for each partner and re-pushes |
| C4.4 | On each refresh, host prunes `dismissedOverlapPairs` to the currently-active pair set (FR-009) |
| C4.5 | Both hosts use the **same** shared `detectSceneOverlaps` (FR-011 — no divergent rule) |
| C4.6 | No write to the plot, STAC, SystemState, or any persistence path occurs for detection or dismissal (Constitution IV.2) |

## C5 — Negative / non-goals (must NOT happen)

| # | Requirement |
|---|-------------|
| C5.1 | Detection/dismissal MUST NOT reorder, merge, delete, or edit any Scene (FR-005) |
| C5.2 | A warning MUST NOT block capture, playback, edit, save, or step-onto |
| C5.3 | Instant-Scene timestamp collisions MUST NOT be reported here (that is #235) |
| C5.4 | Cross-Storyboard pairs MUST NOT be reported |
</content>
