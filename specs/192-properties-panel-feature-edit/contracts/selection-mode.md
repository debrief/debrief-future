# Contract — Selection → Editing-mode resolver

**Owner**: `shared/components/src/PropertiesPanel/selectionMode.ts` (NEW)
**Consumers**: `PropertiesForm.tsx` (mode dispatch), Vitest unit tests
**Source of truth**: `services/session-state/src/utils/selectionPath.ts`

This contract defines the pure function the panel uses to translate the
current selection into an editing mode. The function is the single
behavioural anchor for FR-001, FR-002, FR-012, and the stale-selection
edge cases.

---

## Type signature

```ts
import type { FeatureSelection } from '@debrief/session-state';
import type { Feature } from '@debrief/schemas';

export type EditingMode =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'subfeature'; featureId: string; index: number }
  | { kind: 'multi'; featureIds: string[] }
  | { kind: 'stale' };

export function resolveEditingMode(
  selection: FeatureSelection,
  featuresById: ReadonlyMap<string, Feature>
): EditingMode;
```

No `any`, no implicit fallbacks, no async. Total over its inputs.

---

## Resolution rules (in order)

| # | Condition | Result |
|---|-----------|--------|
| 1 | `selection.primary` is a string AND it parses (via `parseSelectionPath`) as a `positions`-level path AND its featureId resolves in `featuresById` AND its index is in `[0, coords.length)` | `{ kind: 'subfeature', featureId, index }` |
| 2 | `selection.primary` is a string AND it parses as a `positions`-level path AND **either** featureId not in map **or** index out of range | `{ kind: 'stale' }` |
| 3 | `selection.featureIds.length === 1` AND that id resolves in `featuresById` | `{ kind: 'feature', featureId }` |
| 4 | `selection.featureIds.length === 1` AND that id does **not** resolve | `{ kind: 'stale' }` |
| 5 | `selection.featureIds.length >= 2` (filter to those that resolve) | If 2+ remain → `{ kind: 'multi', featureIds }`; if 1 remains → rule 3; if 0 remain → `{ kind: 'stale' }` |
| 6 | Otherwise (`featureIds.length === 0` AND `primary` is null) | `{ kind: 'plot' }` |

The function MUST NOT mutate either input. The caller (the panel)
reacts to a `stale` result by dispatching `clearSelection()`.

---

## Tests (Vitest, must accompany implementation)

```text
resolveEditingMode
  ├── empty selection → plot
  ├── one valid feature id → feature
  ├── one missing feature id → stale
  ├── two valid feature ids → multi (preserves order)
  ├── two ids, one missing → feature (the surviving one)
  ├── two missing ids → stale
  ├── valid positions path → subfeature with the same index
  ├── positions path with unknown featureId → stale
  ├── positions path with index === coords.length → stale (boundary)
  ├── positions path with index === -1 → stale (defensive)
  ├── positions path mixed with featureIds=[other] → subfeature wins
  └── non-positions structured path (e.g., segments) → falls through to feature/multi rules using selection.featureIds
```

---

## Out-of-contract

- This function does NOT decide what the form looks like — it only
  picks the mode. Form contents are owned by the mode components.
- This function does NOT touch the store. Side effects live in the
  panel.
- It does NOT handle "selection refers to a feature in a different
  plot" — by construction, `featuresById` is the open plot's index.
