# Implementation Plan: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Branch**: `256-prefix-aware-stac-typing` (cloud session branch: `claude/item-256-spec-status-JCx2R`) | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/256-prefix-aware-stac-typing/spec.md`

## Summary

Make the spec-240–deferred promise true: new and existing `debrief:*` STAC
extension fields flow to the writers' **typed surface**, not just to generated
declarations. The LinkML `gen-typescript` output strips the `debrief:` prefix,
so the writers' real call sites (`props['debrief:provenance_log']` ×27 across
both hosts) fall through to a `[key: string]: unknown` index signature and rely
on `as` casts.

**Approach (route a, user-confirmed):** extend the existing
`shared/schemas/scripts/generate.py` post-processor to rewrite the generated
`StacExtensionProperties` slot keys to their on-disk `debrief:`-prefixed form,
derived from each slot's LinkML `slot_uri`. TypeScript resolves string-literal
index access to the matching named slot, so the existing literal-key call sites
gain types with no rewrite; the redundant `as` casts are then removed. Typing
only — no schema change, no on-disk change, no new dependency. The existing
`src/generated` drift gate enforces freshness.

## Technical Context

**Language/Version**: Python 3.11 (`generate.py` post-processor + structural tests); TypeScript 5.x strict (generated types + writer consumers)
**Primary Dependencies**: LinkML ≥ 1.7.0 (`gen-typescript`, `linkml-runtime` `SchemaView` for the slot→`slot_uri` map — already present); `@debrief/schemas` (generated types); `@debrief/stac-writer` (re-export surface). **No new runtime dependencies.**
**Storage**: N/A — STAC Items on disk (filesystem / IndexedDB) are read/written unchanged; this is a type-declaration change only.
**Testing**: `pnpm -r typecheck` (type-level assertions — the only gate that catches type regressions), Vitest (writer unit tests), pytest (`shared/schemas/tests/` structural + round-trip), existing `src/generated` CI drift gate.
**Target Platform**: Build-time code generation (Python) + both writer hosts (VS Code extension host / web-shell browser).
**Project Type**: Monorepo — schema generation tooling + shared packages + two frontends. No new project.
**Performance Goals**: N/A — compile-time/type-level change; generator runtime negligible.
**Constraints**: On-disk JSON byte-for-byte unchanged (FR-008); generator deterministic (Article I.4); no `any` (Article XV); open content preserved (FR-005/6).
**Scale/Scope**: 5 modelled slots on `StacExtensionProperties`; 1 generator step; ~27 call sites that gain typing (cast removal incremental); 2 writer hosts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Assessment |
|---------|-----------|
| **II. Schema Integrity** (single source of truth) | ✅ **Strengthens it.** The prefixed keys are derived from LinkML `slot_uri`; the writer's typed surface now flows from the schema instead of hand-maintained casts. Closes the #240 deferral. |
| **II.2 Schema tests mandatory** | ✅ Structural test on the regenerated artefact + round-trip golden + drift gate. |
| **I.4 Reproducibility** | ✅ Generator must be deterministic (self-guard + byte-identical re-run); mirrors the #240 `source_file` normalisation precedent. |
| **IV. Architectural Boundaries** | ✅ Writer abstraction untouched; both hosts consume one generated definition (FR-009). No frontend persistence path changes. |
| **VI/VII. Testing** | ✅ Type-level tests are the spec for "done"; ride the existing `tsc` gate. |
| **VIII. Specs before code** | ✅ Spec + this plan precede implementation. |
| **IX. Dependencies** | ✅ No new dependency. Uses `linkml-runtime`/`PyYAML` already present. |
| **XV. Strict Type Safety** | ✅ Prefixed slots are concretely typed. The `[key: string]: unknown` index signature uses `unknown` (not `any`) — the Article XV.2 open-content exception already documented for these STAC classes (#223). |
| **XIV. Pre-Release Freedom** | ✅ Renaming generated bare slots to prefixed is permitted; no compat obligation. |

**Result: PASS — no violations, no Complexity Tracking entries required.**

### Post-Design Re-check (after Phase 1)

Re-evaluated against research.md / data-model.md / contracts. No new
violations: design adds one generator step + tests, reuses the existing drift
gate, introduces no new dependency, and preserves open content + on-disk shape.
**PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/256-prefix-aware-stac-typing/
├── plan.md              # This file
├── spec.md              # Feature spec
├── research.md          # Phase 0 — route decision + rationale
├── data-model.md        # Phase 1 — slot→key mapping, before/after shape
├── quickstart.md        # Phase 1 — regenerate + verify + add-a-field demo
├── contracts/
│   └── prefixed-extension-properties.md   # Generator + type-surface contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (passing)
└── evidence/
    └── opening-context.md  # Cached blog opener (Phase 2)
```

### Source Code (repository root)

```text
shared/schemas/
├── scripts/generate.py                       # MODIFIED — add prefixed-key post-processor step in generate_typescript()
├── src/linkml/stac-extension.yaml            # source of slot_uri (READ ONLY — unchanged)
├── src/generated/typescript/types.ts         # REGENERATED — StacExtensionProperties slot keys gain debrief: prefix
└── tests/                                     # NEW/EXTENDED — structural assertion on prefixed keys

shared/stac-writer/src/interface.ts            # unchanged (re-exports @debrief/schemas StacItem)

apps/vscode/src/services/stacService.ts         # MODIFIED — drop redundant `as` casts on modelled debrief:* keys
apps/web-shell/src/services/stacWriterIdb.ts     # MODIFIED — drop redundant `as` casts on modelled debrief:* keys

shared/schemas/<type-level test location>        # NEW — .test-d.ts / ts-expect-error assertions (C3)
```

**Structure Decision**: No new packages or projects. The change is centred on
the schema generator (`shared/schemas/scripts/generate.py`) and its committed
TypeScript artefact, with cast-removal cleanup at the two writer hosts. This
keeps the blast radius minimal and the single-source-of-truth flow intact.

## Media Components

None - backend/infrastructure feature. No visual components; the deliverable is
generated type declarations and a generator step.

## Storybook E2E Testing

None - no interactive UI components.

## Web-Shell E2E Testing

None - no extension workflow changes. This is a type-declaration change; the
web-shell's runtime behaviour and on-disk output are unchanged (FR-008), so the
existing web-shell E2E suite serves as the behaviour-invariance guard without
new tests. (A round-trip/golden assertion in `shared/schemas/tests` / stac-writer
unit tests covers byte-identical output.)

## Complexity Tracking

> No Constitution violations — section intentionally empty.
