# Feature Specification: Document LinkML Platform Override Decisions

**Feature Branch**: `183-document-linkml-decisions`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Note the decisions made for 181 in the planning post document"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Schema Restructuring Decisions as ADRs (Priority: P1)

A project contributor starting work on a downstream feature (e.g., save-time resolution, CQL2 array filtering, or NL query generation) needs to understand why the STAC metadata was restructured from flat aggregate fields to per-platform records, and what constraints apply to the new structures. They consult `docs/project_notes/decisions.md` and find a complete set of ADRs covering the schema changes made in feature 181.

**Why this priority**: Downstream features (#183 save-time resolution, #185 CQL2 array filter, #186 filter bar UI, #188 NL queries) all depend on the schema structures introduced in 181. Without documented rationale, contributors may misunderstand the design intent, reintroduce flat aggregates, or place types in the wrong schema module.

**Independent Test**: Can be verified by reading `docs/project_notes/decisions.md` and confirming that each decision from the 181 planning post has a corresponding ADR entry with context, alternatives, and consequences.

**Acceptance Scenarios**:

1. **Given** the planning post for feature 181 contains 6 key decisions, **When** a contributor opens `docs/project_notes/decisions.md`, **Then** they find an ADR entry for each of the 6 decisions with date, context, decision, alternatives considered, and consequences.
2. **Given** a contributor is unsure why `VesselDomainEnum` lives in `common.yaml` rather than `stac-extension.yaml`, **When** they search the decisions file, **Then** they find the specific ADR explaining the dependency direction rationale.

---

### User Story 2 - Understand Transition Strategy for Flat Aggregates (Priority: P2)

A contributor working on catalog migration or fixture regeneration needs to understand the transition plan for the legacy flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`). They consult the decisions file and find a clear record of why these fields were retained alongside the new `debrief:platforms` array, and when they will be removed.

**Why this priority**: The coexistence of old and new fields is a deliberate transition strategy. Without documentation, a contributor might prematurely remove the flat fields (breaking existing fixtures and catalogs) or assume the new fields are optional.

**Independent Test**: Can be verified by confirming the decisions file contains an ADR about the transition strategy that explicitly states flat fields remain during transition and references the cleanup timeline.

**Acceptance Scenarios**:

1. **Given** the decisions file has been updated, **When** a contributor searches for "flat aggregate" or "transition", **Then** they find an ADR explaining the dual-field strategy and the conditions for eventual removal.

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
- **FR-005**: The ADR covering `VesselDomainEnum` placement MUST explain the dependency direction rationale (GeoJSON should not depend on STAC extension).
- **FR-006**: The ADR covering the flat aggregate transition MUST state that legacy fields are retained during the transition period and reference the planned cleanup.
- **FR-007**: The ADR covering `PlatformRecord` requirements MUST document that only `id` is required and explain why sparse records are valid.

### Key Entities

- **Architectural Decision Record (ADR)**: A structured record capturing the context, decision, alternatives, and consequences of a significant project decision. Stored in `docs/project_notes/decisions.md` with sequential numbering.
- **Planning Post**: The source document for feature 181 containing the 6 decisions to be recorded. Located at `specs/181-linkml-platform-overrides/media/planning-post.md`.

### Decisions to Record

The following 6 decisions from the 181 planning post must each become an ADR:

1. **VesselDomainEnum placement** — Move from `stac-extension.yaml` to `common.yaml` to avoid GeoJSON depending on the STAC extension module.
2. **PlatformRecord scope** — A STAC extension entity representing fully-resolved metadata, not a general-purpose type. Lives in `stac-extension.yaml`.
3. **Flat aggregate field transition** — Legacy fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) remain alongside new `debrief:platforms` array during transition.
4. **PlatformRecord minimal requirements** — Only `id` is required; sparse records with no registry data and no analyst overrides are valid.
5. **Override field pattern constraints** — Nationality uses ISO 3166-1 alpha-2 (`^[A-Z]{2}$`), vessel class uses slash-delimited lowercase segments, domain reuses existing enum.
6. **Targeted fixture strategy** — New golden fixtures (~7) cover the new structures without modifying the existing 100-item exercise set.

## Assumptions

- The ADR numbering continues sequentially from the current last entry (ADR-011), starting at ADR-012.
- All 6 decisions are recorded as separate ADR entries (not combined into a single entry), since each addresses a distinct concern.
- The decisions are recorded as made at planning time; if implementation diverged, that can be noted in future ADR amendments.
- The planning post is the authoritative source for the decision rationale. ADR text should faithfully capture the intent without reinterpreting it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 6 decisions from the feature 181 planning post are represented as individual ADR entries in `docs/project_notes/decisions.md`.
- **SC-002**: Each ADR entry contains all required sections (context, decision, alternatives considered, consequences) with substantive content — no placeholder text.
- **SC-003**: A contributor unfamiliar with feature 181 can read any single ADR and understand what was decided, why, what was rejected, and what trade-offs were accepted — without needing to consult the original planning post.
- **SC-004**: Each ADR is findable by searching for relevant keywords (e.g., "PlatformRecord", "VesselDomainEnum", "flat aggregate", "override", "fixture").
