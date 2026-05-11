# Implementation Plan: LinkML-derive `@debrief/stac-writer` contract types

**Branch**: `240-linkml-stac-writer-types` (work pushed on cloud-session branch `claude/start-speckit-240-DixZc`) | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/240-linkml-stac-writer-types/spec.md`

## Summary

Close the *consolidation* half of the last hand-written gap on `@debrief/stac-writer`'s contract surface (per #236 review 2A) by routing `PropertiesProvenanceEntry` through LinkML. The `StacItem`-typing half is deferred — see the §"Scope reduction from `/speckit.review`" subsection below.

Research surfaced one important factual update to the spec's premise: **the `PropertiesProvenanceEntry` LinkML class already exists** as a concrete class in `shared/schemas/src/linkml/stac-extension.yaml` (lines 63–110), and the generators already emit it into both `@debrief/schemas` (TypeScript) and `debrief_schemas` (Pydantic). FR-003 therefore reduces from "add a class" to "verify the existing class is canonical, then re-point three TS hand-writes at it." Today there are *three* divergent hand-written declarations of the same concept (in `@debrief/stac-writer/src/interface.ts`, `@debrief/components/src/PropertiesPanel/provenanceTypes.ts`, and the writer's transitive consumers), and they disagree subtly on field shape — this is exactly the "drift" the spec exists to eliminate.

The technical approach is:

1. **`PropertiesProvenanceEntry` — hybrid intersection** (per `/speckit.review` decision 2): The components-side declaration in `@debrief/components/src/PropertiesPanel/provenanceTypes.ts` becomes `Omit<Generated, 'tool' | 'method' | 'source'> & { tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL; method: \`properties-panel@${string}\`; source: 'user' }`, importing `Generated` from `@debrief/schemas`. This preserves *both* the LinkML canonical-source link *and* the literal-string compile-time guard that today catches typos at the two production write sites (`stacService.ts:1323`, `stacWriterIdb.ts:332`). The writer (`@debrief/stac-writer/src/interface.ts`) deletes its hand-written declaration and re-exports from the components-side declaration. The runtime validator (`isValidPropertiesProvenanceEntry`) and the constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`) stay verbatim.
2. **CI drift check**: Add a step to `schema-tests.yml` that runs `python scripts/generate.py` then `git diff --exit-code shared/schemas/src/generated/`, failing any PR whose committed generated artefacts diverge from a fresh regeneration. Gated on **SC-007 — verified generator determinism** (per `/speckit.review` decision 5): a one-time check that the generator produces byte-identical output across two consecutive runs; if not, a normalisation pass (`prettier --write` for TS, equivalent for Pydantic) lands in the same change.
3. **Reconcile the `source` enum divergence** (`'user' | 'tool' | 'import'` in the writer vs `^user$` in LinkML): mechanically resolved by deleting the writer's hand-written declaration entirely; the components-side intersection enforces `source: 'user'` in TS, matching the LinkML pattern and the runtime validator. The two extra values are confirmed dead code (zero in-repo callers).
4. **Workspace dependency edge** (per `/speckit.review` decision 3): `@debrief/stac-writer` adds `@debrief/components` to its `package.json` `dependencies` (workspace `*`). The import is type-only via the `./PropertiesPanel/provenanceTypes` subpath leaf — no runtime code is pulled. An ESLint rule bans *runtime* imports from `@debrief/components` in the writer to keep this property durable.

No new packages, no new external dependencies, no new LinkML classes. The `StacItem` typing improvement is deferred (see below).

### Scope reduction from `/speckit.review`

Two material findings from `/speckit.review` reduced the plan from the originally-drafted version:

- **`StacItem.properties` typing dropped (decision 1)**. The originally-planned design — `properties: StacExtensionProperties & Record<string, unknown>` — would not have delivered the spec's "new `debrief:*` fields flow automatically to the writer's typed surface" promise, because LinkML's `gen-typescript` emits unprefixed field names (`provenance_log`) while the on-disk JSON keys carry the `debrief:` prefix (`'debrief:provenance_log'`). The writer accesses `properties` by JSON key (`props['debrief:provenance_log']` at `stacService.ts:1333`, `stacWriterIdb.ts:341`), which falls into the `Record<string, unknown>` index signature and bypasses the named slots from `StacExtensionProperties`. Delivering that promise requires a `gen-typescript` prefix-aware emitter (or a repo-wide refactor of the writer's access pattern) — captured as a backlog follow-up.
- **Hybrid intersection adopted (decision 2)**. The originally-drafted plan accepted the loss of literal-string narrowness for `tool`/`method`/`source`, citing `isValidPropertiesProvenanceEntry()` as the runtime backstop. Review found the validator is **only called in tests**, not in either production write path — the literal types in the components-side hand-written declaration are today's *only* compile-time guard against typos. The hybrid intersection preserves that guard while still routing through LinkML.

The two `StacItem`/runtime-validation gaps are tracked as deferred backlog items (see BACKLOG.md entries added 2026-05-08); they're real but out of scope for spec 240.

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
**Scale/Scope**: Two TS files materially modified (`shared/components/src/PropertiesPanel/provenanceTypes.ts` — type alias becomes hybrid intersection; `shared/stac-writer/src/interface.ts` — local declaration deleted, re-export added), one `package.json` updated (writer gains workspace dep on components), one ESLint config extended (ban runtime imports from components in the writer), one CI workflow extended, two Taskfile targets added, one `.gitattributes` line added. Importers (`apps/vscode/.../stacService.ts`, `apps/web-shell/.../stacWriterIdb.ts`, tests) require **no edits** — their import paths re-route transparently. No LinkML schema additions are required (the class already exists).

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

**No deviation — the hybrid intersection preserves all today's invariants**:

LinkML's `gen-typescript` cannot translate `pattern` constraints into TypeScript literal types (it emits plain `string`). To preserve the compile-time guard that today catches typos at the production write sites (`stacService.ts:1323`, `stacWriterIdb.ts:332`), the components-side declaration uses a hybrid intersection:

```typescript
import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';
export type PropertiesProvenanceEntry =
  Omit<Generated, 'tool' | 'method' | 'source'> &
  {
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    method: `properties-panel@${string}`;
    source: 'user';
  };
```

| Field | Source after migration | Compile-time guard | Runtime guard |
|---|---|---|---|
| `activity_id` | LinkML-generated (`string`) | tsc | — |
| `timestamp` | LinkML-generated (`string`) | tsc | — |
| `tool` | hand-narrowed via intersection (`typeof PROPERTIES_PANEL_TOOL_SENTINEL`) | tsc — typo rejected | `isValidPropertiesProvenanceEntry` (test-only today) |
| `method` | hand-narrowed via intersection (`` `properties-panel@${string}` ``) | tsc — non-template-conforming string rejected | validator (test-only) |
| `fields` | LinkML-generated (`string[]`) | tsc | validator (test-only) |
| `source` | hand-narrowed via intersection (`'user'`) | tsc — non-`'user'` rejected | validator (test-only) |

**Net effect**: The static surface is no looser than today on any field. The schema-driven invariant (any change to the LinkML class flows into the generated `Generated` type) is preserved alongside. The intersection is small (5 lines), deliberately *complements* rather than *replaces* the generator, and lives in one place (the components-side declaration). The single residual concern — that `isValidPropertiesProvenanceEntry()` is not called in production write paths — predates this feature and is captured as a separate backlog item (production read-path validation).

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
│   ├── package.json                         # MODIFY — add @debrief/components workspace dep
│   └── src/
│       ├── interface.ts                     # MODIFY — DELETE hand-written PropertiesProvenanceEntry (lines 42–49); ADD re-export from @debrief/components/PropertiesPanel/provenanceTypes; LEAVE StacItem unchanged
│       └── index.ts                         # NO CHANGE (export surface unchanged)
└── components/
    └── src/PropertiesPanel/
        └── provenanceTypes.ts               # MODIFY — REPLACE local interface body with hybrid intersection over @debrief/schemas; KEEP constants + isValidPropertiesProvenanceEntry verbatim

apps/
├── vscode/src/services/
│   └── stacService.ts                       # NO CHANGE — import path is already @debrief/components/PropertiesPanel/provenanceTypes; type re-routes underneath
└── web-shell/src/services/
    └── stacWriterIdb.ts                     # NO CHANGE — imports flow through @debrief/stac-writer's re-export

.github/workflows/
└── schema-tests.yml                         # MODIFY — add drift-check step after `Run schema generation`

.eslintrc.* (or equivalent)                  # MODIFY — add no-restricted-imports rule banning runtime imports from @debrief/components in shared/stac-writer/**

Taskfile.yml                                 # MODIFY — add `schema:generate` and `schema:check-drift` targets

.gitattributes                               # MODIFY — `shared/schemas/src/generated/** linguist-generated=true`
```

**Structure Decision**: Existing monorepo. Two packages have type-body changes (`@debrief/stac-writer` deletes a declaration; `@debrief/components` rewrites one type alias). One workspace dep edge added (writer → components, type-only, ESLint-policed). No new packages, no LinkML edits, no consumer-side edits.

## Media Components

None — backend / type-derivation feature with zero visual surface.

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes. The on-disk byte-equivalence requirement (FR-008) is covered by the Python schema-tests.yml round-trip test (`tests/test_roundtrip.py`), which already runs against the LinkML-generated Pydantic models and the sample fixtures. We will add a small TS-side fixture round-trip test (see `quickstart.md`) to cover the writer's TS surface end-to-end.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — section intentionally empty.
