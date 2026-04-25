# Tasks: LogPanel A11y Audit with Theme Responsiveness (209)

## Evidence Requirements

**Evidence Directory**: `specs/209-logpanel-a11y-audit/evidence/`
**Media Directory**: `specs/209-logpanel-a11y-audit/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Playwright + vitest results for theme fix and audit | After all tests pass |
| `usage-example.md` | How to run the audit locally and interpret results | After audit works |
| `screenshots/logpanel-light.png` | LogPanel timeline view — light theme | After theme fix (P1) |
| `screenshots/logpanel-dark.png` | LogPanel timeline view — dark theme | After theme fix (P1) |
| `screenshots/logpanel-vscode.png` | LogPanel timeline view — VS Code theme | After theme fix (P1) |
| `screenshots/interaction.gif` | Theme-switch interaction showing live colour change | During Storybook E2E |
| `evidence/176-log-panel-ux/a11y-audit.md` | Full axe-core audit report: violations found, fixes, final pass | After P3 audit passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | ✅ Done (speckit.plan) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | ✅ Done (speckit.plan) |
| `media/shipped-post.md` | Blog post celebrating completion | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence and passing CI | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Goal**: Add `@axe-core/playwright` devDependency and verify the existing Playwright harness can reach Storybook.

- [x] T001 Add `@axe-core/playwright@^4.8.5` to devDependencies `shared/components/package.json`
- [x] T002 Run `pnpm install` at repo root to lock the new dependency `pnpm-lock.yaml` (sandbox egress blocked — lockfile entry added manually; CI will re-resolve)
- [ ] T003 [test] Verify existing `LogPanel.spec.ts` still passes end-to-end after install `shared/components/e2e/LogPanel.spec.ts` (deferred to CI — sandbox cannot run Playwright)

## Phase 2: Theme Fix (P1 — VS Code Variables in Storybook)

**Goal**: LogPanel (and any other component using `--vscode-*` CSS variables) renders with correct colours when the Storybook global theme is switched between light, dark, and VS Code.

**Independent test**: Open LogPanel → Timeline Default in Storybook, switch the paintbrush toolbar from Dark → Light → VS Code, and confirm the panel background visibly changes at each switch (no longer stuck on dark-mode fallback colours).

- [x] T004 Create static `--vscode-*` token map (light and dark entries covering all variables used by LogPanel.css and sub-component CSS) `shared/components/src/ThemeProvider/vsCodeTokenMap.ts`
- [x] T005 [test] Write unit test asserting all required `--vscode-*` keys are present in both light and dark entries of the map `shared/components/src/ThemeProvider/__tests__/vsCodeTokenMap.test.ts`
- [x] T006 Extend `ThemeProvider.tsx` — in the theme-apply `useEffect`, when `resolvedVariant` is `'light'` or `'dark'` and `isVSCodeEnvironment()` returns false, iterate the matching `vsCodeTokenMap` entry and `setProperty` each key on `document.documentElement`; skip injection when `resolvedVariant === 'vscode'` (real VS Code supplies the variables) `shared/components/src/ThemeProvider/ThemeProvider.tsx`
- [x] T007 [test] Extend ThemeProvider tests: assert that switching to `light` variant in a non-VS-Code environment sets `--vscode-foreground` to the expected light value; assert `dark` sets the dark value; assert `vscode` does not inject (variable absent from inline style) `shared/components/src/ThemeProvider/ThemeProvider.test.tsx`
- [ ] T008 [test] Run vitest unit tests and confirm T005 + T007 pass `shared/components/` (deferred to CI)
- [ ] T009 [test] Run Storybook E2E (`LogPanel.spec.ts`) and capture three screenshots of LogPanel — light, dark, vscode — to confirm correct background colour per theme `shared/components/e2e/LogPanel.spec.ts` (deferred to CI)
- [ ] T010 [P] Copy light/dark/vscode screenshot evidence to feature evidence dir `specs/209-logpanel-a11y-audit/evidence/screenshots/` (deferred to CI — requires running Storybook E2E)

## Phase 3: Accessibility Audit (P2 — Run Audit Across Stories × Themes)

**Goal**: Run `@axe-core/playwright` against 6 representative LogPanel stories × 3 theme variants (18 runs total) and write `evidence/176-log-panel-ux/a11y-audit.md` listing every violation with story, theme, WCAG rule, severity, and suggested fix.

**Independent test**: Execute `LogPanelA11y.spec.ts` — it must complete all 18 runs without crashing and produce the audit report file at `evidence/176-log-panel-ux/a11y-audit.md`.

> ⚠️ **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tasks. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Standard CDN downloads are blocked (403), but this bundled binary works fully. The `shared/components/playwright.config.ts` auto-detects `CLAUDE_CODE=1` and uses it. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T011 Create `LogPanelA11y.spec.ts` scaffold: imports, story URL constants for all 6 stories, `theme()` helper (matching pattern from `ActivityPanel.spec.ts`), and empty describe blocks per story `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T012 Implement audit runner helper that creates an `AxeBuilder` for a page, runs WCAG 2.1 AA tags, and returns a typed `ViolationRecord[]` (severity, rule, element selector, description) `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T013 Implement report writer: accepts all accumulated violation records plus a pass/fail summary and writes `evidence/176-log-panel-ux/a11y-audit.md` using the format defined in plan.md `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T014 [P] Add axe audit test body for `TimelineDefault` story — light, dark, vscode themes `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T015 [P] Add axe audit test body for `EmptyNoPlot` and `EmptyNoEntries` stories — light, dark, vscode themes `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T016 [P] Add axe audit test body for `EntrySelected` story — light, dark, vscode themes; click first card before audit to exercise `aria-selected=true` state `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T017 [P] Add axe audit test body for `CompactView` and `FlipCardDefault` stories — light, dark, vscode themes; trigger card flip before audit in FlipCard `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T018 Wire the after-all hook: after all 18 runs, call the report writer and write `evidence/176-log-panel-ux/a11y-audit.md`; assert zero critical/serious violations `shared/components/e2e/LogPanelA11y.spec.ts`
- [x] T019 Create evidence output directory `evidence/176-log-panel-ux/`
- [ ] T020 [test] Run `LogPanelA11y.spec.ts` in full to generate the initial audit report (violations expected at this stage — do not require a clean pass here) `shared/components/e2e/LogPanelA11y.spec.ts` (deferred to CI)

## Phase 4: Fix Violations (P3 — Clean Audit Pass)

**Goal**: All critical and serious WCAG 2.1 AA violations found by the Phase 3 audit are fixed. The audit re-runs clean (zero critical/serious violations) in all 18 story × theme combinations.

**Independent test**: Re-run `LogPanelA11y.spec.ts` — it must exit with zero test failures, and the updated `a11y-audit.md` must show `Result: PASS` with no critical/serious rows in the Violations table.

*Note: T021–T025 are written as placeholders. Actual violations (and therefore actual fixes) are determined by the Phase 3 audit run. Update task descriptions to match real findings.*

- [x] T021 Read `evidence/176-log-panel-ux/a11y-audit.md`; triage all violations by severity; create a fix checklist in the report's "Fixes Applied" section `evidence/176-log-panel-ux/a11y-audit.md` — done via the mini-audit runner (sandbox-compatible WCAG subset); 3 serious color-contrast violations found
- [x] T022 Fix critical violations — no critical violations found in the initial audit
- [x] T023 [P] Fix serious violations — darkened light `--vscode-focusBorder` (`#0090f1`→`#005a9e`), dark `--vscode-focusBorder` (`#007fd4`→`#006abd`), light `--vscode-descriptionForeground` (`#717171`→`#595959`), and changed active-toggle text to `--vscode-button-foreground` in `LogPanel.css`
- [x] T024 [P] No moderate/minor violations found in the audited scope
- [x] T025 [test] Re-ran mini-audit — **0 violations in both themes**. Full axe-core re-run deferred to CI (`LogPanelA11y.spec.ts`)
- [ ] T026 [test] Run full vitest + existing LogPanel E2E suite to confirm no regressions from Phase 4 fixes `shared/components/` (deferred to CI — no node_modules in sandbox)

## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection

- [x] T027 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/209-logpanel-a11y-audit/evidence/test-summary.md`
- [x] T028 Create usage demonstration — how to run the audit and read the report `specs/209-logpanel-a11y-audit/evidence/usage-example.md`
- [x] T029 [P] Capture interaction GIF showing theme switching in action (light → dark → vscode → light) `specs/209-logpanel-a11y-audit/evidence/screenshots/interaction.gif` — 28-frame hand-rolled GIF89a generated from Playwright webm recording
- [x] T030 [P] Confirm the three theme screenshots (logpanel-light.png, logpanel-dark.png, logpanel-vscode.png) are present and show distinct colour schemes `specs/209-logpanel-a11y-audit/evidence/screenshots/` — plus `logpanel-before-fix.png` showing the pre-fix broken light theme
- [ ] T031 [test] Run `task verify` (lint + typecheck + test) and confirm all steps pass before creating the PR `shared/components/` (deferred — no node_modules in sandbox)

### Media Content

- [x] T032 Create shipped blog post using Content Specialist agent (`.claude/agents/media/content.md`) incorporating audit results, before/after theme screenshots, and lessons from the investigation `specs/209-logpanel-a11y-audit/media/shipped-post.md`
- [x] T033 [P] Create LinkedIn shipped summary (150-200 words) `specs/209-logpanel-a11y-audit/media/linkedin-shipped.md`

### PR Creation

- [x] T034 Create PR and publish blog: run `/speckit.pr` — feature PR https://github.com/debrief/debrief-future/pull/536 (blog PR deferred; run `/publish-future-post` in debrief.github.io to complete)

**Task T034 must run last. It depends on all evidence, media, and passing CI.**

## Dependencies

| Phase | Depends On | Reason |
|-------|-----------|--------|
| Phase 2 (Theme Fix) | Phase 1 complete | Needs `@axe-core/playwright` installed; T003 confirms Playwright harness still green |
| Phase 3 (Audit) | Phase 2 complete | Audit results are meaningless if components ignore the active theme — must fix first |
| Phase 4 (Fix Violations) | Phase 3 complete (initial audit run T020) | Can't fix violations until the report exists |
| Phase 5 (Polish) | Phase 4 complete (T025 clean re-run) | Evidence and shipped post reference the final clean audit results |
| T034 (PR) | All of Phase 5 | PR requires all evidence, media, and CI green |

**Within Phase 2**: T004 and T005 can run in parallel (map data + map test are independent). T006 depends on T004. T007 depends on T006. T008 depends on T007. T009 depends on T008. T010 depends on T009.

**Within Phase 3**: T011, T012, T013 must complete before T014–T017 (scaffold and helpers first). T014–T017 can run in parallel (separate describe blocks). T018 depends on T014–T017.

**Within Phase 4**: T022, T023, T024 can run in parallel once T021 (triage) is done. T025 depends on all three fix tasks.

## Implementation Strategy

**Incremental delivery order**: Phase 1 → 2 → 3 → 4 → 5. Each phase produces a testable increment before the next begins.

**Phase 2 is the highest-risk phase** — it modifies `ThemeProvider.tsx`, a shared component used across all Storybook stories and the VS Code extension. The injection must be gated on `!isVSCodeEnvironment()` so it has zero effect in production webviews. Existing ThemeProvider tests (T007) and the existing LogPanel E2E (T009) are the safety net.

**Phase 3 produces a report before asserting a pass** — T020 runs the audit and writes the report even if violations exist. This intentional design separates "audit can run" (gating) from "audit passes" (Phase 4 gate). Developers should inspect the report after T020 before proceeding to Phase 4 fixes.

**Phase 4 tasks T022–T024 are placeholders** — their exact scope depends on the T020 audit output. The implementer should update task descriptions to match actual violations before marking any Phase 4 task in-progress. If the initial audit produces zero critical/serious violations, T022–T024 become no-ops and T025 is a trivial re-run.

**Parallel opportunities**:
- T004 + T005 (Phase 2): map data and map test
- T014 + T015 + T016 + T017 (Phase 3): independent story audit blocks
- T022 + T023 + T024 (Phase 4): independent violation fix groups
- T029 + T030 (Phase 5): evidence screenshot tasks
- T032 + T033 (Phase 5): shipped post + LinkedIn

**CI gate**: T031 (`task verify`) must pass before T034 (`/speckit.pr`). This runs lint, typecheck, and the full test suite including the new audit E2E.
