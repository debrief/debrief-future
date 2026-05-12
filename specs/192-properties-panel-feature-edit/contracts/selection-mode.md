# Contract — Selection → Editing-mode resolver (refreshed)

**Owner**: `shared/components/src/PropertiesPanel/selectionMode.ts` (NEW)
**Consumers**: `PropertiesForm.tsx` (mode dispatch), Vitest unit tests
**Source of truth**: `services/session-state/src/utils/selectionPath.ts` (`parsePath`)

## Type signature

```ts
import type { FeatureSelection } from '@debrief/session-state';
import type { Feature } from '@debrief/schemas';

export type EditingMode =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'subfeature'; featureId: string; path: string }
  | { kind: 'multi'; featureIds: string[] }
  | { kind: 'stale' };

export function resolveEditingMode(
  selection: FeatureSelection,
  featuresById: ReadonlyMap<string, Feature>
): EditingMode;
```

Total over its inputs. No `any`. No async. No side effects.

## Resolution rules (in order)

| # | Condition | Result |
|---|---|---|
| 1 | `selection.primary` parses (via `parsePath`) into root + ≥1 vertex-bearing level (`positions` for Track, `rings` for Polygon, `vertices` for LineString/MultiPoint, `vertex` for Point) AND its featureId resolves AND the indices are in range for the parent geometry | `{ kind: 'subfeature', featureId, path }` (`path` = the levels portion, e.g., `positions/4`) |
| 2 | as (1) but featureId not in map OR any index out of range | `{ kind: 'stale' }` |
| 3 | `selection.featureIds.length === 1` AND that id resolves | `{ kind: 'feature', featureId }` |
| 4 | `selection.featureIds.length === 1` AND that id does NOT resolve | `{ kind: 'stale' }` |
| 5 | `selection.featureIds.length >= 2` — filter to resolved IDs: 2+ → `multi`; 1 → rule 3; 0 → `stale` |
| 6 | otherwise (`featureIds.length === 0` AND `primary` is null) | `{ kind: 'plot' }` |

The resolver MUST NOT mutate either input. Callers react to `stale` by
dispatching `clearSelection()`.

## Vitest cases (must accompany impl)

```text
resolveEditingMode
  ├── empty selection → plot
  ├── one valid feature id → feature
  ├── one missing feature id → stale
  ├── two valid feature ids → multi (preserves order)
  ├── two ids, one missing → feature (the surviving one)
  ├── two missing ids → stale
  ├── valid positions path → subfeature (path = "positions/N")
  ├── valid polygon rings path → subfeature (path = "rings/R/vertices/V")
  ├── valid LineString vertices path → subfeature
  ├── valid MultiPoint vertices path → subfeature
  ├── valid single-Point vertex/0 path → subfeature
  ├── positions path with index === coords.length → stale
  ├── polygon rings path with ring out of range → stale
  ├── polygon rings path with vertex out of range in a valid ring → stale
  ├── non-vertex structured path (e.g., segments) → falls through to feature/multi rules
  └── path with unknown featureId → stale
```
