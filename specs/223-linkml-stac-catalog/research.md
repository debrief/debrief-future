# Phase 0 — Research: STAC catalog hand-types → LinkML

**Feature**: 223-linkml-stac-catalog
**Date**: 2026-05-19

Resolves the open design questions called out in spec.md §Edge Cases
and plan.md §Technical Context. Each entry follows the
**Decision / Rationale / Alternatives** format.

---

## R-001 — How to express the `StacCatalogOrCollection` discriminated union

**Context**: The destination TypeScript shape narrows by
`type === 'Catalog'` vs `type === 'Collection'`. LinkML can express
this several ways; the choice affects whether downstream code can use
`if (x.type === 'Collection')` for type narrowing or has to fall back
to runtime predicates.

**Decision**: Model `StacCatalog` and `StacCollection` as **sibling
classes** (not an inheritance relationship), each declaring its
`type` slot as `range: StacTypeEnum` with `equals_string: Catalog` /
`equals_string: Collection` respectively (LinkML's discriminator
mechanism). The union itself is expressed as a TS-only type alias
`StacCatalogOrCollection = StacCatalog | StacCollection` in
`shared/schemas/src/typescript/aliases/stac-unions.ts` — same
re-export pattern #222 used for `ToolExecutor`/`ToolVersionResolver`.
The Python equivalent (`StacCatalogOrCollection = StacCatalog |
StacCollection`) lives in `debrief_schemas/aliases/stac_unions.py`.

**Rationale**:

1. `equals_string` on the `type` slot produces a TypeScript
   `type: "Catalog"` / `type: "Collection"` literal in the generated
   type, which is exactly what makes the discriminated-union narrow
   work at the call site (`stacService.ts` and
   `mocks/stacService.ts`).
2. LinkML inheritance (`is_a: StacCatalog` on `StacCollection`) was
   considered but produces a flattened `allOf` in JSON Schema that
   the TypeScript generator emits as an intersection, NOT a
   discriminated union — the narrow on `type` would still work but
   the structural relationship is "Collection extends Catalog with
   extra fields," which is misleading because a Collection's `type`
   is `"Collection"`, not `"Catalog"`. Sibling classes capture the
   semantic accurately.
3. The TS-only re-export alias for the union mirrors the established
   #222 precedent for shapes that LinkML cannot express directly. The
   audit's R4 file-level rule reclassifies the alias file as
   `schema-rooted`.

**Alternatives considered**:

- **`is_a: StacCatalog` inheritance** — produces JSON Schema `allOf`,
  TS intersection; doesn't capture the discriminator semantics.
- **`any_of` slot at union site** — produces a generated TypeScript
  union but without a discriminator field LinkML-side, requires
  per-call runtime narrowing helpers; worse DX.
- **Closed `union` LinkML feature (experimental)** — not supported by
  `gen-typescript` at the version pinned in
  `shared/schemas/pyproject.toml`.

---

## R-002 — How to express open-record `assets[key]` and `properties[key]`

**Context**: STAC `assets` is `Record<string, StacAsset>` — arbitrary
keys ('thumbnail', 'overview', 'features', 'source-boat1',
'scene-thumbnail-<id>', etc.). Within each asset value, additional
extension keys may appear at the top level (`file:checksum`,
`file:size`, `processing:datetime`, `proj:shape`,
`debrief:provenance`). Similarly `StacItem.properties` carries a fixed
core set (`datetime`, `start_datetime`, `end_datetime`, `title`,
`description`, `license`, `providers`, `created`, `updated`) plus an
unbounded `<extension>:<key>` set.

**Decision**:

**For the outer `assets` map**: `StacItem.assets` is an
`inlined_as_dict` multi-valued slot whose value class is `StacAsset`,
keyed by an opaque string. LinkML / `gen-typescript` produces
`assets: { [key: string]: StacAsset }` which is structurally identical
to the hand-type and to the on-disk JSON.

**For the `StacAsset` extension keys**: `StacAsset` declares its core
fields (`href`, `type?`, `title?`, `description?`, `roles?`) as named
slots and includes an `additional_properties: true` directive (LinkML
1.7's `additional_properties_keyword` slot-level setting). The
generated Pydantic class uses
`model_config = ConfigDict(extra='allow')`; the generated TypeScript
emits `[key: string]: unknown` after the named keys.

**For the `StacItem.properties` extension keys**: The
`StacItemProperties` class composes the existing
`StacExtensionProperties` (from `stac-extension.yaml`) via `is_a:` or
`mixins:` (Research R-003 picks the construct), declares the
STAC-spec core fields, and likewise carries
`additional_properties: true` so unknown `<ns>:<key>` keys are
accepted at the schema boundary. Consumers narrow via existing
per-extension Zod / type-guard helpers (the pattern already used for
`debrief:platforms`).

**Rationale**:

1. The live fixtures (73 items under `preview/workspace/samples/`)
   carry asset extension keys (`debrief:provenance`,
   `processing:software`, `processing:datetime`, `file:size`,
   `file:checksum`, `proj:shape`) and property extension keys
   (`debrief:platforms`, `debrief:tags`, `debrief:feature_tags`,
   `providers`, `created`, `updated`, `license`). FR-011 forbids
   rewriting fixtures.
2. STAC's own spec is open at exactly these two points. Modelling
   the closure would lock the schema to a snapshot of today's
   extensions and break the moment #241 (in-flight) adds
   `file:local_path` or #258 adds a new asset role.
3. `additional_properties: true` is the well-established LinkML
   construct for this; #222 used the equivalent
   `range: Any`-on-named-slot pattern for the same problem at a
   single named slot (`structuredContent`). Here the problem is
   structurally an open map, so the proper construct is
   `additional_properties`, not a named `Any` slot.
4. Article XV.2 explicitly permits this pattern when "external
   libraries return untyped data" — STAC's extension mechanism is
   precisely that. The consumer narrows at the boundary
   (per-extension Zod schema) as Article XV.2 requires.

**Alternatives considered**:

- **`range: Any` on a single `properties` slot** — collapses the
  core fields into an untyped blob; loses the typing for
  `datetime`, `start_datetime`, etc., which IS knowable.
- **Closed schema with explicit enumeration of every observed
  extension key** — moving target, breaks on #241/#258 evolution,
  rejects future-valid STAC.
- **Per-extension nested class** (e.g. `FileExtensionProperties`)
  — implementable but doesn't capture the open-ness of STAC's
  extension model; locks the schema to today's extensions.

---

## R-003 — How to compose `StacExtensionProperties` into `StacItem.properties`

**Context**: The existing `StacExtensionProperties` in
`stac-extension.yaml` declares `platforms`, `tags`, `feature_tags`,
`overrides`, `provenance_log`. These belong on `StacItem.properties`
alongside STAC core fields (`datetime`, etc.). LinkML offers `is_a`
(single inheritance) and `mixins` (multiple inheritance) — which one?

**Decision**: Use **`mixins: [StacExtensionProperties]`** on
`StacItemProperties`. The new `StacItemProperties` class declares the
STAC-spec core fields (`datetime`, `start_datetime?`, `end_datetime?`,
`title?`, `description?`, `license?`, `providers?`, `created?`,
`updated?`) and mixes in `StacExtensionProperties` for the
`debrief:platforms` / `debrief:tags` / `debrief:feature_tags` /
`overrides` / `provenance_log` slots.

**Rationale**:

1. `is_a` would imply `StacItemProperties` IS-A `StacExtensionProperties`,
   which is wrong semantically — STAC properties aren't an extension,
   they're the host of extensions. `mixins:` correctly says "compose
   these slots in" without an inheritance relationship.
2. The TypeScript generator produces a flat interface with all
   slots either way; the choice is documentation hygiene.
3. The existing `StacExtensionProperties` class already uses
   `slot_uri: debrief:platforms` etc., which LinkML preserves
   correctly through `mixins:` — i.e. the generated JSON Schema for
   the property class will have both `datetime` AND `debrief:platforms`
   slots side-by-side, matching the on-disk shape.

**Alternatives considered**:

- **`is_a: StacExtensionProperties`** — semantically wrong (see
  above).
- **Inline duplication** — violates spec FR-005 ("MUST compose the
  existing `StacExtensionProperties` ... rather than re-declaring").
- **Reference `StacExtensionProperties` as a nested class under a
  `debrief` slot** — would change the on-disk shape (extension fields
  are flat on `properties`, not nested), breaking FR-011.

---

## R-004 — How to model `bbox` (4-element vs 6-element array)

**Context**: STAC `bbox` is `[west, south, east, north]` (4 elements,
2D) or `[west, south, min_alt, east, north, max_alt]` (6 elements,
3D). Live fixtures use 4 elements; the STAC 1.1 spec permits 6.

**Decision**: Model `bbox` as `range: float, multivalued: true,
minimum_cardinality: 4, maximum_cardinality: 6` with no further
constraint. The generated TypeScript is `bbox: number[]` (LinkML's
`gen-typescript` does not currently emit `[number, number, number,
number] | [number, number, number, number, number, number]` tuples),
which is structurally compatible with the hand-type's
`[number, number, number, number]` because the runtime values are
always arrays — call sites that index into `bbox[0]..bbox[3]` continue
to type-check.

**Rationale**:

1. Tuples in LinkML-generated TypeScript would require post-processing
   the generator output, which is out-of-scope (we don't extend
   `gen-typescript` in this feature).
2. The current hand-type's tuple shape was over-tight — the live
   fixtures comply but STAC permits more. The migration is allowed
   to widen the type in the array dimension (4–6 elements) because
   it's still narrower than `number[]` would be without bounds.
3. The fixture-corpus test (FR-006) covers all 73 items; if any one
   has a 6-element bbox today (unlikely — current fixtures use 4),
   the schema accepts it.

**Alternatives considered**:

- **Strict 4-element tuple** — narrower than STAC 1.1 allows;
  rejects valid future data.
- **Two separate classes `Bbox2D` / `Bbox3D` with a union** —
  over-engineered; LinkML doesn't represent length-discriminated
  unions ergonomically.
- **Patch `gen-typescript` to emit tuples** — outside this feature's
  scope.

---

## R-005 — `stac_extensions` field (URI array)

**Context**: Live STAC 1.1 items carry a top-level
`stac_extensions: string[]` field listing the extension schema URLs in
use. The hand-types do not currently include this field — they were
authored against STAC 1.0 before the field was standard.

**Decision**: Model `stac_extensions` as an optional multi-valued
string slot on `StacItem`, `StacCatalog`, and `StacCollection`. The
generated type permits the field to be absent (matches STAC 1.0
fixtures) or a string array (matches STAC 1.1 fixtures), exactly per
spec A-001's "additive optional fields" pattern.

**Rationale**:

1. STAC 1.0 fixtures (`apps/vscode/test-data/local-store/catalog.json`)
   have no `stac_extensions`; STAC 1.1 fixtures
   (`preview/workspace/samples/local-store/`) all do. Making it
   optional accepts both.
2. The migration MUST capture the on-disk superset (FR-011) — that
   means adding the field even though no current TypeScript consumer
   reads it. Future consumers (e.g. spec #241's #205 STAC extension
   activation check) can rely on it being present in the type.

**Alternatives considered**:

- **Omit the field entirely** — fails FR-011: fixtures carrying it
  would either round-trip-lose the field (if Pydantic ignores
  unknowns) or fail validation (if Pydantic rejects unknowns). The
  generator default is `extra='forbid'` (see
  `shared/schemas/scripts/generate.py:60` — `--extra-fields forbid`),
  so omitting it would actively reject every STAC 1.1 item.
- **Make it required** — breaks STAC 1.0 fixtures.

---

## R-006 — `providers` and `item_assets` on Collection

**Context**: The live STAC 1.1 Collection at
`preview/workspace/samples/local-store/catalog.json` carries top-level
`providers`, `item_assets`, and `stac_extensions` fields not present
in the hand-typed `StacCollection`. The collection also has fields
like `created`, `updated`, `license`.

**Decision**: Add `providers?`, `item_assets?` (an open dict matching
`assets`), and `license` (required per STAC 1.1) to `StacCollection`.
For `providers`, model a `StacProvider` class (`name` required;
`description?`, `roles?`, `url?` optional) — small enough that
explicit modelling beats a wildcard. `item_assets` mirrors the
`assets` open-record pattern from R-002.

**Rationale**:

1. The live fixture carries all four. FR-011 mandates the schema
   accepts it.
2. `providers` has a stable STAC-spec shape worth capturing (so
   consumers can read `provider.name` with type-safety).
3. `item_assets` is structurally identical to per-item `assets`; the
   open-record approach scales to it.

**Alternatives considered**:

- **Omit `providers` and `item_assets`** — fails FR-011 (live
  fixture has them).
- **Model `providers` as a wildcard** — loses unnecessary typing on
  a STAC-spec-defined shape.

---

## R-007 — STAC tree Playwright regression test

**Context**: Spec SC-006 demands no consumer-visible regression in
catalog-tree rendering or plot loading. The web-shell has an existing
plot-loading Playwright suite; the specific spec file isn't yet
confirmed.

**Decision**: During /speckit.tasks, locate the specific Playwright
test under `apps/web-shell/playwright/tests/` that exercises the STAC
tree → plot load path. Candidates from the directory listing:
`catalog.spec.ts`, `plot-load.spec.ts`, `stac-browser.spec.ts`
(existence to be confirmed). Reuse the test, do not author a new
one.

**Outcome contingencies**:

- If an existing E2E exists and exercises the path: record path in
  `quickstart.md` Step 6 and as task T-VERIFY-001 in tasks.md.
- If no E2E exists for this exact flow: SC-006 relaxes to "Storybook
  + vitest snapshot suite for `StacFileTree` + `StacBrowser` + the
  catalog-overview-panel renders byte-identical screenshots" — this
  IS already in CI and is sufficient evidence for a non-UI-changing
  migration. Update spec via `/speckit.apply-feedback` rather than
  blocking on a new E2E.

---

## R-008 — Migration ordering and rollback granularity

**Decision**: One PR, three commits in P1 → P2 → P3 order. Each
commit:

1. Adds the LinkML classes for its slice (`StacItem` + `StacCatalog`
   in P1; `StacLink` + `StacAsset` in P2; `StacCollection` +
   `StacExtent` + `StacSummaries` + `StacProvider` +
   `StacCatalogOrCollection` alias in P3).
2. Re-runs the schema build.
3. Migrates the consumer sites associated with that slice (lists
   in `data-model.md` per-class consumer rows).
4. Adds round-trip + fixture-corpus tests for the slice's classes.
5. Passes `task verify` standalone.

The final commit appends the changelog entry to
`docs/type-audit-2026.md` §5 (FR-010) and updates
`shared/schemas/README.md` (NFR-003).

**Rationale**: Bisect-friendliness; reviewer cognitive load
proportional to slice size; type-audit row count drops monotonically
across the three commits; if P3 fails review, P1+P2 can ship
independently because the audit's `cross-domain-hand-typed` cluster
attributed to #223 is already at zero (P1 alone resolves it; P2/P3
clean up the R4-masked tail).

**Alternatives considered**:

- **Three separate PRs** — sibling-PR rebase pain for the audit
  re-run; the audit must run only at PR-merge time.
- **One commit** — loses bisect granularity; hard to review.
- **Per-class commits** — too granular; each class doesn't compile
  in isolation (FR-002's downstream sites need all classes present
  before they can be migrated cleanly).

---

## R-009 — Python regeneration script alignment (FR-012)

**Context**: `scripts/enrich-legacy-catalog.py` currently constructs
catalogs and items from Python dicts (verified via `grep -l StacItem
scripts/`). FR-012 mandates the migration extends to this writer so
both Python and TypeScript root on the same schema.

**Decision**: During implementation, audit
`scripts/enrich-legacy-catalog.py` and the `services/stac/` package
for raw `dict[str, Any]` constructions that build STAC payloads.
Replace each with construction of the generated
`debrief_schemas.StacItem` / `StacCatalog` / `StacCollection`
Pydantic models; serialise with `model.model_dump(mode='json',
by_alias=True, exclude_none=True)` (matching the existing
`debrief:platforms` write path). The fixture-corpus test catches any
construction that doesn't validate.

**Rationale**:

1. Closes the loop on Article II.1: single source of truth for
   wire shapes, both sides validate.
2. Surfaces any field-name typos at write time (Pydantic refuses to
   accept unknown fields when `extra='forbid'` is set on the
   model_config — which is the default in this repo).
3. Makes a future regeneration run (e.g. driven by spec #184 /
   #228 / #231) automatically schema-compliant.

**Alternatives considered**:

- **Leave Python writes as raw dicts; validate post-hoc** —
  validation catches the error too late, after the file is on disk.
  Better to refuse construction.
- **Defer to a sibling backlog item** — would leave the Python
  writer hand-rolled while TypeScript reads schema-rooted, exactly
  the cross-language drift this work is designed to prevent.

---

## R-010 — Audit scanner re-run command and gating

**Context**: SC-001/002 require a re-run of the audit scanner to
report the count. The scanner is at
`scripts/audits/type-audit/scan.ts` and the generator at
`scripts/audits/type-audit/generate-report.ts`. The #222 quickstart
documents the exact invocation.

**Decision**: Use the identical invocation from
`specs/222-linkml-mcp-envelopes/quickstart.md` Step 3 — reproduced
verbatim in this feature's `quickstart.md` Step 3. The PASS criterion
becomes:

```sh
# Zero §3.1 rows attributed to #223:
grep -c "Open #223" tmp/type-audit-report.md
# expected: 0

# Zero StacItem / StacCatalog rows in §3.2:
grep -cE 'drift cluster "(StacItem|StacCatalog)"' tmp/type-audit-report.md
# expected: 0
```

**Rationale**: Reusing the #222 recipe ensures consistency across E11
sibling features; reviewers don't have to learn a new audit-run
convention.

---

## Open follow-ups (not blocking this plan)

- **#214 follow-up — camelCase `StacItemSummary` adapter**: The
  hand-typed adapter at `apps/vscode/src/types/stac.ts:67` is
  out-of-scope per OOS-002. A separate backlog item should track
  unifying it with `@debrief/schemas#StacItemSummary` (snake_case),
  including the coordinated rename across `stacService`,
  `stacTreeProvider`, and `catalogOverviewPanel`. This is plumbing,
  not schema work, and shouldn't block this feature.
- **#241 alignment — STAC 1.1 asset-role renames**: Spec #241 is
  in-flight and may rename asset roles (`thumbnail` for 200×150 vs
  `overview` for 800×600). Since both renames are additive and the
  `StacAsset.roles` slot is open (string array), the migration here
  doesn't need to wait. When #241 lands, the role-rename diff is
  just a search-and-replace in the regeneration script — no schema
  change.
- **#258 alignment — scene-thumbnail asset keys**: Scene-thumbnail
  assets (`scene-thumbnail-<id>`) are written under the open
  `assets` map by `sceneThumbnailService`; the open-record pattern
  in R-002 accommodates them without further work.
- **Future E11 phase — per-extension typed narrowing**: At some
  point the project will likely want a `StacAssetExtensions` union
  type that captures the observed extension namespaces
  (`file:`, `processing:`, `proj:`, `debrief:`). That's a separate
  item; the current schema's open-record pattern is the right
  starting point because it doesn't preclude the future narrowing.
