# Contract: `@debrief/stac-writer` public types — pre/post migration

**Feature**: 240-linkml-stac-writer-types
**Phase**: 1 (design — public-surface contract)
**Date**: 2026-05-07

This is the binding TypeScript public-surface contract for the migration. The names, import paths, and member shapes below are normative. Any deviation in the implementation requires a spec amendment.

---

## 1. Public TS surface — `@debrief/stac-writer` (export from `index.ts`)

**No name additions, no name removals, no name renames.** Same set of exports as today; one underlying definition (`PropertiesProvenanceEntry`) re-routes to a schema-derived source. `StacItem` is unchanged.

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
  StacItem,                          // ← UNCHANGED (out of scope per /speckit.review)
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

**Out of scope for this feature.** `StacItem` remains exactly as today:

```typescript
// shared/stac-writer/src/interface.ts — StacItem unchanged

export interface StacItem {
  readonly id: string;
  readonly properties: Record<string, unknown>;
  readonly assets?: Record<string, StacAsset>;
  readonly links?: ReadonlyArray<{ readonly rel: string; readonly href: string }>;
  readonly [k: string]: unknown;
}
```

The originally-planned typing of `properties` as `StacExtensionProperties & Record<string, unknown>` was rejected after `/speckit.review` (decision 1) — see research R1 for the full rationale. The "new `debrief:*` fields flow automatically to the writer's typed surface" promise is captured as a backlog follow-up.

**Behavioural invariants** (must hold — and do, since the type is unchanged):

- Every value the writer accepts today, it accepts after the migration. (Trivially true.)
- The TS type is structurally compatible with every JSON object the writer accepts on disk today.

## 3. `PropertiesProvenanceEntry` after migration (normative)

```typescript
// shared/stac-writer/src/interface.ts — re-export only

export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
```

```typescript
// shared/components/src/PropertiesPanel/provenanceTypes.ts — final shape (HYBRID INTERSECTION)

import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';

export const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;

/**
 * Per-commit provenance entry for the Properties Panel.
 * Schema-derived contract via LinkML (see shared/schemas/src/linkml/stac-extension.yaml).
 * Pattern constraints not expressible in TypeScript (literal `tool`/`source` values,
 * `method` template) are reinstated here via a hybrid intersection so that
 * compile-time typo-detection at production write sites continues to work.
 */
export type PropertiesProvenanceEntry =
  Omit<Generated, 'tool' | 'method' | 'source'> &
  {
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    method: `properties-panel@${string}`;
    source: 'user';
  };

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
+ import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';
+ export type PropertiesProvenanceEntry =
+   Omit<Generated, 'tool' | 'method' | 'source'> &
+   {
+     tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
+     method: `properties-panel@${string}`;
+     source: 'user';
+   };
```

**Static-surface invariants** (must hold after migration):

- `tool`, `method`, `source` retain their literal/template-literal types from today. A typo at the production write sites continues to fail tsc.
- `activity_id`, `timestamp`, `fields` flow from the LinkML-generated `Generated` type. Any change to those slots in `stac-extension.yaml` propagates without a hand-edit here.
- The runtime validator (`isValidPropertiesProvenanceEntry`) and the constants are bit-for-bit unchanged from today.

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

**Prerequisite**: SC-007 — generator-determinism verification. Before the drift check ships, the implementation MUST confirm that running `python scripts/generate.py` twice on a clean checkout produces zero `git diff` under `shared/schemas/src/generated/`. If non-deterministic, a normalisation pass (e.g. `prettier --write` on the generated `.ts`; equivalent for Pydantic if needed) MUST run between regeneration and the diff check, and the normalised output MUST itself be verified byte-stable.

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

**Invariant**: For every STAC Item file under `preview/workspace/samples/local-store/`, reading the file via `JSON.parse`, narrowing to the (unchanged) `StacItem` type, then serialising via `JSON.stringify` MUST produce a byte-equivalent string (modulo trailing newline normalisation already applied by today's writer). Because `StacItem` is unchanged by this feature, the invariant is *trivially* preserved on the writer side; the round-trip walkthrough in quickstart.md still exists as a smoke test against accidental regression introduced by the workspace dep edge or the ESLint rule.

This invariant is verified by the Phase-1 quickstart walkthrough and by the existing Python round-trip test (`shared/schemas/tests/test_roundtrip.py`).

## 7. Workspace dependency contract

**New edge** (added by this feature): `@debrief/stac-writer` depends on `@debrief/components` (workspace `*`).

**Constraint**: The dependency is type-only via the `./PropertiesPanel/provenanceTypes` subpath leaf. No runtime code from `@debrief/components` may be imported by any file under `shared/stac-writer/`. This is enforced by an ESLint `no-restricted-imports` rule scoped to `shared/stac-writer/**`. Type-only imports (`import type { ... }`, `export type { ... }`) remain allowed.

The provenanceTypes leaf module today has zero React/DOM/Leaflet dependencies (it contains only constants, the runtime validator, and the type alias). The ESLint rule keeps that property durable as the components package evolves.

## 8. Out-of-scope (NOT covered by this contract)

- Modifying `StacExtensionProperties` itself (the LinkML class).
- Modifying any other LinkML class (`PlotSummary`, `StacItemSummary`, `PlatformRecord`, etc.).
- Changing the writer's `StacItem` interface — explicitly deferred per `/speckit.review` decision 1.
- Changing the writer's runtime behaviour (`writeItem`, `patchItem`, `writeAsset`, etc.).
- Changing on-disk JSON format.
- Adding new public type names to `@debrief/stac-writer`.
- Adding runtime validator calls in production write paths (covered by the hybrid intersection's compile-time guard; deferred backlog item exists for read-path validation).
