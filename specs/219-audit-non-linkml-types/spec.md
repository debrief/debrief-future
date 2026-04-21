# Feature Specification: Audit non-LinkML Type Declarations

**Feature Branch**: `219-audit-non-linkml-types`
**Created**: 2026-04-21
**Status**: Draft
**Input**: Backlog item #206 — `[E11] Audit non-LinkML type declarations`: produce an inventory of every hand-typed `interface`/`type`/`enum` across `apps/`, `shared/` (excluding `generated/`), and `services/`; classify each entry; emit `docs/type-audit-2026.md`; open follow-up items for every promote-to-LinkML and drift finding not already covered by #203 – #205. Feeds the phase list for Epic E11 (Schema-First Boundary Typing).

## Overview

Our architectural principle holds that LinkML is the root of truth for any type that crosses the Python ↔ TypeScript boundary; single-domain types may be hand-defined *by exception*, but each exception must be an explicit, justified choice rather than an accident. The code-quality review pass that produced PR #465 surfaced multiple cases where hand-typed interfaces had silently drifted from one another or from the LinkML schema (`ResolvedPositionStyle`, `Coordinate`, `ViewportPolygon`, `GeoJSONFeature`, `DisplayMode`, `PlaybackState`, `DatasetEnvelope`, tool-result envelopes, etc.). Each drift has its own follow-up item, but we have no systematic, repository-wide inventory of where our TypeScript types stand against this principle.

This feature delivers that inventory as a single, reviewable report. It is a **read-only analysis task** — no runtime code changes — whose output drives the phase list of Epic E11.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Architecture lead scopes Epic E11 from a complete inventory (Priority: P1)

The E11 epic lead needs to know every place where a TypeScript type is hand-defined outside the LinkML-generated output, so that E11's phase list can be confirmed complete (rather than being a best-effort sample drawn from the PR #465 review). After this feature lands, they open `docs/type-audit-2026.md`, see every non-generated `interface`/`type`/`enum` declaration in the audit scope classified into one of five categories, and can confidently say "E11 covers every boundary that violates the principle."

**Why this priority**: Without a complete inventory, E11 is planned on gut feel. Every phase added later from "we found another one" erodes confidence that the epic has a known endpoint. This story is the whole reason the feature exists.

**Independent Test**: Run the enumeration tooling/process against the current `main` HEAD, confirm the resulting report lists every non-generated `interface`/`type`/`enum` declaration under `apps/`, `shared/` (excluding LinkML-generated output), and `services/`. Spot-check by picking five random TS files from the scope and confirming every declaration they contain appears in the report.

**Acceptance Scenarios**:

1. **Given** the audit has been produced against the current `main` HEAD, **When** a reviewer opens `docs/type-audit-2026.md`, **Then** they can see the total count of audited declarations, a breakdown by classification, and a sortable/scannable list of every declaration with its file path and line number.
2. **Given** the audit report, **When** the E11 epic document is read, **Then** it contains a link to `docs/type-audit-2026.md` and a summary of how many new phases (or phase expansions) were added as a result.
3. **Given** the audit report, **When** a reviewer picks any individual entry, **Then** the entry's classification is accompanied by a one-line justification explaining why it fell into that category.

---

### User Story 2 - Maintainer distinguishes intentional exceptions from accidental drift (Priority: P2)

A maintainer reviewing a new PR that adds a hand-typed interface needs to answer "should this be LinkML-rooted instead?" Right now that question is answered inconsistently. With this audit, each existing hand-typed declaration carries an explicit classification and justification, establishing a documented baseline against which new declarations can be reviewed. A maintainer can read the report's category definitions, locate a similar existing declaration, and use its justification as precedent.

**Why this priority**: The long-term value of the audit is not the report itself — it's that every future "why isn't this in LinkML?" question has a written answer to point at. This turns an informal principle into an enforceable one.

**Independent Test**: Pick three existing hand-typed interfaces that were *intentionally* kept outside LinkML (e.g., a TS-only UI preference type). Confirm each appears in the report under `Single-domain convenience type` with a justification that would satisfy a future maintainer reviewing a similar case.

**Acceptance Scenarios**:

1. **Given** a hand-typed interface that is known to be a legitimate single-domain exception, **When** the maintainer looks it up in the report, **Then** it is classified as `Single-domain convenience type` with a justification (e.g., "TS-only localStorage shape; no Python counterpart").
2. **Given** a hand-typed interface that crosses the Python ↔ TS boundary and has no LinkML root, **When** the maintainer looks it up in the report, **Then** it is classified as `Cross-domain runtime type (must promote to LinkML)` and linked to either an existing backlog item or a newly-opened one.

---

### User Story 3 - Every drift finding is tracked end-to-end (Priority: P3)

For each type declaration classified as "must promote to LinkML" or "drift candidate," the audit creates or references a backlog item so no finding sits in the report without an owner. A scrum-master-style sweep of the backlog after report publication should find zero findings unaccounted for.

**Why this priority**: A report without follow-through is a liability — it documents known problems while creating no pressure to fix them. Pairing each finding with a tracked work item is what turns the audit from a snapshot into an improvement plan.

**Independent Test**: After report publication, grep the report for every entry classified as `Cross-domain runtime type (must promote to LinkML)` or `Drift candidate`. For each entry, confirm the report cell contains either a link to #203, #204, #205, or a link to a newly-opened backlog item under E11.

**Acceptance Scenarios**:

1. **Given** the audit report, **When** every `Cross-domain runtime type (must promote to LinkML)` entry is inspected, **Then** each one has a backlog link (existing or newly opened).
2. **Given** the audit report, **When** every `Drift candidate` entry is inspected, **Then** each one has a backlog link and an explicit list of the co-named variants whose shapes disagree.
3. **Given** the backlog after report publication, **When** the new items are reviewed, **Then** each one references the audit report entry that triggered it.

---

### Edge Cases

- **Re-exported types**: A single `interface` declaration can be re-exported from multiple files. The audit records the original declaration site once, and lists re-export paths under it (rather than double-counting).
- **Generic / parameterized types**: Types like `ToolResult<T>` are enumerated as a single entry; the parameterization does not change their classification.
- **Inline anonymous types**: Anonymous inline types used in function signatures (e.g., `(arg: { foo: string }) => void`) are **out of scope** — the audit covers named declarations only. This is recorded as a scoping decision in the report.
- **Ambient declaration files (`.d.ts`)**: `.d.ts` files that declare types for external packages are out of scope (they describe third-party shapes we don't own). First-party `.d.ts` files within the audit scope are in scope.
- **Test-local / fixture / story types**: Types defined inside `__tests__/`, `__fixtures__/`, `*.test.ts`, `*.spec.ts`, `*.stories.tsx`, and equivalent test-scaffolding files are excluded. The audit records which directories/patterns were treated as test-local.
- **Same name, same shape, different location**: Two files declaring an identical interface are flagged as a potential consolidation opportunity but not necessarily a drift candidate (drift requires *differing* shapes).
- **Types whose source has since been deleted**: The audit is a point-in-time snapshot against a specific git SHA; the report records that SHA so future re-runs can be compared against a known baseline.
- **Python-side equivalents**: Python `TypedDict`, dataclass, and Pydantic model declarations are **out of scope for this audit** — they are governed by the Pydantic-from-LinkML generator chain and covered by the existing schema adherence tests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST enumerate every TypeScript `interface`, `type`, and `enum` declaration found under `apps/`, `shared/` (excluding the LinkML-generated output directories), and `services/`.
- **FR-002**: The audit MUST exclude LinkML-generated output. The report MUST explicitly list the directories treated as generated (so a reviewer can verify the exclusion).
- **FR-003**: The audit MUST exclude test-local declarations (those whose only uses are within test-scaffolding files per the patterns listed in Edge Cases). The report MUST explicitly list the exclusion patterns used.
- **FR-004**: Each enumerated declaration MUST be classified into exactly one of five categories:
  1. **Schema-rooted** — re-exports or direct uses of a type from `@debrief/schemas` (no action required).
  2. **Boundary / parse-time loose type** — a hand-typed shape used at a data-parse boundary (raw JSON, external API response); ideally LinkML-rooted per #204, otherwise a justified exception.
  3. **Single-domain convenience type** — TS-only, no Python counterpart, remains in one runtime; allowed exception with recorded justification.
  4. **Cross-domain runtime type (must promote to LinkML)** — hand-typed shape that crosses Python ↔ TS or is persisted to disk; **violates principle; requires a promote-to-LinkML follow-up item**.
  5. **Drift candidate** — two or more declarations sharing a name but differing in shape, or a hand-typed shape whose fields disagree with the corresponding LinkML type; **requires a fix-drift follow-up item**.
- **FR-005**: Each audit entry MUST record, at minimum: the declaration's name, its source file path, its line number, its syntactic kind (`interface` / `type` / `enum`), its assigned classification, and a one-line justification.
- **FR-006**: The audit MUST emit a single report document at `docs/type-audit-2026.md`.
- **FR-007**: For every entry classified as `Cross-domain runtime type (must promote to LinkML)` or `Drift candidate`, the report MUST link to either an existing backlog item (e.g., #203, #204, #205) or a newly-opened backlog item under Epic E11. No entry in those two categories may be left unlinked.
- **FR-008**: Each `Drift candidate` entry MUST list every co-named variant with its file path, so the drift scope is visible without re-running the enumeration.
- **FR-009**: The report MUST include per-category counts and a short "phase impact" summary indicating how the findings map onto Epic E11's existing phase list (which phases expand, which phases are new).
- **FR-010**: The Epic E11 document (`docs/ideas/E11-schema-first-boundary-typing.md`) MUST be updated to link to `docs/type-audit-2026.md` and to reflect any phase additions or scope expansions the audit surfaced.
- **FR-011**: The report MUST record the git SHA of the HEAD against which the audit was run and the date of publication, so the snapshot is reproducible and its freshness is traceable.
- **FR-012**: The report MUST document the enumeration approach (tooling, queries, or manual process) in a "Methodology" section sufficient for an independent reviewer to reproduce the counts.

### Key Entities

- **Type Declaration Record**: One row in the audit inventory — name, file path, line number, syntactic kind (`interface`/`type`/`enum`), classification, justification, and (for must-promote / drift entries) a follow-up link.
- **Classification Taxonomy**: The five-category scheme defined in FR-004. The report reproduces the taxonomy definitions verbatim so entries can be validated without cross-referencing this specification.
- **Follow-up Action Link**: For each must-promote or drift entry, either a reference to an existing backlog item (`#203`, `#204`, `#205`, or a pre-existing E11-scoped item) or a reference to a newly-opened backlog item created as part of this audit.
- **Audit Report**: A single markdown document at `docs/type-audit-2026.md` containing the inventory table, per-category counts, methodology notes, phase-impact summary, and the git SHA / publication date metadata.

## Assumptions

- **TypeScript-only scope.** The audit addresses TypeScript `interface`/`type`/`enum` declarations because the architectural principle in question — "types that cross Python ↔ TS must be LinkML-rooted" — is enforced TypeScript-side via the generated `@debrief/schemas` package. Python-side types are already governed by the Pydantic-from-LinkML generator chain and by existing schema adherence tests; re-auditing them here would duplicate coverage.
- **Test-local exclusion patterns.** "Test-local" is defined as declarations whose source files match `__tests__/**`, `__fixtures__/**`, `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `*.stories.ts`, or `*.stories.tsx`. The report will list the exact patterns used so the exclusion is auditable.
- **LinkML-generated directory exclusion.** "Generated" is defined by directory (e.g., the TypeScript output directory produced by `gen-typescript`, and any directory whose header comment indicates generator emission). The report will list the exact directories excluded.
- **Anonymous inline types are out of scope.** Only named declarations count. This matches the intent of the backlog item, which is concerned with *identifiable* types that can drift or cross boundaries.
- **Ambient first-party `.d.ts` declarations** (first-party shims within the audit scope) are in scope. Third-party ambient declarations (e.g., types for external packages) are out of scope.
- **The report is a point-in-time snapshot.** It records the git SHA of HEAD at audit time. Future re-runs produce new snapshots rather than mutating this one.
- **Classification may require judgement.** The taxonomy has crisp edges but individual entries may sit near boundaries (e.g., a type used in one runtime today but likely to cross boundaries tomorrow). The report captures each judgement call with a one-line justification so reviewers can challenge the specific decision rather than the overall methodology.
- **Newly-opened backlog items are created under Epic E11.** Each is individually scoped to a single target (single type or single drift group) to keep follow-up work parallelisable, consistent with E11's existing phase structure.

## Dependencies

- **None for execution.** This is a read-only analysis task against the current `main` HEAD. It does not modify runtime code.
- **Feeds Epic E11** (`docs/ideas/E11-schema-first-boundary-typing.md`). The epic's phase list is expected to grow from the audit's findings.
- **Overlaps with existing items**: #203 (spatial types in LinkML), #204 (`RawGeoJSONFeature` in LinkML), #205 (`DisplayMode` / `PlaybackState` in LinkML). Audit findings that fall inside those items' scopes are linked to them rather than opening duplicates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `docs/type-audit-2026.md` exists, is checked into `main`, and is reachable via a link from `docs/ideas/E11-schema-first-boundary-typing.md`.
- **SC-002**: Every non-generated, non-test-local TypeScript `interface`/`type`/`enum` declaration under the audit scope appears in the report exactly once and carries a classification — **target: 100% of audited declarations classified**.
- **SC-003**: Zero report entries in the `Cross-domain runtime type (must promote to LinkML)` or `Drift candidate` categories are missing a follow-up link — **target: 100% of must-promote and drift entries linked to a backlog item**.
- **SC-004**: An independent reviewer can reproduce the report's per-category counts from the Methodology section in under 30 minutes by re-running the enumeration and spot-checking five randomly-chosen entries per category.
- **SC-005**: After the audit lands, the E11 epic document reflects the full set of phases (original plus audit-driven additions) so the epic can be declared "scope-complete" — **target: E11's phase count matches the audit's phase-impact summary**.
- **SC-006**: The report includes a git SHA and publication date, so any future review can verify whether the snapshot is still current — **target: both metadata fields present and correctly formatted**.
- **SC-007**: Every newly-opened follow-up item references the audit report entry that produced it — **target: 100% traceability from backlog item back to audit entry** (spot-checkable by sampling new items under Epic E11).
