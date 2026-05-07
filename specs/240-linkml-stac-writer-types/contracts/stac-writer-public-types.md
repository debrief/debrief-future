# Contract: `@debrief/stac-writer` public types — pre/post migration

**Feature**: 240-linkml-stac-writer-types
**Phase**: 1 (design — public-surface contract)
**Date**: 2026-05-07

This is the binding TypeScript public-surface contract for the migration. The names, import paths, and member shapes below are normative. Any deviation in the implementation requires a spec amendment.

---

## 1. Public TS surface — `@debrief/stac-writer` (export from `index.ts`)

**No name additions, no name removals, no name renames.** Same set of exports as today; the underlying definitions of two of them (`StacItem`, `PropertiesProvenanceEntry`) re-route to schema-derived sources.

```typescript
// shared/stac-writer/src/index.ts — export list (unchanged from today)

export type {
  CapabilityReport,
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  PropertiesProvenanceEntry,        // ← now re-exported from @debrief/components/PropertiesPanel/provenanceTypes
  StacAsset,
  StacItem,                          // ← now references StacExtensionProperties from @debrief/schemas
  StacWriter,
  StoreContext,
  StoredItem,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WritePlotThumbnailPairInput,
  WritePlotThumbnailPairResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from './interface.js';
```

## 2. `StacItem` after migration (normative)

```typescript
// shared/stac-writer/src/interface.ts — StacItem only

import type { StacExtensionProperties } from '@debrief/schemas';

export interface StacItem {
  readonly id: string;
  readonly properties: StacExtensionProperties & Record<string, unknown>;
  readonly assets?: Record<string, StacAsset>;
  readonly links?: ReadonlyArray<{ readonly rel: string; readonly href: string }>;
  readonly [k: string]: unknown;
}
```

**Diff from today**:

```diff
- readonly properties: Record<string, unknown>;
+ readonly properties: StacExtensionProperties & Record<string, unknown>;
```

**Behavioural invariants** (must hold after migration):

- `StacItem` accepts every value it accepts today (the `& Record<string, unknown>` clause keeps the open-extension semantics).
- `StacItem` does **not** require any new field — `StacExtensionProperties` consists entirely of optional fields (verified at `shared/schemas/src/linkml/stac-extension.yaml:112–169` — every slot in the class has `required: false` or no `required:` attribute, defaulting to optional).
- The TS type is structurally compatible with every JSON object the writer accepts on disk today, including those carrying *no* `debrief:*` extension fields.

## 3. `PropertiesProvenanceEntry` after migration (normative)

```typescript
// shared/stac-writer/src/interface.ts — re-export only

export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
```

```typescript
// shared/components/src/PropertiesPanel/provenanceTypes.ts — final shape

import type { PropertiesProvenanceEntry as GeneratedEntry } from '@debrief/schemas';

export const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;

/**
 * Per-commit provenance entry for the Properties Panel.
 * Type sourced from LinkML — see shared/schemas/src/linkml/stac-extension.yaml.
 * Constraints not expressible in TypeScript (literal `tool`/`source` values,
 * `method` template) are enforced at runtime by isValidPropertiesProvenanceEntry.
 */
export type PropertiesProvenanceEntry = GeneratedEntry;

export function isValidPropertiesProvenanceEntry(
  entry: unknown,
): entry is PropertiesProvenanceEntry {
  // Body unchanged from today — same six runtime checks.
}

export const PROVENANCE_LOG_CAP = 500 as const;
export const PROVENANCE_LOG_ARCHIVE_FILENAME = 'provenance_log_archive.jsonl' as const;
```

**Diff from today**:

```diff
- export interface PropertiesProvenanceEntry {
-   activity_id: string;
-   timestamp: string;
-   tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
-   method: `properties-panel@${string}`;
-   fields: string[];
-   source: 'user';
- }
+ import type { PropertiesProvenanceEntry as GeneratedEntry } from '@debrief/schemas';
+ export type PropertiesProvenanceEntry = GeneratedEntry;
```

**Static-surface change** (research R2): `tool`, `method`, `source` go from literal/template-literal types to plain `string`. Runtime semantics unchanged.

## 4. `@debrief/schemas` import surface (no change)

```typescript
// shared/schemas/src/generated/typescript/types.ts (auto-generated, normative shape)

export interface PropertiesProvenanceEntry {
  activity_id: string;
  timestamp: string;
  tool: string;        // pattern enforced at runtime / Pydantic, not at TS level
  method: string;      // pattern enforced at runtime / Pydantic, not at TS level
  fields: string[];
  source: string;      // pattern enforced at runtime / Pydantic, not at TS level
}

export interface StacExtensionProperties {
  platforms?: PlatformRecord[];
  tags?: string[];
  feature_tags?: string[];
  overrides?: string[];
  provenance_log?: PropertiesProvenanceEntry[];
  // …other Debrief extension fields (existing, unchanged by this feature)
}
```

This file is auto-generated. The contract here pins the *expected output* of `gen-typescript` against the current LinkML source — not a hand-written declaration. The drift check (research R3) enforces that the committed file matches a fresh regeneration.

## 5. CI contract — drift check

After this feature lands, `.github/workflows/schema-tests.yml` MUST contain a step semantically equivalent to:

```yaml
- name: Check generated artefacts are up-to-date
  run: |
    if ! git diff --exit-code -- src/generated/; then
      echo "::error::Generated artefacts under shared/schemas/src/generated/ have drifted from the LinkML source."
      echo "::error::Run 'task schema:generate' (or 'cd shared/schemas && uv run python scripts/generate.py') and commit the result."
      exit 1
    fi
```

This step:

- MUST run **after** `Run schema generation` and **before** any test step that consumes the generated artefacts.
- MUST exit non-zero if `git diff` reports any change in `shared/schemas/src/generated/`.
- MUST mention both `task schema:generate` and the fallback `cd shared/schemas && uv run python scripts/generate.py` in the failure message (FR-006).

## 6. Behavioural contract — STAC Item round-trip

**Invariant**: For every STAC Item file under `preview/workspace/samples/local-store/`, reading the file via `JSON.parse`, narrowing to the post-migration `StacItem` type, then serialising via `JSON.stringify` MUST produce a byte-equivalent string (modulo trailing newline normalisation already applied by today's writer).

This invariant is verified by the Phase-1 quickstart walkthrough and by the existing Python round-trip test (`shared/schemas/tests/test_roundtrip.py`).

## 7. Out-of-scope (NOT covered by this contract)

- Modifying `StacExtensionProperties` itself (the LinkML class).
- Modifying any other LinkML class (`PlotSummary`, `StacItemSummary`, `PlatformRecord`, etc.).
- Changing the writer's runtime behaviour (`writeItem`, `patchItem`, `writeAsset`, etc.).
- Changing on-disk JSON format.
- Adding new public type names to `@debrief/stac-writer`.
