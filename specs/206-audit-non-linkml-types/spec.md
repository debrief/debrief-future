# Feature Specification: [E11] Audit non-LinkML type declarations

**Feature Branch**: `206-audit-non-linkml-types`
**Created**: 2026-04-21
**Status**: Draft
**Input**: User description: "206 from the backlog (working in a worktree)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete classified inventory for E11 planning (Priority: P1)

As the owner of Epic E11 (Schema-First Boundary Typing), I need a single written inventory that lists every non-generated, named type declaration across the monorepo's application, shared, and service code, with each entry assigned exactly one of five classifications, so that I can decide which boundaries still need to be rooted in LinkML before I authorise further E11 phases.

**Why this priority**: Without this inventory the E11 phase list is incomplete — we know about five known boundaries but cannot tell whether we're looking at 5 / 20 / 50 candidates. Every downstream E11 phase depends on the audit being comprehensive and trustworthy, which is why it must land before heavy investment in phases 3+.

**Independent Test**: Can be fully validated by picking any ten named TypeScript type declarations at random from the in-scope directories and confirming each appears in the report with a classification and recommended action.

**Acceptance Scenarios**:

1. **Given** the audit report has been published, **When** a reader scans it, **Then** every named type declaration found under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/` appears exactly once with a classification.
2. **Given** a type declaration has been classified as "Cross-domain hand-typed" or "Drift candidate", **When** the reader follows the recommended action, **Then** they find either an existing backlog item reference (e.g. #203, #204, #205) or a newly opened backlog item link.
3. **Given** a previously unknown type is introduced to the codebase after the audit, **When** the audit is re-run using the documented methodology, **Then** the new type is discoverable and the re-run produces the same classifications for existing types.

---

### User Story 2 - Backlog items exist for every actionable finding (Priority: P2)

As an engineer planning the next E11 phase, I need every "Cross-domain hand-typed" and "Drift candidate" finding to be addressable via a backlog item — either an existing item or a new one opened as part of the audit — so that follow-up work has a concrete home and no finding gets lost on a report page.

**Why this priority**: A report that does not drive work is shelfware. This story turns the inventory into committed backlog entries so the audit feeds E11's rollout directly.

**Independent Test**: Can be validated by filtering the report to its actionable rows and confirming each row's recommended action resolves to a backlog item ID (existing or newly created) linked from the report.

**Acceptance Scenarios**:

1. **Given** a finding in the "Cross-domain hand-typed" bucket, **When** a reader checks the recommended action, **Then** they see either a link to an existing backlog item (#203, #204, #205, or another open E11 child) or a link to a newly created item.
2. **Given** a finding in the "Drift candidate" bucket, **When** a reader checks the recommended action, **Then** the same rule applies.
3. **Given** the report has been accepted, **When** the E11 epic document is viewed, **Then** it links to the audit report so the phase list can be read in context.

---

### User Story 3 - Reproducible methodology (Priority: P3)

As a future maintainer, I need the audit report to document how it was produced — which paths were scanned, which were excluded, which markers identified generated vs. authored code, and how classifications were assigned — so that the audit can be re-run to detect drift that creeps back in, without re-deriving the method from scratch.

**Why this priority**: Drift is the problem the audit is trying to surface; a one-off audit whose method is lost offers half the value. Reproducibility is lower priority than the inventory itself but is what makes the audit a durable control rather than a snapshot.

**Independent Test**: Another engineer, given only the report and the repo at a later commit, can follow the methodology section and arrive at an equivalent inventory within one working session.

**Acceptance Scenarios**:

1. **Given** the report, **When** a new engineer reads its methodology section, **Then** they can identify the exact in-scope and out-of-scope paths and the rule used to distinguish generated from authored code.
2. **Given** the methodology section, **When** a re-run is attempted six months later, **Then** any discrepancy between the re-run and the original audit is attributable to code change, not methodology ambiguity.

---

### Edge Cases

- **Test-local types** (declared inside `__tests__/`, `__fixtures__/`, `*.test.ts`, `*.spec.ts`): excluded from the inventory but the exclusion rule is stated in the methodology; if a test-local type is later promoted to production use it becomes in-scope.
- **Re-exports of schema types** (e.g. `export type { Coordinate } from '@debrief/schemas'`): classified as Schema-rooted via transitive reference — not treated as a new declaration.
- **Anonymous / inline types** (e.g. object literal types in function parameters): out of scope — the audit covers only named `interface` / `type` / `enum` declarations.
- **Type aliases that collapse to `Record<string, unknown>` or `unknown`**: classified as Boundary / parse-time loose type regardless of their declared name.
- **Same-name, different-shape types across packages** (e.g. two `Coordinate` definitions in different folders): recorded once per declaration site and both tagged as Drift candidate cross-referencing each other.
- **Re-exports from third-party packages** (`export type { Foo } from 'leaflet'`): excluded — vendored or upstream types are not in scope.
- **TypeScript declaration files (`.d.ts`)**: included if authored in-repo; excluded if under `node_modules/` or a generated output path.
- **Python cross-domain types** (e.g. a hand-authored Pydantic `BaseModel` whose instances are serialised and consumed by the TypeScript side): flagged in a separate "Python cross-domain candidates" appendix if encountered during the sweep, without being classified against the five TS buckets.
- **Generated output discovered outside the known generated directory**: noted as a methodology gap and escalated, not silently classified.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST enumerate every named `interface`, `type`, and `enum` declaration in TypeScript source files under `apps/`, `shared/`, and `services/`.
- **FR-002**: The audit MUST exclude declarations under `shared/schemas/src/generated/` and any other path whose output is produced by the LinkML generators.
- **FR-003**: The audit MUST exclude declarations inside test-only locations (`__tests__/`, `__fixtures__/`, files ending `.test.ts` or `.spec.ts`) and document the exclusion rule.
- **FR-004**: Each in-scope declaration MUST be assigned exactly one of five classifications: Schema-rooted, Boundary / parse-time loose type, Single-domain convenience type, Cross-domain hand-typed, or Drift candidate.
- **FR-005**: Each entry MUST record the declaration's name, source file path, line number, a one-line summary of what it represents, its classification, and a recommended action.
- **FR-006**: For every entry classified Cross-domain hand-typed or Drift candidate, the recommended action MUST resolve to a backlog item reference — either an existing item (including #203, #204, #205) or a newly opened item.
- **FR-007**: The audit MUST be delivered as a single Markdown report committed to the repository at a stable path under `docs/`.
- **FR-008**: The report MUST include a summary section with counts per classification bucket and a list of newly opened backlog items.
- **FR-009**: The report MUST include a methodology section describing the scanned paths, exclusion rules, the distinction between generated and authored code, and the rule applied for each classification bucket, sufficient for an independent re-run.
- **FR-010**: The Epic E11 document (`docs/ideas/E11-schema-first-boundary-typing.md`) MUST be updated to link to the report.
- **FR-011**: The audit MUST NOT modify production source code; it is read-only analysis producing documentation and backlog entries only.
- **FR-012**: Where a Python hand-authored type appears to cross the Python ↔ TypeScript boundary, the audit MUST list it in a separate appendix rather than silently dropping it, even though the five-bucket classification is TypeScript-focused.

### Key Entities

- **Type declaration**: a named TypeScript `interface`, `type`, or `enum` located in an in-scope source file; uniquely identified by source file path + declaration name.
- **Classification**: the bucket assigned to a type declaration — one of Schema-rooted, Boundary / parse-time loose, Single-domain convenience, Cross-domain hand-typed, Drift candidate.
- **Finding**: the combination of a type declaration, its classification, a one-line summary, a recommended action, and any linked backlog item. A finding is the unit of content in the report table.
- **Audit report**: the Markdown document containing the methodology, the findings table, the summary counts, and the appendices.
- **Backlog item link**: a reference (by ID and URL/anchor) to an existing or newly opened backlog item that will carry out the recommended action for an actionable finding.
- **E11 epic link**: a bidirectional reference — the epic document points to the report, and the report points back to the epic — so the phase plan stays traceable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of named `interface`, `type`, and `enum` declarations discovered in the in-scope paths appear in the report with an assigned classification; zero appear unclassified or with multiple classifications.
- **SC-002**: Every finding in the Cross-domain hand-typed and Drift candidate buckets links to a backlog item (existing or newly opened); the report's summary section lists the newly opened items so the count is auditable.
- **SC-003**: The Epic E11 document contains a working link to the report, and the report contains a working link back to the epic.
- **SC-004**: An engineer unfamiliar with the audit can reproduce the inventory from the methodology section within one working session; a re-run's differences are attributable only to code change, not to method ambiguity.
- **SC-005**: No production source code files are modified as part of delivering this feature (zero non-documentation code diffs in the audit's pull request, excluding backlog file edits).

## Assumptions

- Scope for the five-bucket classification is TypeScript declarations only; Python hand-typed cross-domain candidates are surfaced in an appendix rather than classified, because the Python side is expected to be Pydantic-generated-from-LinkML and any hand-authored cross-domain Python type is a signal rather than a bucket.
- The generated-vs-authored boundary is defined primarily by path (`shared/schemas/src/generated/`); if any generator writes elsewhere, the methodology will note this as a gap rather than silently re-classify.
- The report file will live under `docs/` at a path chosen by the implementer during planning (e.g. `docs/type-audit-2026.md` as suggested in the original idea) — the exact filename is not material provided the E11 epic links to it.
- "Backlog item" means an entry in `BACKLOG.md` following the project's existing item format; existing items #203, #204, #205 already cover several findings and should be reused rather than duplicated.
- The audit is a one-shot deliverable; however, reproducibility of the methodology is a first-class requirement so the audit can be re-run later.

## Dependencies

- No code dependencies (read-only analysis).
- References existing backlog items #203, #204, #205 and Epic E11; those items must remain findable and accurately scoped or the report's "fold into existing item" links will break.
