# Implementation Plan: LinkML-derive `@debrief/stac-writer` contract types

**Branch**: `240-linkml-stac-writer-types` (work pushed on cloud-session branch `claude/start-speckit-240-DixZc`) | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/240-linkml-stac-writer-types/spec.md`

## Summary

Close the last hand-written gap on `@debrief/stac-writer`'s contract surface (per #236 review 2A) by routing both contract types through LinkML.

Research surfaced one important factual update to the spec's premise: **the `PropertiesProvenanceEntry` LinkML class already exists** as a concrete class in `shared/schemas/src/linkml/stac-extension.yaml` (lines 63–110), and the generators already emit it into both `@debrief/schemas` (TypeScript) and `debrief_schemas` (Pydantic). FR-003 therefore reduces from "add a class" to "verify the existing class is canonical, then re-point three TS hand-writes at it." Today there are *three* divergent hand-written declarations of the same concept (in `@debrief/stac-writer/src/interface.ts`, `@debrief/components/src/PropertiesPanel/provenanceTypes.ts`, and the `apps/vscode/src/services/stacService.ts` import surface), and they disagree subtly on field shape — this is exactly the "drift" the spec exists to eliminate.

The technical approach is therefore narrower than the spec suggested:

1. **`PropertiesProvenanceEntry`**: Replace three hand-writes with re-exports of the already-generated type from `@debrief/schemas`. Keep the runtime validator (`isValidPropertiesProvenanceEntry`) and the constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`) — they encode tighter constraints than LinkML can express in TypeScript and remain the runtime gate.
2. **`StacItem`**: Type its `properties` as `StacExtensionProperties & Record<string, unknown>`, importing `StacExtensionProperties` from `@debrief/schemas`. This makes the `debrief:*` extension surface schema-derived (the only part the spec actually cares about) without LinkML having to re-model the bare STAC 1.1 Item shape.
3. **CI drift check**: Add a step to `schema-tests.yml` that runs `python scripts/generate.py` then `git diff --exit-code shared/schemas/src/generated/`, failing any PR whose committed generated artefacts diverge from a fresh regeneration.
4. **Reconcile the `source` enum divergence** (`'user' | 'tool' | 'import'` in the writer vs `^user$` in LinkML): see research R4 — narrow the writer's enum to match LinkML, since the broader values are dead code today.

No new packages, no new dependencies. The `StacItem` class is intentionally **not** modelled in LinkML (research R1).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Article XV); Python 3.11 only for the LinkML generator pipeline (already wired via `shared/schemas/scripts/generate.py`).
**Primary Dependencies**: LinkML >= 1.7.0 (`gen-typescript`, `gen-pydantic` — already used); `@debrief/schemas` (existing workspace package, generated TS already exposes `PropertiesProvenanceEntry` and `StacExtensionProperties`); no new runtime dependencies.
**Storage**: N/A — this feature changes type declarations only. STAC Items already on disk in `preview/workspace/samples/local-store/` MUST round-trip byte-equivalent (FR-008).
**Testing**: Existing schema-tests.yml CI workflow (golden fixtures + round-trip + schema comparison + tsc --noEmit on generated TS); extended with a new drift-check step. No new test frameworks.
**Target Platform**: Cross-host — Node-side VS Code extension and browser-side web-shell both consume `@debrief/stac-writer`'s types and must continue to compile + run unchanged at the JSON level.
**Project Type**: Monorepo — pnpm + uv workspaces. No new packages.
**Performance Goals**: N/A — type-derivation feature, zero runtime impact.
**Constraints**:
- On-the-wire JSON shape MUST NOT change (FR-008).
- No rename of public TS type names (`StacItem`, `PropertiesProvenanceEntry`, `StacExtensionProperties`).
- `PROPERTIES_PANEL_TOOL_SENTINEL`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`, and `isValidPropertiesProvenanceEntry` must remain exported from `@debrief/components/PropertiesPanel/provenanceTypes`.
- Generated artefacts remain checked into git (current convention; do not change).
**Scale/Scope**: Three TS files modified (the three current hand-writes), ~10 importers updated to canonical paths, one CI workflow extended, one Taskfile target added. No LinkML schema additions are required (the class already exists).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The whole *purpose* of this feature is to bring an Article II.1 violation back into compliance, so the constitution check is mostly inverted — the deliverable closes a known gap rather than risking opening a new one.

| Article / Clause | Relevance | Status |
|---|---|---|
| **II.1** Single source of truth — LinkML drives derived schemas | **Direct**. This feature closes the writer's hand-written gap. | ✅ Closes a violation |
| **II.2** Schema tests mandatory | The drift check is a new schema-test gate. | ✅ Strengthens |
| **III.3** Audit trail immutable | `provenance_log` semantics unchanged; runtime validator stays. | ✅ |
| **IV.1** Frontends never persist | Untouched — `@debrief/stac-writer` abstraction stays the same shape. | ✅ |
| **IV.4** Persistence-host abstraction | Untouched — the writer interface is *re-typed*, not redesigned. | ✅ |
| **VI.1** Schema tests gate all merges | Drift check becomes a required CI step. | ✅ Strengthens |
| **IX.1** Minimal, vetted dependencies | Zero new dependencies. | ✅ |
| **XIV** Pre-release freedom | Behaviour-equivalent migration; no migration period needed. | ✅ |
| **XV.2** `Any`/`any` prohibited | Generated TS uses `string` (not `any`) for pattern-constrained fields; the only place `Record<string, unknown>` appears is `StacItem.properties` extensions, and `unknown` is allowed. | ✅ |
| **XV.4** Schema types canonical, no `Any`/`any` in generated output | Verified in current `types.ts`. | ✅ |

**Single justified deviation — accepted, no Complexity Tracking entry needed**:

The hand-written `PropertiesProvenanceEntry` in `@debrief/components` uses tighter literal-string types than LinkML's `gen-typescript` can produce:

| Field | Hand-written today | LinkML-generated | Constraint enforcement after migration |
|---|---|---|---|
| `tool` | `typeof PROPERTIES_PANEL_TOOL_SENTINEL` (literal `'debrief.propertiesPanel'`) | `string` (LinkML `pattern: "^debrief\\.propertiesPanel$"`) | Runtime: `isValidPropertiesProvenanceEntry` (kept). Static: looser. |
| `method` | `` `properties-panel@${string}` `` (template literal) | `string` (LinkML `pattern: "^properties-panel@.+$"`) | Runtime: validator (kept). Static: looser. |
| `source` | `'user'` (literal) | `string` (LinkML `pattern: "^user$"`) | Runtime: validator (kept). Static: looser. |

The static surface becomes slightly looser on those three fields. **Compensating control**: `isValidPropertiesProvenanceEntry` already enforces the literal constraints at write time and stays unchanged. The constants (`PROPERTIES_PANEL_TOOL_SENTINEL` etc.) also stay. This is the same trade-off implicit in every existing `gen-typescript` consumer in this repo (e.g. `FeatureKindEnum` is generated as a TS `enum` because LinkML's `permissible_values` map cleanly to TS enums; `pattern` does not). No new ADR required.

No violations require a Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/240-linkml-stac-writer-types/
├── plan.md              # This file
├── research.md          # Phase 0 — five research outcomes (R1–R5)
├── data-model.md        # Phase 1 — type-surface delta (before/after)
├── quickstart.md        # Phase 1 — local validation walkthrough
├── contracts/
│   └── stac-writer-public-types.md   # Phase 1 — pre/post TS public surface
├── checklists/
│   └── requirements.md  # Already created by /speckit.specify (spec quality)
├── evidence/
│   └── opening-context.md            # Phase 2 — cached blog opener
└── tasks.md             # NOT created here — that's /speckit.tasks
```

### Source Code (repository root)

This feature touches existing files only — no new packages, no new directories.

```text
shared/
├── schemas/
│   ├── src/linkml/
│   │   └── stac-extension.yaml             # READ-ONLY (PropertiesProvenanceEntry already at lines 63–110)
│   └── src/generated/typescript/
│       └── types.ts                         # AUTO-REGENERATED — no hand-edit (drift check enforces)
├── stac-writer/
│   └── src/
│       ├── interface.ts                     # MODIFY — re-type StacItem.properties; replace hand-written PropertiesProvenanceEntry with re-export
│       └── index.ts                         # NO CHANGE (export surface unchanged)
└── components/
    └── src/PropertiesPanel/
        └── provenanceTypes.ts               # MODIFY — re-export type from @debrief/schemas; keep constants + isValidPropertiesProvenanceEntry

apps/
├── vscode/src/services/
│   └── stacService.ts                       # NO TYPE CHANGE — import path is already @debrief/components/PropertiesPanel/provenanceTypes; re-export there will flow through
└── web-shell/src/services/
    └── stacWriterIdb.ts                     # NO CHANGE (already imports from @debrief/stac-writer)

.github/workflows/
└── schema-tests.yml                         # MODIFY — add drift-check step after `Run schema generation`

Taskfile.yml                                 # MODIFY — add `schema:generate` and `schema:check-drift` targets
```

**Structure Decision**: Existing monorepo. Three packages have type changes (`@debrief/stac-writer`, `@debrief/components`, indirectly `@debrief/schemas` via regeneration if any LinkML edit is needed — research R4 may add a small enum tweak). The web-shell adaptor is unchanged because it already imports through `@debrief/stac-writer`. No new packages.

## Media Components

None — backend / type-derivation feature with zero visual surface.

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes. The on-disk byte-equivalence requirement (FR-008) is covered by the Python schema-tests.yml round-trip test (`tests/test_roundtrip.py`), which already runs against the LinkML-generated Pydantic models and the sample fixtures. We will add a small TS-side fixture round-trip test (see `quickstart.md`) to cover the writer's TS surface end-to-end.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — section intentionally empty.
