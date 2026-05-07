# Feature Specification: LinkML-derive `@debrief/stac-writer` contract types

**Feature Branch**: `240-linkml-stac-writer-types`
**Created**: 2026-05-07
**Status**: Draft
**Input**: User description: "LinkML-derive `@debrief/stac-writer`'s `StacItem` and `PropertiesProvenanceEntry` types — after #236 the canonical declarations of those two types live in `@debrief/stac-writer` (review 2A made it the single source of truth across both hosts), but they're hand-written. Article II.1 says LinkML schemas are the single source of truth for ALL data structures; hand-written types put the writer at risk of drifting from the schema as new `debrief:*` extension fields land. `shared/schemas/src/linkml/stac-extension.yaml` already models the Debrief STAC extension properties; this spec wires the existing generators (gen-typescript, gen-pydantic) into `@debrief/stac-writer`'s build so the contract types come from LinkML, not hand. `PropertiesProvenanceEntry` needs adding to LinkML (currently only the abstract `provenance` slot exists in `common.yaml` — the structured per-entry shape is hand-written in `apps/vscode/src/services/stacService.ts`). Reduces drift risk on the writer's contract surface; closes the gap between Article II.1's promise and the writer's reality. Estimate 2–4 dev-days. (follow-up to #236 review 2A)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema-driven extension fields propagate to the writer (Priority: P1)

As a Debrief platform engineer, I add a new `debrief:*` extension field to the canonical LinkML schema once, and the new field appears automatically on the writer's `StacItem` contract surface in both Python and TypeScript hosts — with no hand-edits to the writer.

**Why this priority**: This is the core promise of Article II.1 ("LinkML schemas are the single source of truth for ALL data structures"). Today the writer is the only remaining hand-written gap, and it sits on the path that *every* STAC Item written to disk passes through. Closing this gap eliminates the "schema vs. writer" drift class entirely; nothing else delivered by this feature matters if this story does not work.

**Independent Test**: Add a single representative new field (e.g. `debrief:test_field`) to the LinkML schema source on a throwaway branch, run the build, and confirm the field appears on both the TypeScript writer surface and the Python equivalent without editing any file in `@debrief/stac-writer` or in the Python service code by hand. Revert.

**Acceptance Scenarios**:

1. **Given** a new optional `debrief:*` property added to the canonical LinkML schema, **When** the build runs, **Then** the writer's TypeScript `StacItem` type and the Python equivalent both include the new property with no hand-edit to the writer.
2. **Given** a removed or renamed `debrief:*` property in the canonical schema, **When** the build runs, **Then** call-sites in the writer that referenced the old name fail to compile (TypeScript) or fail validation (Python) on the next type-check / test run, surfacing the breakage at build time rather than at runtime.
3. **Given** a developer hand-edits a generated artefact in the writer (e.g. to "fix" a property name locally), **When** they push and CI runs, **Then** the build fails with a clear message that the artefact must be regenerated from LinkML.

---

### User Story 2 - `PropertiesProvenanceEntry` becomes a first-class schema entity (Priority: P1)

As a Debrief platform engineer, I can express the per-entry provenance shape (who/what made a change, when, against which item) once in the LinkML source and have the same structure exposed by both the writer's TypeScript types and the Python service models.

**Why this priority**: Provenance is mandated by the constitution ("Provenance always — every transformation records lineage"). The per-entry shape is currently the most-touched hand-written type in the writer pipeline because every write produces one. Promoting it from `apps/vscode/src/services/stacService.ts` into LinkML is a prerequisite for Story 1 to be complete — without it, the writer still has a hand-written contract type even after Story 1 lands. P1 alongside Story 1.

**Independent Test**: Read the LinkML schema after this story; confirm `PropertiesProvenanceEntry` exists as a concrete class with the same attributes that today live in the hand-written declaration. Confirm the writer no longer declares its own version; it imports the generated one (or re-exports it).

**Acceptance Scenarios**:

1. **Given** the canonical LinkML schema after this story lands, **When** a developer searches for the per-entry provenance shape, **Then** they find one definition (in LinkML), not two.
2. **Given** an existing STAC Item on disk written before this feature shipped, **When** the writer reads its `properties.provenance` array using the LinkML-derived type, **Then** the data parses without error and round-trips to disk byte-equivalent (modulo whitespace/property order normalisation already permitted by today's pipeline).
3. **Given** a provenance entry shape change is requested (e.g. add a new attribute), **When** a developer implements it, **Then** the change lives in LinkML only; no hand-written type in `apps/vscode/src/services/stacService.ts` or in `@debrief/stac-writer` needs to be touched.

---

### User Story 3 - Drift detection in CI (Priority: P2)

As a CI gatekeeper, I want the build to fail fast if any LinkML-generated type in the writer is out of date with respect to its schema source, so that drift cannot land on `main`.

**Why this priority**: Story 1 and Story 2 close the *current* gap; Story 3 prevents it from re-opening. Without drift detection, a future contributor could regenerate types locally, then later edit the generated file by hand to "patch" something, re-introducing the drift class this feature exists to eliminate. P2 because the feature still delivers value without it (the gap is closed at merge time), but its long-term durability depends on it.

**Independent Test**: On a throwaway branch, hand-edit a generated artefact in the writer to introduce a subtle difference (e.g. flip a property from optional to required). Push. Confirm CI fails on the drift check before any unit test runs. Revert.

**Acceptance Scenarios**:

1. **Given** a PR that hand-edits a generated artefact, **When** CI runs, **Then** a single, named CI step fails with a message identifying the drifted file and the schema source it should match.
2. **Given** a PR that legitimately updates the LinkML schema *and* the regenerated artefacts together, **When** CI runs, **Then** the drift check passes (because the artefacts match the new source).
3. **Given** a PR that only updates the LinkML schema and forgets to regenerate, **When** CI runs, **Then** the drift check fails and the message tells the developer which generator command to run locally.

---

### Edge Cases

- **Generator output differs structurally between runs** (e.g. property order, comment headers): the drift check must normalise predictably so that semantically-equivalent regenerations don't trip CI; structurally meaningful changes still must be caught.
- **A consumer in a different package** (e.g. `apps/vscode`) imports the hand-written `PropertiesProvenanceEntry` type directly: the migration must update that import, or provide a stable re-export from the writer, so existing call-sites compile without per-call edits.
- **Already-emitted STAC Items on disk** (in `preview/workspace/samples/local-store/` and any user catalogs) carry the *current* provenance shape. The LinkML class must accept that shape unchanged; if reasonable defaults are added (e.g. a new optional attribute), they must default safely on reads.
- **Generator name collision**: the LinkML TypeScript generator emits `StacItem`; the writer also declares `StacItem`. The migration must remove the hand-written declaration in the same change that introduces the import, otherwise both names exist and TypeScript will reject the duplicate.
- **Pydantic-generated class shape vs hand-written shape diverges** in subtle ways (e.g. `Optional[str]` vs `str | None`, alias vs field name). The migration must verify the on-the-wire JSON output is unchanged — not just that Python type-check passes.
- **CI environment lacks the LinkML generators**: the build must fail with a clear "install / pin generator version" message rather than silently skipping the regeneration step.
- **Two `StacItem`s in the world**: STAC's own Item shape (from the STAC 1.1 spec) and the Debrief-extended Item shape co-exist in the codebase. The writer's `StacItem` is the *Debrief-extended* one; the migration must not accidentally re-bind it to the bare STAC shape, or extension fields will silently disappear from the writer's surface.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `@debrief/stac-writer` package MUST consume LinkML-generated TypeScript declarations for `StacItem` and `PropertiesProvenanceEntry` as its contract types, replacing today's hand-written declarations.
- **FR-002**: The Python service code that emits or consumes the same shapes (today centred on `apps/vscode/src/services/stacService.ts` for TypeScript, and equivalent Python service code for Pydantic models) MUST consume LinkML-generated Pydantic models for those classes.
- **FR-003**: `PropertiesProvenanceEntry` MUST be added to the canonical LinkML schema source as a concrete class, with attributes promoted from the current hand-written declaration; the abstract `provenance` slot in `common.yaml` MUST reference this concrete class.
- **FR-004**: The build for `@debrief/stac-writer` MUST regenerate the TypeScript declarations from LinkML before any consumer (the writer itself, downstream packages, the publish step) imports them, so a stale generated artefact cannot ship.
- **FR-005**: A change to the canonical LinkML schema source (adding, removing, or modifying a `debrief:*` extension field, or modifying the `PropertiesProvenanceEntry` shape) MUST flow into both the TypeScript writer surface and the Python equivalent without any hand-edit to the writer's contract files.
- **FR-006**: CI MUST fail any pull request whose generated artefact has drifted from its LinkML source, naming the offending file and the regeneration command in the failure message.
- **FR-007**: Existing call-sites in `apps/vscode/src/services/stacService.ts` (and any other in-repo consumers of the hand-written `PropertiesProvenanceEntry` or hand-written writer-side `StacItem`) MUST compile against the LinkML-derived equivalents without behaviour change at the JSON level.
- **FR-008**: STAC Items already present in `preview/workspace/samples/local-store/` MUST continue to load through the writer with no change to on-disk JSON; round-tripping such an item through read-then-write MUST produce a byte-equivalent file (subject to existing whitespace/order normalisation rules already applied by today's pipeline).
- **FR-009**: The writer MUST NOT export two type names for the same shape (e.g. one hand-written `StacItem` and one re-exported generated `StacItem`); exactly one canonical export of each contract type MUST be visible to consumers.
- **FR-010**: Generated artefacts checked into the repository (if any) MUST be marked as generated (header comment, `.gitattributes` entry, or both) so that contributors and review tools recognise them as not for hand-edit.

### Key Entities *(include if feature involves data)*

- **StacItem (Debrief-extended)**: The shape of a STAC Item as accepted and emitted by `@debrief/stac-writer`. Includes the standard STAC 1.1 properties plus all `debrief:*` extension properties modelled in `shared/schemas/src/linkml/stac-extension.yaml`. Today: hand-written in `@debrief/stac-writer`. Target: LinkML-generated, imported (or re-exported) by the writer; same nominal name preserved for downstream consumers.
- **PropertiesProvenanceEntry**: One entry in a STAC Item's `properties.provenance` array. Records who or what made a change to the item, when it was made, and the antecedent inputs. Today: hand-written in `apps/vscode/src/services/stacService.ts`. Target: a concrete LinkML class, with the abstract `provenance` slot in `common.yaml` referring to it; generated into both TypeScript and Pydantic.
- **LinkML schema source** (`shared/schemas/src/linkml/stac-extension.yaml` and related files): The single canonical declaration of the writer's contract surface. Already exists and already drives generation for other consumers; this feature wires it into the writer too.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single new representative `debrief:*` field added to the canonical LinkML schema appears in both the TypeScript writer surface and the Python equivalent after one build, with zero hand-edits to files outside the schema source. (Measured by adding a probe field on a throwaway branch and inspecting the generated artefacts.)
- **SC-002**: Zero hand-written declarations of `StacItem` or `PropertiesProvenanceEntry` remain in `@debrief/stac-writer` or in `apps/vscode/src/services/stacService.ts` after the feature lands. (Measured by repository search; baseline today is two — one per type.)
- **SC-003**: A PR that hand-edits any generated artefact fails CI within one pipeline run, with a failure message that names the drifted file and the regeneration command. (Measured by a deliberate drift PR run during acceptance.)
- **SC-004**: 100% of STAC Items in `preview/workspace/samples/local-store/` continue to load through the writer and round-trip to byte-equivalent JSON after the migration. (Measured by an existing or new round-trip test against the sample catalog.)
- **SC-005**: An Article II.1 audit (manual review against the constitution) reports zero remaining hand-written contract types on the writer's surface after this feature lands. (Today the audit lists `StacItem` and `PropertiesProvenanceEntry` as the only outstanding gaps.)
- **SC-006**: Time for a future contributor to add a new `debrief:*` extension field, end-to-end, drops to one schema edit plus regeneration, with no hand-edits to writer-side type files. (Measured by walking through a representative addition during acceptance.)

## Assumptions

- The existing LinkML generators (`gen-typescript`, `gen-pydantic`) — already used elsewhere in this monorepo per the active-technologies list in `CLAUDE.md` — are the right generators to wire into `@debrief/stac-writer`, with no need to introduce a new generator or fork an existing one.
- The build orchestration already in place (Taskfile + pnpm + uv-driven schema build) is the right place to add the writer's regeneration step; no new build tool is required to deliver this feature.
- "Behaviour-equivalent" at acceptance means: identical on-the-wire JSON, identical required-vs-optional field semantics, and no rename of public property names. Internal naming conventions (e.g. snake_case vs camelCase in the generated TypeScript) MAY differ from today as long as the JSON surface is unchanged.
- The 2–4 dev-day estimate carried on the backlog item is a planning hint, not a contract; the spec does not encode it as a success criterion.
- `@debrief/stac-writer`'s role as the single source of truth across both hosts (the conclusion of #236 review 2A) is settled and not re-litigated by this feature.
- No new public API surface is added by this feature; the writer's type names and import paths visible to downstream consumers remain stable across the migration.

## Dependencies

- **#236 (web-shell STAC writes / writer is single source of truth)** — already merged; this feature builds directly on the placement decision made by review 2A.
- **`shared/schemas/src/linkml/stac-extension.yaml`** — exists and already models the Debrief STAC extension properties; this feature reuses it without restructuring it (other than adding the `PropertiesProvenanceEntry` class noted in FR-003).
- **Existing LinkML generator pipeline** — `gen-typescript` and `gen-pydantic` already produce types for other packages in the monorepo and are assumed available in CI; this feature does not introduce a new generator dependency.
