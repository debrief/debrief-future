# Phase 0 Research: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature**: 256-prefix-aware-stac-typing
**Date**: 2026-06-01

> **Scope note (revised in `/speckit.plan`, 2026-06-02):** The user folded two
> follow-ups into this PR — `StacSummaries` prefixing and modelling the
> asset-level `debrief:toolId` / `debrief:snapshotTimestamp` keys. Investigation
> during planning then corrected three assumptions: (1) `debrief:snapshotTimestamp`
> is asset-level, not item-level; (2) `debrief:label` is a GeoJSON feature
> property / MCP annotation, **not** a STAC property, so it is excluded; (3) the
> three target classes have divergent name→`slot_uri` conventions, so the
> transform must be **schema-driven**, not a per-class text rule. Decisions 1, 4,
> 6, 7, 8 below reflect the revised scope.

## Decision 1 — Implementation route: schema-driven generator post-processor (route a)

**Decision**: Extend `shared/schemas/scripts/generate.py` (`generate_typescript()`)
with **one schema-driven step** that rewrites generated slot **keys to their
on-disk `debrief:` form** (e.g. `'debrief:provenance_log'?:
PropertiesProvenanceEntry[]`), across **three classes**:
`StacExtensionProperties` (5 item fields), `StacSummaries` (3 Collection-summary
fields), and `StacAsset` (2 newly-modelled asset fields). The key is taken from
each slot's LinkML `slot_uri` **verbatim** — the step looks up a
`{class → {slot_name → slot_uri}}` map and rewrites any slot whose `slot_uri`
carries an extension prefix; slots with no extension `slot_uri` (e.g.
`StacAsset.href`) are left untouched. The existing `[key: string]: unknown`
index signature on `StacItemProperties` / `StacAsset` / `StacSummaries` (added
for STAC #223) is preserved for open content.

**Rationale**:
- **It fits the established pattern.** `generate.py` already performs ~20
  text-surgery post-processing steps on gen-typescript output, each guarded by
  a `if fixed_block == block: raise RuntimeError(...)` sentinel (enum
  narrowing, geometry unions, discriminator literals, the `[key: string]:
  unknown` open-record insertion). The prefix rewrite is one more step of
  exactly the same shape.
- **TypeScript string-literal index access resolves to the named slot.**
  When `props` is typed as `StacItemProperties` and a slot
  `'debrief:provenance_log'?: PropertiesProvenanceEntry[]` is declared,
  `props['debrief:provenance_log']` resolves to that slot's type — *not* the
  `[key: string]: unknown` index signature. This is the exact mechanism that
  makes the prefixed keys deliver real typing at the writers' existing call
  sites. (The naive unprefixed `StacItem.properties: StacExtensionProperties`
  intersection that #240 rejected failed precisely because the bare `platforms`
  slot never matched the on-disk `debrief:platforms` key.)
- **Zero call-site rewrites required.** The 27 existing `props['debrief:foo']`
  / `item.properties['debrief:foo']` accesses (counted across both writer
  hosts) keep their literal-key form and simply gain types. The redundant `as`
  casts can then be removed incrementally.
- **One step, three classes.** A schema-driven rule serves all three target
  classes uniformly. A pure-text "prepend `debrief:`" rule (considered in
  `/speckit.review`) was rejected once the scope grew: `StacSummaries` keys are
  underscore-named (`debrief_platforms` → `debrief:platforms`, a *substitution*
  not a prefix) and `StacAsset` mixes Debrief slots (`tool_id`) with non-Debrief
  ones (`href`, `type`, `roles`) that must NOT be rewritten. Only reading
  `slot_uri` handles all three without bespoke per-class string surgery.
- **Reuses the existing drift gate.** The committed artefact lives under
  `shared/schemas/src/generated/typescript/types.ts`, already covered by the
  #240/T013 CI gate (`git diff --exit-code -- src/generated/` in
  `schema-tests.yml`, and `task schema:check-drift`). No new gate is needed
  (satisfies FR-007).
- **No runtime / on-disk change.** This is a `.d.ts`-level rewrite only; the
  emitted JSON is untouched (satisfies FR-008).
- **Low blast radius.** Backlog estimate 3–5 dev-days vs. 5–8 for route (b).

**Alternatives considered**:
- **Route (b) — refactor writer access to `props.foo` + serialisation
  adapter.** Rejected. Larger blast radius (rewrites all 27 sites), introduces
  a new serialisation boundary where a forgotten field silently drops — the
  exact ADR-033 / Article IV.5 failure class this project guards against — and
  changes runtime data flow. User confirmed route (a) on 2026-06-01.
- **Fork / patch the LinkML `gen-typescript` generator.** Rejected. Heavier
  maintenance, ties us to a generator fork (Article IX vendor-lock-in concern),
  and the post-processor approach already in `generate.py` achieves the same
  outcome without forking.

## Decision 2 — How the prefix is derived (schema-driven, not hard-coded)

**Decision**: The post-processor reads the `slot_uri` of each slot on the
LinkML `StacExtensionProperties` class and uses it verbatim as the emitted TS
key. It does **not** hard-code the five field names or assume the prefix is
always `debrief:`.

**Rationale**: FR-002 requires that *adding a new `debrief:*` slot to LinkML
and regenerating* surfaces the field automatically. Hard-coding field names
would break that promise. Reading `slot_uri` makes the emission fully
schema-driven: a new slot with `slot_uri: debrief:reviewed_by` produces
`'debrief:reviewed_by'?: <type>` with no edit to `generate.py`.

**Mechanism**: `generate.py` already has `LINKML_DIR` / the schema paths. The
`{class → {slot_name → slot_uri}}` map for the three target classes is obtained
by loading the LinkML source (via `linkml-runtime`'s `SchemaView`, already a
transitive dep, or a narrow `PyYAML` read of `stac.yaml` + `stac-extension.yaml`).
For each slot whose `slot_uri` carries an extension prefix (a CURIE that is not
the default), the generated bare-key declaration (`<name>?: <type>`) is rewritten
to (`'<slot_uri>'?: <type>`). Value types are left untouched (no new imports).

**Testability (Issue 3A / FR-002)**: the rewrite is structured as a **pure
function** — `prefix_extension_slots(block_text, slot_uri_map) -> text` — so a
pytest unit test can feed it a synthetic interface block containing an *extra*
slot and assert the new slot flows through to a prefixed key, proving FR-002
deterministically without a full schema regen.

**Self-guard**: Wrap the rewrite in the same `raise RuntimeError` sentinel used
throughout `generate.py`, so a future gen-typescript change that alters the
`StacExtensionProperties` block fails the build loudly instead of silently
emitting bare keys again.

## Decision 3 — Bare-name slots are replaced, not duplicated

**Decision**: Replace the bare-name slot declarations with prefixed ones
(don't keep both).

**Rationale**: A codebase search found **zero** reads of the bare-name slots —
`.properties.platforms` / `.tags` (StacExtensionProperties) and
`.debrief_platforms` / `.debrief_tags` / `.debrief_feature_tags`
(StacSummaries) — they were dead/always-`undefined` against on-disk data.
Keeping both would re-introduce the ambiguity (two ways to spell the same
concept, one of which never matches disk). None of the three target classes is
imported directly with bare-key access outside the generated package, so the
rename is safe. (The new `StacAsset` slots are additive optionals — no rename,
no break.)

## Decision 4 — Scope: three classes (revised — `StacSummaries` now in scope)

**Decision**: Apply the prefix rewrite to **all three** classes that carry
`debrief:` `slot_uri`s:
- `StacExtensionProperties` — 5 item `properties` slots (`platforms`, `tags`,
  `feature_tags`, `overrides`, `provenance_log`).
- `StacSummaries` — 3 Collection-summary slots (`debrief_platforms`,
  `debrief_tags`, `debrief_feature_tags`), generated underscore-named today.
- `StacAsset` — 2 newly-modelled slots (see Decision 7).

**Rationale**: The user folded the `StacSummaries` follow-up into this PR
(originally deferred in the first draft of this decision). `StacSummaries` has
the same bare-vs-disk gap, and the schema-driven step (Decision 1/2) handles it
at zero marginal cost. SC-003 / FR-010 updated to match.

## Decision 5 — Testing approach

**Decision**: Test layers, all using existing infrastructure:
1. **Pure-function unit test (FR-002, Issue 3A)** — call
   `prefix_extension_slots()` with a synthetic block containing an *added* slot
   and assert it emerges prefixed. Proves "new field flows automatically" in CI
   without a full regen. (pytest, `shared/schemas/tests/`.)
2. **Generator structural test** — assert the regenerated `types.ts`
   `StacExtensionProperties` / `StacSummaries` / `StacAsset` blocks contain the
   prefixed keys and the index signature.
3. **Schema-convention guard test** — assert every slot in the three target
   classes that declares an extension `slot_uri` is emitted under its colon key
   (none left bare). Catches a future slot whose `slot_uri` diverges.
4. **Type-level test (`tsd`-style / `// @ts-expect-error`)** — assert (a)
   `props['debrief:provenance_log']` is `PropertiesProvenanceEntry[] | undefined`,
   (b) a typo'd/wrong-typed modelled key is rejected on both **read and write**
   paths, and (c) `asset['debrief:toolId']` is `string | undefined`. Satisfies
   SC-001/SC-002/SC-007, FR-004/FR-012. Runs under `pnpm -r typecheck`.
5. **Round-trip / golden + StacAsset adherence** — confirm emitted JSON is
   byte-for-byte unchanged (SC-004, FR-008) and the two new `StacAsset` slots
   round-trip in Python + TS (Article II.2).

**Rationale**: Article VI/VII (tests gate merges; tests are the spec). No new
test framework — type-level assertions ride the existing `tsc` typecheck step,
which is the only gate that catches type regressions (per CLAUDE.md note that
vitest does not).

## Decision 6 — Write-path re-typing (Issue 2A from `/speckit.review`)

**Decision**: Remove the `Record<string, unknown>` widenings at both hosts'
mutation paths (`stacService.ts:1315` `const props = item.properties as
Record<string, unknown>`; `stacWriterIdb.ts:309` `const props: Record<string,
unknown> = { ...baseItem.properties }`) and re-type the locals to
`StacItemProperties`, so write-side access to modelled keys is type-checked.

**Rationale**: The generated-type change alone types only the **read** sites
(`item.properties` is already `StacItemProperties`); the writers deliberately
widen to `Record<string, unknown>` at the **write** path, so without this the
mutation sites stay untyped and FR-004/FR-009 are only half met — leaving exactly
the ADR-033 / Article IV.5 silent-drop surface this feature exists to close.
Writing to `StacItemProperties` is legal: named slots plus the inherited
`[key: string]: unknown` index signature accept both modelled-slot and arbitrary
writes (`for (const [k,v] of Object.entries(patch)) props[k] = v` still
type-checks). The `eslint-disable … ADR-011` at `stacService.ts:1314` is removed
with the cast — a net lint cleanup.

## Decision 7 — Model `debrief:toolId` + `debrief:snapshotTimestamp` on `StacAsset`

**Decision**: Add two optional `string` slots to the `StacAsset` LinkML class:
`tool_id` (`slot_uri: debrief:toolId`) and `snapshot_timestamp`
(`slot_uri: debrief:snapshotTimestamp`). Regenerate Pydantic + TS.

**Rationale**: Investigation showed both keys are written into STAC **asset**
metadata, not item `properties`:
- `debrief:toolId` — `apps/vscode/test-data/.../item.json` asset entries;
  written via `addResultAsset` (`resultsPanelService.ts:639`,
  `executeTool.ts:345`); read via the hand-cast `asset as StacAsset &
  { 'debrief:toolId'?: string }` at `stacService.ts:674`.
- `debrief:snapshotTimestamp` — `writeSnapshotAsset` passes it in asset metadata
  (`stacService.ts:1003`).

Modelling them on `StacAsset` makes the writer's asset access typed and removes
the hand-cast (SC-007). The keys already exist on disk → on-disk shape unchanged
(FR-008). Pydantic regen is additive and follows the existing `StacSummaries`
`slot_uri` precedent; no Python consumer change.

## Decision 8 — Exclude `debrief:label` (not a STAC property)

**Decision**: Do **not** model `debrief:label`. The user asked to model it, but
investigation showed it is a **GeoJSON feature property / MCP result
annotation** (`bufferZoneGenerator.ts:377`, `toolService.ts:527`) — it never
appears on STAC `item.properties` or asset metadata. Modelling it onto a STAC
class would type a key that the STAC writer never persists, re-introducing the
exact bare-vs-disk mismatch this feature removes.

**Rationale / follow-up**: `debrief:label` belongs to `BaseFeatureProperties`
(the GeoJSON feature schema), a separate surface with its own consumers. The
user confirmed dropping it here (`/speckit.plan`, 2026-06-02); modelling it is
left as a noted future change, not a backlog item.

## Open questions

None. The route, mechanism, scope (3 classes), write-path, and asset-modelling
decisions are all resolved above and confirmed by the user during
`/speckit.review` + `/speckit.plan`.
