# Feature Specification: Backlog Navigator E2E Test Fixture Decoupling

**Feature Branch**: `245-navigator-e2e-fixture`  
**Created**: 2026-05-05  
**Status**: Draft  
**Input**: User description: "Backlog Navigator — fixed E2E fixture, replace live BACKLOG.md coupling"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — CI stays green regardless of live BACKLOG.md state (Priority: P1)

A developer merges a PR that changes item statuses in `BACKLOG.md` (e.g. the deployed navigator flips a row to `approved` via eat-your-own-dogfood use). Previously this drift caused the E2E suite to select a status that was already set, disabling the Push button and timing out. With the fixture in place, the same merge leaves E2E unaffected — the tests operate entirely against the hand-curated fixture whose state never drifts.

**Why this priority**: The live-coupling breakage is the root cause of this ticket. Eliminating drift is the primary goal.

**Independent Test**: Run `cd apps/backlog-navigator && pnpm test:e2e:cloud` immediately after any change to the repo-root `BACKLOG.md`; all E2E specs must pass.

**Acceptance Scenarios**:

1. **Given** `BACKLOG.md` has item 244 in `approved` status, **When** the E2E suite runs, **Then** all Playwright specs pass and no spec reads or depends on repo-root `BACKLOG.md`.
2. **Given** a fresh checkout of the branch, **When** the developer runs the E2E suite without any local `BACKLOG.md` modifications, **Then** all Playwright specs pass in under 60 seconds.
3. **Given** the fixture is loaded, **When** a spec selects a row known to be in state `proposed` and changes it to `approved`, **Then** the Push Changes button enables and the edit is recorded as 1 pending change.

---

### User Story 2 — Fixture covers all parser edge cases (Priority: P2)

A contributor adding a new parser feature or format column needs confidence that the fixture exercises the full grammar — escaped pipes, Markdown links, epic tags, strikethrough, and every workflow state and category. Without deliberate fixture coverage, a new parser bug might not be caught by the suite.

**Why this priority**: Correctness of the fixture itself determines the long-term value of the E2E suite as a regression gate.

**Independent Test**: Read the fixture file and verify rows match the coverage matrix (one per workflow state, one per category, 2+ epics, parser edge-case row). Each condition can be verified by inspection without running the suite.

**Acceptance Scenarios**:

1. **Given** the fixture file exists, **When** inspected, **Then** it contains exactly one row for each of the following workflow states: `proposed`, `approved`, `clarified`, `complete`, `blocked`, `wont-do`.
2. **Given** the fixture file exists, **When** inspected, **Then** it contains at least one row for each category: Feature, Tech Debt, Enhancement, Bug, Infrastructure, Documentation, Research Spike.
3. **Given** the fixture file exists, **When** inspected, **Then** it contains rows tagged `[[E01]]` and `[[E02]]` plus at least one row with no epic tag.
4. **Given** the fixture file exists, **When** inspected, **Then** at least one row's description contains a Markdown link, an `[[E##]]` epic tag, and a `\|`-escaped pipe character.
5. **Given** the fixture file exists, **When** the parser processes the row with the escaped pipe, **Then** the cell value is correctly unescaped and a round-trip through the serialiser restores the escape.

---

### User Story 3 — Live round-trip gate is preserved (Priority: P3)

The Vitest `liveBacklog.roundtrip.test.ts` deliberately reads the production `BACKLOG.md` to verify byte-stable round-tripping. After this change the E2E suite reads the fixture, but this unit test must continue reading the live file — both gates serve different purposes.

**Why this priority**: Preserving the live gate prevents inadvertent regression of the parser against real-world data.

**Independent Test**: Run `pnpm test` (Vitest) and confirm `liveBacklog.roundtrip.test.ts` still references `../../../BACKLOG.md` (not the fixture) and passes.

**Acceptance Scenarios**:

1. **Given** the fixture refactor is complete, **When** `pnpm test` runs in `apps/backlog-navigator`, **Then** `liveBacklog.roundtrip.test.ts` reads the repo-root `BACKLOG.md` and passes.
2. **Given** the fixture refactor is complete, **When** the source of `liveBacklog.roundtrip.test.ts` is inspected, **Then** it references the live `BACKLOG.md` path, not the fixture path.

---

### Edge Cases

- What happens when the fixture file is deleted or corrupted? The E2E suite should fail fast with a clear missing-file error, not a cryptic timeout.
- What happens if a new workflow state is added to the system that is not represented in the fixture? The relevant test targeting that state will fail with a "row not found" error — this is expected and correct behaviour (the fixture needs manual update).
- What happens when the parser's column count changes (e.g. a 13th column is added)? Tests that hard-code column indices will break at the assertion level, signalling that the fixture needs updating — preferable to silent wrong results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The E2E test suite MUST read fixture data from `apps/backlog-navigator/e2e/fixtures/backlog-fixture.md` instead of `../../../BACKLOG.md` in all four Playwright specs (`browse`, `interaction`, `a11y`, `realWrite`, `prMode`).
- **FR-002**: The fixture file MUST contain approximately 10–12 rows in the current 12-column backlog table format, covering at least one row per workflow state (`proposed`, `approved`, `clarified`, `complete`, `blocked`, `wont-do`).
- **FR-003**: The fixture file MUST contain at least one row per category type (Feature, Tech Debt, Enhancement, Bug, Infrastructure, Documentation, Research Spike).
- **FR-004**: The fixture file MUST contain rows associated with at least two distinct epic identifiers (`[[E01]]`, `[[E02]]`) and at least one row with no epic tag, so the group-by-Epic view and the "(unassigned)" group are both exercisable.
- **FR-005**: The fixture file MUST include at least one row whose description contains a Markdown link, an epic tag, and a `\|`-escaped pipe, exercising the parser's edge-case grammar.
- **FR-006**: The fixture file MUST include at least one row rendered with strikethrough (marking it as `complete`) so the strikethrough rendering path is exercised.
- **FR-007**: E2E test assertions that previously used dynamic row selection based on live-file state MUST be updated to reference known, stable row IDs and known workflow states from the fixture.
- **FR-008**: The Vitest `liveBacklog.roundtrip.test.ts` MUST continue to read the repo-root `BACKLOG.md` unchanged; the fixture refactor MUST NOT modify this test.
- **FR-009**: A `README.md` MUST be placed alongside the fixture file documenting the purpose of each row and what parser/workflow condition it exercises.
- **FR-010**: The fixture file MUST be committed to the repository and treated as a stable, hand-curated artefact; no automated regeneration is required.

### Key Entities

- **Fixture file** (`backlog-fixture.md`): A static markdown table in the 12-column backlog format, hand-curated to provide deterministic, drift-free test data for the Playwright E2E suite.
- **E2E spec** (Playwright): One of four test files (`browse.spec.ts`, `interaction.spec.ts`, `a11y.spec.ts`, `realWrite.spec.ts`, `prMode.spec.ts`) that previously loaded live `BACKLOG.md` via `readFileSync` and served it as a mocked GitHub Contents API response.
- **Round-trip gate** (`liveBacklog.roundtrip.test.ts`): Vitest unit test that verifies the parser can parse and re-serialise the production `BACKLOG.md` byte-for-byte; deliberately reads the live file and is not modified by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All Playwright E2E specs pass on every CI run regardless of the current content of `BACKLOG.md` — zero test failures attributable to live-data drift after this change lands.
- **SC-002**: The entire E2E suite completes in under 60 seconds (no regression from the current baseline).
- **SC-003**: The fixture file covers 100% of the workflow states, category types, and parser edge cases listed in FR-002 through FR-006, verifiable by inspection.
- **SC-004**: The Vitest unit test suite (`pnpm test`) continues to pass with `liveBacklog.roundtrip.test.ts` reading the live `BACKLOG.md`, with no change to that test's pass rate.
- **SC-005**: After the change, no E2E spec file contains a reference to `../../../BACKLOG.md` — confirmed by a grep that returns zero matches.

## Assumptions

- The four Playwright specs that need updating are: `browse.spec.ts`, `interaction.spec.ts`, `a11y.spec.ts`, `realWrite.spec.ts`, and `prMode.spec.ts` (five files; the idea doc says four but lists five distinct names).
- The 12-column backlog format is stable for the duration of this work; if a column migration is in flight it should land first.
- The fixture is hand-authored and does not need to reflect real backlog items — synthetic data with realistic structure is sufficient.
- "Approximately 10–12 rows" is a soft target; the hard constraint is coverage (one per workflow state, one per category), not row count.
