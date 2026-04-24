# Implementation Plan: Storyboard Edit Suite — Webview Wiring + Web-shell Harness + Error Triage

**Branch**: `230-storyboard-edit-wiring` | **Date**: 2026-04-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/230-storyboard-edit-wiring/spec.md`

## Summary

Feature #218 landed the full service, dispatcher, component, and command-handler surface for the Storyboard edit suite (94/104 tasks, 2,983 tests green), but left the VS Code webview-side wiring incomplete: no in-panel row-level affordance, no client-side message reducer, and no interactive web-shell harness. As a result, 10 tasks (T068/T087/T094 Playwright + T097 screenshots + T101/T102 blog post) shipped as deferred and two pre-existing errors (viewport race + `Failed to load plot`) remain on first-open.

This plan wires the webview end-to-end. **Technical approach:** introduce a typed `useStoryboardEditReducer` hook shared between the VS Code panel entry point and a new web-shell harness page, add a Scene-row chevron + double-click + right-click overflow menu, extend `storyboardPanelView.refresh()` to emit the enriched `SceneEditViewModel[]` already defined in `shared/components/.../types.ts`, upgrade the four existing edit-suite Storybook stories from static fixtures to fully interactive ones (same reducer hook), add a `?storyboard-edit-harness` query-string mode to the web-shell that the Playwright suite drives, and triage the two known errors (emit a mount-time viewport from `mapView.tsx`, add structured diagnostics to `stacService.loadPlot`'s null-return branches). Shipped with FRs 001–053, SCs 001–010, and the #218 test gate held at 2,983 green.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview + shared components + web-shell + Playwright)
**Primary Dependencies**:
  - `@debrief/components` (StoryboardPanel, SceneRow, SceneEditForm, UndoToast, StaleBadge — existing from #218)
  - `@debrief/session-state` (LogService, session store — existing)
  - React 18.x (`useReducer`, `useEffect`)
  - VS Code Extension API ^1.85.0 (webview postMessage, `showInputBox`, `showQuickPick`, `showInformationMessage`)
  - Playwright ^1.57.0 + `@sparticuz/chromium` (E2E — already installed)
  - No new runtime dependencies (SceneOverflowMenu is a native `<menu role="menu">` — no floating-ui, no headless-ui)
**Storage**: N/A — UI wiring only; persistence already owned by `storyboardEditService` (Python + session store)
**Testing**:
  - Vitest (reducer unit tests + component tests — already configured)
  - Playwright web-shell E2E (`apps/web-shell/playwright/tests/storyboard-edit.spec.ts` — new)
  - Playwright code-server chrome E2E (`tests/e2e/test-storyboard-edit.spec.ts` — new, thin)
  - `@axe-core/playwright` for the overflow-menu a11y audit
**Target Platform**:
  - VS Code extension host (webview + extension side)
  - Web-shell browser preview (Chrome via `@sparticuz/chromium` in cloud, local Chromium in dev)
  - Storybook (interactive stories)
**Project Type**: Web-shell / extension monorepo (existing). No new project; additive changes to `apps/vscode/`, `shared/components/`, `apps/web-shell/`, `tests/e2e/`.
**Performance Goals**:
  - `onPlotOpened` median ≤ 50 ms at spec scale (SC-008, carried forward from #218 SC-014)
  - Reducer dispatch ≤ 1 ms per action (pure, synchronous)
  - Overflow-menu open ≤ 100 ms (lazy render, native menu)
  - Interaction GIF < 5 s and < 2 MB (FR-041)
**Constraints**:
  - `storyboardPanelView.refresh()` MUST stay O(active-storyboard Scenes) (FR-008, invariant R4/13A from #218)
  - Zero new runtime deps (Article IX)
  - All new user-visible strings route through `apps/vscode/src/messages/storyboardEdit.ts` (Article XI + #218 convention)
  - Reducer state mirrors extension-authoritative state; local state never "corrects" inbound messages (FR-007)
**Scale/Scope**:
  - Per Storyboard: up to ~50 Scene rows (spec bound)
  - Concurrent open edit forms: 1 (FR-004)
  - Eleven new outbound postMessage types + three new inbound types + one extended refresh payload
  - Four Storybook stories to upgrade from static → interactive
  - Two error-triage fixes (viewport race, STAC-load null-diagnostic)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---------|--------|------|
| I. Defence-Grade Reliability | ✅ Pass | All client-side; no network; no silent failures — every edit op emits a Log Panel card (FR-035) and errors raise explicit toasts (FR-041 diagnostic output channel) |
| II. Schema Integrity | ✅ Pass | No schema changes. Reuses `SceneEditViewModel`, `SceneUndoToastDescriptor`, `LogEntry` from #215/#218. |
| III. Data Sovereignty | ✅ Pass | No new persistence; no telemetry; all state stays in session store + on-disk STAC. |
| IV. Architectural Boundaries | ✅ Pass | Webview dispatches user intents; services stay authoritative (FR-007, FR-009). No service methods change. |
| V. Extensibility | ✅ Pass | UI wiring only; no extension-API surface change. |
| VI. Testing | ✅ Pass | Reducer unit tests + component tests + web-shell E2E + code-server chrome E2E; FR-030..FR-035 enumerate coverage. |
| VII. Test-Driven AI Collaboration | ✅ Pass | FR-001..FR-053 + SC-001..SC-010 define acceptance up-front; reducer is a pure function (trivially testable). |
| VIII. Documentation | ✅ Pass | spec.md, plan.md, research.md, data-model.md, quickstart.md, evidence/opening-context.md; shipped blog post via Content Specialist in Phase E. |
| IX. Dependencies | ✅ Pass | Zero new runtime deps. Dev-deps unchanged (Playwright / `@axe-core/playwright` already present). |
| X. Security | ✅ Pass | No secrets; no network; output channel writes non-sensitive diagnostic text only. |
| XI. Internationalisation | ✅ Pass | All new strings (menu labels, ARIA labels, toast text) route through `apps/vscode/src/messages/storyboardEdit.ts`. |
| XII. Community Engagement | ✅ Pass | Shipped blog post + LinkedIn summary in Phase E (FR out-of-scope for spec, delivered per #218 T101/T102). |
| XIII. Contribution Standards | ✅ Pass | Atomic commits per phase (Phase A → D); PR review required; CI must pass. |
| XIV. Pre-Release Freedom | ✅ Pass | Pre-v4.0.0 — no backwards compat gates. |
| XV. Strict Type Safety | ✅ Pass | Reducer action union is a discriminated union; no `any`. All new functions fully typed. |

**No violations — no complexity-tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/230-storyboard-edit-wiring/
├── plan.md                    # This file (/speckit.plan output)
├── spec.md                    # Feature spec (/speckit.specify output)
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── quickstart.md              # Phase 1 output
├── contracts/
│   └── postmessage-contract.md  # Extended webview ↔ extension message contract
├── checklists/
│   └── requirements.md        # Spec quality checklist (already written)
└── evidence/
    └── opening-context.md     # Phase 2 output (cached blog-post opener)
```

### Source Code (repository root)

The worktree is at `/Users/ian/git/worktrees/230-storyboard-edit-wiring/`. All paths below are repo-relative.

```text
apps/vscode/src/
├── webview/web/
│   ├── storyboardPanel.tsx        # [EDIT] Consume useStoryboardEditReducer; remove local useState pile; dispatch 11 new outbound msgs
│   └── mapView.tsx                # [EDIT] Emit initial viewport postMessage on mount + map.whenReady (FR-050)
├── views/
│   └── storyboardPanelView.ts     # [EDIT] refresh() emits sceneEditViewModels + pendingUndoToast + storyboard edit VM
├── services/
│   └── stacService.ts             # [EDIT] Structured diagnostics on each null-return path in loadPlot (FR-051, FR-052)
├── types/
│   └── storyboardPanelMessages.ts # [EDIT] Union extensions for the 3 new inbound + 11 new outbound messages
├── messages/
│   └── storyboardEdit.ts          # [EDIT] Add i18n strings for overflow menu labels + ARIA labels
└── commands/
    └── storyboardEdit.ts          # [NO CHANGE — command handlers from #218 are already the target]

shared/components/src/panels/StoryboardPanel/
├── useStoryboardEditReducer.ts    # [NEW] Exported reducer hook (pure reducer + initial state + action creators)
├── useStoryboardEditReducer.test.ts  # [NEW] Unit tests per action
├── SceneRow.tsx                   # [EDIT] Render chevron + wire double-click + right-click triggers
├── SceneOverflowMenu.tsx          # [NEW] Scene-level right-click menu (native <menu>, role=menu, keyboard nav)
├── SceneOverflowMenu.test.tsx     # [NEW] Component + a11y tests
├── StoryboardPanel.stories.tsx    # [EDIT] Four edit-suite stories become fully interactive via the new reducer hook
└── types.ts                       # [EDIT] Export the reducer's action union + state shape types (if not already)

shared/components/src/LogPanel/
└── collapseStoryboardEdits.ts     # [NO CHANGE — #218 landed this; wiring into LogTimeline is out of scope per spec]

apps/web-shell/src/
├── App.tsx                        # [EDIT] Detect ?storyboard-edit-harness query-string → mount harness view
└── StoryboardEditHarness.tsx      # [NEW] Harness wrapper: in-memory mock ext-port reducer + Scene fixtures + query-string knobs

apps/web-shell/playwright/tests/
└── storyboard-edit.spec.ts        # [NEW] Primary E2E surface — FR-030, FR-031, FR-032, FR-040, FR-041

tests/e2e/
└── test-storyboard-edit.spec.ts   # [NEW] Thin code-server chrome — FR-033, FR-034 (palette + input-box + quick-pick + native toast)

specs/218-storyboarding-edit/evidence/screenshots/
└── [NEW FILES written by storyboard-edit.spec.ts] # Per FR-040 + #218 evidence-requirements table
```

**Structure Decision**: No new projects, no new workspaces. All work lands in existing directories: two edits in `apps/vscode/src/webview/web/`, one edit each in `apps/vscode/src/views/`, `apps/vscode/src/services/`, `apps/vscode/src/types/`, `apps/vscode/src/messages/`; one new file + two edits in `shared/components/src/panels/StoryboardPanel/`; one new file + one edit in `apps/web-shell/src/`; two new Playwright specs (one web-shell, one code-server). Evidence screenshots land under the **#218** spec's evidence directory (per FR-040 — this feature is a follow-up that completes #218's evidence artefacts).

## Media Components

**Four interactive Storybook stories will be upgraded** from static fixtures to fully behavioural demos. These are the Story 4 (P2) user story's observable outcome and are the primary narrative vehicle for the shipped blog post.

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` (edit form open) | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` → `WithEditForm` | `storyboard-edit-form.js` | Demonstrates inline edit of Scene description with live reducer — reviewer can type and submit |
| `StoryboardPanel` (undo toast) | `…/StoryboardPanel.stories.tsx` → `WithUndoToast` | `storyboard-undo-toast.js` | Delete→Undo flow — reviewer can click Undo and see row restore |
| `StoryboardPanel` (stale badge) | `…/StoryboardPanel.stories.tsx` → `WithStaleBadge` | `storyboard-stale-badge.js` | Stale Scene detection + Refresh clear — reviewer can click Refresh and see badge clear |
| `StoryboardPanel` (missing-data remediation) | `…/StoryboardPanel.stories.tsx` → `WithMissingDataRemediation` | `storyboard-missing-data.js` | Hard-block for deleted source features — reviewer can see remediation affordance |

**Inclusion Criteria Applied**:

- [x] New visual component (SceneOverflowMenu) + significant upgrade (stories go from static → interactive)
- [x] Significant visual change (chevron + dbl-click + right-click row affordance)
- [x] Interactive demo adds narrative value (the core value prop IS the polish loop — static screenshots under-sell it)

**Bundleability Verified**:

- [x] Stories exist in Storybook (upgraded, not newly created)
- [x] Components render standalone (`<StoryboardPanel>` wraps all required sub-components; no VS Code API needed when the harness reducer replaces postMessage)
- [x] Reasonable bundle size expected (< 500KB — shared components already tree-shake)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-edit-form` (and the three sibling stories).

## Storybook E2E Testing

Each of the four upgraded edit-suite stories gets Playwright interaction tests. These run inside Storybook (not the web-shell) to isolate the component-level behaviour from workspace-level orchestration.

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `WithEditForm` | Chevron click opens form, submit commits, cancel discards | light, dark, vscode | click chevron, fill textarea, click submit, click cancel |
| `WithUndoToast` | Delete → toast appears → Undo restores the row | light, dark, vscode | click Delete (overflow), click Undo in toast |
| `WithStaleBadge` | Badge renders, tooltip shows feature IDs, Refresh clears badge | light, dark, vscode | hover badge, click Refresh |
| `WithMissingDataRemediation` | Remediation affordance visible, keyboard-reachable | light, dark, vscode | Tab to affordance, verify focus ring |

**Testing Strategy**:

- [x] Component renders correctly in all theme variants (reuse `applyTheme` helper from `properties-screenshots.spec.ts`)
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid`, `aria-expanded`, `aria-controls`, `role="menu"`, `aria-haspopup`)
- [x] Screenshots captured for evidence (written under `specs/218-storyboarding-edit/evidence/screenshots/`)
- [x] `@axe-core/playwright` scan on each open-menu state (no serious/critical a11y violations)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` (consolidates story-level + workflow-level coverage — they share the same reducer so one spec drives both).

**Theme Variant URLs** (for Storybook):

```text
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:vscode
```

## Web-Shell E2E Testing

The web-shell harness is the **primary E2E surface** for this feature. Per the SRD's design constraint, every polish-loop click flow runs here; only flows that *require* real VS Code chrome run in code-server.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Scene description edit (chevron → form → submit) | `StoryboardPanel`, `SceneRow`, `SceneEditForm`, `LogPanel` | `[data-testid="scene-row-chevron"]`, `[data-testid="scene-edit-form"]`, `[data-testid="log-panel-card"]` | click chevron, type description, click submit, assert Log card |
| Scene delete + undo | `StoryboardPanel`, `SceneOverflowMenu`, `UndoToast`, `LogPanel` | `[data-testid="scene-overflow-trigger"]`, `[role="menuitem"]`, `[data-testid="undo-toast"]` | right-click row, click Delete, click Undo, assert row restored |
| Scene duplicate at colliding timestamp | `StoryboardPanel`, `SceneOverflowMenu`, `UndoToast` | `[data-testid="scene-overflow-trigger"]`, `[data-testid="duplicate-timestamp-prompt"]` | right-click, Duplicate, (mock-harness prompts simulated collision), accept alt timestamp |
| Copy Scene to other storyboard (incl. deep-copy failure path) | `StoryboardPanel`, `SceneOverflowMenu` | `[data-testid="copy-to-other-picker"]`, `[data-testid="copy-error-toast"]` | right-click, Copy to Other, pick destination, observe success then (separate step) induce mock failure, observe error toast, confirm destination not left partial |
| Update-to-current | `StoryboardPanel`, `SceneOverflowMenu` | `[data-testid="scene-overflow-trigger"]` | right-click, Update to current, assert thumbnail updates + Log card emitted |
| Stale badge + refresh single + refresh all stale | `StoryboardPanel`, `StaleBadge`, `StoryboardHeader` | `[data-testid="stale-badge"]`, `[data-testid="refresh-all-stale"]` | navigate to `?stale=sceneA,sceneC`, click Refresh on row, click Refresh All, assert each emits its own Log card |
| Storyboard rename + describe | `StoryboardHeader` | `[data-testid="storyboard-header-rename"]`, `[data-testid="storyboard-header-describe"]` | click rename, type new name, submit; click describe, type description, submit |
| Missing-data routing + remediation | `StoryboardPanel`, hard-block affordance | `[data-testid="missing-data-remediation"]` | navigate to `?missingData=sceneC:track-alpha,track-bravo`, click remediation, assert outcome |

**Testing Strategy**:

- [x] Workflow runs end-to-end in the web-shell (no VS Code)
- [x] Page objects: extend `apps/web-shell/playwright/pages/AnalysisPage` with `StoryboardEditPage` (single new page object; no duplication)
- [x] Screenshots and interaction GIF written **directly** into `specs/218-storyboarding-edit/evidence/screenshots/` (pattern from `properties-screenshots.spec.ts` — per FR-040 + #218 evidence requirements)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`

**Run Commands**:

- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-edit` (auto-provisions `@sparticuz/chromium`)
- Local: `pnpm --filter @debrief/web-shell test storyboard-edit`

**Optional — chrome-level VS Code Webview tests**: `tests/e2e/test-storyboard-edit.spec.ts` (FR-033, FR-034) covers **only** palette invocation for the 11 new commands, native input-box prompts (rename / duplicate-timestamp / storyboard rename), native quick-pick (copy-to-other destination), and native `showInformationMessage` / `showWarningMessage` toasts. Captures one `vscode-native-chrome.png` for evidence. Does **not** re-test click flows covered in the web-shell suite.

## Complexity Tracking

> **No constitution violations — this table intentionally left blank.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
