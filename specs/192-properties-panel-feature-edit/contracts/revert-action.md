# Contract — Override → auto-derived revert (US-6)

**Owner**: `shared/components/src/PropertiesPanel/revertControl.tsx` (NEW
widget) + `useStagedEdits.revertField()` (staging-buffer action)
**Source of truth**: this contract + research.md R-011

## Scope

Applies to the six per-platform override slots on `TrackProperties`
(`shared/schemas/src/linkml/geojson.yaml:471–504`):

- `display_name`, `nationality`, `vessel_class`, `vessel_type`,
  `vessel_role`, `domain`

No other slots gain a revert control in v1 (FR-023, Out of Scope:
"Bulk revert").

## Widget surface

```tsx
interface RevertControlProps {
  slot: 'display_name' | 'nationality' | 'vessel_class'
      | 'vessel_type'  | 'vessel_role' | 'domain';
  /** The current effective value (override if set, else auto-derived). */
  effectiveValue: string | null;
  /** The auto-derived value resolved on-the-fly from the platform registry. */
  autoDerivedValue: string | null;
  /** Is an explicit override currently in place (saved or staged)? */
  hasOverride: boolean;
  /** Has the analyst already clicked revert this session (pending save)? */
  isReverted: boolean;
  onRevert: () => void;
  onUnrevert: () => void;  // analyst undoes the revert before save
}
```

## Behavioural rules

| Condition | Control state | Tooltip |
|---|---|---|
| `hasOverride === true` AND `autoDerivedValue !== null` AND NOT `isReverted` | enabled, label "Revert" | "Restore the registry value: `<autoDerivedValue>`" |
| `isReverted === true` | enabled, label "Undo revert" | "Restore your override of `<savedOverrideValue>`" |
| `hasOverride === true` AND `autoDerivedValue === null` | disabled | "No auto-derived value available for this platform" |
| `hasOverride === false` | hidden | — |

Visual treatment of the parent field MUST switch back to "auto-derived"
when `isReverted === true` (FR-024) — same chip/icon family as the
existing override marker (FR-005).

## Staging-buffer semantics

`revertField(featureId, slot)`:

1. Remove any staged entry at `byFeature[featureId][slot]`.
2. Add `slot` to `revertedFields[featureId]`.

`unrevertField(featureId, slot)`:

1. Remove `slot` from `revertedFields[featureId]`.

`applyEditsToFeatures` translates `revertedFields` into "slot absent
from the saved feature.properties" (sparse, not `null`/`undefined`).

## Save-time provenance

For every reverted slot, the per-feature `editedPaths` entry uses the
slot name with a small marker:

```ts
{ path: 'vessel_role', op: 'revert' }   // vs the default { path, op: 'set' }
```

The `LogEntry` `inputs[]` array MAY surface this distinction (e.g.,
`vessel_role (reverted)`) in the NarrativeLog UI. Not required for
constitutional compliance — Article III.1 just requires the path to be
listed — but useful for analyst replay.

## Failure modes

| Failure | Test | Notes |
|---|---|---|
| Revert on a field with no auto-derived value | Vitest widget | Control disabled + tooltip |
| Revert then unrevert before save | Vitest staging buffer | Buffer state matches "no edit" |
| Revert + save → reload | Playwright `properties-revert.spec.ts` | Saved feature has the slot absent |
| Revert on a slot that was never overridden | Vitest widget | Control hidden (no-op) |

## Playwright cases (`properties-revert.spec.ts`)

```text
revert workflow
  ├── feature with override → revert visible → click → field shows auto-derived value + dirty
  ├── save + reload → slot absent from saved feature properties
  ├── revert then unrevert before save → save → slot still present with original override
  └── feature with override and no auto-derived value (unknown platform) → revert disabled
```
