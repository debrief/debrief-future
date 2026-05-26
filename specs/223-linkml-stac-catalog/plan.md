# Implementation Plan: Promote STAC catalog hand-types to LinkML

**Branch**: `223-linkml-stac-catalog` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/223-linkml-stac-catalog/spec.md`

## Summary

Promote the **STAC catalog cluster** — 5 audit-flagged hand-typed
TypeScript declarations (3× `StacItem` + 2× `StacCatalog`, §3.1 / §3.2
of [`docs/type-audit-2026.md`](../../docs/type-audit-2026.md)) plus 7
sibling shapes masked by the R4 file-level rule (`StacLink`,
`StacAsset`, `StacExtent`, `StacSummaries`, `StacCollection`,
`StacCatalogOrCollection`, inline `StacItemAssets`) — onto LinkML-rooted
classes generated under `shared/schemas/`. Existing hand-types are
**deleted** (not aliased) and replaced with imports from
`@debrief/schemas` / `debrief_schemas`. Coverage is verified by a
fresh audit re-run plus a fixture-corpus test that loads every
committed `item.json` / `catalog.json` / `collection.json` under
`preview/workspace/samples/local-store/` (73 items + 1 root Collection,
STAC 1.1) and `apps/vscode/test-data/local-store/` (1 root Catalog,
STAC 1.0) without coercion.

**Approach** — single new LinkML schema file
(`shared/schemas/src/linkml/stac.yaml`) co-located with the existing
`stac-extension.yaml` so STAC core classes sit alongside the debrief
extension properties they reference; three migration slices
(P1 envelopes → P2 members → P3 Collection family) each independently
shippable and gate-able by an audit re-run; the schema is authored
against **STAC 1.1** but accepts **STAC 1.0** payloads via additive
optional fields and a string-typed `stac_version` (per spec A-001) so
this feature has no ordering dependency on in-flight spec #241.

The model **composes** the existing `StacExtensionProperties` and
`PlatformRecord` (already in `stac-extension.yaml`) and the existing
GeoJSON geometry classes (`geojson.yaml`) — there is no
redeclaration. Two intentional open-record slots
(`StacItem.properties` and `StacAsset` itself) preserve the STAC
extension-key convention (`debrief:*`, `processing:*`, `file:*`,
`proj:*` observed in the live fixtures), matching the established
`raw-geojson.yaml` `JsonObject` precedent and the #222 Article XV
exception pattern.

## Technical Context

**Language/Version**: Python 3.11 (services, schema-build tooling,
adherence tests); TypeScript 5.x strict (consumer sites, generated
types, vitest fixtures).
**Primary Dependencies**: LinkML ≥ 1.7.0 (schema source +
`gen-pydantic` / `gen-typescript` / `gen-json-schema`); Pydantic v2
(generated Python models); `@debrief/schemas` workspace package
(TypeScript re-exports); `debrief_schemas` Python package (Pydantic
re-exports); `@debrief/stac-writer` (writer interface — its `StacItem`
type is migrated onto the same generated class, closing A-009).
**No new external runtime dependencies.**
**Storage**: N/A for the schema build (outputs to
`shared/schemas/src/generated/{python,typescript,json-schema}/` —
committed). On-disk STAC fixtures under
`preview/workspace/samples/local-store/` (73 items + 1 STAC 1.1
Collection root) and `apps/vscode/test-data/local-store/` (1 STAC 1.0
Catalog root) are read-only inputs to the round-trip / fixture-corpus
tests (FR-011: schema widens to accept fixtures, fixtures never
rewritten).
**Testing**: pytest (Python adherence + round-trip + fixture-corpus,
under `shared/schemas/tests/`); vitest (TS-side schema-compare and
type-narrow tests; web-shell mock unit tests under
`apps/web-shell/src/mocks/__tests__/`); Playwright (one reused E2E in
`apps/web-shell` proving no regression in "open a plot from the STAC
tree" flow — SC-006); the audit scanner itself
(`pnpm tsx scripts/audits/type-audit/scan.ts`) used as a verification
harness for SC-001 / SC-002.
**Target Platform**: Linux server (Python regeneration scripts and
`services/stac/`); browser (VS Code webviews, web-shell, Storybook);
Node 20.x (VS Code extension host, schema build).
**Project Type**: Monorepo (`pnpm` + `uv` workspaces). Cluster spans
`shared/schemas/`, `apps/vscode/`, `apps/web-shell/`, and the Python
regeneration script under `scripts/`.
**Performance Goals**: Schema build runtime MUST stay within +20% of
pre-feature baseline (NFR-001). STAC load hot path (used on every
plot open) MUST NOT regress — generated types are plain structural
shapes with no runtime overhead beyond what the hand-types had. The
catalog tree provider currently parses 73 items in ~200 ms on a
2024-vintage workstation; that budget must be maintained.
**Constraints**: Constitution Article XV (strict types — no new
`any` / `Any` casts except the two enumerated open-record slots).
Constitution Article II (schema integrity — round-trip + comparison +
golden adherence tests mandatory). Constitution Article IV.4
(persistence-host abstraction — STAC writes already route through
`@debrief/stac-writer`, this migration aligns that writer's `StacItem`
with the new generated class). No new external dependencies.
**Scale/Scope**: ~8 LinkML classes added + 1 enum (`StacTypeEnum` for
the discriminator); ~5 audit-flagged hand-type sites deleted + ~7
R4-masked siblings deleted; ~8 new export entries on
`@debrief/schemas` / `debrief_schemas`; ~2 new adherence-test modules;
1 new docs section in `shared/schemas/README.md` (NFR-003); 1
changelog entry under `docs/type-audit-2026.md` §5 (FR-010).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1
design.*

All articles pass. One Article XV exception documented in Complexity
Tracking below: two open-record slots (`StacItem.properties` and the
`StacAsset` class itself) keep a wildcard extension-properties shape
to preserve the STAC `<namespace>:<key>` extension convention. This
matches the existing `raw-geojson.yaml` `JsonObject` precedent and the
#222 Article XV exception pattern (`MCPContentItem.structuredContent`
et al.) — i.e. it is established practice for boundary-loose schemas
in this repo, not a new deviation.

Article-by-article notes (only those needing comment):

- **Article II (Schema Integrity)**: This work IS the schema-integrity
  step for the STAC cluster. FR-006 mandates round-trip + schema
  comparison + golden + fixture-corpus tests. Article II.3 (schema
  versioning) does not yet bind — Article XIV (Pre-Release Freedom)
  is still in effect; the cluster adopts additive evolution against
  STAC 1.0 + 1.1.
- **Article IV.4 (Persistence-host abstraction)**: In-scope and
  reinforced — both VS Code (`apps/vscode/src/services/stacService.ts`
  via `@debrief/stac-writer`'s filesystem adapter) and the web-shell
  (`apps/web-shell/src/mocks/stacService.ts` via `@debrief/stac-writer`'s
  IndexedDB adapter, per #236) already route STAC writes through the
  unified writer interface. After this feature, the writer's `StacItem`
  type and the local `StacItem` type are the **same generated class**,
  closing the projection cast at
  `apps/web-shell/src/mocks/stacService.ts:464-474` (A-009).
- **Article XV (Strict Type Safety)**: One documented exception — see
  Complexity Tracking below.

**Initial gate**: PASS. Proceeding to Phase 0.

**Post-design gate** (re-evaluated 2026-05-19 after Phase 0 + Phase 1
artefacts): PASS — no new violations surfaced during design. The
Article XV exception count remains at one (the open-record
extension-properties pattern documented in Complexity Tracking).
Research R-001 (sibling-class discriminator) and R-002
(`additional_properties` for STAC extensions) are both expressed in
existing LinkML constructs — no toolchain extensions or new patterns
introduced. Research R-009 reinforces Article IV.4 by aligning the
Python writer with the same generated class the TypeScript consumers
import (closing the projection cast at
`apps/web-shell/src/mocks/stacService.ts:464-474` per A-009).

## Project Structure

### Documentation (this feature)

```text
specs/223-linkml-stac-catalog/
├── plan.md                          # This file (/speckit.plan output)
├── spec.md                          # Feature specification
├── checklists/
│   └── requirements.md              # Spec quality checklist
├── research.md                      # Phase 0 — open design questions resolved
├── data-model.md                    # Phase 1 — class catalogue + field tables
├── contracts/
│   ├── stac.linkml.yaml.draft.md    # Phase 1 — outline of the new LinkML schema
│   └── json-schema.expected.md      # Phase 1 — checklist of generated JSON Schema
├── quickstart.md                    # Phase 1 — dev verification recipe
├── evidence/
│   └── opening-context.md           # Phase 2 — cached opener for feature post
└── tasks.md                         # /speckit.tasks output (NOT created here)
```

### Source Code (repository root)

Cluster spans the existing monorepo packages; no new directories. The
single new LinkML file is `shared/schemas/src/linkml/stac.yaml`. The
master schema `shared/schemas/src/linkml/debrief.yaml` adds one line to
import the new file (mirroring its existing `mcp` import added by
#222).

Consumer sites have their hand-types deleted and replaced with imports
from `@debrief/schemas`. The five audit-flagged sites and seven
R4-masked siblings are enumerated in `data-model.md` §"Per-site
migration plan"; in summary:

| File | Action |
|------|--------|
| `apps/vscode/src/types/stac.ts` | Convert from declaration module to re-export module — `StacItem`, `StacCatalog`, `StacCollection`, `StacLink`, `StacAsset`, `StacExtent`, `StacSummaries`, `StacCatalogOrCollection` re-exported from `@debrief/schemas`; UI-only `StoreStatus`/`StacStore`/`Catalog`/helpers and the camelCase `StacItemSummary` adapter retained (OOS-001 / OOS-002) |
| `apps/vscode/src/services/sceneThumbnailService.ts` | Delete inline `StacItem` + `StacItemAssets` (lines 63–76); import `StacItem`, `StacAsset` from `@debrief/schemas` |
| `apps/web-shell/src/mocks/stacService.ts` | Delete private `StacItem` (line 23) and `StacCatalog` (line 39); import from `@debrief/schemas`; remove the JSON projection cast at lines 464–474 (A-009 closure) |
| `services/stac/` (Python) | Pydantic constructions used by `scripts/enrich-legacy-catalog.py` switched to the generated `debrief_schemas.StacItem` / `StacCatalog` / `StacCollection` classes (FR-012) |
| `shared/schemas/scripts/generate.py` | Add three small per-class post-processing entries for `StacSpatialExtent.bbox` and `StacTemporalExtent.interval` (Pydantic `list[float]` → `list[list[float]]`; TypeScript `number[]` → `number[][]`; JSON Schema flat array → nested array). Same pattern as the existing GeoJSON `_pydantic_coord_fixes` / `_coordinate_type_fixes` / `_GEOJSON_COORDINATE_SCHEMAS` tables — not a new mechanism. See research.md R-011. |

**Structure Decision**: Use the existing `shared/schemas/` package as
the single home for the new LinkML source. Co-locate the new STAC
core classes in a fresh `stac.yaml` (rather than appending to
`stac-extension.yaml`) because (a) it isolates the cluster for
reviewers, (b) `stac-extension.yaml` is namespace-scoped to the
debrief: extension fields and conflating it with STAC-spec core types
would muddle its name, (c) imports are cheap in LinkML — `stac.yaml`
imports `stac-extension.yaml` for `StacExtensionProperties` and
`PlatformRecord`, (d) mirrors the existing pattern where related-but-
distinct clusters live in their own files (`tool.yaml` /
`tool-result.yaml`, `session-state.yaml` / `storyboard.yaml`,
`mcp.yaml` after #222).

## Media Components

None — backend / infrastructure feature.

The migration is invisible at the UI surface: the STAC tree view, the
catalog overview panel, the file thumbnail capture, and the web-shell
plot loader all continue to render identical output because the
generated types are structurally identical to the hand-types they
replace. SC-006 explicitly requires "no consumer-visible regression
in catalog-tree rendering or plot loading."

## Storybook E2E Testing

None — no interactive UI components added or modified.

The STAC-facing UI components (`StacBrowser`, `StacFileTree`) already
have Storybook coverage. The migration MUST NOT change their visual
output; existing vitest + Storybook snapshot tests catch any
regression.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors |
|----------|---------------------------|---------------|
| Open a plot from the STAC tree | StacFileTree (catalog tree), MapView (loaded plot) | `[data-testid="stac-file-tree"]`, `[data-testid="stac-file-tree-item"]`, `.leaflet-container` |

**Testing Strategy**: Reuse the existing plot-loading E2E in
`apps/web-shell/playwright/tests/` — SC-006 demands "same fixture
catalogue as before the feature." The test MUST be reused, not
authored; the specific spec file is resolved during /speckit.tasks
per Research R-007. If no suitable existing E2E is found, the
fixture-corpus test (FR-006) at the schema layer provides the
strongest evidence and SC-006 relaxes to "Storybook + vitest snapshot
suite passes with byte-identical output" — flagged at /speckit.tasks
time, not deferred.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Two open-record slots modelled as wildcard extension-properties in LinkML (`StacItem.properties` carries arbitrary `<namespace>:<key>` keys; `StacAsset` itself carries `file:checksum`, `file:size`, `processing:datetime`, `proj:shape`, `debrief:provenance` keys observed in the live fixtures) — Article XV.2 normally requires explicit narrowing | The STAC spec mandates an extensible namespace convention (`<extension>:<key>`) for both `properties` and per-asset keys. The local store today uses at least five active extensions (`debrief:`, `processing:`, `file:`, `proj:`, plus implicit core). Constraining at the schema layer would either require enumerating every observed key (a moving target — #241 adds more, #258 may add more) or reject valid live payloads. The fields are documented as boundary-loose intentionally in spec §Edge Cases and explicitly enumerated in FR-005 / FR-009. | Strict schema rejection would break every existing fixture under `preview/workspace/samples/local-store/`. Per-extension subclasses would explode the schema (~5 extensions × ~3 fields each = ~15 extra classes that capture transient real-world state, not contract). Two-tier validation (schema accepts, consumer narrows) matches Article XV.2 verbatim: "When external libraries return untyped data, narrow to a concrete type at the boundary immediately." Consumers narrow via per-extension Zod schemas (in-place today for `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`). The retained open-record pattern matches the precedents established in `raw-geojson.yaml` (`JsonObject` wildcard) and the #222 MCP cluster (`MCPContentItem.structuredContent` et al.). |
