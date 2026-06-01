# Feature Specification: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature Branch**: `256-prefix-aware-stac-typing` (cloud session branch: `claude/item-256-spec-status-JCx2R`)
**Created**: 2026-06-01
**Status**: Draft
**Input**: User description: "Prefix-aware TS typing for `StacExtensionProperties` — extend `gen-typescript` (or post-process its output) to emit a parallel TypeScript interface whose field names carry the on-disk JSON `debrief:` prefix, so the writer's `StacItem.properties` access sites gain named-slot typing flowing from LinkML. Today LinkML's generator strips the `debrief:` prefix, so a naive `StacItem.properties: StacExtensionProperties` intersection delivers zero benefit at the writer's real call sites."

## Context (why this exists)

The Debrief STAC extension fields (`debrief:platforms`, `debrief:tags`,
`debrief:feature_tags`, `debrief:overrides`, `debrief:provenance_log`) are
modelled in `shared/schemas/src/linkml/stac-extension.yaml` as the
`StacExtensionProperties` class. Each slot declares a prefixed disk key via
`slot_uri: debrief:<name>`, but the LinkML TypeScript generator emits the
interface with the **prefix stripped** (`provenance_log`, not
`'debrief:provenance_log'`).

The STAC writers persist and read those fields under their **prefixed**
on-disk keys — e.g. `props['debrief:provenance_log']` and
`props['debrief:overrides']` in `apps/vscode/src/services/stacService.ts`,
the same keys in `apps/web-shell/src/services/stacWriterIdb.ts`, and the
read sites `item.properties['debrief:platforms' | 'debrief:tags' |
'debrief:feature_tags']`. Every one of those accesses goes through an
untyped `Record<string, unknown>` bag with an `as` cast, because a naive
`StacItem.properties: StacExtensionProperties` intersection would key on the
*unprefixed* generated names and therefore match **none** of the real,
prefixed access sites.

Spec #240 LinkML-derived `PropertiesProvenanceEntry` and added a schema
drift gate, but explicitly **deferred** the promise that "new `debrief:*`
fields flow automatically to the writer's typed surface" — because making it
true requires solving the prefix-stripping problem. That deferral is this
feature. Today the promise holds only for *generated* field declarations,
not for the *writer's read/write of those fields*.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New extension field flows to the writer's typed surface (Priority: P1)

A schema author adds a new `debrief:*` extension slot to the LinkML
STAC-extension schema (with its `slot_uri`), regenerates the derived
artefacts, and the new field immediately appears as a **named, typed slot**
at the writer's access sites — without anyone hand-editing a writer-owned
TypeScript declaration.

**Why this priority**: This is the core promise #240 deferred and the whole
reason the item exists. It converts the writer's `debrief:*` surface from a
hand-maintained, drift-prone `Record<string, unknown>` into a contract that
flows from the single source of truth (Article II.1).

**Independent Test**: Add a throwaway modelled slot to the LinkML
extension schema, regenerate, and confirm a writer access site referencing
the new prefixed key type-checks against the LinkML-derived shape with no
edit to any writer-owned type. Remove the throwaway slot afterwards.

**Acceptance Scenarios**:

1. **Given** a new slot `debrief:reviewed_by` is added to
   `StacExtensionProperties` in LinkML and the derived artefacts are
   regenerated, **When** a writer reads or writes
   `props['debrief:reviewed_by']`, **Then** the access is typed against the
   LinkML-defined shape (not `unknown`) with no hand-edit to writer types.
2. **Given** the schema author makes no edits to any writer `.ts` file,
   **When** the typecheck step runs, **Then** the new field is available on
   the writer's typed properties surface.

---

### User Story 2 - Compile-time safety on existing prefixed access sites (Priority: P2)

A developer working in either writer host references a `debrief:*` property
key. A typo, a renamed field, or a removed field is caught by the type
checker at build time instead of silently evaluating to `undefined` at
runtime.

**Why this priority**: The current `as`-cast pattern on an untyped bag means
mis-typed keys fail silently — the exact "silently-dropped data" failure
class the Constitution's boundary-types rule (Article IV.5 / ADR-033) exists
to prevent. Once the modelled fields are typed, the checker enforces them.

**Independent Test**: Introduce a deliberate typo (e.g.
`props['debrief:provenence_log']`) at a writer access site and confirm the
typecheck step fails; correct it and confirm it passes.

**Acceptance Scenarios**:

1. **Given** a writer access site references a misspelled modelled key,
   **When** the typecheck runs, **Then** the build fails with a type error.
2. **Given** a modelled field is renamed in the LinkML schema and
   regenerated, **When** a stale writer reference to the old key remains,
   **Then** the typecheck fails, flagging every stale site.

---

### User Story 3 - Close the #240-deferred Article II.1 audit finding (Priority: P3)

A maintainer auditing the writer against Article II.1 (LinkML is the single
source of truth) finds that the writer's modelled `debrief:*` properties are
no longer accessed through a hand-typed `Record<string, unknown>` bag — the
remaining deferral noted in #240 is resolved.

**Why this priority**: It retires a tracked, documented audit deferral. Value
is real but is a consequence of Stories 1 and 2 rather than independent.

**Independent Test**: Review the writer's properties access surface and
confirm modelled `debrief:*` fields resolve to LinkML-derived types; confirm
#240's deferral note no longer describes open work.

**Acceptance Scenarios**:

1. **Given** the feature has landed, **When** the writer's modelled
   `debrief:*` access surface is audited, **Then** it derives from LinkML and
   the #240 deferral is recorded as closed.

---

### Edge Cases

- **Open content (STAC core + third-party keys)**: A STAC Item's
  `properties` legitimately carries non-Debrief keys (`datetime`,
  `start_datetime`, third-party extension keys). The typed surface MUST still
  accept these without error — it narrows the modelled `debrief:*` slots, it
  does not close the object.
- **Unmodelled `debrief:*` keys**: Some `debrief:*` keys the writer touches
  are *not* in `StacExtensionProperties` today (e.g. `debrief:label` at item
  level; `debrief:snapshotTimestamp`; `debrief:toolId` at asset level). These
  MUST remain accessible without a type error; they are out of the modelled
  set unless separately added to LinkML.
- **On-disk shape must not change**: The persisted JSON keys and structure
  must be byte-for-byte identical before and after this change. If an
  internal unprefixed representation is used anywhere, a single serialisation
  boundary is responsible for the prefix and no modelled field may be lost in
  translation (ADR-033 / Article IV.5).
- **Schema drift**: If the derived prefixed typing artefact is regenerated
  but not committed (or hand-edited out of sync with LinkML), the drift gate
  must fail CI — consistent with the gate #240 introduced.
- **Both hosts**: A field typed for the VS Code host but not the web-shell
  host (or vice versa) is a failure — both writer hosts share the same typed
  surface.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The writer hosts' read and write access to the LinkML-modelled
  `debrief:*` extension properties (`debrief:platforms`, `debrief:tags`,
  `debrief:feature_tags`, `debrief:overrides`, `debrief:provenance_log`) MUST
  be statically type-checked against the LinkML schema at both the VS Code
  (`stacService`) and web-shell (`stacWriterIdb`) call sites.
- **FR-002**: Adding a new modelled `debrief:*` slot to the LinkML
  STAC-extension schema and regenerating the derived artefacts MUST cause that
  field to become available as a typed slot on the writer's properties
  surface **without any hand-edit to a writer-owned type declaration**.
- **FR-003**: The typed surface MUST correspond exactly to the on-disk JSON
  representation (`debrief:`-prefixed keys), such that reading or writing a
  modelled field through the type system manipulates the *same* key that is
  persisted — no modelled field may be silently dropped when the schema grows
  (Constitution Article IV.5 / ADR-033).
- **FR-004**: A typo'd, renamed, or removed modelled `debrief:*` key
  referenced at a writer access site MUST produce a typecheck (build) failure
  rather than a silent runtime `undefined`.
- **FR-005**: The typed surface MUST continue to accept STAC 1.1 core
  properties and unmodelled / third-party `properties` keys (open content)
  without type errors.
- **FR-006**: `debrief:*` keys touched by the writer but not currently
  modelled in `StacExtensionProperties` MUST remain accessible without a
  forced type error. The modelled set (FR-001) is authoritative for typed
  slots; unmodelled keys are permitted via open content.
- **FR-007**: The artefact that carries the prefix-aware typing MUST be
  derived from LinkML (generated or regenerated, never hand-authored as a
  field-by-field copy), and a CI drift gate MUST fail if it is out of sync
  with the LinkML schema — reusing or extending the gate established by #240.
- **FR-008**: The change MUST be typing-only and behaviour-preserving — the
  on-disk JSON shape of written Items (key names, nesting, values) MUST be
  unchanged. No data-format migration is introduced.
- **FR-009**: Both writer hosts MUST share a single typed definition of the
  prefixed surface (no per-host re-declaration), so a schema change cannot
  type one host and miss the other.

### Key Entities *(include if feature involves data)*

- **StacExtensionProperties (LinkML class)**: The canonical model of the
  Debrief `debrief:*` extension fields. Each slot carries a `slot_uri` of the
  form `debrief:<name>`. Today its generated TypeScript strips the prefix.
- **Prefixed properties surface**: The LinkML-derived typed view whose keys
  carry the `debrief:` prefix, matching on-disk JSON exactly. This is the new
  contract the writers' access sites bind to.
- **StacItem.properties (writer surface)**: The properties bag accepted and
  emitted by the writer. Today an untyped `Record<string, unknown>` for the
  `debrief:*` fields. Target: modelled `debrief:*` fields are typed via the
  prefixed surface while the object stays open for core/third-party keys.
- **Writer access sites**: The concrete read/write points in
  `apps/vscode/src/services/stacService.ts` and
  `apps/web-shell/src/services/stacWriterIdb.ts` that today use prefixed
  string-literal keys with `as` casts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding one new modelled `debrief:*` slot to LinkML and
  regenerating surfaces it as a typed slot at a writer access site with **zero**
  hand-edits to writer-owned types (demonstrated by a worked example or test).
- **SC-002**: A renamed/removed modelled key in the schema, or a typo at a
  call site, causes the typecheck step to **fail the build** (demonstrated by
  a deliberate-error check that is reverted).
- **SC-003**: 100% of the LinkML-modelled `debrief:*` extension fields
  accessed by either writer host (currently 5: `platforms`, `tags`,
  `feature_tags`, `overrides`, `provenance_log`) are covered by the typed
  surface.
- **SC-004**: A write operation produces on-disk JSON byte-for-byte identical
  to the pre-feature output for the same input (golden / round-trip check),
  confirming typing-only with no data migration.
- **SC-005**: The CI drift gate fails when the prefix-aware typing artefact
  diverges from the LinkML schema, and passes when in sync.
- **SC-006**: The Article II.1 audit deferral recorded in #240 (modelled
  `debrief:*` access via hand-typed `Record<string, unknown>`) is closed — the
  writer no longer relies on an untyped bag for the modelled fields.

## Assumptions

- **Scope = both writer hosts, read & write, modelled fields only.** The five
  fields modelled in `stac-extension.yaml`'s `StacExtensionProperties` are the
  authoritative typed set. `debrief:label`, `debrief:snapshotTimestamp`, and
  the asset-level `debrief:toolId` are out of the modelled set and remain
  open-content unless separately modelled (not in scope here).
- **Implementation route is a planning decision.** The two routes named in the
  backlog — (a) a generator extension / post-processor emitting a sibling
  prefixed interface, vs. (b) refactoring the writer's access pattern to
  unprefixed keys plus a serialisation adapter — both satisfy these
  requirements. The choice (and its blast radius / cost trade-off, est. 3–5
  vs. 5–8 dev-days) is deferred to `/speckit.plan` and `/speckit.review`.
- **Builds on #240.** `PropertiesProvenanceEntry` is already LinkML-derived
  and a schema drift gate already exists; this feature extends that
  infrastructure rather than inventing a new one.
- **Sequencing.** The backlog notes this should land alongside the next
  significant `services/stac` MCP contract iteration so related contract work
  ships together. This is a coordination preference, not a hard blocker for
  the spec; the planning phase should confirm timing.
- **Python side unaffected.** This concerns the TypeScript writer surface;
  Pydantic-side typing is out of scope.

## Dependencies

- **#240** (LinkML-derive writer types + drift gate) — complete; provides
  `PropertiesProvenanceEntry` and the drift-gate pattern this feature reuses.
- **#236** (web-shell STAC writes; writer is single source of truth across
  both hosts) — complete; establishes the shared writer surface being typed.
- **LinkML `gen-typescript` toolchain** — the generator whose prefix-stripping
  behaviour this feature works around or extends.

## Out of Scope

- Changing the on-disk JSON format or any data migration.
- Modelling additional `debrief:*` fields beyond those already in
  `StacExtensionProperties` (beyond a throwaway field used to demonstrate
  SC-001/SC-002).
- Reader/display code paths outside the two writer hosts.
- Python / Pydantic typing changes.
