# Feature Specification: Promote STAC catalog hand-types to LinkML

**Feature Branch**: `223-linkml-stac-catalog`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "[backlog-id:223] Promote STAC catalog hand-types to LinkML — the audit (#206) flagged `StacItem` (3 sites), `StacCatalog` (2 sites) and related aliases in `apps/vscode/src/types/stac.ts` and `apps/web-shell/src/mocks/stacService.ts`. STAC payloads persist to disk (Python writes, TS reads) and are authoritative wire shapes — they must be rooted in LinkML so the two sides cannot drift. See docs/type-audit-2026.md §3.2 (drift cluster) and §3.1 (cross-domain hand-typed)."

## Background

The 2026 type-declaration audit ([#206](../206-audit-non-linkml-types/spec.md),
captured in `docs/type-audit-2026.md` at SHA
`01166d6e8ef72ed5cf25c339f0d9fa7dfc2b15b1`) is the evidence base for Epic
**E11 — Schema-First Boundary Typing**. The audit identified
**cross-domain hand-typed** TypeScript shapes that cross a service boundary
but are not derived from the LinkML schema set under `shared/schemas/`.
This feature addresses the **STAC catalog cluster** — five flagged sites
plus a tail of hand-written supporting shapes that all describe the on-disk
STAC JSON files Python writes and TypeScript reads.

The STAC cluster has a structural twist that distinguishes it from
sibling #222 (MCP) which it follows: STAC files are **not** transient
JSON-RPC envelopes — they are **persistent artefacts** that live on disk
between sessions. Specifically:

- Python (`services/stac/` and the regeneration script
  `scripts/enrich-legacy-catalog.py`) **writes** `catalog.json`,
  `collection.json`, and per-plot `item.json` files into stores under
  `preview/workspace/samples/local-store/` and
  `apps/vscode/test-data/local-store/`.
- TypeScript reads the same files from two consumers:
  1. **VS Code extension** — `apps/vscode/src/services/stacService.ts`,
     `apps/vscode/src/providers/stacTreeProvider.ts`,
     `apps/vscode/src/panels/catalogOverviewPanel.ts`,
     `apps/vscode/src/services/sceneThumbnailService.ts`, all typed
     against `apps/vscode/src/types/stac.ts`.
  2. **Web-shell mock** —
     `apps/web-shell/src/mocks/stacService.ts` re-declares the same
     shapes locally because no shared TS type exists.

A divergence here is **silently corrupting** rather than crashing:
catalogs that round-trip through a future Python regeneration but were
last read against an older TS hand-type may quietly lose fields on the
next write (think `assets.thumbnail`, `links.canonical`, the
`debrief:` extension properties), and there is no schema-adherence test
that catches it. Constitution Article XV mandates this is the kind of
boundary shape that must be schema-rooted.

The audit's recommended actions for this cluster, in concrete terms:

| # | Site | Class | §  | Action |
|---|------|-------|----|--------|
| 1 | `apps/web-shell/src/mocks/stacService.ts:23` | `StacItem` | 3.1 / 3.2 drift | Delete hand-type; import from `@debrief/schemas` |
| 2 | `apps/web-shell/src/mocks/stacService.ts:39` | `StacCatalog` | 3.1 / 3.2 drift | Delete hand-type; import from `@debrief/schemas` |
| 3 | `apps/vscode/src/services/sceneThumbnailService.ts:62` | `StacItem` (private) | 3.1 / 3.2 drift | Delete private alias; import from `@debrief/schemas` |
| 4 | `apps/vscode/src/types/stac.ts:114` (now 127) | `StacItem` | 3.1 / 3.2 drift | Delete; re-export from `@debrief/schemas` |
| 5 | `apps/vscode/src/types/stac.ts:153` (now 166) | `StacCatalog` | 3.1 / 3.2 drift | Delete; re-export from `@debrief/schemas` |

The remaining STAC shapes in `apps/vscode/src/types/stac.ts` — `StacLink`,
`StacAsset`, `StacExtent`, `StacSummaries`, `StacCollection`,
`StacCatalogOrCollection` — were classified `schema-rooted` by the
audit's R4 file-level rule (the file imports `PlatformRecord` from
`@debrief/schemas`, which masks the audit's R3 hand-typed classifier).
**They are still hand-written** and carry the same on-disk drift risk
as the flagged shapes. Leaving them un-promoted would resolve the audit
metric without resolving the underlying drift problem — so this feature
includes them in the migration. The same pattern was applied in #222
(audit-flagged `ToolParameter` was resolved alongside un-flagged
function-type aliases).

The sister clusters (session-state #224, loader↔main IPC #225, drift
roll-up #226, Storybook/Props rollup #227) are explicitly **out of
scope** here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single source of truth for STAC Item and Catalog envelopes (Priority: P1)

A maintainer adds a new top-level field to `StacItem` (say,
`collection?: string` to support items that belong to a STAC Collection).
They edit **one** file — the LinkML source under
`shared/schemas/src/linkml/` — re-run the schema build, and the field
appears simultaneously in the generated Pydantic class used by the
Python regeneration script and in the generated TypeScript type
consumed by the VS Code extension, the web-shell mock, the
`sceneThumbnailService`, the catalog overview panel, and the
`stacTreeProvider`. The CI schema-adherence test fails if any consumer
is still importing a hand-typed shadow declaration.

**Why this priority**: `StacItem` and `StacCatalog` are the audit's
flagged cluster (3 + 2 sites). They carry every byte of the per-plot
`item.json` and per-store `catalog.json` files. A divergence in
`StacItem` corrupts every plot the VS Code extension opens; a
divergence in `StacCatalog` corrupts the entire store's tree view.
Until these two are schema-rooted, the rest of the cluster inherits
their risk.

**Independent Test**: After completing P1, run the type-audit scanner
(`pnpm tsx scripts/audits/type-audit/scan.ts ...`) against the working
tree. The five rows attributed to #223 in §3.1
(`cross-domain-hand-typed`) MUST disappear, and both `StacItem` and
`StacCatalog` MUST drop from §3.2 (`drift-candidate`). Every site that
previously declared one of them MUST now import the corresponding
generated class from `@debrief/schemas`. The full `task verify`
pipeline (lint + typecheck + tests + Playwright E2E, per
`CLAUDE.md` § Before Pushing) MUST pass.

**Acceptance Scenarios**:

1. **Given** the LinkML source file declares `StacItem` with fields
   matching the STAC 1.1 spec (`type`, `stac_version`, `id`, `geometry`,
   `bbox`, `properties`, `links`, `assets`, plus optional `collection`,
   `stac_extensions`), **When** the schema build runs, **Then**
   `@debrief/schemas` exports a TypeScript `StacItem` type and
   `debrief_schemas` exports a Pydantic `StacItem` class whose
   serialised JSON is structurally identical for the same input.
2. **Given** the migration is complete, **When** a developer searches
   for `interface StacItem` or `interface StacCatalog` outside
   `shared/schemas/`, **Then** zero matches are returned in `apps/`,
   `services/`, `shared/components/` (the hand-types have been deleted,
   not aliased).
3. **Given** an existing committed `item.json` from
   `preview/workspace/samples/local-store/` (chosen at random across
   the ~80 plots), **When** it is loaded through the generated Pydantic
   `StacItem` validator and through the generated TypeScript type
   guard, **Then** both validate without coercion and the round-trip
   (Python → JSON → TS parse → JSON → Python) produces a byte-identical
   payload (modulo whitespace).
4. **Given** the type-audit re-runs after this feature lands, **When**
   §3.1 of the regenerated report is inspected, **Then** the five rows
   attributed to #223 are gone (count drops by exactly five), and
   **When** §3.2 is inspected, **Then** the `StacItem` and
   `StacCatalog` drift clusters are gone (5 drift members removed).
5. **Given** the `apps/web-shell/src/mocks/stacService.ts` and
   `apps/vscode/src/services/sceneThumbnailService.ts` files, **When**
   inspected after P1, **Then** their hand-declared private
   `StacItem` / `StacCatalog` interfaces are deleted and replaced with
   `import type { StacItem, StacCatalog } from '@debrief/schemas'`.

---

### User Story 2 - Schema-rooted supporting envelope members (Priority: P2)

A developer changes how `StacAsset` carries thumbnail metadata (say,
adds a `checksum?: string` for the `file:checksum` extension landing in
spec #241). They edit the LinkML source for `StacAsset`, re-run the
build, and the change propagates simultaneously to the Python writer
(`scripts/enrich-legacy-catalog.py`, `services/stac/`), the
TypeScript consumer in `stacService`, and the `sceneThumbnailService`
which reads `assets["scene-thumbnail-*"]` keys. The two hand-typed
inline `StacAsset` literals in
`apps/vscode/src/services/sceneThumbnailService.ts` lines 63–71 are
deleted; both sites now reference `StacAsset` from `@debrief/schemas`.

**Why this priority**: `StacLink` and `StacAsset` are the structural
members of every `StacItem`, `StacCatalog`, and `StacCollection`. They
are not audit-flagged on their own (the R4 file-level rule masks them
in `apps/vscode/src/types/stac.ts`), but a P1-only migration would
leave the **member shapes** hand-written while the **container shapes**
are schema-rooted — an asymmetric outcome that defeats the point of
the cluster. Resolving them in the same pass closes the cluster
properly without adding new audit findings.

**Independent Test**: After P2, every hand-written `StacLink` /
`StacAsset` declaration outside `shared/schemas/` MUST be deleted.
Specifically: lines 146–161 of `apps/vscode/src/types/stac.ts` (the
two interface declarations) MUST be replaced by re-exports from
`@debrief/schemas`. The inline `StacItemAssets` interface at line 63
of `apps/vscode/src/services/sceneThumbnailService.ts` MUST be
replaced by `Record<string, StacAsset>` imported from `@debrief/schemas`.
A grep across `apps/`, `services/`, and `shared/components/` for
`interface StacLink` / `interface StacAsset` / `type StacLink` /
`type StacAsset` MUST return zero hits.

**Acceptance Scenarios**:

1. **Given** the LinkML source defines `StacLink` with fields
   `{ rel, href, type?, title? }` per STAC 1.1, **When** the schema
   build runs, **Then** every prior site (VS Code stac.ts,
   sceneThumbnailService, web-shell mock stacService) imports the
   generated type and the inline hand-declared copies are deleted.
2. **Given** the LinkML source defines `StacAsset` with fields
   `{ href, type?, title?, description?, roles? }` (STAC 1.1) plus an
   extensible-properties slot to permit the `file:checksum`,
   `file:size`, `file:local_path` keys used by Debrief, **When** a
   STAC Item from the local store is loaded, **Then** all asset entries
   round-trip without field loss.
3. **Given** a developer searches for `interface StacLink` or
   `interface StacAsset` across `apps/`, `services/`, and
   `shared/components/`, **When** P2 lands, **Then** zero matches are
   returned and the schemas package is the single source.

---

### User Story 3 - Schema-rooted STAC Collection family (Priority: P3)

A regeneration run upgrades a flat `StacCatalog` to a STAC 1.1
`Collection` by attaching a spatial-temporal extent and a debrief
extension summary block. The Python script
(`scripts/enrich-legacy-catalog.py`) writes the `collection.json` file;
the TypeScript reader in `stacService` deserialises it through the
`StacCatalogOrCollection` union, narrows it to `StacCollection`, and
the catalog overview panel renders the summaries panel with the
extension data (`debrief:platforms`, `debrief:tags`,
`debrief:feature_tags`). All four shapes — `StacCollection`,
`StacExtent`, `StacSummaries`, `StacCatalogOrCollection` — flow from
the same LinkML source.

**Why this priority**: STAC Collections are emitted by the
upgrade-to-1.1 path landing in spec #241 but are not the dominant case
today — most stores still ship flat `Catalog` files (per
`preview/workspace/samples/local-store/`'s current state, observed
2026-05-19). Resolving the family in the same pass keeps the LinkML
namespace coherent (Catalog and Collection share `id`, `type`,
`stac_version`, `links`, `description`) and avoids leaving a stale
hand-type that would block #241 from running clean.

**Independent Test**: After P3, the regenerated audit report MUST show
zero hand-written STAC shapes in `apps/vscode/src/types/stac.ts` other
than: (a) `StacStore` / `StoreStatus` / `Catalog` — UI-only
Debrief-specific projections that don't cross Python↔TS (out of scope
per OOS-001); (b) `StacItemSummary` — the existing camelCase adapter
over `@debrief/schemas#StacItemSummary` (out of scope per OOS-002).
The `stacTreeProvider` MUST continue to display the catalog tree for
every store in the test fixture without visual regression; the
catalog overview panel MUST render extent + summaries for any store
that has been promoted to a Collection.

**Acceptance Scenarios**:

1. **Given** the LinkML source defines `StacCollection` extending
   `StacCatalog` with `license`, `extent`, `summaries?` fields, **When**
   a store containing a `collection.json` is opened, **Then** the
   catalog overview panel displays the spatial bbox(es), the temporal
   interval(s), and the platform / tag summary blocks identical to
   pre-feature rendering.
2. **Given** the `StacCatalogOrCollection` discriminated union (by
   `type` field — `'Catalog'` vs `'Collection'`), **When** the
   `stacService` loads any store's root JSON, **Then** the narrow
   succeeds and downstream consumers receive the correct concrete
   shape with no `as unknown` casts.
3. **Given** a fresh checkout after this feature lands, **When** a
   contributor greps `interface StacCollection` / `interface StacExtent`
   / `interface StacSummaries` outside `shared/schemas/`, **Then** zero
   matches are returned.

---

### Edge Cases

- **STAC 1.1 vs 1.0 wire shape**: The local stores currently ship
  `"stac_version": "1.0.0"`. Spec #241 (in-flight) upgrades them to
  `"stac_version": "1.1.0"` with attendant field renames (notably the
  thumbnail/overview asset role conventions captured in
  `apps/vscode/src/types/stac.ts:104-121`). The LinkML schema MUST be
  authored against STAC 1.1 (the destination), and MUST validate both
  1.0 and 1.1 payloads — i.e. the `stac_version` field is a string,
  not an enum, and the renamed fields are additive (1.0 had no
  `assets.overview`; 1.1 adds it). This avoids a coupling between #223
  and #241's merge order.
- **`assets` is an open record**: STAC Items have arbitrarily-keyed
  asset slots (`assets.thumbnail`, `assets.overview`, `assets.payload`,
  and the debrief-specific `assets["scene-thumbnail-<id>"]` family
  written by `sceneThumbnailService`). LinkML's `inlined_as_dict`
  with an `Any` value range — or a closed `StacAsset` value with an
  extension-properties slot — MUST capture this. The plan phase will
  pick the pattern; the spec requires only that loading any committed
  item.json from the local stores succeeds without coercion (FR-011).
- **`properties` is an open record with the debrief extension**:
  `StacItem.properties` carries `datetime`, optional STAC core fields
  (`start_datetime`, `end_datetime`, `title`, `description`), and the
  `debrief:` extension properties already modelled in
  `shared/schemas/src/linkml/stac-extension.yaml`
  (`StacExtensionProperties`). The new `StacItem` MUST compose the
  existing `StacExtensionProperties` class rather than re-declaring
  the `debrief:platforms` / `debrief:tags` / `debrief:feature_tags`
  fields. This matches the #222 precedent of reusing already-modelled
  shapes (e.g. `ToolParameter`).
- **Existing camelCase adapter for `StacItemSummary`**:
  `apps/vscode/src/types/stac.ts:67` declares a camelCase
  `StacItemSummary` interface as an explicit deliberate adapter over
  the generated snake_case `@debrief/schemas#StacItemSummary` (see the
  inline `eslint-disable` comment and `#214 scope-adjacent` note). The
  adapter is **out of scope** for #223 — unifying it requires a
  coordinated rename across `stacService`, `stacTreeProvider`, and
  `catalogOverviewPanel`. The migration MUST NOT remove this adapter
  or touch its consumers; the audit's R4 file-level masking will
  continue to apply.
- **`sceneThumbnailService`'s minimal `StacItem`**: The inline
  `StacItem` at `apps/vscode/src/services/sceneThumbnailService.ts:73`
  is a structurally-narrower view (only `assets?: StacItemAssets`,
  plus an open-ended index signature). Replacing it with the full
  `StacItem` from `@debrief/schemas` is correct — the service only
  reads `assets`, and the rest of the fields being present is harmless.
  The plan phase MUST verify this doesn't introduce a runtime cost
  (the file is parsed as JSON regardless of TypeScript shape).
- **GeoJSON geometry composition**: `StacItem.geometry` is a GeoJSON
  geometry. The LinkML schema set already exports the seven geometry
  classes under `geojson.yaml`. `StacItem` MUST reference those via
  the same any_of pattern used by `RawGeoJSONFeature.geometry`
  (`shared/schemas/src/generated/typescript/types.ts:1799`) — not
  re-declare geometry shapes.
- **`StacCatalogOrCollection` discriminated union**: The destination
  TypeScript union narrows by `type === 'Collection'` vs
  `type === 'Catalog'`. LinkML expresses this via the `designates_type`
  pattern (or equivalent). The plan phase must pick a pattern that
  generates a TypeScript discriminated union usable with
  `if (x.type === 'Collection')` narrowing — not a soft any_of that
  requires runtime predicates.
- **Open-ended `properties` keys**: Beyond the modelled fields,
  `StacItem.properties` may carry arbitrary keys (per STAC spec). The
  schema MUST permit these via an extension-properties slot rather than
  refusing unknown keys — i.e. additive loading, not strict-rejection,
  matching the current hand-type's `[key: string]: unknown` semantics.
- **Cross-package version pinning**: `@debrief/utils`,
  `@debrief/components`, `@debrief/session-state`, `@debrief/stac-writer`
  (the existing writer abstraction), and the VS Code / web-shell apps
  all import from `@debrief/schemas`. A schema bump that changes a
  generated type must reach all consumers in the same release; pnpm
  workspace ranges already enforce this — verify no consumer pins an
  older version.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A LinkML source file (`shared/schemas/src/linkml/stac.yaml`
  or equivalent) MUST declare each of the data-bearing STAC envelope
  shapes: `StacItem`, `StacCatalog`, `StacCollection`, `StacLink`,
  `StacAsset`, `StacExtent`, `StacSummaries`, and the
  `StacCatalogOrCollection` discriminated union. The file MUST import
  and compose the existing `PlatformRecord` and
  `StacExtensionProperties` classes from `stac-extension.yaml` rather
  than redeclaring them.
- **FR-002**: The schema build MUST generate corresponding Pydantic
  classes (under `shared/schemas/src/generated/pydantic/` or the
  package's current Python output path) and TypeScript types (under
  `shared/schemas/src/generated/typescript/`) for every class in
  FR-001, exported from `@debrief/schemas` and `debrief_schemas`
  respectively. The `StacCatalogOrCollection` union MUST generate as a
  TypeScript discriminated union narrowable via the `type` field
  (no `as unknown` casts at the call site).
- **FR-003**: Every site listed in `docs/type-audit-2026.md` §3.1
  that is attributed to #223 MUST be migrated to import the
  corresponding generated class. The hand-typed declarations at those
  sites (5 audit-flagged + the 7 R4-masked siblings — `StacLink`,
  `StacAsset`, `StacExtent`, `StacSummaries`, `StacCollection`,
  `StacCatalogOrCollection`, and the inline `StacItemAssets`) MUST be
  **deleted**, not aliased. A re-run of the audit scanner MUST show
  zero §3.1 rows attributed to #223 and zero §3.2 rows for the
  `StacItem` / `StacCatalog` drift clusters.
- **FR-004**: The `apps/vscode/src/types/stac.ts` file MUST continue
  to exist as a barrel re-export module for `@debrief/schemas` STAC
  types **plus** the UI-only shapes that remain out of scope
  (`StoreStatus`, `StacStore`, `Catalog`, the helper functions
  `createStore` / `isValidStorePath` / `buildStacUri` / `parseStacUri`,
  and the camelCase `StacItemSummary` adapter — see OOS-001 and
  OOS-002). The file's audit row count MUST remain unchanged or
  reduce.
- **FR-005**: The `StacItem.properties` LinkML class MUST compose the
  existing `StacExtensionProperties` (from `stac-extension.yaml`) and
  the STAC-spec core fields (`datetime`, `start_datetime?`,
  `end_datetime?`, `title?`, `description?`). The class MUST permit
  arbitrary additional keys via an extension-properties slot so that
  no committed `item.json` is rejected.
- **FR-006**: Schema-adherence tests under `shared/schemas/tests/`
  MUST exist for every new class added under FR-001, covering:
  - **Round-trip**: Python instance → JSON → TS parse → JSON →
    Python instance produces a value equal to the original.
  - **Schema comparison**: The JSON Schema generated from LinkML MUST
    match the JSON Schema generated from the Pydantic class (modulo
    permitted whitespace / ordering differences already accepted by
    the existing schema-comparison helper).
  - **Negative**: At least one invalid fixture per class fails
    validation with a field-level error.
  - **Fixture corpus**: For `StacItem` and `StacCatalog`
    specifically, every committed `item.json` and `catalog.json`
    under `preview/workspace/samples/local-store/` and
    `apps/vscode/test-data/local-store/` MUST be loadable through
    both the generated Pydantic and TypeScript validators (no
    coercion, no field loss). This is the strongest evidence of the
    migration's correctness because those files are the ones in
    production.
- **FR-007**: The `StacItem` / `StacCatalog` drift clusters (audit
  §3.2) MUST be resolved by collapsing all 5 sites (3 `StacItem` + 2
  `StacCatalog`) onto a single generated class per name from
  `@debrief/schemas`. Both clusters MUST disappear from the audit's
  drift-candidate bucket.
- **FR-008**: The type-audit's classifier rules already exempt files
  importing from `@debrief/schemas` (R4 > R3). Every migrated site
  MUST end up matching R4. No new entries to the
  `CROSS_DOMAIN_NAME_PATTERNS` constant in
  `scripts/audits/type-audit/generate-report.ts` are required for this
  feature; if migration completeness depends on adding a new pattern,
  that is a sign the migration is incomplete.
- **FR-009**: The full project `task verify` pipeline (lint +
  typecheck + tests + Playwright E2E, per `CLAUDE.md` § Before
  Pushing) MUST pass on the feature branch before merge. No new
  `// @ts-expect-error`, no new `# type: ignore`, no new `as any`,
  no new `Any` casts added during the migration except where the
  cluster intentionally preserves an open-ended payload (i.e. STAC
  `assets[key]` extension properties and `properties[key]` extension
  properties — both modelled as extension-properties slots).
- **FR-010**: A changelog entry MUST be appended to
  `docs/type-audit-2026.md` §5 (Re-run log / changelog) recording the
  before/after counts for the cluster (5 → 0 in §3.1; 5 drift members
  → 0 in §3.2), the git SHA at which the audit was re-run, and a link
  to this spec.
- **FR-011**: Every committed STAC artefact under
  `preview/workspace/samples/local-store/` and
  `apps/vscode/test-data/local-store/` MUST continue to load without
  modification. If a fixture fails to load under the new generated
  types, the LinkML model MUST be widened to accept it — not the
  fixture rewritten. The migration is **additive over the union of
  currently-shipping on-disk shapes**.
- **FR-012**: The Python regeneration script
  `scripts/enrich-legacy-catalog.py` and the `services/stac/`
  package MUST emit JSON files that validate against the generated
  Pydantic models. If the script currently constructs catalogs from
  Python dicts, those constructions MUST be migrated to use the
  generated Pydantic classes for the data-bearing fields — closing
  the loop on Article XV.

### Non-Functional Requirements

- **NFR-001**: The schema build MUST remain a single command
  (`task schemas:build` or the equivalent currently in use) and its
  runtime MUST NOT increase by more than 20% over the pre-feature
  baseline.
- **NFR-002**: Generated TypeScript MUST continue to satisfy the
  project's strict-mode rules (no implicit any, no nullable mismatch,
  no unused imports) without consumers needing per-file overrides.
- **NFR-003**: Documentation under `shared/schemas/README.md` MUST
  list the STAC catalog cluster as a worked example alongside the
  existing GeoJSON / session-state / styling / MCP examples.
- **NFR-004**: The web-shell mock at
  `apps/web-shell/src/mocks/stacService.ts` MUST remain a faithful
  in-memory substitute for the VS Code STAC service. After the
  migration, its only deviation from the VS Code service MUST be the
  use of fetch/IndexedDB instead of node:fs — every type used to
  describe wire payloads MUST come from `@debrief/schemas`.

### Key Entities

- **StacItem** — A STAC 1.1 Item describing one plot. Carries `type:
  'Feature'`, `stac_version`, `id`, `geometry` (GeoJSON), `bbox`,
  `properties` (datetime + debrief extension), `links`, `assets`,
  and optional `collection`, `stac_extensions`. Persisted to
  `<store>/<catalog>/<plot-slug>/item.json`. Currently hand-typed at 3
  sites — the audit's flagged drift cluster.
- **StacCatalog** — A flat STAC Catalog (no extent, no summaries).
  Carries `type: 'Catalog'`, `stac_version`, `id`, `description`,
  optional `title`, and `links` (with `rel: 'item'` entries pointing
  at child items, plus `self` / `root` / `parent` housekeeping links).
  Persisted to `<store>/<catalog>/catalog.json`. Currently hand-typed
  at 2 sites — the audit's flagged drift cluster.
- **StacCollection** — A STAC 1.1 Collection extending `StacCatalog`
  with `license`, `extent` (spatial + temporal), optional `summaries`
  (debrief extension aggregates). Persisted to
  `<store>/<catalog>/collection.json`. Emitted by spec #241's upgrade
  path.
- **StacCatalogOrCollection** — A discriminated union over `type`
  used by readers that don't yet know whether a given store has been
  upgraded to a Collection. Narrowable via
  `if (x.type === 'Collection')`.
- **StacLink** — A single link entry within `links[]`. Carries `rel`,
  `href`, optional `type`, `title`. Used by Item, Catalog, Collection.
- **StacAsset** — A single asset entry within `assets[key]`. Carries
  `href`, optional `type`, `title`, `description`, `roles[]`. Used by
  Item (for the GeoJSON payload, thumbnails, overviews, scene
  thumbnails). Permits arbitrary extension keys (e.g. `file:checksum`,
  `file:size` landing in #241).
- **StacExtent** — Spatial + temporal extent on a Collection. Carries
  `spatial.bbox: [[w, s, e, n]]` and
  `temporal.interval: [[start, end]]` (ISO 8601 or null).
- **StacSummaries** — Pre-aggregated extension summaries on a
  Collection. Carries `debrief:platforms?`, `debrief:tags?`,
  `debrief:feature_tags?` — re-using `PlatformRecord` from
  `stac-extension.yaml`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A re-run of the type-audit scanner against the merged
  feature branch reports **zero** rows in §3.1
  (`cross-domain-hand-typed`) attributed to #223 — down from the 5
  rows captured at audit commit
  `01166d6e8ef72ed5cf25c339f0d9fa7dfc2b15b1`.
- **SC-002**: A re-run of the type-audit scanner reports **zero**
  rows for `StacItem` (was 3) and `StacCatalog` (was 2) in §3.2
  (`drift-candidate`) — both clusters fully resolved.
- **SC-003**: A grep across the in-scope tree (`apps/`, `shared/`,
  `services/`, excluding generated code and test fixtures) for
  `interface StacItem` / `interface StacCatalog` /
  `interface StacCollection` / `interface StacLink` /
  `interface StacAsset` / `interface StacExtent` /
  `interface StacSummaries` returns hits **only** in files under
  `shared/schemas/src/` (the LinkML / generated code), plus the
  documented re-export inside `apps/vscode/src/types/stac.ts`.
- **SC-004**: For every named class in FR-001, at least one
  round-trip schema-adherence test exists in `shared/schemas/tests/`
  and passes in CI. Additionally, the fixture-corpus test (FR-006)
  loads every committed `item.json` and `catalog.json` /
  `collection.json` under `preview/workspace/samples/local-store/`
  and `apps/vscode/test-data/local-store/` (currently ~80 items + a
  handful of catalogs) without coercion, demonstrating the migration
  is additive over the on-disk state of the world.
- **SC-005**: The full `task verify` pipeline passes on the feature
  branch with no new `// @ts-expect-error`, `# type: ignore`,
  `as any`, or `Any` casts attributable to this migration (existing
  ones grandfathered; the diff MUST NOT add any new ones except for
  the intentional extension-properties slots on
  `StacItem.properties[key]` and `StacAsset[key]`).
- **SC-006**: The end-to-end "open a plot from the STAC tree"
  Playwright path (web-shell flow:
  `apps/web-shell/playwright/tests/`) completes successfully against
  the same fixture catalogue as before the feature, demonstrating no
  consumer-visible regression in catalog-tree rendering or plot
  loading.
- **SC-007**: `docs/type-audit-2026.md` §5 contains a new changelog
  entry crediting this spec, the merge git-SHA, and the before/after
  row counts. The audit's "Newly opened backlog items" callout for
  #223 is annotated as resolved.

## Assumptions

- **A-001**: STAC 1.1 is the canonical wire-shape target — same
  target as spec #241 (the in-flight STAC best-practices upgrade).
  The LinkML schema authored here MUST accept STAC 1.0 payloads
  (current local store state) and STAC 1.1 payloads (post-#241 state)
  via additive optional fields, with `stac_version` modelled as a
  string. This avoids any ordering coupling with #241.
- **A-002**: The Debrief STAC extension namespace (`debrief:` properties)
  is already modelled in `shared/schemas/src/linkml/stac-extension.yaml`
  and is treated as authoritative for those fields. This feature does
  not extend that namespace — it only references it from
  `StacItem.properties` and `StacSummaries`.
- **A-003**: The `Catalog` interface at
  `apps/vscode/src/types/stac.ts:36` (a Debrief-specific UI summary
  carrying `id`, `title`, `description?`, `catalogPath`, `storeId`,
  `itemCount`) is **not** a STAC Catalog — it's a UI-only projection
  used by the tree provider. It MUST remain hand-typed in `stac.ts`
  (no LinkML promotion needed because it doesn't cross Python↔TS).
- **A-004**: The `StacStore` / `StoreStatus` types in `stac.ts`
  describe VS Code workspace state (registered store paths and their
  reachability). They are UI-only and not on the wire. Out of scope.
- **A-005**: The hand-typed camelCase `StacItemSummary` in `stac.ts`
  is an explicit adapter over `@debrief/schemas#StacItemSummary` and
  has its own annotated technical-debt comment (`#214 scope-adjacent`).
  Unifying it requires a coordinated rename across `stacService`,
  `stacTreeProvider`, and `catalogOverviewPanel` that is outside this
  feature's scope. The adapter remains untouched.
- **A-006**: There is no need to preserve backwards compatibility
  with previously-recorded STAC files that pre-date the audit. If
  fixture-loading widens the schema (per FR-011), the resulting
  generated types are still backwards-compatible with the live data
  on `main` today.
- **A-007**: The schema-build toolchain (`gen-pydantic`,
  `gen-typescript`, `gen-json-schema`) supports every LinkML
  construct this feature needs — specifically, open-ended record
  fields (for extension keys) and discriminated unions (for
  `StacCatalogOrCollection`). The #222 worked example demonstrated
  both patterns work; this feature reuses them.
- **A-008**: The `@debrief/schemas` package's public API surface is
  allowed to grow by ~8 additional named exports. No consumer is
  currently using `import *` from the package, so additive exports
  are non-breaking.
- **A-009**: The existing writer abstraction (`@debrief/stac-writer`,
  see CLAUDE.md "Recent Changes" / spec #236) defines its own
  `StacItem` type that the web-shell mock currently round-trips
  through JSON to project onto the local `StacItem` shape (see
  `apps/web-shell/src/mocks/stacService.ts:464-474`). After this
  feature, both `@debrief/stac-writer.StacItem` and the local
  `StacItem` MUST be the same generated class from `@debrief/schemas`
  — no projection cast needed.

## Dependencies

- **D-001**: Audit #206 (the type-declaration audit) is committed
  and its scanner is runnable from the feature branch — required to
  verify SC-001 / SC-002.
- **D-002**: The LinkML schema build toolchain is functional on
  `main` (it is — `shared/schemas/` already generates ~260
  schema-rooted shapes including the worked #222 MCP cluster
  example).
- **D-003**: The existing `StacExtensionProperties` and
  `PlatformRecord` classes in
  `shared/schemas/src/linkml/stac-extension.yaml` MUST be importable
  by the new `stac.yaml` source file. This is the same composition
  pattern #222 used for `ToolParameter`.
- **D-004**: No blocking dependency on sibling E11 items (#224
  session-state, #225 loader IPC, #226 drift, #227 rollup). This
  feature touches STAC-cluster files only; if a shared file appears
  in another sibling's diff, last-mover-wins and the rebase is
  handled in the plan phase.
- **D-005**: Spec #241 (STAC 1.1 best-practices upgrade) is
  in-flight and modifies the STAC 1.0 → 1.1 wire format. **No
  ordering dependency** in either direction: the LinkML schema
  authored here accepts both versions (A-001), and #241's wire
  changes (asset role renames, `file:checksum` additions) land as
  schema bumps in the same workspace.

## Out of Scope

- **OOS-001**: The Debrief-specific UI projection types in
  `apps/vscode/src/types/stac.ts` that don't cross Python↔TS:
  `StoreStatus`, `StacStore`, `Catalog` (the UI summary, not the STAC
  Catalog), and the helper functions (`createStore`,
  `isValidStorePath`, `buildStacUri`, `parseStacUri`). These are
  UI-only and remain hand-typed.
- **OOS-002**: The camelCase `StacItemSummary` adapter at
  `apps/vscode/src/types/stac.ts:67`. The audit already exempts it
  (`#214 scope-adjacent` annotation), and unifying it requires a
  coordinated rename across `stacService`, `stacTreeProvider`, and
  `catalogOverviewPanel`. A separate backlog item should track that
  follow-up.
- **OOS-003**: Session-state wire shapes (#224 — `StateSnapshot`,
  `FeatureProvenance`, `ModifiedFeature`, etc.).
- **OOS-004**: Loader↔main IPC envelopes (#225).
- **OOS-005**: Drift clusters other than `StacItem` and `StacCatalog`
  (#226 — `DebriefConfig`, `ExtensionMessage`, etc.).
- **OOS-006**: Storybook / React-component Props rollups (#227).
- **OOS-007**: Any change to the STAC file layout on disk (directory
  conventions, file naming, store organisation). Spec #241 owns
  format-evolution; this feature is type-promotion only.
- **OOS-008**: Performance optimisation of STAC file loading. The
  migration MUST NOT regress runtime performance, but no new
  optimisation work is undertaken.
- **OOS-009**: Adding new STAC fields beyond what is required to
  capture the union of currently-shipping payloads. Field additions
  driven by #241 (e.g. `file:checksum`, `file:size`) land under #241,
  not here — though the LinkML schema's extension-properties slots
  MUST accept them without modification.
- **OOS-010**: STAC API (the HTTP-served version of STAC). Debrief
  uses STAC purely as an on-disk catalog format; the API spec is not
  in scope.
