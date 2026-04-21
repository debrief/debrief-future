# Phase 0 Research: Schema-Rooted Raw GeoJSON Feature Type

**Feature**: 204-rawgeojsonfeature-linkml
**Date**: 2026-04-20
**Input**: [plan.md](./plan.md) — resolve mechanism questions before Phase 1 design artefacts.

## Scope of research

The spec and plan frame four concrete unknowns that must be resolved before
committing to the LinkML class definitions:

1. How do we express `id: string | integer` in LinkML so that both
   `gen-pydantic` and `gen-typescript` produce correct unions?
2. How do we express a permissive `properties: Record<string, unknown> | null`
   in LinkML **without** introducing `any`/`Any` (Article XV)?
3. What is the full inventory of consumer files that must be migrated, and
   does any consumer rely on a runtime field that the new class would not
   emit?
4. What migration sequencing + generator post-processing (if any) is needed
   so the atomic PR stays green?

A fifth topic — the existing `SafeFeature`/`SafeGeometry` types — was
explicitly ruled out by the idea doc and is tracked under backlog #212. No
research is performed for those here.

## 1. LinkML union mechanism for `id: string | integer`

### Decision
Use LinkML `any_of:` with two `range:` entries — one `string` and one
`integer` — marked `required: false`. The GeoJSON spec (RFC 7946 §3.2) allows
either type, and fixtures in the existing monorepo exercise both
(`shared/components/src/ExerciseListView/__fixtures__/mockData.ts` uses string
ids; legacy REP imports use numeric). Matching the spec is cheap and avoids a
silent coercion at the parse boundary.

### Rationale
- **LinkML supports it today** — `geojson.yaml:519` and `geojson.yaml:604`
  already use `any_of` on the `geometry` slot for Track/ReferenceLocation, so
  the generator pipeline is known to handle it.
- **Pydantic output is native** — `gen-pydantic` renders `any_of: [string,
  integer]` as `Union[str, int]`, which is exactly what we want in the parse
  model.
- **TypeScript output needs a post-processing pass** — `gen-typescript`
  falls back to `string` for `any_of` slots (see `generate.py:382-391`). We
  will add a targeted string-replacement entry alongside the existing ones
  for Track/ReferenceLocation geometry so the rendered field becomes
  `id?: string | number`.
- **JSON Schema output needs the existing `_strip_type_from_anyof`
  post-processor** — already present at `generate.py:245`. No change needed
  to the post-processor itself; we simply ensure the new `id` slot goes
  through it.

### Alternatives considered
- **`range: string` + coerce at boundary.** Rejected: coercing integer ids
  to strings silently is exactly the drift the spec is trying to eliminate
  (FR-002, FR-007) and would force every integer-id consumer to change
  semantics.
- **Enum-valued discriminator.** Not applicable — `id` is a free-form
  identifier, not a discriminated value.
- **Two separate classes `StringIdFeature` / `IntegerIdFeature`.** Rejected:
  inflates the schema surface and forces consumers to branch on the id type,
  which they currently do not.

## 2. LinkML mechanism for permissive `properties`

### Decision
Declare the `properties` slot with `range: Any` where LinkML's `Any` is the
**schema-level** wildcard type (`linkml:Any`, materialised as an empty
class in LinkML core), **required: false**, **inlined: true**. Author a
dedicated permissive class `RawGeoJSONProperties` whose body is an
*empty* `attributes:` map and whose `class_uri` is `linkml:Any` — this is
the idiom used by LinkML itself for free-form dictionaries and is what the
LinkML schema-definition metamodel uses for the `slot_definition.minimum_value`
/ `maximum_value` slots. Generated outputs:

- **Pydantic**: `properties: Optional[Dict[str, Any]] = None` — Pydantic v2
  emits `Dict[str, Any]` for `linkml:Any` ranges.
- **TypeScript**: `properties?: { [key: string]: unknown } | null` after
  post-processing. `gen-typescript` defaults to `properties?: RawGeoJSONProperties`
  where `RawGeoJSONProperties` is declared as `export interface
  RawGeoJSONProperties {}` — we then add a post-processor rule to rewrite it
  to `Record<string, unknown>` (or to emit an index signature via the
  existing string-replace hook in `generate.py`).
- **JSON Schema**: `"properties": {"type": "object", "additionalProperties":
  true}` — which matches RFC 7946 §3.2.

### Rationale — why this does NOT violate Article XV
Article XV forbids `any`/`Any` **in authored production code**. The Pydantic
output `Dict[str, Any]` is generated code representing the boundary of a
well-specified external format (GeoJSON), and it maps to TypeScript
`Record<string, unknown>` — not `any`. Pre-existing wildcard types in the
repo (e.g. `SafeFeature.properties: Record<string, unknown>`) already use
this pattern. The generator post-processor makes the TypeScript output
`unknown`-based, which is Article-XV-compliant.

### Alternatives considered
- **`range: string` with a `pattern` for JSON text.** Rejected: defeats
  structured access — every consumer would have to `JSON.parse` on read.
- **A closed `BaseFeatureProperties` class**, following the pattern used by
  `TrackProperties`/`ReferenceLocationProperties`. Rejected: the whole point
  of `RawGeoJSONFeature` is that the authored schema does not *know* what is
  inside `properties` at the parse boundary — the caller narrows it later by
  validating into a domain class (`TrackFeature`, `ReferenceLocation`, etc.).
- **Omit the `properties` slot.** Rejected — RFC 7946 §3.2 requires the
  member to be present (though it may be `null`), and several consumer sites
  depend on reading `properties.dataType`, `properties.stac`, etc., before
  narrowing.

## 3. Full consumer inventory

Discovered via `rg --type ts` and `rg --type py` for `GeoJSONFeature` and
`GeoJSONFeatureCollection`. The list below is authoritative for the tasks.md
migration checklist.

### TypeScript consumers (22 files)

| # | File | Type of edit |
|---|------|--------------|
| 1 | `shared/utils/src/types.ts` | **Delete** both interfaces (authored) |
| 2 | `shared/utils/src/index.ts` | **Remove** re-exports of both names |
| 3 | `shared/utils/src/bounds.ts` | Update import to `@debrief/schemas` |
| 4 | `shared/utils/tests/bounds.test.ts` | Update import to `@debrief/schemas` |
| 5 | `services/session-state/src/types/results.ts` | **Delete** duplicate interface; re-export `RawGeoJSONFeature` |
| 6 | `services/session-state/src/store/slices/results.ts` | Update import source |
| 7 | `shared/components/src/ExerciseListView/types.ts` | Update import source |
| 8 | `shared/components/src/ExerciseListView/utils.ts` | Update import source |
| 9 | `shared/components/src/ExerciseListView/utils.test.ts` | Update import source |
| 10 | `shared/components/src/ExerciseListView/SpatialThumbnail.test.tsx` | Update import source |
| 11 | `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx` | Update import source |
| 12 | `shared/components/src/ExerciseListView/__fixtures__/mockData.ts` | Update import source |
| 13 | `apps/vscode/src/types/import.ts` | **Delete** `SafeFeature as GeoJSONFeature` alias; replace with direct `RawGeoJSONFeature` import |
| 14 | `apps/vscode/src/commands/importRep.ts` | Update import source |
| 15 | `apps/vscode/src/services/ioService.ts` | Update import source |
| 16 | `apps/vscode/src/webview/mapPanel.ts` | Update import source |
| 17 | `apps/loader/src/renderer/types/results.ts` | Update re-export chain |
| 18 | `apps/loader/src/main/ipc/stac.ts` | Update import source |
| 19 | `apps/loader/src/main/ipc/io.ts` | Update import source |
| 20 | `apps/web-shell/src/tools/region/analysis/areaSummary.ts` | Update import source |
| 21 | `apps/web-shell/src/tools/shape/manipulation/moveShape.ts` | Update import source |
| 22 | `apps/web-shell/src/tools/track/analysis/rangeBearing.ts` | Update import source |
| — | `apps/web-shell/src/tools/track/analysis/trackStats.ts` | Update import source |
| — | `shared/schemas/src/generated/typescript/types.ts` | **Regenerated** — no manual edit |

### Python consumers (3 files requiring edits + 24 incidental matches)

Most Python matches in `services/calc/` reference `GeoJSONFeature` in
comments/docstrings only (no imports). The only files that must change are:

| # | File | Type of edit |
|---|------|--------------|
| 1 | `services/stac/src/debrief_stac/types.py` | **Delete** `GeoJSONFeature: TypeAlias = dict[str, Any]` + `GeoJSONFeatureCollection: TypeAlias = dict[str, Any]` — violates Article XV; import from `debrief_schemas` instead |
| 2 | `services/stac/src/debrief_stac/features.py` | Update import source |
| 3 | `services/stac/tests/fixtures.py` | Update import source |

All remaining Python matches (`services/calc/**`, `shared/schemas/src/generated/python/…`)
are either comments, docstrings referencing spec IDs, or the generated
output itself — they are handled by regeneration.

### Runtime-field audit
No consumer reads a field that `RawGeoJSONFeature` would not emit. The
existing hand-typed interfaces only expose `type`, `id`, `geometry`, and
`properties`; the new LinkML class covers all four with equal-or-wider
semantics. Downstream narrowing (e.g. `feature.properties.kind === 'TRACK'`)
will continue to work through normal TypeScript discriminated-union
narrowing on the `properties` type.

## 4. Migration sequencing

### Decision
Single atomic PR with commits in this order (each commit individually passes
`task verify`):

1. **Schema source + generator output** — add
   `shared/schemas/src/linkml/raw-geojson.yaml`, import it in `debrief.yaml`,
   remove `GeoJSONFeature`/`GeoJSONGeometry` from `session-state.yaml`,
   regenerate. Post-processor entries for the new `id` and `properties`
   slots added to `generate.py`.
2. **Schema tests + fixtures** — add `shared/schemas/fixtures/raw-geojson/`
   and extend `test_golden.py`, `test_roundtrip.py`, `test_schema_compare.py`
   to include the new class. These must go green before we touch consumers.
3. **`shared/utils` + `services/session-state` duplicate removal** — delete
   the two authored interfaces, update the re-export graph.
4. **`services/stac` Any-alias removal** — the Article XV clean-up.
5. **Consumer import migration** — the 20 remaining TS files + 2 Python
   files update their import source. No behavioural change.
6. **ADR entry** — append to `docs/project_notes/decisions.md` with rationale
   + link to this spec.

### Rationale
- Fixtures + tests land **before** consumer migration so the green CI
  signal after steps (3)-(5) confirms the regen is stable.
- `stac/types.py` Article XV violation is addressed in its own commit so the
  history shows the intent explicitly.
- The atomic PR requirement (SC-009) does **not** require a single commit;
  it requires a single reviewable PR. Multiple small commits help the
  reviewer.

### Alternatives considered
- **Phase migration across multiple PRs.** Rejected: leaves the codebase in
  an intermediate state where two `GeoJSONFeature` types co-exist, which is
  exactly the problem the spec targets.
- **Rename via codemod before schema regen.** Rejected: requires running
  consumer migration against types that don't exist yet, forcing a scratch
  branch that cannot pass typecheck.

## 5. Generator post-processing decisions

### Decision
Add **two** new string-replacement entries to `generate.py` — one for the
`id: string | number` union, one for `properties: Record<string, unknown>`.
No changes to JSON-Schema post-processing (the existing `_strip_type_from_anyof`
handles the `id` union already).

### Rationale
- `gen-typescript` lacks support for `any_of` unions (documented in
  `generate.py:379-392`). The existing pattern is exactly a find-and-replace
  keyed on the generated docstring. Following that pattern keeps the
  post-processor uniform.
- We deliberately do **not** introduce a general "union post-processor"
  (e.g. AST-based) for this feature — that refactor would exceed scope and
  is tracked separately. Three string-replacement entries remain readable.

### Alternatives considered
- **Fork `gen-typescript` to support `any_of`.** Out of scope — would gate
  this feature on upstream LinkML changes.
- **Emit a custom TS emitter from the LinkML schema.** Out of scope — would
  invalidate the entire "LinkML is the master" decision in ADR-II.

## 6. Locked review decisions (from `/speckit.review`, 2026-04-21)

The `/speckit.review` pass (Phases 5A–5D + Summary) surfaced six architectural
refinements that override the earlier design assumptions. They are locked
here so that `data-model.md`, `contracts/linkml-classes.md`, and
`tasks.md` stay coherent.

### 6.1 Review decision 5-alt — null-geometry conversion at ingress

**Decision**: Null-geometry payloads do **not** make `RawGeoJSONFeature.geometry`
nullable. Instead, the two ingress sites (`services/io/src/debrief_io/parser.py`
for REP import and `services/stac/src/debrief_stac/features.py` for STAC
catalog load) convert `geometry: null` or `geometry: undefined` to
`{"type": "Point", "coordinates": []}` — i.e., a `GeoJSONEmptyPoint`.

**Rationale**: `GeoJSONEmptyPoint` already exists (`geojson.yaml:43`) for
non-spatial `SystemState` features; reusing it means:
- Zero new LinkML surface area
- `RawGeoJSONFeature.geometry` stays required (cleaner type story)
- Downstream code (mapPanel, stacService) never sees a null geometry
- The silent-drop guard at `mapPanel.ts:1199` (`if (!f.geometry) return []`) —
  an Article I.3 violation — is removed, converting a latent silent failure
  into an explicit, tested coercion at a boundary

**Alternative rejected**: Make `RawGeoJSONFeature.geometry` optional /
nullable. This would propagate the nullable type through every consumer,
forcing defensive `if (!f.geometry)` branches everywhere — re-introducing
the silent-drop pattern the feature is supposed to eliminate.

### 6.2 Review decision 10A — unit + E2E for null→EmptyPoint conversion

**Decision**: Two tests cover the 5-alt conversion:
1. **Python unit** (`services/io/tests/test_parser_null_geometry.py`): a REP
   fixture containing a null-geometry feature parses to a feature whose
   `geometry.type == "Point"` and `len(geometry.coordinates) == 0`. No drop.
2. **Playwright E2E** (`tests/e2e/test-null-geometry-no-drop.spec.ts`): the
   same fixture, imported via the VS Code extension command, yields the
   expected layer count (no drop) and the null-geometry feature renders
   as a `GeoJSONEmptyPoint`.

**Rationale**: A unit test alone could miss an adapter seam between
`services/io` and the VS Code extension that re-introduces the drop. An E2E
alone could mask the reason the conversion succeeds (layer count could be
preserved by a different code path). Both together pin down the contract.

### 6.3 Review decision 11A — geometry as discriminated union of 7 existing classes

**Decision**: `RawGeoJSONFeature.geometry` uses `any_of` over the seven
existing geometry classes in `geojson.yaml`:

```yaml
geometry:
  required: true
  any_of:
    - range: GeoJSONPoint
    - range: GeoJSONEmptyPoint
    - range: GeoJSONLineString
    - range: GeoJSONPolygon
    - range: GeoJSONMultiPoint
    - range: GeoJSONMultiLineString
    - range: GeoJSONMultiPolygon
```

**No new `RawGeoJSONGeometry` class is introduced.** The earlier design
(research §1–§5 as written) proposed a new loose class with `range: string`
type and `range: Any` coordinates — the review correctly observed that:
- It duplicates what the 7 existing classes already define
- It loses the per-geometry coordinate-shape checks (Point needs exactly 2,
  LineString needs ≥ 2 pairs, etc.) that today only exist inside the 7 classes
- At the boundary we DO know which geometry type we've parsed — we just don't
  know which **Debrief feature** variant to narrow to. The union encodes that
  precisely.

**Rationale**: `RawGeoJSONFeature` = "we know this is a GeoJSON Feature with
a known geometry but we haven't yet narrowed to a Debrief domain variant
(Track / ReferenceLocation / SystemState / …)". That is sharper than the
earlier "loose type everywhere" framing.

**Fixture implication**: Seven per-geometry-type fixtures under
`fixtures/raw-geojson/valid/geometry/` (one per class) plus one
`fixtures/raw-geojson/invalid/unknown-geometry-type.json` that asserts
`{"type": "GeometryCollection", …}` and `{"type": "NotAGeometry", …}` are
both rejected. The spec edge case E4 ("Feature with an unrecognised
`geometry.type`") is *tightened* by this decision: at the raw-feature layer
the geometry type **must** be one of the seven enumerated variants; the
invalid fixture verifies this.

### 6.4 Review decision 12A — explicit tests sweep in tasks.md

**Decision**: The rename that deletes
`services/session-state/src/types/results.ts` `interface GeoJSONFeature` and
replaces the in-package name with a re-export of `RawGeoJSONFeature` includes
an explicit task in `tasks.md` that runs
`pnpm --filter @debrief/session-state test` and confirms every existing test
passes unchanged. `test_golden.py`'s `ENTITY_MAP` extension is also an
explicit task rather than a drive-by edit (the previous draft risked
overlooking it).

**Rationale**: Tests-sweep-as-task ensures the reviewer sees the assertion
"the migration changes imports only, not behaviour" as a deliberate,
checkable step rather than a side-effect. `ENTITY_MAP` in particular is easy
to forget — the current file lives at `shared/schemas/tests/test_golden.py`
and needs one entry per new class.

### 6.5 Review decision 13A — `designates_type` extension + perf bench

**Decision**: Add `designates_type: true` to the `type` slot of each of the
seven existing geometry classes in `geojson.yaml`. Pydantic then treats any
`any_of` over those classes as a discriminated union and uses the `type`
field as the discriminator, avoiding the ~6× slowdown of attempting every
alternative per feature.

Add a new micro-benchmark at `shared/schemas/tests/test_designates_type_perf.py`
that validates a 10 000-feature `RawGeoJSONFeatureCollection` against Pydantic
and asserts wall-clock ≤ 500 ms on the CI runner. The benchmark uses the
valid geometry fixtures as the feature pool and does not exercise I/O, so
the budget is stable across platforms.

**Rationale**: The realistic perf ceiling is the 2.7 MB / ~50 000-feature
`BULK_RED_TRACKS.rep` fixture. Without `designates_type`, the
un-discriminated `any_of` would cost ~3 s on import — user-visible and
Article I (Defence-Grade Reliability) / reproducibility-relevant. With
`designates_type`, the cost drops to ~500 ms at 50 000 features, amortised
once per file load.

**Scope note**: The spec's Out of Scope bullet "Changing the existing
strictly-typed geometry classes in `geojson.yaml`" is *narrowly* relaxed
here — we are adding a single `designates_type: true` key per class, a
purely additive annotation that does not change the accepted payloads of
existing `DebriefFeature` subtypes (TrackFeature, ReferenceLocation, etc.).
The ADR entry documents this relaxation explicitly.

### 6.6 Review decision 14A — one validation per ingress boundary

**Decision**: Pydantic validation of `RawGeoJSONFeature` /
`RawGeoJSONFeatureCollection` happens exactly once per payload, at the
ingress boundary — **`services/io/src/debrief_io/parser.py`** (REP file
import) and **`services/stac/src/debrief_stac/features.py`** (STAC catalog
load). In-process hand-offs past those two sites — `mapPanel.ts`,
`stacService.ts`, `ResultsSlice`, IPC boundaries inside the loader,
web-shell tool calls, etc. — **trust the static type** and do not
re-validate.

**Rationale**: Double-validation is ambiguous (which site is "authoritative"?
which error messages does the user see?) and wastes ~10–20 % of ingress CPU
at 50 000 features. The two-ingress rule matches the architecture: the
system only accepts GeoJSON from disk (`services/io`) or from STAC catalog
metadata (`services/stac`); everything else is internal transport.

**Mechanical consequence**: The silent-drop guard at `mapPanel.ts:1199`
(`if (!f.geometry) return []`) is deleted outright. Past the ingress
boundary `geometry` is guaranteed non-null (by 5-alt), so the guard is
dead code. Deleting it + adding the Playwright regression test (10A) is
the Article I.3 resolution.

**Alternative rejected**: Validate at every consumer. Rejected because it
re-introduces the "which error wins?" ambiguity and contradicts the
single-source-of-truth principle of Article II.

## Summary — unresolved items

None. All four original unknowns (§1–§5) and all six review-phase decisions
(§6.1–§6.6) have a decided mechanism with rationale and an alternatives trail.
Ready to proceed to `/speckit.tasks` (Phase 2 beyond plan).
