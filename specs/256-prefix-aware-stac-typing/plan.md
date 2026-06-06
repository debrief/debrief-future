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

**Approach (route a, schema-driven, expanded in `/speckit.plan`):** extend the
existing `shared/schemas/scripts/generate.py` post-processor with one
**schema-driven** step that rewrites each modelled slot's emitted TS key to its
LinkML `slot_uri` verbatim, across **three** classes — `StacExtensionProperties`
(5 item fields), `StacSummaries` (3 Collection-summary fields), and `StacAsset`
(2 newly-modelled asset fields). TypeScript resolves string-literal index access
to the matching named slot, so the existing literal-key call sites gain types
with no rewrite; the redundant `as` casts — and the `Record<string, unknown>`
widenings at both hosts' **write** paths — are then removed (Issue 2A from the
review). The existing `src/generated` drift gate enforces freshness.

**Scope expanded beyond the original spec during `/speckit.review` + `/speckit.plan`** (user-directed, folded into this PR rather than backlogged):
- **`StacSummaries` prefixing** — same prefix-stripping gap, same fix (FR-010).
- **Modelling `debrief:toolId` + `debrief:snapshotTimestamp` on `StacAsset`** —
  a LinkML change (additive Pydantic regen); removes the hand-cast at
  `stacService.ts:674` (FR-011). `debrief:label` was investigated and **dropped**
  — it is a GeoJSON feature property / MCP annotation, not a STAC property.
- **Write-path re-typing** — both hosts widen `props` to `Record<string,
  unknown>` at the mutation site; re-typed to `StacItemProperties` so write-side
  typos fail the build (FR-012).
- **Mechanism is schema-driven, not text-only** — the three classes have
  divergent name→`slot_uri` conventions and `StacAsset` mixes Debrief and
  non-Debrief slots, so a pure-text rule cannot generalise (FR-013).

This is **no longer "typing-only / no schema change"**: it adds two `StacAsset`
slots. The on-disk JSON is still unchanged (the keys already exist); no new
dependency.

## Technical Context

**Language/Version**: Python 3.11 (`generate.py` post-processor + structural tests; additive Pydantic regen); TypeScript 5.x strict (generated types + writer consumers)
**Primary Dependencies**: LinkML ≥ 1.7.0 (`gen-typescript`, `gen-pydantic`, `linkml-runtime` `SchemaView` for the class→slot→`slot_uri` map — already present); `@debrief/schemas` (generated types); `@debrief/stac-writer` (re-export surface). **No new runtime dependencies.**
**Storage**: N/A — STAC Items / assets on disk (filesystem / IndexedDB) are read/written unchanged; the two newly-modelled `StacAsset` keys already exist on disk. Typing-only over existing data.
**Testing**: `pnpm -r typecheck` (type-level assertions — the only gate that catches type regressions), Vitest (writer unit tests), **pytest pure-function unit test** of the prefix transform fed a synthetic added slot (FR-002, Issue 3A) + structural + round-trip + new `StacAsset`-slot adherence (`shared/schemas/tests/`), schema-convention guard test, existing `src/generated` CI drift gate.
**Target Platform**: Build-time code generation (Python) + both writer hosts (VS Code extension host / web-shell browser).
**Project Type**: Monorepo — schema generation tooling + shared packages + two frontends. No new project.
**Performance Goals**: N/A — compile-time/type-level change; generator runtime negligible.
**Constraints**: On-disk JSON byte-for-byte unchanged (FR-008); generator deterministic (Article I.4); no `any` (Article XV); open content preserved (FR-005/6); transform schema-driven, never hard-coded (FR-013).
**Scale/Scope**: 3 target classes (`StacExtensionProperties` ×5, `StacSummaries` ×3, `StacAsset` ×2-new) = 10 modelled slots; 2 new LinkML slots; 1 generator step (schema-driven); ~27 read call sites that gain typing + 2 write-path `props` re-types + 1 asset hand-cast removed; 2 writer hosts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Assessment |
|---------|-----------|
| **II. Schema Integrity** (single source of truth) | ✅ **Strengthens it.** The prefixed keys are derived from LinkML `slot_uri` across all three classes; the writer's typed surface (read **and** write) now flows from the schema instead of hand-maintained casts. Closes the #240 deferral. |
| **II.2 Schema tests mandatory** | ✅ **Now binding — this adds two `StacAsset` slots (a real schema change).** Coverage: pure-function transform unit test (synthetic added slot, FR-002), structural test on regenerated `types.ts`, round-trip / adherence for the new `StacAsset` slots (Python + TS), schema-convention guard, drift gate. |
| **I.4 Reproducibility** | ✅ Generator must be deterministic (self-guard + byte-identical re-run); mirrors the #240 `source_file` normalisation precedent. |
| **IV. Architectural Boundaries** | ✅ Writer abstraction untouched; both hosts consume one generated definition (FR-009). The write-path `Record<string, unknown>` widenings are removed so the modelled surface reaches the mutation sites — directly serves Article IV.5 / ADR-033 (no silent drop on schema growth). |
| **VI/VII. Testing** | ✅ Type-level tests are the spec for "done" (ride the existing `tsc` gate); plus the new pure-function and adherence tests. |
| **VIII. Specs before code** | ✅ Spec + this plan (both updated for the expanded scope) precede implementation. |
| **IX. Dependencies** | ✅ No new dependency. Uses `linkml-runtime`/`PyYAML` already present. |
| **XV. Strict Type Safety** | ✅ Prefixed slots are concretely typed. The `[key: string]: unknown` index signature uses `unknown` (not `any`) — the Article XV.2 open-content exception already documented for these STAC classes (#223). Re-typing `props` to `StacItemProperties` removes two `as Record<string, unknown>` widenings (a net reduction in casts). |
| **XIV. Pre-Release Freedom** | ✅ Renaming generated bare slots to prefixed, and adding `StacAsset` slots, is permitted; no compat obligation. |

**Result: PASS — no violations. Note: scope now includes a LinkML schema change (two `StacAsset` slots), so Article II.2 schema-test obligations are *active* (not vacuous) and are itemised above.**

### Post-Design Re-check (after Phase 1)

Re-evaluated against the updated research.md / data-model.md / contracts. No new
violations: design adds one schema-driven generator step + two additive
`StacAsset` slots + tests, reuses the existing drift gate, introduces no new
dependency, removes two write-path widenings + one asset hand-cast, and
preserves open content + on-disk shape. **PASS.**

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
├── scripts/generate.py                       # MODIFIED — add ONE schema-driven prefix step (pure fn) covering StacExtensionProperties + StacSummaries + StacAsset
├── src/linkml/stac.yaml                       # MODIFIED — add tool_id + snapshot_timestamp slots (slot_uri debrief:toolId / debrief:snapshotTimestamp) to StacAsset
├── src/linkml/stac-extension.yaml            # source of slot_uri for StacExtensionProperties (READ ONLY — unchanged)
├── src/generated/typescript/types.ts         # REGENERATED — slot keys gain debrief: prefix across the 3 classes
├── src/generated/python/debrief_schemas/...   # REGENERATED — StacAsset Pydantic model gains 2 optional fields (additive)
└── tests/                                     # NEW/EXTENDED — pure-fn transform unit test (synthetic slot), structural assertion, convention guard, StacAsset adherence/round-trip

shared/stac-writer/src/interface.ts            # unchanged (re-exports @debrief/schemas StacItem)

apps/vscode/src/services/stacService.ts         # MODIFIED — drop `as` casts on modelled keys; re-type props (line 1315) to StacItemProperties; remove StacAsset hand-cast (line 674)
apps/web-shell/src/services/stacWriterIdb.ts     # MODIFIED — drop `as` casts; re-type props (line 309) to StacItemProperties

shared/schemas/tests/ts/*.test-d.ts             # NEW — ts-expect-error assertions (C3) incl. write-path + StacAsset
```

**Structure Decision**: No new packages or projects. The change is centred on
the schema generator (`shared/schemas/scripts/generate.py`) and its committed
TypeScript + Pydantic artefacts, plus two additive `StacAsset` slots in
`stac.yaml`, with cast-removal and write-path re-typing at the two writer hosts.
A single schema-driven generator step serves all three target classes, keeping
the logic in one place and the single-source-of-truth flow intact.

## Media Components

None - backend/infrastructure feature. No visual components; the deliverable is
generated type declarations and a generator step.

## Storybook E2E Testing

None - no interactive UI components.

## Web-Shell E2E Testing

None - no extension workflow changes. Despite the two new `StacAsset` slots,
the on-disk output and runtime behaviour are unchanged (FR-008 — the keys
already exist on disk; modelling is typing-only over them), so the existing
web-shell E2E suite serves as the behaviour-invariance guard without new tests.
(A round-trip/golden assertion in `shared/schemas/tests` / stac-writer unit
tests covers byte-identical output, now including the asset-level keys.)

## Complexity Tracking

> No Constitution violations — section intentionally empty.
