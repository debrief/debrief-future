# Tasks: Copilot Chat Integration Best-Practices Upgrade

**Feature**: `285-copilot-best-practices` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Successor to spike #284. Six slices across five user stories: priming placement
(US1), curated agent + scenario prompts (US2), approvals hardening (US3),
budget-aware token-efficient summary with spatial digest (US4), MCP hybrid
catalog-search experiment (US5). All #284 behavioural invariants preserved.

## Evidence Requirements

**Evidence Directory**: `specs/285-copilot-best-practices/evidence/`
**Media Directory**: `specs/285-copilot-best-practices/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results: extended copilot suite (summary v2, digest, compact, approval decl, prompt↔corpus parity, MCP guard) + drift check | After all tests pass |
| usage-example.md | Walkthrough: select Debrief Analyst agent, run a `/demo-*` scenario, mutation gate under /yolo | After US2+US3 complete |
| screenshots/priming-applied-preview.png | Applied-context indicator showing priming loaded (preview workspace) | US1 (live preview session) |
| screenshots/priming-applied-root.png | Same, repo-root workspace | US1 |
| screenshots/agent-picker.png | Debrief Analyst in the chat agent picker with pinned model | US2 |
| screenshots/mutation-gate-yolo.png | Confirmation dialog still shown under global auto-approve | US3 |
| screenshots/summary-northern-track.png | Positional reference resolved from summary alone | US4 |
| token-budget-v2.md | Regenerated probe table (4 sizes × 4k/8k/32k) with digests + compact form | US4 (supersedes #284 table) |
| mcp-vs-lmtool-comparison.md | Query-matrix parity + per-config routing/latency + E13 recommendation | US5 (findings note) |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| evidence/opening-context.md | Cached opener (Hook/What/How/Key Decisions) | Done during /speckit.plan |
| media/shipped-post.md | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Already open (#676); evidence + tasks pushed to it | Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

## Phase 1: Setup

**Goal**: Add the one new dependency and record the ADR so downstream tasks can import it.

- [ ] T001 Add `@vscode/prompt-tsx` (pinned) to `apps/vscode/package.json` devDependencies/dependencies and install `apps/vscode/package.json`
- [ ] T002 Record ADR for the `@vscode/prompt-tsx` dependency (Article IX justification from plan.md Constitution Check) `docs/project_notes/decisions.md`

**Checkpoint**: `pnpm --filter debrief-vscode install` resolves; `import { renderElementJSON } from '@vscode/prompt-tsx'` typechecks.

## Phase 2: Foundation

**Goal**: Shared plumbing every story leans on — the drift-check script that
enforces the customization-pack sync contract, and confirmation that the
scenario-truth corpus exists to bind prompts and replay tests together. Blocks
US1/US2 (drift check) but not US4/US5.

- [ ] T003 Create the customization-pack drift-check script (SHA-256 canonical vs synced copies for priming/agent/prompts; exit non-zero on mismatch or missing copy) `scripts/check-copilot-customization-drift.mjs`
- [ ] T004 Wire the drift check into the lint step so CI runs it `Taskfile.yml`
- [ ] T005 [P][test] Add a unit test asserting the drift-check script passes on identical copies and fails on injected drift `apps/vscode/tests/unit/copilot/customizationDrift.test.ts`
- [ ] T006 Confirm/annotate the scenario-truth corpus (the 8 #284 utterances) in the transcript-replay test as the single source the prompt files must match `apps/vscode/tests/unit/copilot/scenarios.transcript.test.ts`

**Checkpoint**: `node scripts/check-copilot-customization-drift.mjs` runs (passes trivially until copies exist); corpus utterances enumerated for T012 to reference.

## Phase 3: US1 — Domain priming actually loads (P1)

**Goal**: The Debrief priming file is applied to chat requests in both demo
workspaces, from one canonical source, drift-guarded.

**Independent test**: Open each demo workspace, send a chat request, confirm the
applied-context indicator lists the Debrief priming (FR-001/002).

- [ ] T007 Relocate the priming file to the canonical repo root, preserving #284 content `.github/copilot-instructions.md`
- [ ] T008 Remove the mis-placed #284 priming file `apps/vscode/.github/copilot-instructions.md`
- [ ] T009 Add the byte-identical synced copy at the preview workspace root (folder `samples/` per `debrief-preview.code-workspace`) `preview/workspace/samples/.github/copilot-instructions.md`
- [ ] T010 Verify the drift check now covers the priming copy (extend script paths if needed) `scripts/check-copilot-customization-drift.mjs`

**Checkpoint**: drift check green; priming present at both roots; SC-001 screenshots capturable in Polish.

## Phase 4: US2 — Reproducible demos: curated agent + scenario prompts (P1)

**Goal**: A "Debrief Analyst" custom agent (pinned model, restricted tool list)
and the eight #284 scenarios as `/demo-*` slash commands, all drift-guarded and
corpus-bound.

**Independent test**: On a fresh profile, select Debrief Analyst, run each
`/demo-*` command, confirm the scripted outcome without manual picker setup
(FR-004/007/008, SC-002/003).

- [ ] T011 Determine the minimal built-in tool set empirically (run the 8 scenarios, enable only what they require) and record the chosen model id + built-ins in research.md Assumption `specs/285-copilot-best-practices/research.md`
- [ ] T012 Author the Debrief Analyst custom agent (front matter: name, description, pinned model, `tools` = 4 `debrief_*` + minimal built-ins; body embeds conventions per FR-005) `.github/agents/debrief-analyst.agent.md`
- [ ] T013 [P] Author the 5 happy-path scenario prompts, bodies verbatim-equivalent to the corpus utterances, `agent: Debrief Analyst` front matter `.github/prompts/demo-1-open-plot.prompt.md`
- [ ] T014 [P] Author the 3 fail-safe scenario prompts (no-plot, ambiguous-reference, invented-tool) `.github/prompts/demo-6-no-plot.prompt.md`
- [ ] T015 Add byte-identical synced copies of the agent + 8 prompts at the preview workspace root `preview/workspace/samples/.github/agents/debrief-analyst.agent.md`
- [ ] T016 [test] Add the prompt↔corpus parity test (each `demo-*.prompt.md` body matches its `scenarios.transcript.test.ts` utterance) `apps/vscode/tests/unit/copilot/promptCorpusParity.test.ts`
- [ ] T017 Update the drift check to include the agent + prompt copies; run it `scripts/check-copilot-customization-drift.mjs`

**Checkpoint**: `/demo-1` … `/demo-8` appear under Debrief Analyst; parity + drift tests green; SC-002/003 evidenced in Polish live session.

## Phase 5: US3 — Bypass-proof mutation approvals; frictionless read-only (P2)

**Goal**: `debrief_runTool` cannot be auto-approved even under global auto-
approve; read-only pre-approval is documented (never granted by the extension).

**Independent test**: Enable `chat.tools.global.autoApprove`, run a mutating
tool, confirmation still appears; declining leaves the plot byte-identical
(FR-010/011/013, SC-004).

- [ ] T018 Contribute `configurationDefaults.chat.tools.eligibleForAutoApproval` = `{ "debrief_runTool": false }` `apps/vscode/package.json`
- [ ] T019 Echo the same setting in the preview workspace so it holds even if extension defaults are overridden `preview/workspace/debrief-preview.code-workspace`
- [ ] T020 [test] Assert the approval-eligibility declaration exists and marks only `debrief_runTool` ineligible; assert read-only tools are NOT programmatically auto-approved (FR-012) `apps/vscode/tests/unit/copilot/approvalPolicy.test.ts`
- [ ] T021 [test] Regression: confirm the existing `prepareInvocation` confirmation + invoke-time mutation guard still fire (defence-in-depth, FR-013) — extend existing prepare/invoke tests `apps/vscode/tests/unit/copilot/runTool.prepare.test.ts`

**Checkpoint**: mutation gate survives /yolo (verified live in Polish); read-only pre-approval documented in quickstart (already present); no extension-granted approval.

## Phase 6: US4 — Budget-aware token-efficient plot summary with spatial digest (P2)

**Goal**: Compact serialization on all tool results; a per-feature spatial
digest; and a budget-aware summary that sheds content in priority order via
prompt-tsx instead of a fixed cap.

**Independent test**: Summarise the 4 probe fixture sizes — small plots gain
digests with modest growth; over-budget plots degrade by documented shed order
with a partial-inventory notice; "northern track" resolves from summary alone
(FR-014–018, SC-005/006).

- [ ] T022 Make `jsonResult()` emit compact JSON (drop `null, 2`); keep `approxTokens` computed over the emitted payload `apps/vscode/src/copilot/resultHelpers.ts`
- [ ] T023 [P][test] Assert ≥15% payload reduction vs the #284 pretty-printed baseline at each probe size (8/32/100/250) `apps/vscode/tests/unit/copilot/compactSerialization.test.ts`
- [ ] T024 Add the spatial-digest derivation (3×3 compass sector + pt/local/wide extent from feature-vs-plot bbox; omit for zero-geometry features) `apps/vscode/src/copilot/summarize.ts`
- [ ] T025 Extend `FeatureInventoryEntry`/`PlotSummaryView` to v2 shape (`spatialDigest?`, `shedding?` notice, `truncated` now = any-content-shed) using derived types per the boundary-types rule `apps/vscode/src/copilot/types.ts`
- [ ] T026 [P][test] Assert digest determinism + correctness (northern feature → `N*` sector; geometry-less feature → field omitted, never fabricated) `apps/vscode/tests/unit/copilot/spatialDigest.test.ts`
- [ ] T027 Author the prompt-tsx summary element with priority ranks (identity+counts+notice > id/name/type > timeSpan > digest) `apps/vscode/src/copilot/summaryPrompt.tsx`
- [ ] T028 Wire `summarizeCurrentPlotTool.invoke` to render via `renderElementJSON(..., options.tokenizationOptions)` → `LanguageModelPromptTsxPart`, falling back to the compact-text path when `tokenizationOptions` is absent `apps/vscode/src/copilot/summarizeCurrentPlotTool.ts`
- [ ] T029 Emit the `shedding` notice (omitted classes + narrowing guidance) whenever pruning or the `INVENTORY_CAP` backstop drops content; enforce the minimum-budget floor (identity+counts+guidance always present) `apps/vscode/src/copilot/summarize.ts`
- [ ] T030 [test] Summary-v2 tests: text/prompt-tsx field parity at full budget; priority shed order under shrinking budget; partial-inventory notice present when shed; floor never empty `apps/vscode/tests/unit/copilot/summarize.test.ts`

**Checkpoint**: `pnpm --filter debrief-vscode typecheck && test` green; digests present; over-budget degrades gracefully; token-budget-v2 regenerable in Polish.

## Phase 7: US5 — MCP hybrid catalog-search experiment (P3)

**Goal**: Register the existing Python STAC MCP server with agent mode (no
manual mcp.json), gated by `debrief.mcp.autoStart`, non-fatal on failure; then
produce the MCP-vs-LM-tool routing comparison for E13.

**Independent test**: With the MCP server enabled and `debrief_searchPlots`
disabled, the agent finds a plot via the MCP-served tool; result sets match the
extension tool across the query matrix; comparison note exists (FR-019–022,
SC-007).

- [ ] T031 Implement the `McpServerDefinitionProvider` returning one `McpStdioServerDefinition` for `debrief_stac.mcp_server` (reuse `calcService` Python-interpreter resolution; catalog path from `debrief.stacCatalogPath`) `apps/vscode/src/copilot/mcpProvider.ts`
- [ ] T032 Register the provider in activation behind a capability check (`'registerMcpServerDefinitionProvider' in vscode.lm`) + try/catch (log diagnostic, LM tools unaffected) and gate on `debrief.mcp.autoStart` `apps/vscode/src/extension.ts`
- [ ] T033 Contribute `mcpServerDefinitionProviders` `apps/vscode/package.json`
- [ ] T034 [test] Provider-guard tests: absent-API host → no throw, LM tools intact; startup failure → diagnostic not error dialog (FR-021); definition targets the correct module + catalog path `apps/vscode/tests/unit/copilot/mcpProvider.test.ts`
- [ ] T035 Write the query-matrix parity script (text/time/platform/bbox × 3 fixtures) asserting MCP-served results == `searchCatalog` results (FR-020) `apps/vscode/tests/unit/copilot/mcpSearchParity.test.ts`

**Checkpoint**: MCP server discoverable when enabled; parity green; failure non-fatal. Comparison findings note produced in Polish (needs live routing runs).

## Phase 8: Polish & Cross-Cutting Concerns

### Cross-cutting verification

- [ ] T036 Run `task verify` (lint incl. drift check, typecheck, full test suite) and confirm the #284 invariants still hold: dirty-only edits, corrective fail-safes, telemetry, provenance (FR-023/024)

### Evidence Collection

- [ ] T037 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/285-copilot-best-practices/evidence/test-summary.md`
- [ ] T038 Create usage demonstration (select Debrief Analyst → run a `/demo-*` scenario → mutation gate under /yolo) `specs/285-copilot-best-practices/evidence/usage-example.md`
- [ ] T039 [P] Capture priming-applied screenshots in both workspaces (live preview Code Server session — see quickstart §1) `specs/285-copilot-best-practices/evidence/screenshots/priming-applied-preview.png`
- [ ] T040 [P] Capture the agent-picker + `/demo-*` slash-command screenshots `specs/285-copilot-best-practices/evidence/screenshots/agent-picker.png`
- [ ] T041 [P] Capture the mutation-gate-under-/yolo screenshot `specs/285-copilot-best-practices/evidence/screenshots/mutation-gate-yolo.png`
- [ ] T042 [P] Capture the "northern track" resolved-from-summary screenshot `specs/285-copilot-best-practices/evidence/screenshots/summary-northern-track.png`
- [ ] T043 [P] Regenerate the token-budget probe table (4 sizes × 4k/8k/32k, with digests + compact form; supersedes the #284 table) `specs/285-copilot-best-practices/evidence/token-budget-v2.md`
- [ ] T044 Produce the MCP-vs-LM-tool comparison findings note (query-matrix parity + per-config routing/latency from a live session + E13 recommendation) `specs/285-copilot-best-practices/evidence/mcp-vs-lmtool-comparison.md`

### Media Content

- [ ] T045 Create feature blog post (Content Specialist; first three sections verbatim from `evidence/opening-context.md`, remainder from ship-time evidence) `specs/285-copilot-best-practices/media/shipped-post.md`

### PR Creation

- [ ] T046 Create PR and publish blog: run `/speckit.pr` (feature PR #676 already open — updates it with evidence; opens the debrief.github.io blog PR)

**Task T046 must run last. It depends on all evidence and media tasks (T037–T045) being complete.**

## Dependencies

**Story completion order** (by priority; stories are independently testable):

- **Setup (P1)** → **Foundation (T003–T006)** block everything that uses the
  drift check (US1, US2) and the prompt-tsx import (US4). US3 and US5 depend
  only on Setup.
- **US1 (P1, T007–T010)** — independent once Foundation's drift script exists.
- **US2 (P1, T011–T017)** — needs Foundation (drift check + corpus). T011
  (empirical model/tool choice) precedes T012 (agent file). T013/T014 (prompts)
  are [P]. T016 parity test needs T013/T014 + T006 corpus.
- **US3 (P2, T018–T021)** — independent of US1/US2/US4/US5; only needs the repo.
- **US4 (P2, T022–T030)** — needs Setup (T001 prompt-tsx). T022 compact is
  standalone; T024→T025→T027→T028→T029 is the summary chain; T023/T026 are [P]
  tests. No dependency on US1–US3.
- **US5 (P3, T031–T035)** — needs the existing `debrief_stac` MCP server (already
  present) and `calcService` interpreter resolution. Independent of US1–US4.
- **Polish (T036–T046)** — after all stories. T046 (`/speckit.pr`) is strictly
  last; live-session evidence tasks (T038–T042, T044) require a built extension.

**Cross-file contention**: `apps/vscode/package.json` is touched by T001, T018,
T033 — sequence these (not [P]). `scripts/check-copilot-customization-drift.mjs`
is touched by T003, T010, T017 — sequence. `summarize.ts` by T024, T029 —
sequence.

## Implementation Strategy

**Incremental delivery** — each story is a shippable increment, and the two P1
stories are the highest-value/lowest-risk pair (config files + a placement fix),
so they can land and be demoed first:

1. **MVP demo-ready (US1 + US2)**: priming loads + Debrief Analyst agent + eight
   `/demo-*` commands. This alone delivers the core "optimise what we're
   demoing/researching" ask — reproducible demos on a fixed model and tool set.
2. **Harden (US3)**: bypass-proof mutation gate — small, independent, strengthens
   the defence-posture story for the same demos.
3. **Deepen the research signal (US4)**: budget-aware summary + spatial digest —
   the largest slice; improves both large-plot demos and the E13 token dataset.
4. **Strategic experiment (US5)**: MCP hybrid — highest research value per line
   (server already exists), delivered as a comparison note feeding E13.

**Parallelism**: within US2, the happy-path and fail-safe prompt authoring
(T013/T014) run in parallel; within US4, the compact-serialization and
digest-determinism tests (T023/T026) run in parallel; across stories, US3, US4,
and US5 have no interdependencies and can be worked concurrently once Setup +
Foundation land (mind the shared-file contention notes above).

**Non-negotiable**: T036 gates on all #284 invariants surviving; T046
(`/speckit.pr`) runs only after every evidence and media artifact exists.
