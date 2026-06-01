# Phase 1 Data Model: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature**: 256-prefix-aware-stac-typing
**Date**: 2026-06-01

> This feature changes **type declarations only**. No on-disk data structure,
> no JSON shape, no LinkML class definition changes. The "model" here is the
> shape of the *generated TypeScript* and the slot→key mapping that drives it.

## Source of truth: `StacExtensionProperties` (LinkML)

Defined at `shared/schemas/src/linkml/stac-extension.yaml`. Five slots, each
carrying a `slot_uri` that is the authoritative on-disk JSON key.

| LinkML slot name | `slot_uri` (on-disk key) | Value type (generated) | Multivalued |
|------------------|--------------------------|------------------------|-------------|
| `platforms`      | `debrief:platforms`      | `PlatformRecord[]`     | yes |
| `tags`           | `debrief:tags`           | `string[]`             | yes |
| `feature_tags`   | `debrief:feature_tags`   | `string[]`             | yes |
| `overrides`      | `debrief:overrides`      | `string[]`             | yes |
| `provenance_log` | `debrief:provenance_log` | `PropertiesProvenanceEntry[]` | yes |

All five are optional on the generated interface.

## Transformation (what the generator emits)

### Before (current generated output — prefix stripped)

```ts
export interface StacExtensionProperties {
    platforms?: PlatformRecord[],
    tags?: string[],
    feature_tags?: string[],
    overrides?: string[],
    provenance_log?: PropertiesProvenanceEntry[],
}
```

`StacItemProperties extends StacExtensionProperties` and adds STAC core fields
plus `[key: string]: unknown`. Because no slot key matches an on-disk
`debrief:*` key, every `props['debrief:foo']` access falls through to the
index signature → `unknown` → requires an `as` cast.

### After (this feature — prefix preserved, slot_uri-derived)

```ts
export interface StacExtensionProperties {
    'debrief:platforms'?: PlatformRecord[],
    'debrief:tags'?: string[],
    'debrief:feature_tags'?: string[],
    'debrief:overrides'?: string[],
    'debrief:provenance_log'?: PropertiesProvenanceEntry[],
}
```

`StacItemProperties` is unchanged in source but now inherits prefixed slots.
`props['debrief:provenance_log']` resolves to `PropertiesProvenanceEntry[] |
undefined`; unmodelled keys (`datetime`, third-party `processing:*`, the
unmodelled `debrief:label`) still resolve via `[key: string]: unknown`.

## Entities

### Generated artefact: `StacExtensionProperties` (TypeScript interface)
- **Location**: `shared/schemas/src/generated/typescript/types.ts` (committed,
  drift-gated).
- **Change**: slot keys gain the `debrief:` prefix, derived from `slot_uri`.
- **Invariant**: value types unchanged; no new imports; remains a closed
  interface (the openness lives on the derived `StacItemProperties`).

### Generator post-processor step (`generate.py` → `generate_typescript()`)
- **Input**: gen-typescript text output + the slot→`slot_uri` map for
  `StacExtensionProperties` read from the LinkML source.
- **Output**: the same text with the five bare-key declarations rewritten to
  prefixed-key declarations.
- **Guard**: `raise RuntimeError` if the expected `StacExtensionProperties`
  block or any expected bare-key token is absent (matches existing
  post-processor convention).
- **Schema-driven**: keys come from `slot_uri`, so a newly-added slot flows
  through with no edit to `generate.py` (FR-002).

### Consumer: `StacItem.properties` access sites (writers)
- **Location**: `apps/vscode/src/services/stacService.ts`,
  `apps/web-shell/src/services/stacWriterIdb.ts` (27 prefixed-key accesses).
- **Change**: redundant `as PropertiesProvenanceEntry[]` / `as unknown[]` /
  `as string[]` casts on modelled keys are removed; the literal-key access now
  carries the correct type. Behaviour unchanged at runtime.

## Validation rules / invariants

- **VR-1 (FR-003)**: The emitted TS key for a modelled slot MUST equal its
  on-disk JSON key (`slot_uri`). No transformation layer between type and disk.
- **VR-2 (FR-005/FR-006)**: The derived `StacItemProperties` MUST remain open
  (`[key: string]: unknown`) so STAC core + unmodelled keys type-check.
- **VR-3 (FR-008)**: Emitted JSON for any write MUST be byte-for-byte identical
  to pre-feature output (round-trip golden).
- **VR-4 (FR-002)**: A new slot added to `StacExtensionProperties` with a
  `slot_uri` MUST appear as a prefixed typed slot after regeneration, with no
  hand-edit to `generate.py` or any writer type.
- **VR-5 (FR-009)**: Both writer hosts consume the single generated definition
  via `@debrief/schemas` → `@debrief/stac-writer` re-export; no per-host
  re-declaration.

## State transitions

None — static type declarations.
