# Specification Quality Checklist: Consolidate spatial types in LinkML + lat/lon ↔ GeoJSON converters

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-04-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — spec references the types and packages involved because they are the domain of this refactor, not as implementation leakage; no code structures or framework choices are prescribed beyond the type shapes already mandated by the existing LinkML schema
- [x] Focused on user value and business needs — "user" here is developer-as-consumer of the shared types; stories are framed around developer outcomes
- [x] Written for stakeholders who care about type consistency and schema adherence (the refactor's audience is technical)
- [x] All mandatory sections completed (User Scenarios, Requirements, Success Criteria)

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — all 3 resolved in `research.md` (R-001, R-002, R-003) and the spec has been updated accordingly
- [x] Requirements are testable and unambiguous — each FR names the file/package and action; each SC has a verifiable outcome
- [x] Success criteria are measurable — grep counts, test-suite pass/fail, evidence screenshots, line-count bounds
- [x] Success criteria are technology-agnostic where possible — SCs are expressed as outcomes (types consolidated, tests pass, smoke tests pass) not as implementation steps; unavoidable technology references (LinkML, Pydantic, TS) are intrinsic to the refactor's scope
- [x] All acceptance scenarios are defined — 4 user stories, each with 2-4 Given/When/Then scenarios
- [x] Edge cases are identified — antimeridian/pole coordinates, persisted tuple-form state, Leaflet vs GeoJSON axis order, validator placement, `SpatialSlice` scope boundary
- [x] Scope is clearly bounded — Out of Scope section enumerates `SpatialSlice`, `TemporalSlice`, `TimeRange`, Python helpers, lint rules
- [x] Dependencies and assumptions identified — 7 assumptions (A1-A7) and Dependencies section

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — FRs map to user story acceptance scenarios and to SCs
- [x] User scenarios cover primary flows — single source of truth, interop boundary, schema regeneration, runtime behaviour
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — FR text discusses shapes and boundaries, not algorithms

## Notes

- **3 [NEEDS CLARIFICATION] markers remain** at FR-003, FR-004, FR-018. These are the maximum allowed and represent genuine design decisions:
  1. `zoom` placement on `ViewportPolygon` vs a sibling `ViewState` — affects schema shape and every downstream consumer
  2. `TimeFilter` canonical shape — conflicts with Review Decision 5C (epoch-nullable numbers vs `TimeInstant` objects); material enough to require explicit resolution
  3. Persisted-state migration strategy — choice between silent migration, version bump with reset, or defer
- All three should be resolved before `/speckit.plan`. The `/speckit.clarify` workflow is the right next step.
- UI Feature Validation items skipped — spec correctly excludes the "User Interface Flow" section because this is a schema/type refactor with no user-facing UI changes.
