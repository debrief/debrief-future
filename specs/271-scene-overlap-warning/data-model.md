# Data Model: Overlap Warning for Time-Range Scenes (#271)

**No schema change.** This feature derives, in memory, from existing schema fields. The only new *types* are TypeScript view-model additions at the panel boundary (not LinkML-derived). Nothing is written to the plot.

## Consumed (existing) schema fields

From `@debrief/schemas` (`shared/schemas/src/generated/typescript/types.ts`) — read-only:

| Type | Field | Used for |
|------|-------|----------|
| `SceneProperties` | `id: string` | Scene identity (pair keys, partner refs) |
| `SceneProperties` | `storyboard_id: string` | Scope detection to one Storyboard (FR-007) |
| `SceneProperties` | `title: string` | Naming the conflicting Scene in the warning (FR-004) |
| `SceneProperties` | `time_range?: TimeRange` | The window; presence ⇒ time-range flavour (FR-006) |
| `TimeRange` | `start: string` (ISO-8601) | Window lower bound |
| `TimeRange` | `end: string` (ISO-8601, `> start`) | Window upper bound |

Discriminator: `isTimeRangeScene(scene)` (existing, `storyboard/types.ts`) — true iff `time_range != null`.

## New derived types (shared, `storyboard/overlap.ts`)

### `OverlapPartner`
A Scene that a given Scene overlaps with, carrying just what the badge needs to render.

| Field | Type | Notes |
|-------|------|-------|
| `sceneId` | `string` | The partner Scene's id (for dismiss pair keys) |
| `title` | `string` | The partner's current title (display) |

Derived display value — **not** a subset-mirror DTO of `SceneProperties` (Article IV.5 `Pick`/`Omit` rule does not apply; this is a 2-field projection assembled by the detector, not a re-listing of a schema record).

### Detection result
`ReadonlyMap<string /* sceneId */, readonly OverlapPartner[]>` — sceneId → the partners it overlaps (after dismissal filtering). A sceneId absent from the map, or mapped to an empty array, carries no warning.

## Extended boundary type (`panels/StoryboardPanel/types.ts`)

### `SceneEditViewModel` — one new optional field

```ts
export interface SceneEditViewModel {
  // ...existing fields unchanged...
  /**
   * #271 — time-range Scenes (in the same Storyboard) whose windows
   * overlap this Scene's window, AFTER session dismissals are applied.
   * Empty/omitted ⇒ no overlap warning. Optional + defaulted so existing
   * fixtures/hosts compile unchanged.
   */
  readonly overlapsWith?: readonly OverlapPartner[];
}
```

`OverlapPartner` is re-exported from `@debrief/components` so hosts and the panel share one definition.

## New callback (panel → host)

Threaded `StoryboardPanel` → `SceneList` → `OverlapBadge`, all optional:

```ts
/** #271 — author dismisses the overlap warning on a row. Carries every
 *  partner named on that badge so the host can mark each pair dismissed. */
onSceneOverlapDismiss?(sceneId: string, partnerSceneIds: readonly string[]): void;
```

## Host-local session state (not a schema, not persisted)

Each host holds:

```ts
// VS Code: field on StoryboardPanelViewProvider; web-shell: useState in StoryboardPanelMount
dismissedOverlapPairs: Set<string>   // keys from overlapPairKey(a, b)
```

State transitions (per host, in-memory, session-scoped):

| Event | Transition |
|-------|------------|
| Panel refresh / plot change | `active = detectSceneOverlaps(plot, sbId)` pairs; **prune** `dismissed ← dismissed ∩ active`; recompute view-models with `dismissedOverlapPairs` applied |
| `onSceneOverlapDismiss(sceneId, partners)` | for each `p` in partners: `dismissed.add(overlapPairKey(sceneId, p))`; re-push |
| Scene deleted | falls out of `active` on next refresh ⇒ partner's warning drops; its dismissed keys pruned |
| Window edited apart | pair leaves `active` ⇒ warning drops; dismissed key pruned (so re-overlap later re-warns — FR-009) |

## Validation rules (encoded in `detectSceneOverlaps`)

1. **Flavour gate** — skip any Scene where `!isTimeRangeScene` (FR-006).
2. **Scope gate** — skip any Scene with `storyboard_id !== storyboardId` (FR-007).
3. **Overlap predicate** — with `Date.parse`: `aStart < bEnd && bStart < aEnd` (strict; FR-002).
4. **Symmetry** — if A lists B, B lists A (mutual; FR-001/US1 scenario 1 & 4).
5. **Dismissal filter** — drop any pair whose key ∈ `dismissedPairs`; a Scene whose every pair is dismissed ⇒ empty list ⇒ no badge (FR-008).
</content>
