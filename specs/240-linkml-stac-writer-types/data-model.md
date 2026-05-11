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

**Target state** *(revised after `/speckit.review` 2026-05-08)*:
- The LinkML class stays canonical (no LinkML edit needed).
- The components-side declaration becomes a **hybrid intersection** that re-exports the LinkML-generated type *and* statically narrows `tool`/`method`/`source` to the literal types they have today (preserving the compile-time guard at production write sites — see research R2 for why this is non-negotiable).
- The writer's `interface.ts` deletes its hand-written declaration entirely and re-exports from `@debrief/components/PropertiesPanel/provenanceTypes`.
- The Properties Panel file's constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, etc.) and runtime validator (`isValidPropertiesProvenanceEntry`) stay verbatim.

**Why route through `@debrief/components`, not directly from `@debrief/schemas`**: The hybrid intersection is the *one* place that owns the literal-narrowing alongside the LinkML re-export. The writer needs the narrowed type (its consumers — `stacService.ts:1323`, `stacWriterIdb.ts:332` — depend on the literal `tool`/`method`/`source` for write-time typo detection). Routing through the components-side declaration centralises both the narrowing and the validator in one file. This introduces a new workspace dep edge `@debrief/stac-writer → @debrief/components` (type-only, via subpath leaf) — accepted per `/speckit.review` decision 3, with an ESLint rule banning *runtime* imports from `@debrief/components` in the writer to keep the leanness invariant durable.

**Reconciliation: the `source` enum** (research R4): The hand-written `source: 'user' | 'tool' | 'import'` in the writer is dead code (no caller passes `'tool'` or `'import'`). Under the hybrid intersection, the writer's hand-written declaration is *deleted entirely* and replaced by a re-export of the components-side `PropertiesProvenanceEntry`, which fixes `source: 'user'`. So R4 doesn't require a dedicated edit — it falls out of the R2 implementation as a side-effect.

### 1.2 `StacItem` — out of scope for this feature

*(Updated 2026-05-08 after `/speckit.review`.)*

LinkML class: **does not exist, and will not be added.** The writer's `StacItem` interface stays exactly as today.

| Site | File:Line | Today's shape | Target shape |
|------|-----------|---------------|--------------|
| Hand-written TS in writer | `shared/stac-writer/src/interface.ts:34–40` | `id: string`; `properties: Record<string, unknown>`; `assets?: Record<string, StacAsset>`; `links?: ReadonlyArray<{rel; href}>`; `[k: string]: unknown` | **Unchanged** — same hand-written shape. |

**Why `StacItem` is deferred** (full rationale in research R1): The originally-planned `properties: StacExtensionProperties & Record<string, unknown>` would have delivered no value because LinkML's `gen-typescript` emits unprefixed field names (`provenance_log`) while the writer accesses by JSON key (`props['debrief:provenance_log']`). The named-slot typing would never resolve at the call sites that matter. Delivering the spec's "new `debrief:*` fields flow automatically" promise requires either a `gen-typescript` prefix-aware emitter or a repo-wide refactor of the writer's access pattern — both materially out of scope here. Captured as a backlog follow-up ("Prefix-aware TS typing for `StacExtensionProperties`").

### 1.3 `StacExtensionProperties` (already canonical, untouched)

Today: declared in `shared/schemas/src/linkml/stac-extension.yaml:112–169`, generated into `shared/schemas/src/generated/typescript/types.ts:1625+`, exported from `@debrief/schemas`. **No change** — and per the §1.2 deferral, no new consumer is wired up to it by this feature.

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

@debrief/components
└── PropertiesPanel/provenanceTypes.ts
    ├── import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';
    ├── export const PROPERTIES_PANEL_TOOL_SENTINEL                         ← unchanged
    ├── export type PropertiesProvenanceEntry =                             ← HYBRID INTERSECTION
    │     Omit<Generated, 'tool' | 'method' | 'source'> & {
    │       tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    │       method: `properties-panel@${string}`;
    │       source: 'user';
    │     };
    ├── export function isValidPropertiesProvenanceEntry(...)               ← unchanged body
    └── export const PROVENANCE_LOG_CAP, PROVENANCE_LOG_ARCHIVE_FILENAME    ← unchanged

@debrief/stac-writer
├── package.json
│   └── dependencies: { "@debrief/components": "workspace:*" }              ← NEW (type-only consumer)
└── src/interface.ts
    ├── (no import from @debrief/schemas — writer doesn't see Generated directly)
    ├── export interface StacItem { ... }                                    ← UNCHANGED (out of scope)
    └── export type { PropertiesProvenanceEntry } from
          '@debrief/components/PropertiesPanel/provenanceTypes';            ← re-export of narrowed type

.eslintrc.* (writer-scoped override)
└── no-restricted-imports: ban runtime imports from @debrief/components in shared/stac-writer/**
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

**Conclusion**: Zero call-site edits required outside the two modified TS files (`shared/stac-writer/src/interface.ts`, `shared/components/src/PropertiesPanel/provenanceTypes.ts`). Consumers feel no change. R4 requires no dedicated edit — it falls out of R2 as a side-effect (the writer's hand-written declaration disappears entirely, taking the dead-code `'tool' | 'import'` enum members with it).

## 4. State transitions

None — this is a static type-derivation feature. No runtime state, no entity lifecycle, no transitions.

## 5. Validation rules

All validation lives in `isValidPropertiesProvenanceEntry` (runtime, kept verbatim) and the LinkML class definition (build-time, unchanged). The migration adds **one new validation gate**: the CI drift check (research R3), which validates that the *type definitions themselves* match the schema source.

## 6. Build / CI / config artefacts changed

| Artefact | Change |
|----------|--------|
| `shared/stac-writer/package.json` | Add `@debrief/components` to `dependencies` (workspace `*`). |
| ESLint config (workspace-level or writer-scoped override) | Add `no-restricted-imports` rule for `shared/stac-writer/**` banning runtime imports from `@debrief/components` (type-only imports remain allowed). |
| `.github/workflows/schema-tests.yml` | Add a `Check generated artefacts are up-to-date` step after `Run schema generation`. **Gated on SC-007 — verified generator determinism** (run generator twice on a clean checkout; assert `git diff --quiet`; if non-deterministic, add a `prettier --write` normalisation pass before the diff). |
| `Taskfile.yml` | Add `schema:generate` and `schema:check-drift` targets so contributors run the same check locally. |
| `.gitattributes` | Add `shared/schemas/src/generated/** linguist-generated=true` (research R5). |

No new packages, no new external dependencies, no on-disk format changes. The single new internal dependency edge is `@debrief/stac-writer → @debrief/components` (workspace, type-only via subpath leaf).
