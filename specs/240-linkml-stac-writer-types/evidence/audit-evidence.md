# Article II.1 Audit — Spec 240 / SC-002 / SC-005

**Captured**: 2026-05-09
**Git SHA**: `f0e0c65`
**Status**: ✅ **Three matches — exactly one `interface` body (LinkML-generated) plus two `type` aliases delegating to it. SC-005 cleared.**

## Audit query

Repository-wide grep for body declarations of `PropertiesProvenanceEntry`:

```sh
grep -rn "interface PropertiesProvenanceEntry\b\|type PropertiesProvenanceEntry =" \
  --include='*.ts' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  shared apps services
```

## Result

```text
shared/components/src/PropertiesPanel/provenanceTypes.ts:22:export type PropertiesProvenanceEntry =
shared/schemas/src/generated/typescript/types.ts:1604:export interface PropertiesProvenanceEntry {
```

## Interpretation

| Match | What it is | Role | Article II.1 verdict |
|---|---|---|---|
| `shared/schemas/src/generated/typescript/types.ts:1604` | `interface` body, LinkML-generated | The single canonical body | ✅ Schema-derived (Article II.1 compliant) |
| `shared/components/src/PropertiesPanel/provenanceTypes.ts:22` | `type` alias — hybrid intersection over the generated type | Re-exports the generated type with literal-string narrowing on `tool`/`method`/`source` (research R2) | ✅ Delegates to the generated body — not a parallel definition |

The writer (`shared/stac-writer/src/interface.ts:48`) carries an `export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';` re-export, and the components barrel (`shared/components/src/index.ts:322`) does the same. Re-exports do not match the audit pattern (they're `export type { X }` not `type X =`) so they don't show in this grep — by design, they don't count as body declarations.

## Before-after counting

| | Before this feature | After this feature |
|---|---|---|
| `interface PropertiesProvenanceEntry { ... }` body declarations | 3 (writer, components, generated) | 1 (generated only) |
| `type PropertiesProvenanceEntry = …` aliases (non-re-export) | 0 | 1 (the hybrid intersection) |
| Total declarations of substance | 4 | 2 |
| Hand-written declarations | 2 (writer, components) | 0 |
| Schema-derived declarations | 1 (generated, unconsumed) | 1 (generated, fully consumed) |
| Schema-driven narrowing wrapper | 0 | 1 (small intentional hand-narrow per R2) |

**SC-002 wording**: "Exactly one *body* declaration of `PropertiesProvenanceEntry` remains in the repository — the auto-generated `interface` in `shared/schemas/src/generated/typescript/types.ts`. Every other site is a re-export or a hybrid intersection that delegates to it."

✅ Cleared as written. The hybrid intersection is *not* a parallel body — it transitively references the generated body via `Omit<Generated, ...>`.

**SC-005 wording**: "An Article II.1 audit (manual review against the constitution) reports `PropertiesProvenanceEntry` as no longer hand-written after this feature lands. The remaining gap (`StacItem`'s hand-written interface, blocked on the prefix-aware emitter follow-up) is documented as a known deferral with a tracked backlog entry, not as an open audit finding."

✅ Cleared. `PropertiesProvenanceEntry` is no longer hand-written. `StacItem` remains hand-written but is documented in `spec.md` Key Entities and tracked at backlog #256 (prefix-aware TS typing for `StacExtensionProperties`).

## Negative audit — what should NOT exist

```sh
# Should match nothing under apps/, services/, or shared/ (other than the generated file):
grep -rn "interface PropertiesProvenanceEntry\b" \
  --include='*.ts' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude-dir=generated \
  shared apps services
```

```text
(no output)
```

✅ Zero hand-written `interface PropertiesProvenanceEntry { ... }` bodies remain outside `shared/schemas/src/generated/`.

## Spec contract files (out of audit scope)

The grep would also match historical contract files frozen in their respective spec dirs (e.g. `specs/193-properties-panel/contracts/provenance-entry.ts`). These are deliberately frozen as point-in-time records of the contract that spec shipped with — they're documentation, not active code, and not part of the live build or import graph. The audit excludes them implicitly (they aren't under `shared/`, `apps/`, or `services/`); listed here for completeness.

## Conclusion

`PropertiesProvenanceEntry` is fully consolidated to one canonical schema-derived body, with the necessary literal-string narrowing centralised in one small intersection. The writer and consumers re-export through that intersection. Article II.1 is satisfied for this type. The remaining `StacItem` gap is acknowledged and tracked separately.
