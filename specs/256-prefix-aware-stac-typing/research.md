# Phase 0 Research: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature**: 256-prefix-aware-stac-typing
**Date**: 2026-06-01

## Decision 1 — Implementation route: generator post-processor (route a)

**Decision**: Extend `shared/schemas/scripts/generate.py` (`generate_typescript()`)
to rewrite the generated `StacExtensionProperties` interface so its slot
**keys carry the on-disk `debrief:` prefix** (e.g. `'debrief:provenance_log'?:
PropertiesProvenanceEntry[]`), with the prefix derived from each slot's LinkML
`slot_uri`. The existing `[key: string]: unknown` index signature on the
derived `StacItemProperties` (added for STAC #223) is preserved for open
content.

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
slot→`slot_uri` map for `StacExtensionProperties` is obtained by loading the
LinkML source (via `linkml-runtime`'s `SchemaView`, already a transitive dep,
or a narrow `PyYAML` read of `stac-extension.yaml`). For each slot in the
class, if a `slot_uri` is present and differs from the bare slot name, the
generated bare-key declaration (`<name>?: <type>`) is rewritten to
(`'<slot_uri>'?: <type>`). Value types are left untouched (they already
reference in-file generated types — `PlatformRecord[]`, `string[]`,
`PropertiesProvenanceEntry[]` — so no new imports).

**Self-guard**: Wrap the rewrite in the same `raise RuntimeError` sentinel used
throughout `generate.py`, so a future gen-typescript change that alters the
`StacExtensionProperties` block fails the build loudly instead of silently
emitting bare keys again.

## Decision 3 — Bare-name slots are replaced, not duplicated

**Decision**: Replace the bare-name slot declarations with prefixed ones
(don't keep both).

**Rationale**: A codebase search found **zero** reads of the bare-name slots
(`.properties.platforms`, `.properties.tags`, etc.) — they were dead/always-
`undefined` against on-disk data. Keeping both would re-introduce the
ambiguity (two ways to spell the same concept, one of which never matches
disk). `StacExtensionProperties` is not imported directly anywhere outside the
generated package, so the rename is safe.

## Decision 4 — Scope: the five item-level extension slots only

**Decision**: Apply the prefix rewrite to `StacExtensionProperties` (the five
item `properties` slots: `platforms`, `tags`, `feature_tags`, `overrides`,
`provenance_log`). Do **not** touch `StacSummaries` (Collection-level
`debrief_*` summary fields) in this feature.

**Rationale**: Matches the spec scope (SC-003 names the five fields) and keeps
blast radius tight. `StacSummaries` has the analogous bare-vs-disk gap
(`debrief_platforms` field vs `debrief:platforms` disk key) and the *same*
technique applies — noted as a natural follow-up, deliberately out of scope
here.

## Decision 5 — Testing approach

**Decision**: Three test layers, all using existing infrastructure:
1. **Generator unit/structural test** — assert the regenerated `types.ts`
   `StacExtensionProperties` block contains the prefixed keys and the index
   signature (extends the existing schema structural tests under
   `shared/schemas/tests/`).
2. **Type-level test (`tsd`-style / `// @ts-expect-error`)** — a `.test-d.ts`
   or compile-checked fixture asserting (a) `props['debrief:provenance_log']`
   has type `PropertiesProvenanceEntry[] | undefined`, and (b) a typo'd key or
   wrong value type is rejected (`@ts-expect-error`). Satisfies SC-001/SC-002,
   FR-004. Runs under the existing `pnpm -r typecheck` gate.
3. **Round-trip / golden** — confirm the writer's emitted JSON is byte-for-byte
   unchanged (reuse existing stac-writer round-trip / overlay tests).
   Satisfies SC-004, FR-008.

**Rationale**: Article VI/VII (tests gate merges; tests are the spec). No new
test framework — type-level assertions ride the existing `tsc` typecheck step,
which is the only gate that catches type regressions (per CLAUDE.md note that
vitest does not).

## Open questions

None. The route decision (the spec's only flagged open question) is resolved
in Decision 1 and confirmed by the user.
