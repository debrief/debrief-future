# Feature Specification: Storyboard Edit Suite — Polish Follow-up (stories, code-server E2E, a11y, perf, scenario completion)

**Feature Branch**: `232-storyboard-edit-polish-followup`
**Created**: 2026-04-24
**Status**: Draft
**Input**: Backlog item 232 (follow-up to #230, which landed the core wiring + harness + smoke E2E but deferred five discrete polish items). Parent: #230 Storyboard edit suite webview wiring.

---

## Context

Feature #230 closed the webview wiring + web-shell harness + error triage for the Storyboard edit suite (Phases 1–7 green, 88 new tests, 2,406 pass, 6 evidence screenshots captured). Phase 8 ("Polish") shipped partial: evidence + shipped blog post are complete, but **five quality-of-shipping tasks** were intentionally deferred to this feature so #230 could merge clean without them:

1. **Interactive Storybook stories** (T080–T083 from #230) — the four edit-suite stories (`WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation`) still consume static `args`-based props. #230 introduced `useStoryboardEditReducer` as the shared behavioural layer, but did not wire it into the stories. Reviewers looking at Storybook still see frozen placeholders instead of real state transitions.
2. **Thin code-server E2E** (T084, T085 from #230) — `tests/e2e/test-storyboard-edit.spec.ts` was scoped in #230's plan for VS Code-native chrome only (command-palette invocation of the 11 new commands, `showInputBox` prompts, `showQuickPick` destination picker, native notification toasts). Not written. Captures one `vscode-native-chrome.png` for the evidence table.
3. **`@axe-core/playwright` audit** (T089 from #230) — the SceneOverflowMenu is the highest-risk new a11y surface (right-click / Shift+F10 / ArrowDown nav). The audit was planned against three states (overflow menu open, panel with edit form + stale badge, and each of the four upgraded Storybook stories) with results in `evidence/a11y-report.md`. Not run.
4. **Perf budget test** (T090 from #230) — #218 SC-014 set a budget of `onPlotOpened` median ≤ 50 ms at spec scale. #230's refresh-payload enrichment preserved the O(active-storyboard Scenes) invariant structurally (inline comment + compose loop iterates only active-Storyboard Scenes), but no automated assertion. Worth wiring up so future changes can't silently regress.
5. **Playwright scenario completion** (subset of T057 from #230) — the smoke suite landed by #230 covers 7 scenarios (render, chevron, overflow open, delete+undo, stale+refresh-all, Shift+F10, missing-data). The full #218 evidence-requirements table + #230 FR-030 call for additional scenarios the smoke suite did not cover: Scene rename (inline title edit), duplicate-at-colliding-timestamp prompt, copy-to-other-storyboard picker, copy-to-other deep-copy failure path, Storyboard rename + describe, update-to-current thumbnail, bulk refresh partial failure, and an interaction GIF of rename → describe → delete+undo → refresh-stale (< 5 s, < 2 MB per FR-041).

This feature closes every one of those gaps in a single PR so the Storyboard edit suite can retire its "follow-up" status and the #218 evidence table can be marked complete.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Interactive Storybook for reviewer walkthrough (Priority: P1)

A stakeholder reviewer or incoming team member opens Storybook to learn how the Storyboard edit suite behaves. They click through each edit-suite story and see the real polish loop — chevron opens a real edit form backed by the reducer, Delete surfaces a real Undo toast that actually undoes when clicked, Refresh clears a real stale badge. No documentation required; the story *is* the walkthrough.

**Why this priority**: The shared reducer (`useStoryboardEditReducer`) is #230's headline architectural decision, but its value is invisible until the stories use it. Until then, Storybook under-sells the feature and a reviewer's mental model diverges from production. Every other deferred item is quality-of-ship; this one is narrative.

**Independent Test**: Run `pnpm --filter @debrief/components storybook`. Open each of the four edit-suite stories. For each: click the described interaction (chevron, Delete + Undo, Refresh, keyboard-tab to remediation affordance). Verify the UI responds as in the real panel — the story is not frozen.

**Acceptance Scenarios**:

1. **Given** the `WithEditForm` story is open, **When** the analyst clicks the chevron on any Scene row, **Then** the inline edit form opens for that row, Submit persists locally, and Cancel discards — all through the reducer.
2. **Given** the `WithUndoToast` story is open, **When** the analyst clicks Delete on a Scene row via the overflow menu, **Then** the row disappears and an Undo toast renders; clicking Undo restores the row.
3. **Given** the `WithStaleBadge` story is open, **When** the analyst clicks Refresh on the badge (or in the overflow menu), **Then** the badge clears — driven by a mock-port knob that lets the story simulate both success and induced-failure (the failure path surfaces the error toast without clearing the badge).
4. **Given** the `WithMissingDataRemediation` story is open, **When** the analyst Tabs through the panel, **Then** focus lands on the remediation affordance with a visible focus ring; pressing Enter dispatches the remediation action.

---

### User Story 2 — VS Code chrome integration proven (Priority: P1)

A developer or QA engineer needs confidence that each of the 11 new Storyboard edit commands is reachable from the VS Code command palette and routes through the VS Code-native chrome (input boxes, quick picks, notification toasts) correctly. The polish loop has already been proven from the web-shell harness; this is the thin complementary layer that proves the integration point with VS Code APIs has not regressed.

**Why this priority**: Equal to US1 because it is the last piece of evidence the #218 requirements table needs to declare coverage complete. Without it, FR-033 / FR-034 from #230 remains unverified and the blog post claim that "every polish-loop flow runs end-to-end" is technically incomplete.

**Independent Test**: Run the code-server E2E spec (`node apps/vscode/tests/e2e/run-playwright.mjs test-storyboard-edit`). The run must: (a) invoke each of the 11 commands via the command palette, (b) fulfil each prompt via the native `.monaco-inputbox` / `.quick-input-widget` selector, (c) observe the expected native notification toasts, (d) capture one `vscode-native-chrome.png` screenshot mid-flow.

**Acceptance Scenarios**:

1. **Given** a fresh VS Code code-server session, **When** the test invokes `Ctrl+Shift+P → Storyboard: Rename scene`, **Then** the native input box appears, and fulfilling it dispatches the `renameScene` service call with the correct args.
2. **Given** the duplicate-at-colliding-timestamp path, **When** the test invokes `Storyboard: Duplicate scene` on a scene whose timestamp already has a neighbour, **Then** the native modal surfaces the `duplicateTimestampConflict` message with Replace / Offset / Cancel options.
3. **Given** the copy-to-other path, **When** the test invokes `Storyboard: Copy scene to other storyboard`, **Then** `showQuickPick` surfaces with the plot's other Storyboards as options; selecting one dispatches the copy with the destination storyboardId.
4. **Given** any successful edit op, **When** the completion toast fires via `showInformationMessage`, **Then** the test observes it via Playwright's notification-surface selector.

---

### User Story 3 — Automated a11y audit passes (Priority: P2)

An accessibility reviewer (or CI) needs assurance that the Storyboard edit suite's new surfaces (overflow menu, combined edit-form + stale-badge states, interactive Storybook stories) do not introduce WCAG violations at the serious/critical tier.

**Why this priority**: High-value but secondary to US1/US2. The overflow menu already passes unit-level keyboard-nav tests (13 assertions in `SceneOverflowMenu.test.tsx`). The axe audit is the belt-and-braces automated sweep that catches anything the unit tests miss (colour contrast, focus traps, missing labels in unusual states).

**Independent Test**: Run `pnpm --filter @debrief/web-shell test tests/storyboard-edit-a11y.spec.ts`. The spec must run axe on: (a) harness with overflow menu open, (b) harness with edit form + stale badge visible, (c) each of the four upgraded Storybook stories. No serious/critical violations permitted; moderate violations logged to `evidence/a11y-report.md` with either a fix or an accepted-risk entry.

**Acceptance Scenarios**:

1. **Given** the harness with the overflow menu open, **When** axe runs, **Then** zero serious/critical violations are reported.
2. **Given** the harness with an edit form open AND a stale badge visible on another row, **When** axe runs, **Then** zero serious/critical violations are reported.
3. **Given** any of the four upgraded Storybook stories, **When** axe runs on its iframe, **Then** zero serious/critical violations are reported.

---

### User Story 4 — Perf budget guarded in CI (Priority: P2)

A developer changing the Storyboard panel's refresh path can't silently regress the O(active-storyboard Scenes) invariant because CI will catch it. The `onPlotOpened` median stays below 50 ms at spec scale, enforced by an automated test.

**Why this priority**: Medium-value regression guard. #230's refresh-payload enrichment preserved the bound structurally, but without a test, future changes could walk the scene list twice unintentionally. The test is cheap; the insurance is valuable.

**Independent Test**: Run `pnpm --filter debrief-vscode test perf`. The perf test builds a synthetic plot with the spec-bound scale (5 Storyboards × 50 Scenes each), calls `storyboardPanelView.refresh()` 100 times, and asserts the median wall-clock is ≤ 50 ms.

**Acceptance Scenarios**:

1. **Given** a plot with 5 Storyboards × 50 Scenes, **When** `refresh()` is invoked 100 times, **Then** the median wall-clock time is ≤ 50 ms.
2. **Given** a deliberate regression (e.g. nested loop over all Storyboards instead of only the active one), **When** the perf test runs, **Then** it fails loudly with the measured median in the failure message.

---

### User Story 5 — Remaining Playwright scenarios + interaction GIF (Priority: P3)

A reviewer looking at the shipped blog post or the #218 evidence table wants to see the *full* polish-loop demonstration — not just the smoke-level subset. Every flow #230 promised is exercised by an automated Playwright scenario; a short (< 5 s, < 2 MB) interaction GIF shows rename → describe → delete+undo → refresh-stale in one continuous recording.

**Why this priority**: Lower than the other four because the smoke suite already covers the backbone flows and the feature is functionally complete. This user story is about the evidence package and the blog-post artefact.

**Independent Test**: Run `cd apps/web-shell && node run-playwright.mjs storyboard-edit`. Every scenario from #230's plan.md §Web-Shell E2E Testing table (line 200 onwards) now passes, producing the full set of #218 evidence-requirements screenshots. The interaction GIF renders at `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` within budget.

**Acceptance Scenarios**:

1. **Given** the harness, **When** the test runs, **Then** every new scenario (Scene rename, duplicate-at-colliding-timestamp, copy-to-other success, copy-to-other deep-copy failure, update-to-current, Storyboard rename + describe, bulk refresh partial failure) passes.
2. **Given** Playwright's `recordVideo` is configured, **When** the full polish-loop scenario runs, **Then** a GIF at the target path meets the < 5 s, < 2 MB budget.
3. **Given** every scenario produces a Log Panel card assertion, **When** the test runs, **Then** each assertion matches the expected `data-op` attribute for that action (FR-035 from #230).

---

### Edge Cases

- **Storybook story interactivity without VS Code postMessage**: the stories need a thin mock-port wrapper (same pattern as the web-shell harness but simpler — no URL knobs required). Stories must work when Storybook opens their iframe in isolation.
- **Code-server native selectors across VS Code versions**: `.monaco-inputbox input` and `.quick-input-widget input` selectors are stable in VS Code 1.85+, but regression guard by re-using the selector helpers from `test-storyboard-playback.spec.ts:261` rather than re-declaring.
- **Axe noise on the whole panel**: do not run axe against the full panel — scope to the specific surface under test. A full-panel scan leaks out into non-230 surfaces (LogPanel, etc.) that are not this feature's contract.
- **Perf test variance**: wall-clock medians are susceptible to CI-machine noise. Run the refresh 100× and use the median (not the mean); allow a CI-only 20 % tolerance buffer (hard budget 50 ms, soft budget 60 ms).
- **Interaction GIF size**: the 2 MB budget is tight. Use a low frame rate (10 fps) + short duration (< 5 s) and the existing `videoToGif.ts` helper if present; otherwise add one.
- **Deep-copy failure path**: the harness needs an `inducedFailure` knob so the copy-to-other scenario can deterministically hit the rollback branch. Add as a query-string param (`?induceCopyFailure=sceneB`).

---

## Requirements *(mandatory)*

### Functional Requirements

**Interactive Storybook stories (US1)**

- **FR-001**: The four edit-suite Storybook stories (`WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation`) MUST consume `useStoryboardEditReducer` via a story-only mock-port wrapper. Static `args`-based props are replaced.
- **FR-002**: Each story MUST support the specific interactive flow for its name (form open/submit/cancel, delete+undo, stale refresh success + induced failure, missing-data remediation keyboard reach).
- **FR-003**: The story-only mock-port MUST be the same behavioural layer as the web-shell harness's mock port — if the harness's port exports a reusable factory, the stories import it; otherwise factor out a shared helper in `shared/components/src/panels/StoryboardPanel/`.

**Code-server chrome-only E2E (US2)**

- **FR-010**: `apps/vscode/tests/e2e/test-storyboard-edit.spec.ts` MUST exist and cover command-palette invocation for each of the 11 new commands (rename, describe, delete, undo, update-to-current, duplicate, copy-to-other, refresh-thumbnail, refresh-all-stale, storyboard-rename, storyboard-describe).
- **FR-011**: The spec MUST exercise each native input-box prompt (rename scene, duplicate-timestamp collision, storyboard rename) via `.monaco-inputbox input`.
- **FR-012**: The spec MUST exercise the native quick-pick for copy-to-other destination via `.quick-input-widget input`.
- **FR-013**: The spec MUST observe the native `showInformationMessage` / `showWarningMessage` toast surfaces for success + error paths.
- **FR-014**: The spec MUST NOT duplicate any click-flow already covered by the web-shell suite (FR-034 from #230 carries forward).
- **FR-015**: The spec MUST capture one `vscode-native-chrome.png` screenshot mid-flow (input-box or quick-pick visible) to `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png`.

**A11y audit (US3)**

- **FR-020**: An `@axe-core/playwright` audit MUST run against three harness states (overflow menu open; edit form + stale badge visible; missing-data remediation visible).
- **FR-021**: The same audit MUST run against the iframe of each of the four upgraded Storybook stories.
- **FR-022**: No `serious` or `critical` violations are permitted. `moderate` violations MUST be either fixed or logged in `evidence/a11y-report.md` with an accepted-risk rationale.
- **FR-023**: `evidence/a11y-report.md` MUST enumerate: surfaces audited, axe version, violation counts by severity, and any accepted-risk entries.

**Perf budget (US4)**

- **FR-030**: An automated perf test MUST build a 5 × 50-Scene synthetic plot, invoke `storyboardPanelView.refresh()` 100 times, and assert median wall-clock ≤ 50 ms (hard budget) with a CI-only 20 % tolerance buffer.
- **FR-031**: The perf test MUST run as part of the `debrief-vscode` test suite so CI catches regressions.
- **FR-032**: A deliberate regression MUST fail the test loudly with the measured median in the failure message — the test is not allowed to pass without an explicit assertion on the upper bound.

**Playwright scenario completion + interaction GIF (US5)**

- **FR-040**: The web-shell E2E spec MUST cover, in addition to #230's smoke set: Scene title rename (inline edit), duplicate-at-colliding-timestamp prompt, copy-to-other-storyboard (success), copy-to-other deep-copy failure (via `?induceCopyFailure` knob), update-to-current, Storyboard rename + describe, and bulk refresh partial failure.
- **FR-041**: Every successful edit op MUST assert a matching Log Panel card via `[data-testid="log-panel-card"]` with a `data-op` attribute matching the operation type (FR-035 from #230 extended to the new scenarios).
- **FR-042**: A short (< 5 s, < 2 MB) interaction GIF MUST be captured showing rename → describe → delete + undo → refresh-stale, rendered at `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif`.
- **FR-043**: The harness MUST support an `?induceCopyFailure=<sceneId>` query-string knob so the deep-copy failure path is deterministically reachable by Playwright.

### Key Entities

- **Story-only mock port**: a thin wrapper around `useStoryboardEditReducer` plus a fixture-seed helper, exposing the same observable surface as the harness's mock port. Imported by each of the four upgraded stories.
- **VS Code-chrome E2E selector helpers**: reuse `.monaco-inputbox input`, `.quick-input-widget input`, and the notification-surface selectors already established by `test-storyboard-playback.spec.ts`.
- **A11y report**: a markdown file under `evidence/` enumerating surfaces audited, tool version, violations by severity, and accepted-risk rationale per moderate violation.
- **Perf budget record**: an entry appended to `specs/230-storyboard-edit-wiring/evidence/perf-budget-230.md` (or the current equivalent) with measured medians per run.
- **Interaction GIF**: a ≤ 2 MB, ≤ 5 s recording at a stable per-frame rate; generated by a new or existing `videoToGif.ts` helper.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four edit-suite Storybook stories drive the polish loop through `useStoryboardEditReducer` — no static `args`-based props remain.
- **SC-002**: `test-storyboard-edit.spec.ts` exists in `apps/vscode/tests/e2e/`, passes under code-server, and covers all 11 commands + all native prompt surfaces.
- **SC-003**: `evidence/a11y-report.md` exists with zero `serious`/`critical` violations across the 3 harness states + 4 story iframes.
- **SC-004**: The perf test exists, passes at the 50 ms median budget, and fails loudly on a deliberate regression.
- **SC-005**: The web-shell Playwright suite covers the full scenario set from #230's plan.md §Web-Shell E2E Testing table — no scenario remains unimplemented.
- **SC-006**: `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` exists, is < 5 s and < 2 MB, and shows the core polish loop.
- **SC-007**: #230's and #218's test baselines both remain 100 % green; no regressions in existing component / vscode / web-shell / Playwright suites.
- **SC-008**: Every functional requirement in this spec is covered by at least one automated test or capture step.

---

## Out of Scope

- **Additional Storyboard panel features** (v4.x plans a distraction-free briefing renderer, animated time-range Scenes, MP4/GIF video export — tracked as #229).
- **LogPanel collapser wiring** (#176).
- **Full thumbnail deep-copy on copy-to-other** (#216 / #174).
- **LinkML round-trip for edit view-models** (#215 follow-up).
- **New backlog items discovered during this feature's manual testing** — treat as separate BACKLOG entries; this spec stays within the five deferred items enumerated in Context.

---

## Dependencies

- #230 merged to main (provides the shared reducer, the harness, the smoke E2E suite, the data-testids).
- `@axe-core/playwright` already present in the dev dependency graph (per #230 research R11).
- `@sparticuz/chromium` runner already configured (cloud Playwright).

## Estimate

- **Days**: 3–4 dev-days.
- **Complexity**: Medium (standard follow-up work; well-defined; no architectural novelty).
- **Risk**: Low — all surfaces already exist; this feature is additive quality work.
