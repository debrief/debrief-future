# Specification Quality Checklist: Migrate session-state slices into in-plot SystemState features

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-05-19
**Updated**: 2026-05-19 (Q1/Q2 clarifications + /speckit.review resolutions 1B / 2A / 3A all applied)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — both resolved (Q1 → Option B, Q2 → Option B)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- No UI section — this is a backend / services migration (no dialog, screen, form, app, panel, modal, picker, dropdown, dashboard or other UI keywords). UI Feature Validation checklist skipped per template guidance.
- Strategic constraints from the-ideas-guy approval are all addressed:
  - #1 (#237 contract authority) → "Inherited decisions from #237" subsection + Assumption 1
  - #2 (per-user vs shared) → "Per-slice migration scope" matrix + Q1/Q2 resolutions (both Option B — ship as plot-shared)
  - #3 (sidecar retirement gating) → "Out of scope" subsection + NG-001
  - #4 (#250 web-shell parity) → dedicated "Cross-reference with #250" section
- Q1/Q2 resolution path (Option B + Option B) **expands scope** vs. the spec's documented defaults:
  - `selection` ships now (was: deferred behind #251)
  - `current_time` joins the temporal variant (was: per-user, no schema change)
- Schema growth introduced (`current_time` on `temporal` variant). Spec records this is the ONLY schema extension this work makes.
- Spec is ready for `/speckit.clarify` (if further questions remain) or `/speckit.plan`.

## /speckit.review resolutions (2026-05-19)

The compressed review surfaced three plan defects, all resolved via the highest-impact options:

- **1B — Spatial shape unified**: LinkML `SystemStateProperties.spatial` swapped from `bbox`/`zoom`/`center` to `viewport: ViewportPolygon` (identity-mapped to the slice). Resolves a pre-existing Article II.1 violation in the schema. Article XIV.1 covers the breaking change (zero runtime blast radius — no producers today). New FR-016a added; NG-003 updated.
- **2A — Provenance uses existing LinkML LogEntry fields**: R-008 rewritten to map onto `agent`, `was_generated_by.{tool, tool_version}`, `activity_type`, `timestamp` rather than inventing `host`/`action`/`version`. No `host` field added to LogEntry. SystemStateWriteContext shape in `contracts/system-state-helper.ts.md` updated.
- **3A — Test gaps closed**: FR-018 (cross-field invariant for `current_time`/window) closes F2 silent failure; FR-019 (VS Code save FC-first/sidecar-second) closes F1 silent failure; new legacy-plot fixture corpus closes the SC-005 false-confidence gap. Three test rows added to plan.md's Web-Shell E2E Testing table.

Three backlog items spun off from the review:
- #263 — Spatial-shape cleanup follow-up (any stale references to removed bbox/zoom/center shape)
- #264 — Out-of-window `current_time` policy revisit (if strict-on-import proves user-hostile)
- #265 — VS Code save atomicity (broader — the full save-flow transactional model, beyond just FC↔sidecar)

Spec is ready for `/speckit.tasks`.
