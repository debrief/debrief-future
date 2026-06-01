# Implementation Plan: Replace hand-written `Safe*` GeoJSON feature types with schema-derived equivalents

**Branch**: `212-linkml-safe-feature-types` (cloud session git branch: `claude/intelligent-clarke-VdwDj`) | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/212-linkml-safe-feature-types/spec.md`

## Summary

Close the Article II tripwire by removing the hand-written `SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` types from `@debrief/utils`. Per the decided strategy (A — derive), add a **schema-derived** `IngressFeature` / `IngressFeatureCollection` to `@debrief/schemas/unions.ts` (`Omit<RawGeoJSONFeature,'geometry'> & { geometry: …| null }`), then migrate each usage site to its data-flow-appropriate target: result-carrying surfaces → generated `RawGeoJSONFeature`; permissive parse/MCP/disk boundaries and the host→webview message DTOs → `IngressFeature`. The one bespoke coordinate reader (`stacService.calculateBboxFromFeatures`) is replaced by reuse of `@debrief/utils calculateBounds` — removing casts, dropping a `SafeGeometry` dependency, and fixing a latent Multi*-geometry bbox bug. A definition-level lint guard blocks reintroduction. The change is behaviour-preserving and adds no new dependency and no schema change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory, Article XV). No Python changes.
**Primary Dependencies**: `@debrief/schemas` (source of `RawGeoJSONFeature`; new derived types in `unions.ts`), `@debrief/utils` (`calculateBounds` reuse), VS Code Extension API ^1.85.0 (consumers), React 18 / react-leaflet (consumers, untouched). **No new runtime dependencies** (Article IX).
**Storage**: N/A — type-system refactor; no persistence or schema change.
**Testing**: vitest (unit + `*.test-d.ts` type tests), `tsc --noEmit` (pyright N/A — no Python), ESLint (`no-restricted-syntax` cast bans + the extended `check-no-geojson-feature.sh` guard), Playwright E2E (web-shell — behaviour-preservation regression), pytest (unaffected, must stay green).
**Target Platform**: VS Code extension host + webview, web-shell (browser), services (Node) — monorepo packages.
**Project Type**: web (pnpm monorepo, multiple packages).
**Performance Goals**: Behaviour-preserving. `calculateBounds` reuse keeps bbox computation at O(n features) with the pre-computed-bbox fast-path.
**Constraints**: No new runtime validation (spec A-2); no new `as Record`/`as unknown`/inline-object casts (Article XV.7); no schema change / no new LinkML class / generated artefacts unchanged (FR-009); `geometry: null` features preserved (SC-004).
**Scale/Scope**: 43 semantic usage sites across `apps/vscode`, `apps/web-shell`, `services/session-state` (consumer), `shared/utils` (source of removal), `shared/schemas` (new derived type).

No `NEEDS CLARIFICATION` remain — the strategy fork was resolved by the audit + stakeholder decision (spec § Migration Approach); all design unknowns are resolved in `research.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status |
|---------|-----------|--------|
| **II — Schema Integrity** | Removes hand-written schema-adjacent types; replacements are generated (`RawGeoJSONFeature`) or schema-derived (`IngressFeature` via `Omit`). | ✅ PASS. No schema change (FR-009) ⇒ II.3 versioning N/A. |
| **IV.5 — Boundary types derived** | Central. `IngressFeature` is `Omit`-derived; `messages.ts` DTOs reference it (no field re-listing). | ✅ PASS — this feature *is* an IV.5 cleanup. |
| **VI — Testing** | Type-tests + existing null-geometry fixtures gate the change; CI green required. | ✅ PASS (test strategy in `quickstart.md`). |
| **VII — Test-Driven AI** | Type-tests + null-geometry fixtures define "done". | ✅ PASS. |
| **VIII — Specs before code** | Spec + gap report exist. | ✅ PASS. |
| **IX — Dependencies** | No new runtime dependency. | ✅ PASS. |
| **XV — Strict Type Safety** | No new `as Record`/`as unknown`/inline-object casts; named-type casts retargeted; `calculateBounds` reuse removes `as number[]` casts; unavoidable boundary casts get `// SAFETY:`. | ✅ PASS (cast strategy in `research.md` R3). |
| **XIV.4/5 — Strict on import** | No new tolerant parsing introduced; trust level unchanged from ADR-021. | ✅ PASS. |

**Interaction with BACKLOG #277** (inline-object-cast cleanup): this feature must not *add* inline-object casts and may opportunistically clear the single `mocks/calcService.ts` one during a rename, but must **not** expand into #277's repo-wide cleanup. Noted, not a violation.

**Gate result: PASS.** No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/212-linkml-safe-feature-types/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R6
├── data-model.md        # Phase 1 — type model + per-site migration map
├── quickstart.md        # Phase 1 — verification steps
├── contracts/
│   └── types.md         # Phase 1 — type contracts (IngressFeature, migrated signatures, guard)
├── checklists/
│   └── requirements.md  # spec-quality checklist (from /speckit.specify)
├── evidence/
│   ├── audit-gap-report.md   # User Story 1 deliverable
│   └── opening-context.md    # cached blog opener (Phase 2)
└── tasks.md             # /speckit.tasks output (NOT created here)
```

### Source Code (repository root)

```text
shared/schemas/src/generated/typescript/
├── unions.ts            # ADD IngressFeature / IngressFeatureCollection (hand-maintained companion)
└── index.ts             # re-export the new types (if not already covered)
shared/schemas/tests/
└── ingress-feature.test-d.ts   # NEW — derivation type-test (SC-005)

shared/utils/src/
├── types.ts             # REMOVE SafeFeature / SafeGeometry / SafeFeatureCollection
├── index.ts             # REMOVE their re-exports
└── bounds.ts            # update doc comments referencing SafeFeature
shared/utils/tests/
└── bounds.types.test-d.ts   # replace SafeFeature case with IngressFeature

apps/vscode/src/
├── webview/messages.ts          # DTOs → IngressFeatureCollection (IV.5)
├── services/stacService.ts      # loadGeoJson/writeGeoJson → IngressFeature*; DELETE calculateBboxFromFeatures+extractCoordinates, reuse calculateBounds
├── services/calcService.ts      # MCP-result parse boundary → IngressFeature*
├── services/ioService.ts        # debrief-io subprocess boundary → IngressFeature[]
├── types/import.ts              # ParseResult.features → IngressFeature[]
├── commands/{importRep,openPlot}.ts  # consumers: source rename, keep null-guards
├── tools/reference/classification/pointInZoneClassifier.ts  # source rename, keep guards
├── webview/mapPanel.ts          # consumer: source rename
├── extension.ts, types/tool.ts  # result-carrying → RawGeoJSONFeature*

apps/web-shell/src/
├── mocks/calcService.ts         # toSafeFeatures→toIngressFeatures; rework inline cast (XV.7)
├── services/toolService.ts      # ToolExecuteFn signature → IngressFeature[]
└── tools/sensor/detection/bufferZoneGenerator.ts (+ test)  # result-carrying → RawGeoJSONFeature*

scripts/check-no-geojson-feature.sh  # EXTEND guard to catch Safe* reintroduction
```

**Structure Decision**: Existing pnpm monorepo. The new type lives in `@debrief/schemas` (next to its derivation source); removals in `@debrief/utils`; the bulk of edits are type-name migrations in the two frontends (`apps/vscode`, `apps/web-shell`) plus one reuse refactor in `stacService`. No new package, no new directory beyond `contracts/` + the two test files.

## Media Components

None - backend/infrastructure feature. This is a TypeScript type-system refactor with no new or changed visual component; there is no Storybook story to bundle.

## Storybook E2E Testing

None - no interactive UI components. No component renders or behaviour change.

## Web-Shell E2E Testing

No **new** workflow tests. The migration touches the plot-load, tool-execution/MCP-result, and REP-import paths, so the **existing** web-shell Playwright suites (plot load + tool execution + import) serve as the behaviour-preservation regression for US4 / SC-002 / SC-004 — they must remain green.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Existing: load plot + run a tool (regression only) | MapView, LayersPanel, results | `.leaflet-container`, existing tool/result selectors | load sample plot, execute a tool, verify result layer renders (incl. a `geometry: null` feature surviving) |

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs <existing-spec>`
- Local: `pnpm --filter @debrief/web-shell test`

## Complexity Tracking

> No Constitution Check violations — section intentionally empty.
