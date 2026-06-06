# Phase 0 Research — Per-Scene Asset Key Contract Formalisation

**Feature**: 243-scene-asset-contract
**Date**: 2026-05-02
**Status**: Complete — all `NEEDS CLARIFICATION` resolved

This document resolves the open technical questions implicit in
`spec.md`'s Functional Requirements and records the rationale for each
choice that the Phase 1 design artefacts will encode.

---

## A. On-disk reality (must verify before designing the schema)

### A1. Does the existing sample catalogue contain any actual `scene-thumbnail-{ULID}` asset entries?

**Decision**: **No** — the placeholder lives only in
`preview/workspace/samples/local-store/catalog.json` at the **collection
`item_assets` template** level. No Item under `local-store/` carries an
actual `scene-thumbnail-{ULID}` entry today. Storyboarding capture
produces them at runtime, and the sample catalogue ships with no
captured Scenes.

**Evidence**:

```text
$ grep -rln "scene-thumbnail" preview/workspace/samples/local-store/
preview/workspace/samples/local-store/catalog.json   # only — collection template
$ ls preview/workspace/samples/local-store/core--analysis1-areas/
assets  features.geojson  item.json  overview.png  thumbnail.png
# (no scene-thumbnails/ subdirectory; no scene-thumbnail-* asset entries in item.json)
```

**Rationale**: This validates the spec's **Assumptions**: "No on-disk
migration … the current sample catalogue and fixtures already produce
well-paired, ULID-keyed entries [or none at all]." Since no real
entries exist in committed sample data, we have **zero risk** of
regressing existing fixtures with the new (stricter) shape.

**Consequence**: The new golden fixtures are the only Items containing
real `scene-thumbnail-{ULID}` keys that are version-controlled at merge
time. We do **not** need a backfill script.

**Alternatives considered**: Generating a sample plot with captured
Scenes for richer evidence — rejected as out of scope (this feature is
schema-only; sample data enrichment tracks separately under the
storyboarding feature line).

---

### A2. What other code references the `scene-thumbnail-` literal?

**Decision**: Three call-sites; each addressed by FRs in `spec.md`:

| File | Reference | FR that retires it |
|------|-----------|--------------------|
| `apps/vscode/src/services/sceneThumbnailService.ts` | Generates the keys (`scene-thumbnail-${ulid}`, `scene-thumbnail-${ulid}-sm`); doc-comments describe semantics | FR-013 (doc pointer) — code unchanged |
| `services/stac/src/debrief_stac/collection.py` | `ITEM_ASSETS_TEMPLATE["scene-thumbnail"]` placeholder | FR-008 (remove placeholder) |
| `specs/241-stac-best-practices-upgrade/contracts/item-shape.schema.json` | `^scene-thumbnail(-.+)?$` patternProperties rule | FR-008 (replace with $ref / regenerate) |
| `preview/workspace/samples/local-store/catalog.json` | Same placeholder, materialised in shipped sample data | FR-008 (regenerate sample) |
| `services/stac/tests/test_plot.py` | Validates Items against `item-shape.schema.json` (the contract above) | No change — re-runs against the updated contract |

**Rationale**: The blast radius is small and bounded; no service that
*reads* per-scene assets parses the key string today (the service that
*writes* them is the only source of the literal).

**Alternatives considered**: A grep for `scene-thumbnail` returned no
hits in `apps/vscode/webviews/`, `shared/components/`, or any Python
service besides those listed. No hidden coupling.

---

## B. LinkML expressivity boundary

### B1. Can LinkML express a map keyed by a regex (`patternProperties`-style)?

**Decision**: **Partially**. LinkML supports `inlined: true` /
`inlined_as_dict: true` for slot ranges to model dict-like maps, and
slot-level `pattern` constrains string values, but it does **not** emit
JSON Schema's `patternProperties` construct from `gen-json-schema`. The
generator emits standard `properties` blocks for declared slots and a
permissive `additionalProperties` clause; it has no representation
for "any key matching this regex MUST conform to this value shape."

**Rationale**: Verified by inspection of `gen-json-schema` output for
`SceneProperties` (existing) and a probe-class test. A LinkML-only
solution would require either (a) declaring every possible key as a
slot (impossible — keys carry runtime ULIDs), (b) abandoning per-key
type enforcement at the schema layer, or (c) using a custom
`json_schema_object_meta` annotation. None are clean.

**Decision implication**: We adopt a **hybrid approach**: model the
**value shape** (`SceneThumbnailAssetEntry`) in LinkML and ship a small
**hand-authored JSON Schema overlay** that wraps the generated value
shape with `patternProperties` and the ULID key constraint.

**Alternatives considered**:

- **All-LinkML, no patternProperties**. Rejected — the schema would no
  longer encode the key format invariant, defeating the spec's primary
  goal (FR-003).
- **Drop LinkML, write the whole shape as hand-authored JSON Schema**.
  Rejected — violates Constitution Article II.1 (LinkML as single
  source of truth) and removes the value shape from the
  Pydantic/TypeScript generator outputs.
- **Custom LinkML `json_schema_object_meta` annotation**. Rejected —
  carries opaque generator coupling and isn't documented as a stable
  API. Hand-authored overlay is more transparent and easier to review.

---

### B2. How will the overlay artefact stay in sync with the LinkML value shape?

**Decision**: The overlay file references the LinkML-generated JSON
Schema for `SceneThumbnailAssetEntry` via `$ref`, importing the
schemas package's published JSON Schema bundle by stable identifier:

```jsonc
{
  "$id": "https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json",
  "type": "object",
  "patternProperties": {
    "^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$": {
      "$ref": "https://debrief.info/schemas/storyboard.schema.json#/$defs/SceneThumbnailAssetEntry"
    }
  },
  "additionalProperties": true   // wrapper applies on top of the parent assets map
}
```

A schema adherence test (Phase 1, `test_scene_thumbnail_asset_fixtures.py`)
loads both files and asserts that the `$ref` resolves and the value-shape
component has the expected required fields (`href`, `type`, `roles`).
This catches drift if the LinkML class's required slots change.

**Rationale**: `$ref` is the canonical JSON Schema mechanism for
re-using value shapes across schemas; it keeps the overlay declarative
and lets the value-shape source-of-truth remain LinkML.

**Alternatives considered**:

- **Inlining** the value shape into the overlay (no `$ref`). Rejected
  — drift risk; defeats single-source-of-truth.
- **Generating the overlay from a higher-level LinkML annotation**.
  Rejected — LinkML lacks a clean primitive for this (B1); custom
  generators are a maintenance liability.

---

## C. Pairing invariant enforcement

### C1. Can the large/small pair rule (FR-005) be expressed in JSON Schema?

**Decision**: **Not cleanly**. JSON Schema's `if`/`then`/`else` and
`dependentRequired` operate on *literal* property names; there is no
mechanism to say "if a property matching `^scene-thumbnail-(X)$`
exists, the property `scene-thumbnail-(X)-sm` must also exist" because
JSON Schema cannot capture and back-reference a regex group.

**Rationale**: Confirmed against JSON Schema 2020-12 spec (the dialect
used by spec-241 contracts). `dependentRequired` enumerates literal
keys; `dependentSchemas` likewise. The closest workaround
(`patternProperties` + a sibling `not` predicate) leads to a quadratic
blow-up over all possible ULIDs and is unworkable in practice.

**Decision implication**: Pairing is enforced by a **Python audit
module** (`services/stac/src/debrief_stac/scene_thumbnail_audit.py`),
not by JSON Schema. The audit module's failure messages cite the
named schema rule (`scene-thumbnail-pair-rule-001`) by ID so reviewers
can trace from a CI failure to the contract document.

**Alternatives considered**:

- **JSON Schema 2020-12 `vocabulary`** extension to add a back-reference
  primitive. Rejected — speculative, no validator support, fragile.
- **Embedding the pair-check in `sceneThumbnailService.ts`** so the
  invariant is "enforced at write time only". Rejected — does not
  catch hand-edited or third-party-produced Items, which is the
  failure mode that motivated this feature.

---

### C2. Where does the audit module run in the existing CI flow?

**Decision**: As a **unit test** in `services/stac/tests/`, plus a
**callable function** that the existing `services/stac` validator
(`debrief_stac.collection.validate_collection` or equivalent) invokes
when validating any Item that has at least one matching scene-thumbnail
key. The audit is *not* run as part of generic JSON Schema validation —
it's a layered structural check.

**Rationale**: Keeps the JSON Schema layer pure (still usable by any
JSON Schema validator that consumes the published bundle) while
providing the stronger invariant inside the Python ecosystem where the
audit can also detect orphans (FR-009, see C3).

**Alternatives considered**:

- **TypeScript audit module mirrored into the VS Code reader**.
  Rejected for v1 — the VS Code reader does not currently inspect or
  enforce per-scene asset invariants; introducing one expands scope
  beyond this tech-debt feature. Tracked as a follow-up if needed.

---

### C3. How is the orphan-asset rule (FR-009) modelled?

**Decision**: A **named schema rule** documented inside the
LinkML class docstring (`scene-thumbnail-orphan-rule-001`), with the
operative check living in the same audit module as the pair rule.
The orphan check requires Storyboard context (the list of Scene IDs
in the owning Plot's storyboarding subsystem) and therefore can only
run where that context is reachable — i.e. inside the Python service
that already loads both Item and Storyboard.

**Rationale**: The schema layer documents the invariant; the audit
layer enforces it where the necessary context is in scope. Both
artefacts reference the same named rule ID, so a contributor can
trace from a CI failure to the schema documentation.

**Alternatives considered**:

- **Embedding Scene IDs into Item `properties` for in-band
  validation**. Rejected — duplicates state already living in the
  Storyboard Feature; risks drift; explicitly out of scope per the
  spec's "Scene remains an external referent" assumption.

---

## D. Variant pairing and forward compatibility

### D1. Strict pairing or optional small variant?

**Decision**: **Strict pairing** (matches existing
`sceneThumbnailService.ts` write path: it writes both atomically or
neither). The audit fails on any single-variant entry.

**Rationale**: Spec.md §Assumptions endorses strict pairing as the
default. The current service produces both. No consumer relies on
single-variant items today. Codifying the existing behaviour minimises
churn and gives validators a clean rule.

**Alternatives considered**:

- **Optional small variant** (small can be regenerated from large on
  demand). Rejected — requires a regeneration code path that doesn't
  exist; would introduce the very ambiguity the spec aims to remove.

### D2. Forward compatibility for additional variant sizes (e.g. `-md`)?

**Decision**: The overlay's pattern is anchored to **exactly two
variants today**: `^scene-thumbnail-{ULID}(?:-sm)?$`. A future spec
introducing `-md` would (a) extend the regex's optional-suffix branch,
(b) extend the LinkML class's `variant` slot enum (see data-model.md
§3), and (c) update the pair rule to require all declared variants.
The forward path is documented in the overlay file's `description`.

**Rationale**: Codifying the exact set today prevents accidental
acceptance of spurious suffixes; the extension recipe is recorded so
a future change is mechanical, not exploratory.

**Alternatives considered**:

- **Open-ended `[A-Za-z0-9-]*` suffix**. Rejected — re-introduces the
  permissiveness of the original `^scene-thumbnail(-.+)?$` regex this
  feature is replacing.

---

## E. Generator pipeline — verifying the new class flows through

### E1. Will `SceneThumbnailAssetEntry` appear in the generated Pydantic, JSON Schema, and TypeScript outputs without bespoke generator changes?

**Decision**: **Yes** — the existing `gen-pydantic`, `gen-json-schema`,
and `gen-typescript` invocations in `shared/schemas/Taskfile.yml` (or
equivalent build script) emit any LinkML class declared in
`storyboard.yaml` automatically. The new class needs only standard
LinkML constructs (slot definitions with `range`, `required`,
`pattern`, `description`); no generator flags or custom templates
required.

**Rationale**: Verified by precedent — `SceneProperties`,
`StoryboardProperties`, and `Viewport` (added by spec #215) appear in
all three outputs without bespoke build steps.

**Alternatives considered**: None — this is the existing pipeline.

### E2. Does the generator preserve LinkML class docstrings into the JSON Schema `description` and TypeScript TSDoc (FR-014)?

**Decision**: **Yes**. `gen-json-schema` maps a class's `description`
to the JSON Schema `description`. `gen-typescript` maps it to a TSDoc
block above the type alias. `gen-pydantic` puts it on the model class
docstring.

**Rationale**: Verified against `Viewport` and `SceneProperties` in
the published bundle; both have rich docstrings that flow through.

**Adherence test** (added in Phase 1): asserts the description string
appears in each of the three outputs — guards against generator
regressions and proves FR-014 holds end-to-end.

---

## F. Removal of the spec-241 patternProperties artefact

### F1. Can the placeholder + regex in spec-241's `item-shape.schema.json` be removed without breaking test_plot.py?

**Decision**: **Yes, with a small rewiring**. `test_plot.py` validates
Items against the spec-241 contract after producing them via the
service. The contract's `assets` block currently inlines the
`^scene-thumbnail(-.+)?$` rule. Two options:

1. **Inline replacement**: Replace the inline regex block with the
   same `patternProperties` overlay rule, sourced from the new shared
   contract via `$ref`. The spec-241 contract continues to be the
   one validators consume.
2. **Delegation**: The spec-241 contract removes the rule entirely
   and the audit module assumes responsibility for the format check.

**Decision**: **Option 1 (inline replacement via `$ref`)**. Keeps the
spec-241 contract's surface stable (still self-contained — a
validator consuming only that file gets the full Item shape) and
avoids splitting validation logic across two layers. The `$ref`
points at the new overlay artefact in `shared/schemas/contracts/`.

**Rationale**: Validators consuming the spec-241 contract today
expect one file → one schema. `$ref` resolution is universally
supported. Delegation would force every consumer to know about the
audit module, which is a Python-side concern.

**Alternatives considered**: Option 2 above — rejected on the grounds
above. Hybrid (`$ref` + audit) is the design we end up with anyway,
just with the schema layer continuing to express the value shape +
key format inline-by-reference.

---

## G. Test infrastructure

### G1. Where do new schema fixtures live?

**Decision**: `shared/schemas/fixtures/scene-thumbnail-asset/`,
following the precedent of `shared/schemas/fixtures/stac-extension/`,
`raw-geojson/`, `tool/`, etc. Naming convention:
`<scenario>-<valid|invalid>.json`.

**Rationale**: Consistent with the existing schema test layout —
`test_<topic>_fixtures.py` discovers golden files by glob and runs
them through the matching validator.

### G2. Round-trip coverage?

**Decision**: One round-trip test (Python ↔ JSON ↔ TypeScript ↔
Python) for `SceneThumbnailAssetEntry`, mirroring
`test_properties_panel_roundtrip.py`. Demonstrates the value shape
survives the generator triangle without information loss.

**Rationale**: Constitution Article II.2 requires golden fixtures
**and** round-trip **and** structural comparison. Golden fixtures
already cover validity (G1); round-trip closes the second leg;
structural comparison (Pydantic-generated JSON Schema vs
LinkML-generated JSON Schema) is automatic via the existing
`test_validation.py` machinery.

---

## Summary of Decisions

| ID | Decision | Authority |
|----|----------|-----------|
| A1 | No on-disk migration needed; sample catalogue contains no real scene-thumbnail entries | Verified by repo grep |
| B1 | Hybrid LinkML class + JSON Schema overlay (LinkML cannot emit `patternProperties`) | LinkML generator inspection |
| B2 | Overlay references LinkML-derived value shape via `$ref`; adherence test guards drift | JSON Schema 2020-12 spec |
| C1 | Pairing invariant enforced by Python audit module, not JSON Schema | JSON Schema 2020-12 limitation |
| C2 | Audit runs as unit tests + service-side validation hook | Existing CI pattern |
| C3 | Orphan rule documented in schema, enforced by audit (Storyboard context required) | Spec.md FR-009 |
| D1 | Strict pairing (matches existing service write path) | Spec.md Assumptions |
| D2 | Pattern anchored to current variants; extension recipe documented | Constitution Article XIV |
| E1 | New class flows through existing generators with no bespoke changes | Generator precedent |
| E2 | Class docstring flows through to all three outputs (verified by adherence test) | Generator precedent |
| F1 | Spec-241 contract retains its `assets` block but `$ref`s the overlay | Validator convention |
| G1 | Fixtures in `shared/schemas/fixtures/scene-thumbnail-asset/` | Repo convention |
| G2 | One round-trip test added; structural comparison covered by existing machinery | Constitution Article II.2 |

All `NEEDS CLARIFICATION` markers from the spec template are resolved.
Phase 1 may proceed.
