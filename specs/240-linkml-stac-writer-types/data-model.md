# Data Model: LinkML-derive `@debrief/stac-writer` contract types

**Feature**: 240-linkml-stac-writer-types
**Phase**: 1 (design — type-surface delta)
**Date**: 2026-05-07

This document captures **what changes at the type level** — there are no new entities, no schema migrations, no on-disk format changes. The "data model" here is the TS public surface of `@debrief/stac-writer` and `@debrief/components` plus the LinkML schema that drives them.

## 1. Affected entities

### 1.1 `PropertiesProvenanceEntry`

Today exists in **three** divergent forms:

| Site | File:Line | Today's shape |
|------|-----------|---------------|
| LinkML class (canonical, unused by TS) | `shared/schemas/src/linkml/stac-extension.yaml:63–110` | `tool: string` (pattern `^debrief\.propertiesPanel$`); `method: string` (pattern `^properties-panel@.+$`); `source: string` (pattern `^user$`); `fields: string[]` (multivalued, min 1); `activity_id: string`; `timestamp: string`. **All required.** |
| Generated TS (already exists, unused by writer) | `shared/schemas/src/generated/typescript/types.ts:1600–1618` | Same as LinkML; pattern constraints lost (TS sees plain `string`). |
| Generated Pydantic (already exists, unused) | `shared/schemas/src/generated/python/debrief_schemas/__init__.py` | Same as LinkML; pattern constraints enforced via Pydantic validators. |
| Hand-written TS #1 (writer's own) | `shared/stac-writer/src/interface.ts:42–49` | `tool: string`; `method: string`; **`source: 'user' \| 'tool' \| 'import'`** ← divergent; `fields: ReadonlyArray<string>`; all readonly. |
| Hand-written TS #2 (Properties Panel) | `shared/components/src/PropertiesPanel/provenanceTypes.ts:9–22` | `tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL` ← tighter; `method: \`properties-panel@${string}\`` ← tighter; `source: 'user'` ← matches LinkML; `fields: string[]`; `activity_id`, `timestamp` non-readonly. |

**Target state**: The LinkML class stays canonical (no LinkML edit needed). The two hand-written TS sites collapse to **re-exports** of the generated type. The Properties Panel file keeps its constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, etc.) and the runtime validator (`isValidPropertiesProvenanceEntry`); only the type alias is replaced. The writer's `interface.ts` removes its hand-written declaration entirely and re-exports from `@debrief/components/PropertiesPanel/provenanceTypes` (which now re-exports from `@debrief/schemas`).

**Why route through `@debrief/components`, not directly from `@debrief/schemas`**: `@debrief/components` is the existing canonical TS-side home for the Properties Panel's runtime constraints (validator, constants). The writer already re-exports `PropertiesProvenanceEntry` for its own consumers; keeping that re-export in place means **zero changes to consumer import paths** outside the writer package. The writer becomes a passthrough re-exporter rather than a definer.

**Reconciliation: the `source` enum** (research R4): The hand-written `source: 'user' | 'tool' | 'import'` in the writer is dead code (no caller passes `'tool'` or `'import'`). It collapses to `'user'` (per LinkML). Generated TS sees `string`, runtime validator sees `e.source === 'user'`. Net effect: tighter than today on the runtime side, looser than today on the writer's TS-only narrowing. No behaviour change at runtime.

### 1.2 `StacItem`

LinkML class: **does not exist, and per research R1 will not be added.**

| Site | File:Line | Today's shape | Target shape |
|------|-----------|---------------|--------------|
| Hand-written TS in writer | `shared/stac-writer/src/interface.ts:34–40` | `id: string`; `properties: Record<string, unknown>`; `assets?: Record<string, StacAsset>`; `links?: ReadonlyArray<{rel; href}>`; `[k: string]: unknown` | `id: string`; **`properties: StacExtensionProperties & Record<string, unknown>`** ← imports from `@debrief/schemas`; rest unchanged |

The change is one import + one type-position substitution. Behaviour at runtime is identical (`& Record<string, unknown>` permits all keys the previous `Record<string, unknown>` did). New `debrief:*` fields added to `stac-extension.yaml` flow into `StacExtensionProperties` and are visible to every consumer of `StacItem.properties`.

### 1.3 `StacExtensionProperties` (already canonical)

Today: declared in `shared/schemas/src/linkml/stac-extension.yaml:112–169`, generated into `shared/schemas/src/generated/typescript/types.ts:1625+`, exported from `@debrief/schemas`. **No change.**

This is the existing entity that the writer's new `StacItem.properties` will reference — that's the whole point of the redesign.

## 2. Type-surface delta — before / after

### Before (today)

```text
@debrief/stac-writer
└── interface.ts
    ├── export interface StacItem { properties: Record<string, unknown>; ... }   ← hand-written
    └── export interface PropertiesProvenanceEntry { tool: string; source: 'user'|'tool'|'import'; ... }   ← hand-written, divergent

@debrief/components
└── PropertiesPanel/provenanceTypes.ts
    ├── export const PROPERTIES_PANEL_TOOL_SENTINEL
    ├── export interface PropertiesProvenanceEntry { tool: typeof SENTINEL; method: `${...}`; source: 'user'; ... }   ← hand-written, tighter
    ├── export function isValidPropertiesProvenanceEntry(...)
    └── export const PROVENANCE_LOG_CAP, PROVENANCE_LOG_ARCHIVE_FILENAME

@debrief/schemas
└── src/generated/typescript/types.ts
    └── export interface PropertiesProvenanceEntry { tool: string; source: string; ... }   ← generated, used by NOBODY today
```

### After

```text
@debrief/schemas
└── src/generated/typescript/types.ts
    └── export interface PropertiesProvenanceEntry   ← single source of truth (no change to file)
    └── export interface StacExtensionProperties     ← existing, now imported by writer

@debrief/components
└── PropertiesPanel/provenanceTypes.ts
    ├── import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';
    ├── export const PROPERTIES_PANEL_TOOL_SENTINEL                         ← unchanged
    ├── export type PropertiesProvenanceEntry = Generated;                  ← re-export
    ├── export function isValidPropertiesProvenanceEntry(...)               ← unchanged body
    └── export const PROVENANCE_LOG_CAP, PROVENANCE_LOG_ARCHIVE_FILENAME    ← unchanged

@debrief/stac-writer
└── interface.ts
    ├── import type { StacExtensionProperties } from '@debrief/schemas';
    ├── import type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
    ├── export interface StacItem {
    │     readonly id: string;
    │     readonly properties: StacExtensionProperties & Record<string, unknown>;   ← schema-derived part
    │     readonly assets?: ...;
    │     readonly links?: ...;
    │     readonly [k: string]: unknown;
    │   }
    └── export type { PropertiesProvenanceEntry };                          ← re-export
```

## 3. Consumer impact (all in-repo importers)

Grep-confirmed list of files that import either type today (from research):

| Importer | Imports | Today's source | Source after migration | Action required |
|----------|---------|----------------|------------------------|-----------------|
| `apps/vscode/src/services/stacService.ts` | `PropertiesProvenanceEntry` | `@debrief/components/PropertiesPanel/provenanceTypes` | same | **none** (path unchanged; type re-points underneath) |
| `apps/vscode/src/services/stacService.ts` | `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`, `PROPERTIES_PANEL_TOOL_SENTINEL` | same | same | **none** |
| `apps/web-shell/src/services/stacWriterIdb.ts` | (writer types only) | `@debrief/stac-writer` | same | **none** (writer's exports re-route under the hood) |
| `apps/web-shell` tests | various | `@debrief/stac-writer` | same | **none** |
| `shared/components/src/index.ts:320,322` | `PropertiesProvenanceEntry` re-export | local path | local path | **none** (local re-export still works through the new re-export) |
| `shared/stac-writer/src/index.ts:15` | `PropertiesProvenanceEntry` re-export | local interface.ts | re-routed | **automatic** (re-export updated in interface.ts) |
| `specs/193-properties-panel/contracts/*.ts` | type references | spec contract files | unchanged | **none** (these are historical contract files frozen by their spec) |

**Conclusion**: Zero call-site edits required outside the three modified files (`shared/stac-writer/src/interface.ts`, `shared/components/src/PropertiesPanel/provenanceTypes.ts`, and the LinkML enum reconciliation if R4 needs one). Consumers feel no change.

## 4. State transitions

None — this is a static type-derivation feature. No runtime state, no entity lifecycle, no transitions.

## 5. Validation rules

All validation lives in `isValidPropertiesProvenanceEntry` (runtime, kept verbatim) and the LinkML class definition (build-time, unchanged). The migration adds **one new validation gate**: the CI drift check (research R3), which validates that the *type definitions themselves* match the schema source.

## 6. CI / build artefacts changed

| Artefact | Change |
|----------|--------|
| `.github/workflows/schema-tests.yml` | Add a `Check generated artefacts are up-to-date` step after `Run schema generation`. |
| `Taskfile.yml` | Add `schema:generate` and `schema:check-drift` targets so contributors run the same check locally. |
| `.gitattributes` | Add `shared/schemas/src/generated/** linguist-generated=true` (research R5). |

No new packages, no new dependencies, no on-disk format changes.
