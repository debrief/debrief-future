# Feature Specification: LinkML-derive `@debrief/stac-writer` contract types

**Feature Branch**: `240-linkml-stac-writer-types`
**Created**: 2026-05-07
**Status**: Draft
**Input**: User description: "LinkML-derive `@debrief/stac-writer`'s `StacItem` and `PropertiesProvenanceEntry` types — after #236 the canonical declarations of those two types live in `@debrief/stac-writer` (review 2A made it the single source of truth across both hosts), but they're hand-written. Article II.1 says LinkML schemas are the single source of truth for ALL data structures; hand-written types put the writer at risk of drifting from the schema as new `debrief:*` extension fields land. `shared/schemas/src/linkml/stac-extension.yaml` already models the Debrief STAC extension properties; this spec wires the existing generators (gen-typescript, gen-pydantic) into `@debrief/stac-writer`'s build so the contract types come from LinkML, not hand. `PropertiesProvenanceEntry` needs adding to LinkML (currently only the abstract `provenance` slot exists in `common.yaml` — the structured per-entry shape is hand-written in `apps/vscode/src/services/stacService.ts`). Reduces drift risk on the writer's contract surface; closes the gap between Article II.1's promise and the writer's reality. Estimate 2–4 dev-days. (follow-up to #236 review 2A)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single canonical `PropertiesProvenanceEntry` shape (Priority: P1)

As a Debrief platform engineer, I find exactly one definition of the per-entry provenance shape — the LinkML class — instead of three divergent hand-written TypeScript declarations that subtly disagree.

**Why this priority**: Today the same concept is declared in three TypeScript places that don't agree (the writer says `source: 'user' | 'tool' | 'import'`; the components package says `source: 'user'`; the LinkML schema — the canonical source — says `source: 'user'` only via `pattern: "^user$"`). This is a textbook drift symptom and exactly the class of problem Article II.1 exists to prevent. Closing it means schema changes flow to the runtime types and the audit-trail contract is unambiguous. **Note**: After `/speckit.review` the broader "new `debrief:*` fields propagate to the writer's typed surface" promise was deferred — see the Key Entities note on `StacItem` and the related backlog item — because it requires a `gen-typescript` prefix-aware emitter that is out of scope for this feature. This feature delivers the consolidation half of that promise; the prefix-aware part is captured as a follow-up.

**Independent Test**: Search the repository for `interface PropertiesProvenanceEntry` and `type PropertiesProvenanceEntry =`. After the feature lands, exactly one *body* declaration exists (the auto-generated one in `shared/schemas/src/generated/typescript/types.ts`), and every other site is a re-export or a hybrid intersection that delegates to the generated type.

**Acceptance Scenarios**:

1. **Given** the canonical LinkML schema is the source of truth for `PropertiesProvenanceEntry`, **When** a developer changes the schema (e.g. adds a new attribute or tightens a pattern), **Then** the change flows into the generated TypeScript and Pydantic types after a single `task schema:generate` run, with no hand-edit to `@debrief/stac-writer` or `@debrief/components`.
2. **Given** the writer and components packages today disagree on the type's shape (e.g. the writer's `source` enum carries dead-code values `'tool'` and `'import'`), **When** the migration completes, **Then** all three TS sites resolve to the same shape (the generated one, optionally narrowed by an intersection in the components package).
3. **Given** a developer hand-edits a generated artefact under `shared/schemas/src/generated/`, **When** they push and CI runs, **Then** the build fails with a clear message naming the regeneration command (covered by Story 3).

---

### User Story 2 - Drift detection in CI (Priority: P2)

As a CI gatekeeper, I want the build to fail fast if any LinkML-generated type in the writer is out of date with respect to its schema source, so that drift cannot land on `main`.

**Why this priority**: Story 1 closes the *current* gap; Story 2 prevents it from re-opening. Without drift detection, a future contributor could regenerate types locally, then later edit the generated file by hand to "patch" something, re-introducing the drift class this feature exists to eliminate. P2 because the feature still delivers value without it (the gap is closed at merge time), but its long-term durability depends on it.

**Independent Test**: On a throwaway branch, hand-edit a generated artefact in the writer to introduce a subtle difference (e.g. flip a property from optional to required). Push. Confirm CI fails on the drift check before any unit test runs. Revert.

**Acceptance Scenarios**:

1. **Given** a PR that hand-edits a generated artefact, **When** CI runs, **Then** a single, named CI step fails with a message identifying the drifted file and the schema source it should match.
2. **Given** a PR that legitimately updates the LinkML schema *and* the regenerated artefacts together, **When** CI runs, **Then** the drift check passes (because the artefacts match the new source).
3. **Given** a PR that only updates the LinkML schema and forgets to regenerate, **When** CI runs, **Then** the drift check fails and the message tells the developer which generator command to run locally.

---

### Edge Cases

- **Generator non-determinism** (e.g. property order, comment headers, embedded timestamps): the drift check must rest on byte-stable generator output. If `gen-typescript` or `gen-pydantic` is non-deterministic across runs, the drift gate becomes a flaky CI step; this is a P0 verification before the gate ships (see plan / tasks). If non-deterministic, a normalisation pass (e.g. `prettier --write` on generated TS) must run between regeneration and the diff check.
- **A consumer in a different package** (e.g. `apps/vscode`) imports the hand-written `PropertiesProvenanceEntry` type directly: the migration must keep the import paths stable (re-export through the existing `@debrief/components/PropertiesPanel/provenanceTypes` and `@debrief/stac-writer` surfaces) so call-sites compile without per-call edits.
- **Already-emitted STAC Items on disk** (in `preview/workspace/samples/local-store/` and any user catalogs) carry the *current* provenance shape. The LinkML class must accept that shape unchanged; if reasonable defaults are added (e.g. a new optional attribute), they must default safely on reads.
- **Loss of literal-string narrowing**: LinkML's `gen-typescript` cannot translate `pattern` constraints into TypeScript literal types — the generator emits plain `string`. The migration uses a hybrid intersection in the components-side declaration (`Omit<Generated, 'tool'\|'method'\|'source'> & { tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL; method: \`properties-panel@${string}\`; source: 'user' }`) so that the compile-time guard against typos at write sites is preserved, while the underlying contract still flows from LinkML.
- **Pydantic-generated class shape vs hand-written shape diverges** in subtle ways (e.g. `Optional[str]` vs `str | None`, alias vs field name). The migration must verify the on-the-wire JSON output is unchanged — not just that Python type-check passes.
- **CI environment lacks the LinkML generators**: the build must fail with a clear "install / pin generator version" message rather than silently skipping the regeneration step.
- **Cross-package dependency edge**: the writer (`@debrief/stac-writer`) re-exporting from the components package introduces a new workspace dependency edge `@debrief/stac-writer → @debrief/components`. The import is type-only via the `./PropertiesPanel/provenanceTypes` subpath leaf — no runtime code is pulled — but the package edge is real and is enforced by an ESLint rule banning *runtime* imports from `@debrief/components` in the writer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `@debrief/stac-writer` package MUST consume the LinkML-generated TypeScript declaration for `PropertiesProvenanceEntry` as its contract type, replacing today's hand-written declaration. (Scoping note from `/speckit.review`: the writer's `StacItem` interface remains hand-written. LinkML-deriving its `properties` field requires a `gen-typescript` prefix-aware emitter so that JSON keys like `debrief:provenance_log` map to typed slots — that work is not in scope here, captured as a follow-up backlog item.)
- **FR-002**: The Python service code that emits or consumes the same shapes (today centred on `apps/vscode/src/services/stacService.ts` for TypeScript, and equivalent Python service code for Pydantic models) MUST consume LinkML-generated Pydantic models for those classes.
- **FR-003**: The existing concrete `PropertiesProvenanceEntry` LinkML class in `shared/schemas/src/linkml/stac-extension.yaml` (lines 63–110) MUST be the canonical source; all hand-written TypeScript declarations of the same shape MUST be removed in favour of re-exporting (and, where literal-string narrowing on `tool` / `method` / `source` is required, statically intersecting) the LinkML-generated type. No new LinkML class is added by this feature.
- **FR-004**: The build for `@debrief/stac-writer` MUST regenerate the TypeScript declarations from LinkML before any consumer (the writer itself, downstream packages, the publish step) imports them, so a stale generated artefact cannot ship.
- **FR-005**: A change to the canonical LinkML schema source (adding, removing, or modifying a `debrief:*` extension field, or modifying the `PropertiesProvenanceEntry` shape) MUST flow into both the TypeScript writer surface and the Python equivalent without any hand-edit to the writer's contract files.
- **FR-006**: CI MUST fail any pull request whose generated artefact has drifted from its LinkML source, naming the offending file and the regeneration command in the failure message.
- **FR-007**: Existing call-sites in `apps/vscode/src/services/stacService.ts` (and any other in-repo consumers of the hand-written `PropertiesProvenanceEntry` or hand-written writer-side `StacItem`) MUST compile against the LinkML-derived equivalents without behaviour change at the JSON level.
- **FR-008**: STAC Items already present in `preview/workspace/samples/local-store/` MUST continue to load through the writer with no change to on-disk JSON; round-tripping such an item through read-then-write MUST produce a byte-equivalent file (subject to existing whitespace/order normalisation rules already applied by today's pipeline).
- **FR-009**: The writer MUST NOT export two declarations for the same shape (e.g. one hand-written `PropertiesProvenanceEntry` and one re-exported `PropertiesProvenanceEntry` that resolve to different types); exactly one canonical export of each migrated contract type MUST be visible to consumers, and tsc MUST detect any duplicate as an error.
- **FR-010**: Generated artefacts checked into the repository (if any) MUST be marked as generated (header comment, `.gitattributes` entry, or both) so that contributors and review tools recognise them as not for hand-edit.

### Key Entities *(include if feature involves data)*

- **StacItem (Debrief-extended)**: The shape of a STAC Item as accepted and emitted by `@debrief/stac-writer`. Includes the standard STAC 1.1 properties plus all `debrief:*` extension properties modelled in `shared/schemas/src/linkml/stac-extension.yaml`. Today: hand-written in `@debrief/stac-writer`. Target (this feature): unchanged — remains hand-written with `properties: Record<string, unknown>`. The "automatic flow of new `debrief:*` fields to the writer's typed surface" promise is deferred to a follow-up that solves the prefix-aware emitter problem.
- **PropertiesProvenanceEntry**: One entry in a STAC Item's `properties.provenance` array. Records who or what made a change to the item, when it was made, and the antecedent inputs. Today: three divergent hand-written TypeScript declarations (in `@debrief/stac-writer`, `@debrief/components`, transitively `apps/vscode`). The canonical concrete class already exists in LinkML (`shared/schemas/src/linkml/stac-extension.yaml:63–110`) and is already generated into `@debrief/schemas`. Target: the existing LinkML class is the canonical source; the components-side declaration becomes a hybrid intersection (`Omit<Generated, 'tool'\|'method'\|'source'> & { tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL; method: \`properties-panel@${string}\`; source: 'user' }`) that preserves literal-string narrowing for compile-time safety; the writer re-exports from the components-side declaration.
- **LinkML schema source** (`shared/schemas/src/linkml/stac-extension.yaml` and related files): The single canonical declaration of the writer's contract surface. Already exists and already drives generation for other consumers; this feature wires it into the writer too.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A change to the `PropertiesProvenanceEntry` shape in the canonical LinkML schema (e.g. a new optional attribute, a tightened pattern) flows into the generated TypeScript and Pydantic types after one `task schema:generate` run, with zero hand-edits to files outside the schema source. (Measured by adding a probe attribute on a throwaway branch and inspecting the regenerated artefacts.)
- **SC-002**: Exactly one *body* declaration of `PropertiesProvenanceEntry` remains in the repository — the auto-generated `interface` in `shared/schemas/src/generated/typescript/types.ts`. Every other site is a re-export or a hybrid intersection that delegates to it. (Measured by repository search for `interface PropertiesProvenanceEntry` and `type PropertiesProvenanceEntry =`; baseline today is three TS body declarations.)
- **SC-003**: A PR that hand-edits any generated artefact under `shared/schemas/src/generated/` fails CI within one pipeline run, with a failure message that names the drifted file and the regeneration command (`task schema:generate` or the fallback `cd shared/schemas && uv run python scripts/generate.py`). (Measured by a deliberate drift PR run during acceptance.)
- **SC-004**: 100% of STAC Items in `preview/workspace/samples/local-store/` continue to load through the writer and round-trip to byte-equivalent JSON after the migration. (Measured by the existing Python round-trip test plus a new TS-side smoke test against the sample catalog.)
- **SC-005**: An Article II.1 audit (manual review against the constitution) reports `PropertiesProvenanceEntry` as no longer hand-written after this feature lands. The remaining gap (`StacItem`'s hand-written interface, blocked on the prefix-aware emitter follow-up) is documented as a known deferral with a tracked backlog entry, not as an open audit finding.
- **SC-006**: Time for a future contributor to change the `PropertiesProvenanceEntry` shape, end-to-end, drops to one schema edit plus regeneration, with no hand-edits to writer-side or components-side type bodies. (Measured by walking through a representative attribute addition during acceptance.)
- **SC-007**: Generator output is byte-deterministic — running `python scripts/generate.py` twice on a clean checkout produces zero `git diff` under `shared/schemas/src/generated/`. (Measured as a P0 verification step before the drift gate ships; if non-deterministic, a normalisation pass is added between regeneration and diff.)

## Assumptions

- The existing LinkML generators (`gen-typescript`, `gen-pydantic`) — already used elsewhere in this monorepo per the active-technologies list in `CLAUDE.md` — are the right generators to wire into `@debrief/stac-writer`, with no need to introduce a new generator or fork an existing one.
- The build orchestration already in place (Taskfile + pnpm + uv-driven schema build) is the right place to add the writer's regeneration step; no new build tool is required to deliver this feature.
- "Behaviour-equivalent" at acceptance means: identical on-the-wire JSON, identical required-vs-optional field semantics, and no rename of public property names. Internal naming conventions (e.g. snake_case vs camelCase in the generated TypeScript) MAY differ from today as long as the JSON surface is unchanged.
- The 2–4 dev-day estimate carried on the backlog item is a planning hint, not a contract; the spec does not encode it as a success criterion.
- `@debrief/stac-writer`'s role as the single source of truth across both hosts (the conclusion of #236 review 2A) is settled and not re-litigated by this feature.
- No new public API surface is added by this feature; the writer's type names and import paths visible to downstream consumers remain stable across the migration.

## Dependencies

- **#236 (web-shell STAC writes / writer is single source of truth)** — already merged; this feature builds directly on the placement decision made by review 2A.
- **`shared/schemas/src/linkml/stac-extension.yaml`** — exists and already models the Debrief STAC extension properties, including the concrete `PropertiesProvenanceEntry` class; this feature reuses it as-is. No LinkML edits are required by this feature.
- **Existing LinkML generator pipeline** — `gen-typescript` and `gen-pydantic` already produce types for other packages in the monorepo and are assumed available in CI; this feature does not introduce a new generator dependency.
