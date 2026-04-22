---

description: "Task list for 208-timeline-entry-kind"
---

# Tasks: Timeline Entry `kind` Discriminator

**Input**: Design documents from `/specs/208-timeline-entry-kind/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are included — the spec lists 9 FRs and 5 SCs with testable outcomes, and Constitution VI ("Services require unit tests") plus Constitution VII ("Tests are the spec") make them mandatory for this feature.

**Organization**: Tasks are grouped by user story so each story can land as an independently verifiable increment.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the discriminator landed cleanly — zero visual regression, full populator coverage, no residual `ToolCategory === 'snapshot'` references in rendering code. Evidence is used in the PR description, the shipped blog post, and future cross-references.

**Evidence Directory**: `specs/208-timeline-entry-kind/evidence/`
**Media Directory**: `specs/208-timeline-entry-kind/media/`

### Feature-Type Classification

This feature is best classified as a **Library/SDK + UI Component hybrid**, weighted toward Library/SDK:

- **Library/SDK**: a new TypeScript type (`TimelineEntryKind`), helpers (`TIMELINE_ENTRY_KINDS`, `assertNeverKind`), and a modified interface field (`TimelineEntry.kind?`). Consumers read the new contract; the typechecker enforces it.
- **UI Component**: the change is observed through the LogPanel renderer, but SC-001 mandates zero visible regression. Screenshot evidence is *visual parity* (pre/post match), not a new component demo.

Per the Quality Rubric, Library/SDK features require code-example + output evidence; UI components require theme-variant screenshots. For this feature both apply in a specific form: code examples of consuming `entry.kind`, and a visual-parity screenshot showing no rendering change.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest results (shared components + VS Code host) with YAML front matter | After Phase 3–5 tests pass |
| `evidence/usage-example.md` | TypeScript snippet showing consumer reading `entry.kind` with exhaustiveness guard | After Phase 2 types land |
| `evidence/visual-parity.md` | Side-by-side Storybook LogPanel screenshots (pre-change vs. post-change, `vscode` theme) proving SC-001 | Immediately after Phase 3 consumer swap |
| `evidence/screenshots/logpanel-pre.png` | LogPanel Storybook `vscode` theme, baseline captured from `main` | Immediately before Phase 3 consumer swap |
| `evidence/screenshots/logpanel-post.png` | LogPanel Storybook `vscode` theme, captured on the feature branch | Immediately after Phase 3 consumer swap |
| `evidence/code-search-evidence.md` | Grep output showing SC-003 holds: no `ToolCategory === 'snapshot'` rendering-code references outside the gated legacy-fallback expression | After Phase 3 consumer swap |

No CLI demo, no API response JSON, no interaction GIF, no sample input/output — none are applicable. No E2E browser tests or Playwright runs — no visible change; unit + component tests cover the surface area.

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post — "cleanup in aisle 176" | ✅ Created during `/speckit.plan` |
| `media/linkedin-planning.md` | Planning LinkedIn summary (176 words) | ✅ Created during `/speckit.plan` |
| `media/shipped-post.md` | Shipped blog post — what we built, lessons, what's next | During Polish phase |
| `media/linkedin-shipped.md` | Shipped LinkedIn summary (150–200 words) | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with all evidence + media linked | Final task in Polish phase |
| Blog PR | Shipped post published to `debrief.github.io` via `/speckit.pr` | Triggered by final task |

## Phase 1: Setup

**Goal**: Confirm the repo state is ready to begin implementation. No new tooling, no new dependencies, no config files — this feature adds only source code edits to existing packages.

- [x] T001 Verify the working tree is on branch `208-timeline-entry-kind` and clean: `git -C /home/user/debrief-future status && git -C /home/user/debrief-future branch --show-current`. If uncommitted changes from prior spec/plan phases remain, stop and resolve them. No file output.
- [x] T002 Capture the `main`-baseline LogPanel Storybook screenshot for later visual-parity comparison. Start Storybook (`pnpm --filter @debrief/components storybook`), navigate to the LogPanel story that renders both snapshot and tool rows, switch to the `vscode` theme, capture the frame, and save to `specs/208-timeline-entry-kind/evidence/screenshots/logpanel-pre.png`. This MUST be captured before any code in Phase 2 lands. If the baseline is easier to capture by temporarily checking out `main` in a separate worktree, do so.

**Parallel opportunities**: T002 can run in a separate terminal while T001 executes; they do not share resources. (T002 is not tagged `[P]` because it produces an artefact on disk — the screenshot — that is specific to this phase's sequencing requirement.)

## Phase 2: Foundation — `TimelineEntryKind` contract and helpers

**Goal**: Add the discriminator type, its runtime enumeration, the exhaustiveness guard, and the optional `kind?` field on `TimelineEntry`. This phase delivers the contract surface that every subsequent story consumes. No populator wiring yet; no consumer swap yet. This phase MUST complete before any story phase begins.

**Independent Test Criteria for this phase**: the typechecker passes (`pnpm -r typecheck`); importing `TimelineEntryKind`, `TIMELINE_ENTRY_KINDS`, and `assertNeverKind` from `@debrief/components` resolves without error; constructing a `TimelineEntry` with and without `kind` both type-check.

### Foundation implementation

- [x] T010 Add `TimelineEntryKind` string-literal union, `TIMELINE_ENTRY_KINDS` readonly array (`as const`), and `assertNeverKind(value: never): never` helper adjacent to the existing `TimelineEntry` interface `shared/components/src/LogPanel/types.ts`
- [x] T011 Extend the `TimelineEntry` interface with the optional field `kind?: TimelineEntryKind`, placed after `input_state?` with an inline JSDoc comment referencing the semantics of each value (per `data-model.md`) `shared/components/src/LogPanel/types.ts`
- [x] T012 Re-export `TimelineEntryKind`, `TIMELINE_ENTRY_KINDS`, and `assertNeverKind` from the LogPanel module's public barrel so consumers can import them without reaching into a deep path `shared/components/src/LogPanel/index.ts`

### Foundation tests

- [x] T013 [test] Add a unit test that verifies `TIMELINE_ENTRY_KINDS` contains exactly `['snapshot', 'tool', 'tune']` in that order, and that each element is assignable to `TimelineEntryKind` (compile-time assertion using `satisfies TimelineEntryKind`) `shared/components/src/LogPanel/__tests__/timelineEntryKind.test.ts`
- [x] T014 [P][test] Add a unit test that invokes `assertNeverKind` with a value the compiler narrows to `never` (via an exhaustive switch over `TIMELINE_ENTRY_KINDS`) and asserts the default branch is unreachable at runtime. The test's type-check pass is itself the exhaustiveness check `shared/components/src/LogPanel/__tests__/timelineEntryKind.test.ts`

**Parallel opportunities**: T010, T011, and T012 all edit files in `shared/components/src/LogPanel/` but touch distinct additions — they can be staged in one sitting and committed together, or split and run in parallel by different developers. T013 and T014 share a new test file; T014 is tagged `[P]` to signal it can be authored independently once T013 creates the file.

**Exit check for Phase 2**: `pnpm --filter @debrief/components typecheck && pnpm --filter @debrief/components test timelineEntryKind` green.

## Phase 3: User Story 1 (P1) — Discriminator replaces the category-as-semantics shortcut

**Goal**: Wire up the producer (VS Code host populator) and the consumer (LogPanel renderer) so that entries emitted by the host carry `kind` and the renderer dispatches snapshot-specific presentation from `kind === 'snapshot'` instead of from `ToolCategory === 'snapshot'`. This is the core of the feature — FR-001 through FR-004, FR-006 through FR-008 are satisfied here.

**Independent Test Criteria** (from spec Story 1): a `TimelineEntry` reaching the LogPanel carries a `kind` value drawn from the declared union; the LogPanel's snapshot-specific rendering path keys off `kind === 'snapshot'`; no code path inside the LogPanel reads `ToolCategory` to infer entry semantics (outside the gated legacy-fallback expression).

### Story 1 — tests first (write failing tests before implementation)

- [x] T020 [test] Add host-side unit tests for the `toTimelineEntry` `kind` populator: snapshot mapping, tool mapping, unmapped-tool fallback to `'tool'`, `'tune'` NOT emitted, stability under repeat invocation (5 cases from `contracts/timeline-entry-kind.contract.md`). Tests will fail until T022 lands `apps/vscode/src/views/__tests__/logPanelView.test.ts`
- [x] T021 [P][test] Extend renderer tests with the six cases from `contracts/timeline-entry-kind.contract.md`: `kind: 'snapshot'`, `kind: 'tool'`, `kind: 'tune'`, absent `kind` + snapshot toolName (legacy fallback), absent `kind` + non-snapshot toolName (legacy fallback), unknown `kind` (cast) → tool-row fallback. Tests will fail until T023 lands `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`

### Story 1 — implementation

- [x] T022 Populate `kind` in `toTimelineEntry`: import `resolveToolCategory` from `@debrief/components`, compute `kind = category === 'snapshot' ? 'snapshot' : 'tool'`, attach to the returned object literal. Keep the mapping ≤ 10 lines and co-located with the existing field assignments (SC-005) `apps/vscode/src/views/logPanelView.ts`
- [x] T023 Swap the `isSnapshot` derivation at line 114 to read from `entry.kind === 'snapshot'` with a gated legacy-fallback (`|| (entry.kind === undefined && resolveToolCategory(entry.toolName).category === 'snapshot')`). Update the inline comment to reference feature 208 `shared/components/src/LogPanel/LogEntry.tsx`
- [x] T024 Verify that the gated legacy-fallback expression is the ONLY remaining reference to `resolveToolCategory(...).category === 'snapshot'` in the LogPanel rendering code (non-test sources). Do a grep, document the result in T042's evidence file, and if a stray reference exists that is NOT the gated fallback, replace it with the `entry.kind === 'snapshot'` check. No file output from this task itself — findings feed T042.

### Story 1 — visual-parity evidence capture

- [x] T025 After T022 and T023 land, capture the post-change LogPanel Storybook `vscode`-theme screenshot of the same story exercised in T002. Save to `specs/208-timeline-entry-kind/evidence/screenshots/logpanel-post.png`

**Parallel opportunities**: T020 and T021 can run in parallel — they touch distinct test files. T022 and T023 edit different source files and can be staged in parallel, though the renderer change (T023) should not ship without the populator (T022) — running them together in one PR is essential.

**Exit check for Phase 3**: T020 and T021 tests green; T024 grep returns exactly the one expected occurrence; T025 screenshot captured.

## Phase 4: User Story 2 (P2) — Contract admits future `'tune'` without changing call sites

**Goal**: Prove the contract-shape guarantees spelled out in FR-005: `'tune'` is an admissible value of `TimelineEntryKind`, a future consumer enumerating `kind` handles it naturally, and the LogPanel does not crash when it encounters one. No production code in this phase — the work is test coverage and a fixture that demonstrates the future-ready contract.

**Independent Test Criteria** (from spec Story 2): the declared union includes `'tune'`; a test-only fixture producing a `kind: 'tune'` entry type-checks against every consumer signature without modification; the LogPanel renders such an entry without error (tool-row fallback is acceptable).

### Story 2 — contract coverage tests

- [x] T030 [test] Add a type-level test using `// @ts-expect-error` annotations and `satisfies` assertions that proves `'tune'` is admissible and that invalid values (e.g., `'annotation'`) are rejected at compile time. The test file imports `TimelineEntryKind` and the `TimelineEntry` interface, declares fixtures, and ensures `pnpm --filter @debrief/components typecheck` continues to pass `shared/components/src/LogPanel/__tests__/timelineEntryKind.test.ts`
- [x] T031 [P][test] Extend the renderer tests (already adjusted in T021) with a dedicated `describe` block titled "future 'tune' compatibility" that renders a `TimelineEntry` with `kind: 'tune'` through `LogEntry` and asserts: (a) no error is thrown, (b) the row does NOT carry snapshot-specific presentation, (c) the row renders with tool-row presentation (or at minimum, renders *something* — graceful fallback is the criterion). This is a subset of T021's coverage but exists as a named suite so `SC` traceability is explicit `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`

**Parallel opportunities**: T030 and T031 edit different test files and are fully parallelisable.

**Exit check for Phase 4**: T030 + T031 green; typecheck still green; no new production code changes.

## Phase 5: User Story 3 (P3) — No visible regression for users of today's LogPanel

**Goal**: Produce the visual-parity evidence that SC-001 demands: a row-by-row comparison of LogPanel rendering before and after the change shows 100% visual parity (row type, label, iconography, ordering). This phase is evidence-only — no production code change — but it is a necessary independent verification.

**Independent Test Criteria** (from spec Story 3): a pre-change and post-change LogPanel rendering the same session log are compared side by side; every row renders identically.

### Story 3 — visual-parity evidence

- [x] T040 Assemble the side-by-side comparison artefact. Pull `evidence/screenshots/logpanel-pre.png` (T002) and `evidence/screenshots/logpanel-post.png` (T025) into a single markdown file with: (a) both screenshots embedded side by side, (b) a short narrative explaining what was exercised in the captured story, (c) an explicit attestation that the two images are visually indistinguishable, and (d) an image-diff tool output (e.g., `imagemagick compare` hash equality, or the pixel-diff count produced by Storybook's built-in test-runner). If any pixel diff is visible and not explainable as timestamp text or anti-aliasing noise, STOP and investigate — this is a blocking signal for SC-001 `specs/208-timeline-entry-kind/evidence/visual-parity.md`

### Story 3 — extension smoke test (host-path visual parity)

- [x] T041 Run the VS Code extension in dev mode (`pnpm --filter @debrief/vscode compile` then F5 or via code-server preview), exercise the golden path: open a session with existing log entries containing at least one snapshot tool invocation (e.g., an `export-png` entry) and one ordinary tool invocation (e.g., a `bearing-between-tracks` entry), visually confirm both render as they did before the change. No file output from this task — the positive observation IS the deliverable; a failing observation is a blocker.

### Story 3 — SC-003 residual-grep evidence

- [x] T042 Capture the grep output underpinning SC-003: run `grep -rn "ToolCategory.*snapshot\|resolveToolCategory.*snapshot" shared/components/src/LogPanel/ | grep -v '__tests__'` and paste the result into the evidence file, along with a short commentary confirming that any matches are either (a) the gated legacy-fallback expression inside `LogEntry.tsx:114`, or (b) the `toolCategories.ts` source-of-truth map (the static `TOOL_ID_TO_CATEGORY` entries), which is out of scope for "rendering-code references" `specs/208-timeline-entry-kind/evidence/code-search-evidence.md`

**Parallel opportunities**: T040 depends on both T002 and T025 having produced their screenshots; it cannot parallelise with Phase 3. T041 and T042 can run in parallel with each other after T023 lands.

**Exit check for Phase 5**: visual-parity.md attests indistinguishable pre/post; extension smoke test observed clean; code-search-evidence.md shows only the expected gated reference.

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Capture required evidence, draft the shipped media content, run the full CI gate locally, and open the PR.

### Evidence collection

- [x] T050 Capture aggregate test results using the template at `.specify/templates/evidence/test-summary-template.md`. Run `pnpm --filter @debrief/components test` and `pnpm --filter @debrief/vscode test` (or the vitest invocation that covers the new test files). Populate YAML front matter with `feature: 208-timeline-entry-kind`, `captured_at`, `git_sha` (commit hash of the feature branch HEAD), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body enumerates the 13+ new test cases (T013, T014, T020's 5 populator cases, T021's 6 renderer cases, T030, T031) and names the key scenarios verified `specs/208-timeline-entry-kind/evidence/test-summary.md`
- [x] T051 [P] Create a concise TypeScript usage example showing a consumer reading `entry.kind`, using an exhaustive switch over `TIMELINE_ENTRY_KINDS`, and falling back via `assertNeverKind` in the default branch. Include the expected runtime behaviour and a note that the exhaustiveness guard forces a type-check failure if the union is widened without updating the consumer `specs/208-timeline-entry-kind/evidence/usage-example.md`

### Media content

- [x] T052 Spawn the Content Specialist (via `Task` tool with `subagent_type: "content-specialist"`) to draft the Shipped Post. Provide: feature name, goal from spec.md, what was built (from plan.md + evidence), lessons learned (the #176 conflation → discriminator story, the decision to reserve `'tune'` up front, the choice to keep `TimelineEntry` a UI projection rather than a LinkML type), what's next (PROV-side signal + future `'tune'` populator, #207 sequencing) `specs/208-timeline-entry-kind/media/shipped-post.md`
- [x] T053 [P] Spawn the Content Specialist again (or reuse T052's agent via `SendMessage`) to draft the LinkedIn shipped summary — 150–200 words, hook opening, link placeholder pointing to the shipped blog post URL `specs/208-timeline-entry-kind/media/linkedin-shipped.md`

### Verification (CI gate, run before PR)

- [ ] T054 Run the full CI gate locally per `CLAUDE.md` "Before Pushing": `task verify` (or the four-step fallback — lint, typecheck, unit tests, Playwright). All steps MUST pass. No file output; if anything fails, resolve before proceeding to T055.

### PR creation

- [ ] T055 Create PR and publish blog: run `/speckit.pr`. Delegates PR creation in `debrief-future` and the shipped-post PR in `debrief.github.io`. This task MUST run last; all other tasks must be complete, all evidence committed, and `task verify` green.

**Parallel opportunities**: T050 and T051 can run in parallel (different files). T052 and T053 can run in parallel (different agents / different files). Nothing in Phase 6 can parallelise with T055 — it is the final action.

**Exit check for Phase 6**: all tasks complete; `task verify` green; T055 has returned two PR URLs.

## Dependencies

### Phase ordering (strict)

```text
Phase 1 (Setup)
  └── T001: clean working tree
  └── T002: baseline screenshot (MUST precede Phase 3)
       │
       ▼
Phase 2 (Foundation — contract surface)
  └── T010–T014: type, helpers, contract tests
       │    all subsequent phases depend on this phase
       ▼
Phase 3 (Story 1 — producer + consumer switchover)
  ├── T020, T021: failing tests first
  ├── T022, T023: production code
  ├── T024: grep verification feeds T042
  └── T025: post-change screenshot (MUST follow T022 + T023)
       │
       ▼
Phase 4 (Story 2 — 'tune' contract coverage)
  └── T030, T031: test-only; depends on Phase 2 contract surface and Phase 3 renderer behaviour
       │
       ▼
Phase 5 (Story 3 — visual parity evidence)
  ├── T040: requires both T002 (pre) and T025 (post)
  ├── T041: requires T022 + T023 (extension smoke can run any time after consumer swap)
  └── T042: requires T024's grep findings
       │
       ▼
Phase 6 (Polish)
  ├── T050, T051: evidence (after all tests green)
  ├── T052, T053: media (can overlap with T050/T051)
  ├── T054: CI gate (MUST be green before T055)
  └── T055: /speckit.pr (final task, no parallelism)
```

### Story independence

Each user story is independently verifiable:

- **Story 1 (Phase 3)**: landed in isolation, delivers FR-001–FR-004, FR-006–FR-008. The feature's primary value. Stories 2 and 3 could be skipped and Story 1 would still be shippable — but the evidence-only stories are lightweight enough that skipping them defeats the purpose of `/speckit.tasks`.
- **Story 2 (Phase 4)**: test-only; confirms the contract shape admits `'tune'`. Lands cleanly after Story 1; does not change behaviour.
- **Story 3 (Phase 5)**: evidence-only; attests zero visible regression. Depends on Story 1 having landed to have "post-change" material to compare against.

### Critical-path tasks

T002 → T010 → T011 → T012 → T022 → T023 → T025 → T040 → T054 → T055. Everything else parallelises around this spine.

## Implementation Strategy

### Incremental delivery plan

The feature is small enough to land as a single PR. Within that PR, commits should follow the phase ordering so a reviewer can walk the history story-by-story:

1. **Commit A — Foundation** (Phase 2): type + helpers + contract tests. At this point the repo type-checks and all existing tests still pass; the new `timelineEntryKind.test.ts` passes. No behavioural change is observable.
2. **Commit B — Populator and consumer** (Phase 3 production code: T022, T023). Failing Story 1 tests (T020, T021) go red if run mid-commit; green once this commit lands. This is the atomic behavioural change.
3. **Commit C — Tests for Stories 1 and 2** (T020, T021, T030, T031). Authored alongside B; can be combined with B into one commit if that keeps the diff atomic. Separate commit is only necessary if the reviewer asked for TDD-style "red-then-green" commit trail.
4. **Commit D — Evidence** (Phase 5 + Phase 6 evidence + media drafts). Separate commit so the reviewer can review implementation and evidence independently.

For a very small PR, Commits A–C can be combined into one; only Commit D (evidence) needs to stay separate so the PR description can reference evidence files that existed before CI ran.

### Risk and mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hidden consumer of `TimelineEntry` outside the LogPanel that silently drops the new field | Low | `kind?` is optional; downstream consumers that don't know about it will type-check and run unchanged. Regression surface is zero. |
| `resolveToolCategory` import path is not already open to the VS Code host (creating a circular or forbidden dependency) | Low–Medium | Check import graph before T022. If blocked, use a local decision table reading `TOOL_ID_TO_CATEGORY` directly (≤ 10 lines). Either way, SC-005 is satisfied. |
| Storybook screenshot diff shows pixel-level timestamp differences that read as "regression" | Medium | Render the Storybook story with frozen mocked timestamps (they already are, per feature-176 stories). If noise persists, document the source in `visual-parity.md` and attest that the diff is non-semantic. |
| Conflict with #207 if it merges mid-flight | Low | See research.md R6. Expected merge footprint is trivial — `kind` computation is one statement; #207's manifest hook is a separate statement. Resolve by placing `kind` computation after any category resolution introduced by #207. |
| Exhaustiveness helper is imported into host code that currently lacks it, widening public surface unexpectedly | Low | T012 re-exports from the LogPanel barrel. If the author of this feature prefers the helper stay internal (one of the "what we'd love feedback on" prompts in the planning post), leave T012 scoped to the intra-module barrel and do not hoist to the package root. |

### Definition of Done

The feature is DONE when:

- All 24 implementation/test tasks (T001–T053) are checked.
- `task verify` (or its fallback) runs green locally (T054).
- PR and blog PR are both open (T055 returned two URLs).
- Evidence captured: `test-summary.md`, `usage-example.md`, `visual-parity.md`, `code-search-evidence.md`, `screenshots/logpanel-pre.png`, `screenshots/logpanel-post.png`.
- Media drafted: `shipped-post.md`, `linkedin-shipped.md` (in addition to the planning drafts already in place).
- The BACKLOG.md row for item 208 shows status `complete` once the PR merges (this happens in the post-merge flow, not in this task list).
