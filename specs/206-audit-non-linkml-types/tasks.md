# Tasks: [E11] Audit non-LinkML type declarations

**Input**: Design documents from `/specs/206-audit-non-linkml-types/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Scanner unit tests ARE included (see plan.md Testing field — "fixture-based unit tests for the scanner"). No other test types apply; no runtime or Playwright tests.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered as an independent increment.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that prove the audit deliverable is complete and the methodology is reproducible. Used in the PR description and linked from the shipped blog post.

**Evidence Directory**: `specs/206-audit-non-linkml-types/evidence/`
**Media Directory**: `specs/206-audit-non-linkml-types/media/`

**Feature type**: Infrastructure / Analysis — produces a committed Markdown report plus a committed scanner tool. No UI, no runtime service, no extension workflow.

### Planned Artefacts

| Artefact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Scanner unit-test results (vitest pass/fail counts, YAML front matter with `git_sha` and `captured_at`) | After Phase 2 tests pass |
| `evidence/usage-example.md` | Walk-through of running the scanner + applying a classification to a sample record | After Phase 3 complete |
| `evidence/scanner-run.txt` | Terminal transcript of `pnpm tsx scripts/audits/type-audit/scan.ts` run on the full repo, with per-bucket auto-tag counts | After Phase 3 complete |
| `evidence/scan-output.sample.json` | Redacted / trimmed excerpt (~10 records) of the intermediate JSON produced by the scanner | After Phase 3 complete |
| `evidence/ajv-validation.txt` | Output of validating `scan-output.sample.json` against `contracts/scan-output.schema.json` — proves the scanner honours its contract | After Phase 3 complete |
| `evidence/report-link.md` | One-line stub pointing to the committed report at `docs/type-audit-2026.md` (which is itself the primary deliverable) | After Phase 5 complete |
| `evidence/backlog-diff.txt` | `git diff BACKLOG.md` showing newly opened items (if any) | After Phase 4 complete |
| `evidence/rerun-methodology.md` | Short write-up confirming a second engineer reproduced the inventory from the methodology section (spec SC-004) | After Phase 5 complete |

### Media Content

| Artefact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the audit | **Done** — `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn summary for planning | **Done** — `/speckit.plan` |
| `media/shipped-post.md` | Blog post celebrating completion (findings summary, key surprises, what E11 does next) | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with report, scanner, backlog edits, and evidence | Final task in Polish phase |
| Blog PR | PR in `debrief/debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the scanner's folder skeleton and make `typescript` available to the scanner at repo-root level.

- [x] T001 Create scanner folder structure with a README explaining purpose, CLI flags, and invocation `scripts/audits/type-audit/README.md`
- [x] T002 [P] Add a minimal `tsconfig.json` for the scanner that targets Node 20 + ESM and enables `strict: true` `scripts/audits/type-audit/tsconfig.json`
- [x] T003 Add `typescript` (^5.x) to the repo-root `devDependencies` so the scanner does not need to piggy-back on a workspace install `package.json`
- [x] T004 [P] Add `vitest` + `ajv` to the repo-root `devDependencies` for scanner unit tests and schema-contract validation `package.json`
- [x] T005 [P] Create fixtures directory with ~10 hand-crafted `.ts` files covering each of: exported interface, non-exported interface, type alias, enum, alias bottoming out in `Record<string, unknown>`, drift pair (same name different shape across two files), schema-rooted re-export, and an excluded test-local declaration `scripts/audits/type-audit/__tests__/fixtures/`
- [x] T006 Run `pnpm install` at the repo root to materialise the new devDependencies `package.json`

**Checkpoint**: Scanner folder exists, TypeScript compiler available at root, fixtures in place. Phase 2 can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the committed scanner at `scripts/audits/type-audit/scan.ts`. Every user story consumes this scanner's JSON output — nothing downstream can start until it exists and its contract is honoured.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

### Tests for Foundation (fixture-driven, written first) ⚠️

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementing the scanner.

- [x] T007 [P] [test] Fixture unit test — scanner enumerates the expected number of records from the fixtures folder and produces stable-sorted output `scripts/audits/type-audit/__tests__/scan.enumerate.test.ts`
- [x] T008 [P] [test] Fixture unit test — auto-tag rules: `schema-rooted-candidate` fires on files importing `@debrief/schemas`, `boundary-candidate` fires on aliases bottoming out in `unknown` / `Record<string, unknown>` `scripts/audits/type-audit/__tests__/scan.autotag.test.ts`
- [x] T009 [P] [test] Fixture unit test — `driftClusters` groups same-name-different-shape declarations and excludes same-name-same-shape duplicates `scripts/audits/type-audit/__tests__/scan.drift.test.ts`
- [x] T010 [P] [test] Contract test — scanner output validates against `specs/206-audit-non-linkml-types/contracts/scan-output.schema.json` via ajv `scripts/audits/type-audit/__tests__/scan.contract.test.ts`
- [x] T011 [P] [test] Determinism test — running the scanner twice on the same fixtures produces byte-identical JSON (stable sort order, stable SHA-1 shape hashes) `scripts/audits/type-audit/__tests__/scan.determinism.test.ts`

### Implementation for Foundation

- [x] T012 Implement AST traversal — walk each `.ts` / `.tsx` file and emit one record per top-level `InterfaceDeclaration`, `TypeAliasDeclaration`, `EnumDeclaration` (spec FR-001, data-model §1) `scripts/audits/type-audit/scan.ts`
- [x] T013 Implement exclusion rules — skip paths matching `shared/schemas/src/generated/**`, `**/__tests__/**`, `**/__fixtures__/**`, `**/*.test.ts`, `**/*.spec.ts`, `**/node_modules/**`, `**/dist/**` (spec FR-002, FR-003) `scripts/audits/type-audit/scan.ts`
- [x] T014 Compute stable `id` (`${packageName}:${relativeFilePath}:${declarationName}`) + `shapeHash` (SHA-1 of normalised AST print) per record `scripts/audits/type-audit/scan.ts`
- [x] T015 Collect import specifiers per file and attach to each record's `imports` array `scripts/audits/type-audit/scan.ts`
- [x] T016 Implement auto-tagging: set `autoTag` to `schema-rooted-candidate` / `boundary-candidate` / `drift-shortlist` / `none` per research.md R2, R4, R6 `scripts/audits/type-audit/scan.ts`
- [x] T017 Implement drift-cluster post-pass — group records by `declarationName`, emit a cluster when membership size ≥ 2 and distinct `shapeHash` count ≥ 2 `scripts/audits/type-audit/scan.ts`
- [x] T018 Emit the top-level wrapper — `scannerVersion` = `"v1"`, `capturedAt` (ISO-8601), `gitSha` (from `git rev-parse HEAD`), `scannedPaths`, `excludedPaths`, `records`, `driftClusters` (data-model §6, contract: `scan-output.schema.json`) `scripts/audits/type-audit/scan.ts`
- [x] T019 Add CLI flag parsing (`--roots`, `--exclude`, `--out`) matching the invocation documented in `quickstart.md` `scripts/audits/type-audit/scan.ts`
- [x] T020 Print a one-line stderr summary on completion (`Scanned N files, emitted M records, K drift clusters`) — confirms the scanner ran without forcing stdout noise `scripts/audits/type-audit/scan.ts`
- [x] T021 Wire up `vitest` configuration for the scanner tests (minimal — Node environment, no DOM, no Playwright) `scripts/audits/type-audit/vitest.config.ts`
- [x] T022 Run the scanner once against the full repo and verify it completes in under 30 seconds (plan.md Performance Goal); record timing in a commit message or throwaway log — this is a developer smoke-test, not an evidence task

**Parallel opportunity**: T007–T011 (all tests in different files) can be drafted simultaneously. T013–T017 mutate `scan.ts` and must be done sequentially in that file (unless split into modules).

**Checkpoint**: `pnpm --filter-root vitest run scripts/audits/type-audit` is green; the scanner produces schema-valid output. User-story phases can begin.

---

## Phase 3: User Story 1 — Complete classified inventory for E11 planning (Priority: P1)

**Goal**: Publish the committed report `docs/type-audit-2026.md` with the full findings table — every in-scope TS declaration classified into exactly one of the five buckets.

**Independent Test**: Randomly sample 10 named TypeScript type declarations from `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/`; confirm each appears exactly once in the report with a classification and a recommended action (spec SC-001).

### Implementation for User Story 1

- [x] T023 [US1] Run the scanner against the full repo and save the intermediate JSON to a local throwaway path (e.g. `tmp/type-audit.json`) — `.gitignore` the `tmp/` folder if not already ignored `tmp/type-audit.json`
- [x] T024 [US1] Validate `tmp/type-audit.json` against `contracts/scan-output.schema.json` with ajv-cli; abort if validation fails (spec SC-001 depends on trusting the scanner's output) `tmp/type-audit.json`
- [x] T025 [US1] Create the report scaffold with YAML front matter (`feature`, `epic`, `captured_at`, `git_sha`, `scanner_version`), an intro paragraph that back-links to `docs/ideas/E11-schema-first-boundary-typing.md`, and the six required section headings from data-model §6 `docs/type-audit-2026.md`
- [x] T026 [US1] Populate the Findings table — one row per record, sorted classification → package → file path. For each row, confirm or override the scanner's `autoTag` and assign one of the five final classifications (`schema-rooted`, `boundary-loose`, `single-domain`, `cross-domain-hand-typed`, `drift-candidate`). Author a one-line `summary` per row. Leave `recommendedAction` cells for Phase 4 where they need backlog IDs `docs/type-audit-2026.md`
- [x] T027 [P] [US1] For every `single-domain` row, author the `justification` column (spec data-model §3 validation rule) `docs/type-audit-2026.md`
- [x] T028 [P] [US1] Resolve every entry in `driftClusters` — each cluster becomes at least one `drift-candidate` finding, cross-referencing the sibling declarations `docs/type-audit-2026.md`
- [x] T029 [US1] Fill the Summary section with per-bucket counts (derive from the populated Findings table) — leave the "Newly opened backlog items" sub-list for Phase 4 `docs/type-audit-2026.md`
- [x] T030 [US1] Spot-check: pick 10 random TS declarations from in-scope paths and verify each appears in the Findings table (SC-001). Record the sample IDs in a commit message, not the report `docs/type-audit-2026.md`

**Checkpoint**: The report's Findings table is complete and internally consistent; every record is classified. Phase 4 can fill in backlog linkage.

---

## Phase 4: User Story 2 — Backlog items for every actionable finding (Priority: P2)

**Goal**: Ensure every actionable finding (`cross-domain-hand-typed` or `drift-candidate`) links to a backlog item — either an existing one (#203, #204, #205, or another E11 child) or a new entry opened in this same PR. Update the report's summary to list the newly opened items.

**Independent Test**: Filter the report to `cross-domain-hand-typed` + `drift-candidate` rows; confirm every row's `recommendedAction` cell resolves to a `#NNN` reference (existing or new) with a working link target (spec SC-002).

### Implementation for User Story 2

- [x] T031 [US2] For every `cross-domain-hand-typed` and `drift-candidate` finding, attempt to fold into an existing backlog item first (#203 spatial types, #204 RawGeoJSONFeature, #205 DisplayMode/PlaybackState, or another open E11 child). Update the `recommendedAction` cell to `Fold into #NNN — <short rationale>` `docs/type-audit-2026.md`
- [x] T032 [US2] Determine the next available backlog ID in `BACKLOG.md` by scanning existing rows (current max + 1) `BACKLOG.md`
- [x] T033 [US2] For each remaining actionable finding that does not fit an existing item, append a new row to `BACKLOG.md` using the project's existing table format — category `Infrastructure`, status `approved` if scope is clear else `needs-interview`, link to the audit report anchor as the rationale source `BACKLOG.md`
- [x] T034 [US2] (Optional, if any new item's scope warrants it) Create idea documents under `docs/ideas/` following the pattern of `docs/ideas/203-*.md`, `204-*.md`, `205-*.md` `docs/ideas/`
- [x] T035 [US2] Update every actionable finding's `recommendedAction` cell in the report to `Open #NNN — <title>` (for newly opened items) or `Fold into #NNN` (for existing) so every row has a non-empty link target `docs/type-audit-2026.md`
- [x] T036 [US2] Fill the report's "Newly opened backlog items" summary sub-list with each new ID + one-line title + link to `BACKLOG.md` `docs/type-audit-2026.md`
- [x] T037 [US2] Self-check against spec SC-002: filter the Findings table to `cross-domain-hand-typed` + `drift-candidate` rows and confirm zero rows have an empty `backlogItemRef` `docs/type-audit-2026.md`

**Checkpoint**: Every actionable finding has a backlog home. The Summary section's counts match the number of new items committed to `BACKLOG.md`.

---

## Phase 5: User Story 3 — Reproducible methodology (Priority: P3)

**Goal**: The report's methodology section is detailed enough that a future maintainer can re-run the audit from a clean checkout and produce an equivalent inventory without needing to ask questions. Close the bidirectional link with Epic E11.

**Independent Test**: A second engineer (real or simulated via a code-review pass) reads only the methodology section and the quickstart and reproduces the scan on a freshly-cloned worktree; their output's drift vs. the committed report is attributable to code changes, not methodology ambiguity (spec SC-004).

### Implementation for User Story 3

- [x] T038 [US3] Author the Methodology section: list the exact in-scope paths (`apps/`, `shared/`, `services/`), the exclusion patterns (verbatim globs), the rule for distinguishing generated vs. authored code (path-based — `shared/schemas/src/generated/`), and the rule applied for each of the five classification buckets (spec FR-009) `docs/type-audit-2026.md`
- [x] T039 [US3] In the Methodology section, embed the exact re-run command (copy from `quickstart.md` §1) so the report is self-contained `docs/type-audit-2026.md`
- [x] T040 [US3] Add a "Known methodology gaps / caveats" subsection listing any generated output discovered outside `shared/schemas/src/generated/` (per spec edge-case bullet) or any classification judgement that felt borderline and deserves a second look `docs/type-audit-2026.md`
- [x] T041 [P] [US3] Populate the Python cross-domain appendix: sweep `services/` and `shared/` Python packages for hand-authored types whose instances appear to cross the Python ↔ TS boundary (e.g. Pydantic `BaseModel` subclasses consumed by MCP tool results). If none found, include an explicit "No candidates found" line — the section is not optional (spec FR-012) `docs/type-audit-2026.md`
- [x] T042 [US3] Update `docs/ideas/E11-schema-first-boundary-typing.md` — add a bullet under `## Items` linking to `docs/type-audit-2026.md`, and append any new phases surfaced by the audit to `## Phase inventory` (spec FR-010 / SC-003) `docs/ideas/E11-schema-first-boundary-typing.md`
- [x] T043 [US3] Confirm the report's intro paragraph back-links to `docs/ideas/E11-schema-first-boundary-typing.md` (T025 scaffolded the link — verify it survived editing) `docs/type-audit-2026.md`
- [x] T044 [US3] Add a "Re-run log / changelog" section at the bottom of the report with a first entry: `2026-MM-DD — Initial audit (git_sha: ...)` — future re-runs append rows here without rewriting the body `docs/type-audit-2026.md`

**Checkpoint**: All three user stories are independently testable. Report and epic cross-link bidirectionally. Methodology is complete enough to support re-runs.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence, write the shipped post, and open the PR. This phase is where the audit becomes visible to reviewers.

### Cross-cutting cleanup

- [x] T045 Run `task verify` (lint + typecheck + test) and fix any regressions introduced by adding `typescript` / `vitest` / `ajv` to root devDeps
- [x] T046 [P] Verify no production source files were modified — `git diff --stat origin/main...HEAD` should only touch `docs/`, `BACKLOG.md`, `scripts/audits/type-audit/`, `package.json`, `pnpm-lock.yaml`, and `specs/206-audit-non-linkml-types/` (spec SC-005)
- [x] T047 Update `CLAUDE.md` "Recent Changes" section with a 206 entry (previous auto-update was a no-op) `CLAUDE.md`

### Evidence Collection (REQUIRED)

- [x] T048 Create evidence directory `specs/206-audit-non-linkml-types/evidence/`
- [x] T049 Capture test summary using the template at `.specify/templates/evidence/test-summary-template.md` — YAML front matter with `feature: 206-audit-non-linkml-types`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body covers scanner unit tests + contract validation `specs/206-audit-non-linkml-types/evidence/test-summary.md`
- [x] T050 [P] Record usage example — a narrated walk-through of running the scanner, validating with ajv, and assigning a classification to one sample record `specs/206-audit-non-linkml-types/evidence/usage-example.md`
- [x] T051 [P] Capture terminal transcript of a full-repo scanner run with stderr one-line summary `specs/206-audit-non-linkml-types/evidence/scanner-run.txt`
- [x] T052 [P] Capture a trimmed (~10 records) redacted excerpt of the intermediate scanner JSON `specs/206-audit-non-linkml-types/evidence/scan-output.sample.json`
- [x] T053 [P] Capture ajv validation output against `contracts/scan-output.schema.json` `specs/206-audit-non-linkml-types/evidence/ajv-validation.txt`
- [x] T054 [P] Capture `git diff BACKLOG.md` showing newly opened items (or a "no new items" note if none were opened) `specs/206-audit-non-linkml-types/evidence/backlog-diff.txt`
- [x] T055 [P] Write a short note referencing the committed report as the primary deliverable `specs/206-audit-non-linkml-types/evidence/report-link.md`
- [x] T056 Execute the re-run sanity check from spec SC-004: on a fresh worktree at the same SHA, re-run the scanner + ajv validate; document that the JSON output is byte-identical (determinism test already enforces this, but a live re-run is the evidence) `specs/206-audit-non-linkml-types/evidence/rerun-methodology.md`

### Media Content

- [x] T057 Create shipped blog post using the Content Specialist agent (`.claude/agents/media/content.md`) — include What We Built (surprising findings, counts per bucket, anything notable), Lessons Learned (any classification call that was hard), What's Next (the E11 phase list the audit unlocked) `specs/206-audit-non-linkml-types/media/shipped-post.md`
- [x] T058 [P] Create LinkedIn shipped summary (150–200 words, hook opening referencing a concrete number from the findings, link placeholder to full post) `specs/206-audit-non-linkml-types/media/linkedin-shipped.md`

### PR Creation

- [x] T059 Create PR and publish blog: run `/speckit.pr`

**Task T059 must run last. It depends on T045 through T058 being complete — CI must be green, evidence must be captured, and both blog posts must be drafted before the PR opens.**

---

## Dependencies

### Phase dependencies

- **Phase 1 (Setup)** — no dependencies. T001/T002/T005 are `[P]`. T003 + T004 both edit `package.json` and must be sequential. T006 depends on T003 + T004.
- **Phase 2 (Foundation)** — depends on Phase 1 complete. **Blocks all user stories.**
- **Phase 3 (US1, P1)** — depends on Phase 2. Independently testable per spec §User Story 1.
- **Phase 4 (US2, P2)** — depends on Phase 3 complete (needs the classified Findings table to know which rows need backlog links). Independently testable per spec §User Story 2.
- **Phase 5 (US3, P3)** — depends on Phase 2 (methodology is about the scanner + classification). Can proceed in parallel with Phase 4; T042 depends on Phase 4 having committed new backlog items, so run T042 after Phase 4.
- **Phase 6 (Polish)** — depends on Phases 3, 4, 5 all complete.

### Within-phase dependencies

- **Phase 2 tests (T007–T011)** — all `[P]`, independent files, can be drafted in parallel.
- **Phase 2 implementation (T012–T022)** — T013–T017 all mutate `scan.ts` and should be sequential; T021 (`vitest.config.ts`) is independent `[P]`-eligible. T022 (smoke-test) runs last.
- **Phase 3 (T023–T030)** — T023 → T024 → T025 → T026 are strictly sequential (each builds on the previous). T027 + T028 (`[P]`) edit different parts of the report and can overlap once T026 has laid out the table skeleton. T029 + T030 run after.
- **Phase 4 (T031–T037)** — T031 → T032 → T033 → T034 → T035 → T036 → T037 run sequentially; T034 is optional.
- **Phase 5 (T038–T044)** — T038–T040 sequentially edit the Methodology subsection. T041 `[P]` edits an independent section (Python appendix). T042 edits a different file (`docs/ideas/E11-*.md`). T043 + T044 close the section.
- **Phase 6** — T045 runs first (CI gate). T046–T055 (`[P]`-flagged) can run in parallel where files differ. T056 depends on the scanner being unchanged since T045. T057 + T058 can overlap. **T059 (PR) is the final task and must not run until every other task is complete.**

### Parallel opportunities

- Phase 1: T001, T002, T005 in parallel; T003 + T004 sequential because both edit `package.json`.
- Phase 2: T007–T011 in parallel (all tests, different files).
- Phase 3: T027 + T028 in parallel once the table skeleton from T026 exists.
- Phase 5: T041 (Python appendix) runs in parallel with T038–T040 (Methodology) and T042 (epic doc edit).
- Phase 6: T050, T051, T052, T053, T054, T055 all `[P]` — different evidence files. T058 runs in parallel with T057.

---

## Implementation Strategy

### Incremental delivery

1. **Phase 1 + Phase 2** — land the scanner and its tests. At this checkpoint the scanner is committed but the report does not yet exist. The work is independently verifiable via `vitest` and ajv contract tests. A second engineer could pick up here without any historical context.
2. **Phase 3 (US1)** — land the Findings table. The report exists, every record is classified, but actionable rows do not yet have backlog links. The Summary counts are already honest.
3. **Phase 4 (US2)** — land backlog linkage + any new `BACKLOG.md` entries in the same PR. The report is now actionable.
4. **Phase 5 (US3)** — land the Methodology section + Python appendix + bidirectional E11 link. The report is now reproducible and durable.
5. **Phase 6** — land evidence + shipped blog post + PR.

Each of Phases 3, 4, 5 is an independently-testable increment per spec §User Scenarios. If time pressure forces a stop, Phases 1–3 alone still deliver a useful artefact (the inventory itself); Phase 4 + 5 upgrade it to the final E11-ready deliverable.

### Single-developer cadence

This feature is naturally single-threaded. Recommended sequence:

- Day 1: Phase 1 + Phase 2 (setup + scanner + tests).
- Day 2: Phase 3 (Findings table — the bulk of reviewer judgement work).
- Day 3: Phase 4 + Phase 5 (backlog linkage + methodology).
- Day 4: Phase 6 (evidence, shipped post, PR).

The Findings table (T026) is the largest single effort and benefits from being uninterrupted.

### Stop-the-world triggers

- If the scanner crashes on a real-world file (not a fixture), fix in Phase 2 before proceeding — every downstream task trusts the scanner's output.
- If a classification call is genuinely 50/50, tag the row as such in the Findings table and surface it in the "Known methodology gaps" subsection (T040) rather than silently picking one bucket.
- If the count of actionable findings is surprisingly high (double-digit new backlog items), pause and raise with the E11 owner before opening them all — the audit may need scope adjustment.
