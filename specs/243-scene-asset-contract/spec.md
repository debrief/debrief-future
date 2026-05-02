# Feature Specification: Per-Scene Asset Key Contract Formalisation

**Feature Branch**: `243-scene-asset-contract`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Per-scene asset key contract formalisation — fold `scene-thumbnail-{ulid}` and `scene-thumbnail-{ulid}-sm` keys into the Item shape contract as a first-class LinkML-modelled shape, with explicit semantics for storyboard-derived assets (lifecycle, garbage collection, large/small variant relationship). Today these per-scene assets live in `item.json.assets` alongside plot-level assets but have no schema document explaining what they mean — spec 241 added a placeholder `scene-thumbnail` entry to `item_assets` plus a `^scene-thumbnail(-.+)?$` `patternProperties` rule (review decision 5A) as a tactical fix, and `apps/vscode/src/services/sceneThumbnailService.ts` is the only documentation."

## Background & Problem Statement

Storyboarding (introduced in feature #216) writes per-Scene thumbnails into the
plot's STAC `item.json.assets` map under keys of the form
`scene-thumbnail-{ulid}` (large, 800×600) and `scene-thumbnail-{ulid}-sm`
(small, 200×150). Spec #241 ("STAC Best-Practices Upgrade") needed these
assets to validate against the Item shape JSON Schema, but Scenes were not yet
formally modelled. Review decision **5A** of spec #241 took a tactical
shortcut: it added a placeholder `scene-thumbnail` entry to the
`item_assets` catalogue and a `^scene-thumbnail(-.+)?$` `patternProperties`
rule that accepts any conforming PNG asset.

The shortcut ships, but it leaves a documentation gap. A future contributor
opening a real `item.json` file and seeing
`assets["scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W"]` cannot answer the
following questions from the schema alone:

- What is this asset? Why is the key suffixed with a ULID?
- Why are there *two* matching keys (`...-01HXYZ...` and `...-01HXYZ...-sm`)?
- Who owns this asset? When is it created, and when is it deleted?
- What happens to it if the Scene that produced it is removed?

The only authoritative answer is in TypeScript source
(`apps/vscode/src/services/sceneThumbnailService.ts`). That violates the
project's **schema-first** principle — derived assets that are part of the
durable on-disk contract should be modelled in LinkML, not implied by a
regex.

This spec promotes the per-Scene asset key contract to a **first-class
LinkML-modelled shape**, captures its lifecycle and pairing semantics in the
schema layer, and replaces the tactical patternProperties workaround with
the generated artefact.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Self-documenting on-disk contract (Priority: P1)

A new contributor inspects a STAC `item.json` produced by a Storyboarding
session and sees two unfamiliar asset keys. They open the schema bundle
shipped with the project and find a named, documented "scene thumbnail
asset" shape that explains the keys, the ULID-suffix pattern, the
large/small pairing, and the relationship to the Scene that owns them.
They never need to grep TypeScript source.

**Why this priority**: This is the core deliverable. The whole point of the
feature is to close the documentation gap that the patternProperties
workaround left open. Without P1, P2/P3 have no foundation.

**Independent Test**: Hand the catalogue's published JSON Schema bundle to
someone who has never read the codebase, give them a real `item.json` from
the sample catalogue containing scene-thumbnail entries, and ask them to
explain (a) what those entries are, (b) why there are pairs, (c) what
deletes them. They can answer all three from the schema documentation alone.

**Acceptance Scenarios**:

1. **Given** the LinkML schema source, **When** a contributor reads the
   `SceneThumbnailAsset` shape (or equivalently named class), **Then** the
   class docstring describes its origin (Storyboarding capture), its
   identifier semantics (ULID = Scene id), its lifecycle, and its pairing
   with the small variant.
2. **Given** the generated JSON Schema bundle, **When** a tool follows
   the `$ref` from an `item.json` `assets[scene-thumbnail-…]` entry,
   **Then** it lands on a named, documented sub-schema rather than an
   anonymous patternProperties rule.

---

### User Story 2 — Validators enforce the pairing & key contract (Priority: P2)

A regression slips into a service that writes one variant without the
other (e.g. small written, large skipped). The catalogue validator catches
this at write time or at CI time, because the formalised schema requires
both variants of a scene-thumbnail to be present together and forbids
free-floating partial sets.

**Why this priority**: Without enforcement, the schema is documentation-only
and drift can silently re-introduce the very ambiguity this spec aims to
remove. Enforcement turns the contract into a guarantee. P2 because the
documentation alone (P1) already delivers the bulk of the value; this
hardens it.

**Independent Test**: Take a known-good `item.json`, delete the `-sm`
asset entry while leaving the large variant, and run the catalogue
validator. Validation fails with a message that names the missing
counterpart. Adding the `-sm` entry back makes validation pass.

**Acceptance Scenarios**:

1. **Given** an Item with one scene-thumbnail variant but not the other,
   **When** the catalogue is validated, **Then** validation reports a
   pairing-rule violation that names the absent variant.
2. **Given** an Item with a `scene-thumbnail-…` key whose suffix is **not**
   a valid ULID, **When** the catalogue is validated, **Then** validation
   reports a key-format violation.
3. **Given** an Item with a well-formed scene-thumbnail pair, **When** the
   catalogue is validated, **Then** validation passes without warnings.
4. **Given** every existing sample-catalogue Item that contains
   scene-thumbnail assets today, **When** the new schema is applied,
   **Then** all of them validate without modification (backward
   compatibility with on-disk data).

---

### User Story 3 — Lifecycle & garbage-collection rules captured in schema (Priority: P3)

When a Scene is deleted from a Storyboard, the asset pair it owns must be
removed from `item.json.assets`. The schema documents this invariant — it
states that no scene-thumbnail asset may exist whose ULID does not appear
in the owning Plot's Storyboard scene list — so that future maintainers
have an authoritative reference when implementing or auditing GC code.

**Why this priority**: Lifecycle rules are real today (see
`sceneThumbnailService.ts` and the storyboarding subsystem) but invisible
in the schema. Formalising them prevents drift between code and contract.
P3 because expressing GC rules in JSON Schema has limits — the rule is
partly enforceable (orphan detection during validation when the Scene list
is reachable from the Item context) and partly documentation. Useful, but
not blocking.

**Independent Test**: Take an Item whose Storyboard lists Scenes A and B,
manually inject an extra `scene-thumbnail-{ulid_C}` asset that doesn't
correspond to any Scene, and run the catalogue's orphan-asset audit. The
audit reports the orphan and references the schema rule by name.

**Acceptance Scenarios**:

1. **Given** an Item whose `assets` contains a scene-thumbnail pair whose
   ULID does **not** match any Scene in the owning Storyboard, **When** an
   orphan-asset audit runs, **Then** the audit identifies the pair as an
   orphan and points to the schema rule.
2. **Given** the schema source, **When** a contributor reads the
   lifecycle documentation, **Then** they find the explicit statement
   that scene-thumbnail assets are created on Scene capture and deleted
   on Scene deletion (and that orphans are a defect, not a feature).

---

### Edge Cases

- **Single-variant items**: An Item that contains the large variant of a
  scene-thumbnail but not the matching `-sm` variant (or vice versa). The
  formalised schema MUST treat this as invalid (pairing rule), even
  though the legacy patternProperties rule accepted it. Migration must
  confirm that the existing sample catalogue contains no such cases.
- **Malformed ULIDs**: A key matching the literal prefix `scene-thumbnail-`
  but with a suffix that is not a valid 26-character Crockford-base32
  ULID. The formalised schema MUST reject this; the legacy regex
  `^scene-thumbnail(-.+)?$` accepts it.
- **Coexistence with plot-level thumbnails**: An Item that contains both
  the plot-level `thumbnail` / `overview` asset entries and one or more
  scene-thumbnail pairs. The schema MUST accept this combination
  unchanged.
- **Large catalogues**: An Item that contains many (10s+) Scenes and
  therefore many scene-thumbnail pairs. The schema's pairing and ULID
  rules MUST scale linearly and not impose pathological validation cost.
- **Orphans after Scene deletion**: An Item where a Scene was deleted
  but its asset pair was not garbage-collected (a defect that this spec
  makes detectable). Schema validation alone cannot necessarily *reject*
  this — it depends on whether the Scene list is in scope at validation
  time — but it MUST be expressible as an audit rule.
- **Forward compatibility**: A future Storyboarding change that
  introduces a third variant size (e.g. `…-md`). The formalised shape
  should be extensible without breaking the contract for existing
  large/small pairs.
- **Migration of in-flight write paths**: Any service that currently
  writes the asset entries (e.g. `sceneThumbnailService.ts`) must keep
  producing output that the *new* schema accepts; the changeover is
  schema-side only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST define a named, first-class shape (not an
  anonymous patternProperties rule) representing a per-Scene thumbnail
  asset belonging to a STAC Item.
- **FR-002**: The named shape MUST be authored in LinkML (the project's
  schema source-of-truth) and be present in the generated JSON Schema,
  Pydantic, and TypeScript artefacts produced by the existing
  generators.
- **FR-003**: The shape MUST express that asset keys follow exactly two
  forms: a "large" key of the form `scene-thumbnail-{ULID}` and a
  "small" key of the form `scene-thumbnail-{ULID}-sm`, where `{ULID}`
  is a valid 26-character Crockford-base32 ULID identifying the owning
  Scene.
- **FR-004**: The shape MUST express the structural payload contract for
  each variant — the same `href` / `type` / `roles` constraints
  currently enforced by the patternProperties rule (PNG, role
  `thumbnail`), plus, where applicable to LinkML expressivity, the
  large/small pixel dimensions (800×600 / 200×150).
- **FR-005**: The schema MUST express the **pairing invariant**: for
  every `scene-thumbnail-{ULID}` key in an Item's `assets`, the matching
  `scene-thumbnail-{ULID}-sm` key MUST also be present, and vice versa.
  Validation tooling MUST flag a partial pair as invalid.
- **FR-006**: The schema MUST document the **lifecycle invariant**: a
  scene-thumbnail pair is created when a Scene is captured and removed
  when the Scene is deleted. Where the LinkML/JSON Schema layer cannot
  enforce this directly, it MUST be captured as a named, referable
  shape-level rule that the catalogue's audit tooling can evaluate.
- **FR-007**: The schema MUST document the **ownership relationship**
  between a scene-thumbnail asset pair and the Scene whose ULID it
  carries — i.e. the asset pair belongs to the Scene with id `{ULID}`
  in the owning Plot's Storyboard.
- **FR-008**: The tactical artefacts introduced by spec #241 review
  decision 5A — the placeholder `scene-thumbnail` entry in the
  `item_assets` catalogue and the `^scene-thumbnail(-.+)?$`
  `patternProperties` rule on the Item shape — MUST be removed once the
  formalised shape is in place. The Item shape's overall surface MUST
  refer to the new named shape instead.
- **FR-009**: All existing valid catalogue Items shipping in the
  repository (sample catalogue, fixtures, golden test data) MUST
  validate against the new schema without modification. Any Item that
  was valid under the old contract and is still valid in principle MUST
  remain valid.
- **FR-010**: Items that are *invalid* under the new contract but were
  accepted by the legacy patternProperties rule (e.g. unpaired variants,
  non-ULID suffixes) MUST be rejected by the new contract. If any such
  Items exist in the current sample data, they MUST be repaired or
  removed as part of this feature's delivery.
- **FR-011**: Schema-adherence tests MUST cover the new shape with golden
  fixtures including: (a) a valid paired set, (b) an unpaired-large
  failure, (c) an unpaired-small failure, (d) a malformed-ULID failure,
  (e) coexistence with plot-level `thumbnail` and `overview` entries.
- **FR-012**: Round-trip tests (Python ↔ JSON ↔ TypeScript) MUST pass
  for the new shape, consistent with the project's existing schema test
  strategy.
- **FR-013**: Documentation referencing the asset contract — including
  comments in `apps/vscode/src/services/sceneThumbnailService.ts` and
  any runbook / contributor docs — MUST be updated to point at the new
  named shape rather than describing the contract inline.
- **FR-014**: The contributor-facing docstring on the new shape MUST
  answer the four diagnostic questions from the Background section
  ("what is this", "why ULID", "why pairs", "what deletes it"). The
  docstring MUST flow through to the generated JSON Schema and
  TypeScript artefacts (e.g. as `description` and TSDoc comments).

### Key Entities

- **Scene Thumbnail Asset**: A pair of PNG assets attached to a STAC
  Item's `assets` map that depict the visual state of a single Scene
  in the owning Plot's Storyboard. Identified jointly by the owning
  Scene's ULID. Always exists as a large/small pair under sibling keys
  `scene-thumbnail-{ULID}` and `scene-thumbnail-{ULID}-sm`.
- **Scene** *(referenced, not redefined here)*: The Storyboarding entity
  whose ULID names the asset pair. The asset pair's lifecycle is bound
  to the Scene's lifecycle (created on capture, removed on Scene
  deletion). This spec does **not** modify the schema status of Scene
  itself — it treats Scene as an external referent. Promoting Scene
  from a feature-property to a first-class schema shape is out of
  scope and tracked separately.
- **STAC Item** *(existing)*: The host whose `assets` map carries the
  Scene Thumbnail Asset pairs alongside its plot-level `thumbnail`,
  `overview`, and `source` assets.

## Assumptions

- **Schema source-of-truth is LinkML**: The project's `shared/schemas/`
  pipeline (LinkML → Pydantic / JSON Schema / TypeScript) remains
  authoritative; this feature does not introduce a parallel schema
  source.
- **Strict pairing**: The on-disk contract requires both large and
  small variants to be present together. This matches the
  Storyboarding capture path, which writes the pair atomically. The
  schema enforces this rather than treating the small as derivable /
  optional.
- **Scene remains an external referent**: This spec does not promote
  Scene to a first-class schema shape. The dependency is one-way — the
  asset pair documents that it belongs to a Scene identified by ULID,
  but Scene itself stays modelled as it is today (a property of
  Storyboard features) until a future spec.
- **No new write paths**: Existing services that emit scene-thumbnail
  assets (notably `sceneThumbnailService.ts`) are not refactored; this
  feature is schema-side. Their output continues to validate under the
  new contract.
- **No on-disk migration**: The current sample catalogue and fixtures
  already produce well-paired, ULID-keyed entries. If this assumption
  is contradicted by audit findings during implementation, the
  affected fixtures will be regenerated rather than the schema relaxed.
- **No new variant sizes are introduced by this feature**. Forward
  compatibility for additional sizes (e.g. `-md`) is a design
  consideration but not a deliverable.

## Dependencies

- **Storyboarding feature line stable** (post #234 / #235 cycle). This
  spec assumes Scene capture / deletion semantics will not churn during
  implementation.
- **Spec #241 (STAC Best-Practices Upgrade)** has shipped and the
  tactical placeholder + patternProperties rule are present in the
  item-shape artefacts. This spec replaces them.
- **Existing schema generation pipeline** (LinkML → Pydantic /
  TypeScript / JSON Schema) is operational and used by CI.

## Out of Scope

- Promoting **Scene** itself to a first-class LinkML-modelled shape.
  That work is tracked separately (the backlog notes it as a co-located
  effort but does not require it as a precondition for the asset
  contract).
- Refactoring `sceneThumbnailService.ts` or any other write path. Apart
  from documentation pointers, services keep their current behaviour.
- Introducing new asset variants (e.g. medium-size thumbnails, video
  scrubs). Forward compatibility may inform shape design but no new
  variants ship here.
- Changing the on-disk file layout (`scene-thumbnails/` directory,
  filenames). The schema describes the existing layout.
- Cross-Item / cross-Plot lifecycle rules (e.g. Scene moved between
  Plots). Out of scope; today's storyboarding does not support this.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer unfamiliar with the storyboarding code can,
  using only the published schema bundle, correctly answer the four
  diagnostic questions ("what is this asset", "why is there a ULID
  suffix", "why are there pairs", "what removes them") for a given
  `scene-thumbnail-{ULID}` entry within 5 minutes, with no recourse
  to TypeScript source.
- **SC-002**: 100% of the existing sample-catalogue Items that contain
  scene-thumbnail assets continue to validate (no regressions on
  on-disk data).
- **SC-003**: 100% of the new golden-fixture invalid cases (unpaired
  large, unpaired small, malformed ULID) are rejected by the schema
  validator with a message that names the violated rule.
- **SC-004**: Both tactical artefacts from spec #241 review decision 5A
  — the placeholder `scene-thumbnail` entry in `item_assets` and the
  `^scene-thumbnail(-.+)?$` `patternProperties` rule — are removed
  from the Item shape definition; a repository search for either
  string returns zero hits in production schema files post-merge.
- **SC-005**: The named shape's documentation flows through to all
  three generator outputs (Pydantic class docstring, JSON Schema
  `description`, TypeScript TSDoc) and is verified by an
  adherence test.
- **SC-006**: The catalogue's adherence test suite gains coverage for
  the new shape (golden valid + at least three golden invalid
  fixtures) with the same green-CI bar as the existing Item shape
  tests.
