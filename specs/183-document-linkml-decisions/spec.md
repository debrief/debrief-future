# Feature Specification: Document LinkML Platform Override Decisions

**Feature Branch**: `183-document-linkml-decisions`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Note the decisions made for 181 in the planning post document"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Schema Restructuring Decisions as ADRs (Priority: P1)

A project contributor starting work on a downstream feature (e.g., save-time resolution, CQL2 array filtering, or NL query generation) needs to understand why the STAC metadata was restructured from flat aggregate fields to per-platform records, and what constraints apply to the new structures. They consult `docs/project_notes/decisions.md` and find a complete set of ADRs covering the schema changes made in feature 181.

**Why this priority**: Downstream features (#185 CQL2 array filter, #186 filter bar UI, #188 NL queries) all depend on the schema structures introduced in 181. Without documented rationale, contributors may misunderstand the design intent, reintroduce flat aggregates, or place types in the wrong schema module.

**Independent Test**: Can be verified by reading `docs/project_notes/decisions.md` and confirming that each decision from the 181 planning post has a corresponding ADR entry with context, alternatives, and consequences.

**Acceptance Scenarios**:

1. **Given** the planning post for feature 181 contains key decisions, **When** a contributor opens `docs/project_notes/decisions.md`, **Then** they find an ADR entry for each decision with date, context, decision, alternatives considered, and consequences.
2. **Given** a contributor is unsure why `VesselDomainEnum` lives in `common.yaml` rather than `stac-extension.yaml`, **When** they search the decisions file, **Then** they find the specific ADR explaining the dependency direction rationale.

---

### User Story 2 - Understand Clean Break from Flat Aggregates (Priority: P2)

A contributor working on catalog queries or fixture generation needs to understand that the flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) have been replaced — not supplemented — by `debrief:platforms`. They consult the decisions file and find a clear record that flat fields were removed in favour of the structured array, with the constitutional rationale (Article XIV: no legacy formats pre-v4.0.0).

**Why this priority**: Without this ADR, a contributor might reintroduce flat aggregate fields for "backward compatibility" — violating the constitution's strict-on-import principle. The decision must be recorded clearly: one schema, one format, fix the data.

**Independent Test**: Can be verified by confirming the decisions file contains an ADR that explicitly states flat aggregate fields are removed (not retained), cites Article XIV, and mandates that all fixtures and sample data conform to the `debrief:platforms` structure.

**Acceptance Scenarios**:

1. **Given** the decisions file has been updated, **When** a contributor searches for "flat aggregate" or "platforms", **Then** they find an ADR stating that flat fields are removed and `debrief:platforms` is the sole mechanism for per-item platform metadata.
2. **Given** a contributor proposes adding back a `debrief:nationalities` convenience field, **When** they check the decisions file, **Then** they find the ADR citing Article XIV.4 and XIV.5 as the rationale for a single canonical format.

---

### User Story 3 - Verify Decision Traceability to Feature 181 (Priority: P3)

A project maintainer performing a periodic review of architectural decisions needs to trace each ADR back to the feature that motivated it. Each new ADR references feature 181 and its planning post as the source.

**Why this priority**: Traceability between decisions and features ensures the rationale can be reviewed in its original context if questions arise later.

**Independent Test**: Can be verified by checking that each new ADR entry references feature 181 or the E10 epic context.

**Acceptance Scenarios**:

1. **Given** the new ADR entries have been written, **When** a reviewer inspects them, **Then** each entry references feature 181 (LinkML platform overrides) as the originating feature.

---

### Edge Cases

- What happens if a decision from 181 overlaps with or refines an existing ADR (e.g., ADR-002 Schema-First with LinkML)? The new ADR should reference the earlier decision and explain how it extends or refines it, not contradict it.
- What if the planning post contains decisions that were later revised during implementation? The ADR should record the decision as made at planning time, with a note if the implementation diverged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project decisions file (`docs/project_notes/decisions.md`) MUST contain a new ADR for each of the 6 key decisions documented in the feature 181 planning post.
- **FR-002**: Each ADR MUST follow the established format: date, ADR number, context, decision, alternatives considered, and consequences.
- **FR-003**: Each ADR MUST be sequentially numbered continuing from the last existing entry (currently ADR-011).
- **FR-004**: Each new ADR MUST reference feature 181 (LinkML platform overrides) as the originating context.
- **FR-005**: The ADR covering `VesselDomainEnum` placement MUST explain the dependency direction rationale (GeoJSON should not depend on STAC extension) and note that this decision has been documented in multiple planning artifacts but the enum currently remains in `stac-extension.yaml` — the ADR is the definitive record that the move to `common.yaml` is required.
- **FR-006**: The ADR covering flat aggregate removal MUST state that `debrief:vessel_classes`, `debrief:nationalities`, and `debrief:track_names` are removed from the schema (not retained alongside `debrief:platforms`), citing Constitution Article XIV.4 (strict on import) and XIV.5 (fix the data, never relax the schema) as the governing rationale. All fixtures and sample data MUST be regenerated to conform.
- **FR-007**: The ADR covering `PlatformRecord` requirements MUST document that only `id` is required and explain why sparse records are valid.
- **FR-008**: The ADR covering fixture strategy MUST state that all existing fixtures (100 exercise items, legacy sample catalog) are regenerated with `debrief:platforms` — not left in the old format with new fixtures added alongside.

### Key Entities

- **Architectural Decision Record (ADR)**: A structured record capturing the context, decision, alternatives, and consequences of a significant project decision. Stored in `docs/project_notes/decisions.md` with sequential numbering.
- **Planning Post**: The source document for feature 181 containing the 6 decisions to be recorded. Located at `specs/181-linkml-platform-overrides/media/planning-post.md`.

### Decisions to Record

The following decisions from the 181 planning post must each become an ADR. Note: decision #3 (flat aggregate transition) and #6 (targeted fixtures) are **revised** from the planning post to align with Constitution Article XIV.

1. **VesselDomainEnum placement** — Move from `stac-extension.yaml` to `common.yaml` to avoid GeoJSON depending on the STAC extension module. Note: this decision has been documented in 181's research.md and planning post but the enum has not actually been moved yet — the ADR is the definitive record.
2. **PlatformRecord scope** — A STAC extension entity representing fully-resolved metadata, not a general-purpose type. Lives in `stac-extension.yaml`.
3. **Flat aggregate field removal** *(revised from planning post)* — The flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) are **removed**, not retained alongside `debrief:platforms`. Constitution Article XIV.1 permits breaking changes pre-v4.0.0, XIV.4 prohibits accepting multiple input formats, and XIV.5 mandates fixing data to conform to the schema rather than relaxing it. One canonical format: `debrief:platforms`.
4. **PlatformRecord minimal requirements** — Only `id` is required; sparse records with no registry data and no analyst overrides are valid.
5. **Override field pattern constraints** — Nationality uses ISO 3166-1 alpha-2 (`^[A-Z]{2}$`), vessel class uses slash-delimited lowercase segments, domain reuses existing enum.
6. **Complete fixture regeneration** *(revised from planning post)* — All existing fixtures (100 exercise items, legacy sample catalog items) are regenerated with `debrief:platforms` and without the removed flat fields. New golden fixtures (~7) are also added for the new structures (fully-populated records, sparse records, invalid values). This follows from decision #3: if the flat fields are removed, existing data must be fixed to conform.

## Assumptions

- The ADR numbering continues sequentially from the current last entry (ADR-011), starting at ADR-012.
- All 6 decisions are recorded as separate ADR entries (not combined into a single entry), since each addresses a distinct concern.
- The planning post is the starting point for decision rationale, but decisions #3 and #6 are revised to align with the Constitution (Article XIV). The ADRs record the corrected decisions, not the planning post's original "keep flat fields" stance.
- The Constitution supersedes all other documentation (Governance section). Where the planning post conflicts with Article XIV, the Constitution wins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 6 decisions are represented as individual ADR entries in `docs/project_notes/decisions.md`.
- **SC-002**: Each ADR entry contains all required sections (context, decision, alternatives considered, consequences) with substantive content — no placeholder text.
- **SC-003**: A contributor unfamiliar with feature 181 can read any single ADR and understand what was decided, why, what was rejected, and what trade-offs were accepted — without needing to consult the original planning post.
- **SC-004**: Each ADR is findable by searching for relevant keywords (e.g., "PlatformRecord", "VesselDomainEnum", "flat aggregate", "override", "fixture").
- **SC-005**: No ADR contradicts Constitution Article XIV. Specifically, no ADR endorses retaining legacy data formats alongside new ones, and the flat aggregate removal ADR explicitly cites Article XIV as the governing rationale.
