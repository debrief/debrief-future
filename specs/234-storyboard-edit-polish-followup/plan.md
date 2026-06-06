# Implementation Plan: Storyboard Edit Suite — Polish Follow-up (stories, code-server E2E, a11y, perf, scenario completion)

**Branch**: `234-storyboard-edit-polish-followup` | **Date**: 2026-04-26 (revised 2026-04-27) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/234-storyboard-edit-polish-followup/spec.md`
**Architecture pivot 2026-04-27 (ADR-027):** Phase 3's shared behavioural layer is delivered via a callback-adapter helper, not `PortContext`. See `research.md` R10b + `contracts/harness-knobs.md` §2. Sections of this plan that referenced `PortContext` are revised below.

## Summary

Close the five polish items #230 deferred so the Storyboard edit suite can retire its "follow-up" status and the #218 evidence table can be marked complete, **plus** three review-driven additions (ESLint test-only boundary, ffmpeg system-binary check, public-API contract on `composeSceneEditViewModels`). Concretely: (1) upgrade the four edit-suite Storybook stories from static `args`-based props to interactive ones backed by `useStoryboardEditReducer` via a new shared story-only mock-handlers helper (`useStoryOnlyMockHandlers`) — `<StoryboardPanel>` stays purely presentational; the helper's `handlers` field is spread onto the panel; production webview entry is unchanged; (2) add a thin code-server chrome E2E spec at `tests/e2e/test-storyboard-edit.spec.ts` that exercises only what cannot be reached from the web-shell (command palette, native input-box, native quick-pick, native notification toasts); (3) run `@axe-core/playwright` against the three highest-risk harness states + the four upgraded stories with both a markdown `evidence/a11y-report.md` AND a raw `evidence/a11y-results.json`; (4) add a vitest perf test on the **pure exported** `composeSceneEditViewModels` function at the spec scale (5 × 50 Scenes; budget guards the active-only 50-Scene workload), promoting that function to a contracted public-API surface; (5) extend the web-shell Playwright suite with the seven still-uncovered scenarios, **two** symmetric harness knobs (`?induceCopyFailure`, `?induceRefreshFailure`), and a < 5 s / < 2 MB interaction GIF (1.8 MB soft warning). **Technical approach:** zero new npm runtime deps; ffmpeg is acknowledged as an explicit system-binary dependency (proven path from #217 T520) surfaced by a new `task verify:ffmpeg` check. Each user story is independent and can ship behind its own commit. All new evidence lands either under this feature's `evidence/` (a11y-report, a11y-results.json, opening-context) or under `specs/218-storyboarding-edit/evidence/screenshots/` (vscode-native-chrome.png, interaction.gif) per FR-015 / FR-042 — completing the parent #218 evidence table in one PR.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, web-shell, VS Code extension, Playwright specs); Node 20.x runtime
**Primary Dependencies**:
  - `@debrief/components` (StoryboardPanel + `useStoryboardEditReducer` + the already-exported `composeSceneEditViewModels` pure function — existing from #230)
  - `@debrief/session-state` (existing)
  - React 18.x (`useReducer`, `useEffect` — no new context introduced post-ADR-027)
  - VS Code Extension API ^1.85.0 (palette, `showInputBox`, `showQuickPick`, `showInformationMessage`, `showWarningMessage`)
  - Playwright ^1.57.0 + `@sparticuz/chromium` (already installed); `recordVideo` already wired in `properties-screenshots.spec.ts:121` and `theme-runtime-switch.spec.ts:122`
  - **`@axe-core/playwright` ^4.8.5** — already present in `shared/components/package.json` (added during #230 research R11). No new dep.
  - vitest (existing) — for the perf test + new unit tests (PortContext, videoToGif helper, querystring parser, a11y categoriser)
  - **ffmpeg as a system binary** — NOT an npm dep. Prior art: #217 T520 (complete) + #189 T048 used ffmpeg with `scale=800:-1` to convert webm → ≤ 2 MB / ≤ 5 s GIFs. This feature surfaces the assumption explicitly via FR-045's `task verify:ffmpeg` check — fails fast with a remediation message when ffmpeg is missing locally.
  - **No new npm runtime dependencies.** GIF synthesis: Playwright `recordVideo` → ffmpeg shell-out (via `child_process.execFile`) inside a new `videoToGif.ts` helper.
**Storage**: N/A — UI tests + evidence captures only. No service or schema changes.
**Testing**:
  - Vitest (story-only mock-port unit test; perf test mirroring `storyboardEditService.perf.test.ts`)
  - Playwright web-shell E2E (`apps/web-shell/playwright/tests/storyboard-edit.spec.ts` — extend the existing smoke spec, add seven scenarios + GIF capture)
  - Playwright code-server chrome E2E (`tests/e2e/test-storyboard-edit.spec.ts` — new, thin)
  - `@axe-core/playwright` audits (`apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts` — new; targets 3 harness states + 4 story iframes)
  - Storybook interaction layer (manual + visual; underwritten by reducer unit tests already shipped in #230)
**Target Platform**:
  - VS Code extension host (code-server chrome only, for the thin spec)
  - Web-shell browser preview (Chrome via `@sparticuz/chromium` in cloud + CI)
  - Storybook 8.x (interactive stories)
**Project Type**: Web-shell / extension monorepo (existing). No new project; additive changes to `shared/components/`, `apps/web-shell/`, `apps/vscode/`, `tests/e2e/`.
**Performance Goals**:
  - `composeSceneEditViewModels()` median ≤ 50 ms over 100 iterations against a 50-Scene active storyboard (FR-030; 5 × 50 fixture in memory to validate the FR-008 active-only invariant). CI tolerance 20 % (60 ms soft).
  - Story-only mock-port renders ≤ 16 ms per dispatch (single React frame; piggy-backs on reducer's pure-function guarantee)
  - Interaction GIF < 5 s; soft 1.8 MB / hard 2 MB (FR-042; helper warns at soft, fails at hard)
  - axe audit run time < 30 s total across all 7 surfaces × 3 themes = 21 runs (cloud CI budget headroom; revisit if first measurement > 60 s)
**Constraints**:
  - The `composeSceneEditViewModels` invariant remains O(active-storyboard Scenes) — perf test (FR-030) is the regression guard, not a behavioural change. Pinned via FR-046's public-API contract.
  - Zero new npm runtime deps (Article IX); ffmpeg system binary surfaced explicitly via FR-045
  - No serious/critical axe violations permitted; moderate violations either fixed or recorded with rationale (FR-022, FR-023); raw axe JSON also captured (FR-023)
  - Story-only mock-handlers helper MUST share its behavioural layer with the web-shell harness's translation layer (FR-003) — single source of truth for fixture seed + reducer wiring (post-ADR-027 the shared layer is a callback adapter, not a port)
  - `__testing__/` directory is the test-only export surface; FR-044 ESLint rule prevents production `apps/vscode/` code from importing it
  - `<StoryboardPanel>` stays purely presentational — no `usePanelPort()` hook, no `OutboundMessage` discriminated union, no production webview rewrite (post-ADR-027)
  - All new strings continue to route through `apps/vscode/src/messages/storyboardEdit.ts` (Article XI; no new top-level strings expected — code-server spec uses existing prompts)
  - `tests/e2e/test-storyboard-edit.spec.ts` MUST NOT duplicate any flow already covered by `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` (FR-014 — chrome-only; web-shell owns click flows)
**Scale/Scope**:
  - 4 Storybook stories upgraded (story file edits + 1 new shared mock-handlers helper)
  - 1 new shared callback-adapter helper at `__testing__/storyOnlyMockHandlers.ts` (~80 LOC; 1 unit test file ~5 cases). No `PortContext`, no `OutboundMessage` type, no production webview rewrite (post-ADR-027).
  - 1 new code-server spec (~150 LOC; 11 commands × ~15 LOC each) at `tests/e2e/test-storyboard-edit.spec.ts`
  - 1 new a11y spec (~120 LOC; 7 surfaces × 3 themes × axe.run + assertions) + 1 new pure categoriser helper (`a11yCategoriser.ts`) + its unit test
  - 1 new perf spec at `shared/components/.../__tests__/composeSceneEditViewModels.perf.test.ts` (~80 LOC; methodology from `storyboardEditService.perf.test.ts`, target is the pure exported composer)
  - ~7 new web-shell scenarios + 1 interaction GIF capture path (~250 LOC added across `storyboard-edit.spec.ts` + new `storyboard-edit-interaction-gif.spec.ts`)
  - 2 harness knobs (`?induceCopyFailure`, `?induceRefreshFailure`) added to existing querystring parser + 1 new parser unit test (5 cases)
  - 1 new `videoToGif.ts` helper + its unit test (against checked-in 50 KB fixture webm)
  - 1 new ESLint `no-restricted-imports` rule under `apps/vscode/` config (FR-044)
  - 1 new Taskfile target (`task verify:ffmpeg`, FR-045)
  - 1 new `CONTRACTS.md` + 1 CHANGELOG entry promoting `composeSceneEditViewModels` to public API (FR-046)
  - 6 new/updated evidence files (a11y-report, a11y-results.json, opening-context, perf-budget update, vscode-native-chrome.png, interaction.gif, screenshots refresh)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---------|--------|------|
| I. Defence-Grade Reliability | ✅ Pass | All client-side; no network; no silent failures. The induced-failure harness knob deterministically exercises the existing rollback branch (already implemented in #230). |
| II. Schema Integrity | ✅ Pass | No schema changes. Reuses `SceneEditViewModel`, `SceneUndoToastDescriptor`, `LogEntry` from #215/#218/#230. |
| III. Data Sovereignty | ✅ Pass | No new persistence; no telemetry. axe runs locally; perf test is in-memory only. |
| IV. Architectural Boundaries | ✅ Pass | Tests + evidence only. No service methods change. Story-only mock-port is a test-time wrapper around the existing reducer — boundary preserved. |
| V. Extensibility | ✅ Pass | No extension-API surface change. |
| VI. Testing | ✅ Pass | Every FR is covered by an automated test or capture step (SC-008). The whole feature *is* the testing layer. |
| VII. Test-Driven AI Collaboration | ✅ Pass | FR-001..FR-043 + SC-001..SC-008 define acceptance up-front. Each user story has an Independent Test that doubles as the AI verification gate. |
| VIII. Documentation | ✅ Pass | spec.md, plan.md, research.md, data-model.md, quickstart.md, evidence/opening-context.md, evidence/a11y-report.md; shipped blog post via Content Specialist in `/speckit.pr`. |
| IX. Dependencies | ✅ Pass | **Zero new npm runtime deps.** `@axe-core/playwright` ^4.8.5 is already a dev dep in `shared/components/package.json`. ffmpeg is a **system binary** (NOT a tracked devDep) — proven path from #217 T520 + #189 T048; surfaced explicitly via FR-045's `task verify:ffmpeg` check so the assumption is auditable rather than implicit. (Earlier drafts of this row claimed "ffmpeg invocation reuses existing devDep usage from `tools/screenshot/`" — corrected: that directory does not exist.) |
| X. Security | ✅ Pass | No secrets; no network; output channel writes non-sensitive diagnostic text only. |
| XI. Internationalisation | ✅ Pass | No new user-visible strings. Existing strings already routed through `apps/vscode/src/messages/storyboardEdit.ts`. |
| XII. Community Engagement | ✅ Pass | Shipped blog post + LinkedIn summary in `/speckit.pr` Phase E. The interactive Storybook stories are the post's headline asset. |
| XIII. Contribution Standards | ✅ Pass | Atomic commits per user story (US1 → US5); PR review required; CI must pass. |
| XIV. Pre-Release Freedom | ✅ Pass | Pre-v4.0.0 — no backwards compat gates. |
| XV. Strict Type Safety | ✅ Pass (revised note post-ADR-027) | All new spec files use TS strict; no `any`. The shared callback-adapter helper exposes its handlers as `Pick<StoryboardPanelProps, ...>` — adding a new callback to the panel widens the helper's contract automatically; missing-implementation is a TS compile error. The original v1 note cited Article XV as supporting `PortContext` ("explicit context > module-scope global"). Post-ADR-027 the strict-type guarantee comes from the existing typed callback-prop surface; the spirit is preserved (no implicit IO seam, no globals patched), the mechanism shifts. **Flagged for transparency — no Article XV breach.** |

**No violations — no complexity-tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/234-storyboard-edit-polish-followup/
├── plan.md                        # This file (/speckit.plan output)
├── spec.md                        # Feature spec (already exists)
├── research.md                    # Phase 0 output (R10 superseded by R10b post-ADR-027)
├── data-model.md                  # Phase 1 output (§4 PanelPort removed post-ADR-027)
├── quickstart.md                  # Phase 1 output (developer walkthrough)
├── contracts/
│   └── harness-knobs.md           # Dual-knob URL contract + shared callback-adapter helper API (§3 PortContext removed post-ADR-027)
└── evidence/
    ├── opening-context.md         # Phase 2 output (cached blog-post opener)
    └── a11y-report.md             # Phase 8 output (per FR-023; written by /speckit.implement, not /speckit.plan)
```

### Source Code (repository root)

All paths repo-relative.

```text
shared/components/src/panels/StoryboardPanel/
├── StoryboardPanel.stories.tsx                       # [EDIT] Upgrade WithEditForm/WithUndoToast/WithStaleBadge/WithMissingDataRemediation to interactive — FR-001, FR-002
├── CONTRACTS.md                                      # [NEW] Pinned signature + perf invariant for composeSceneEditViewModels — FR-046
├── index.ts                                          # [EDIT] Re-export storyOnlyMockHandlers barrel + CONTRACTS reference (2A)
├── __testing__/
│   ├── storyOnlyMockHandlers.ts                      # [NEW] Shared callback-adapter helper (reducer + fixture seed via Pick<>) — FR-003 (post-ADR-027)
│   └── __tests__/
│       └── storyOnlyMockHandlers.test.ts             # [NEW] 5-case unit test (seed → state, handler → reducer dispatch, knob routing) — T1A
└── __tests__/
    └── composeSceneEditViewModels.perf.test.ts       # [NEW] Vitest perf test against the pure composer — FR-030, FR-031, FR-032 (D1A)

# REMOVED post-ADR-027:
#   - shared/components/src/panels/StoryboardPanel/PortContext.tsx
#   - shared/components/src/panels/StoryboardPanel/__tests__/PortContext.test.tsx
#   - apps/vscode/src/webview/web/storyboardPanel.tsx [EDIT] (Provider wrap)
# Rationale: callback-adapter helper makes these unnecessary. See ADR-027.

shared/components/
└── CHANGELOG.md                                      # [EDIT] "Unreleased — Public API" entry promoting composeSceneEditViewModels — FR-046

apps/web-shell/
├── src/
│   ├── storyboard-edit-harness-querystring.ts        # [EDIT] Add ?induceCopyFailure + ?induceRefreshFailure knobs — FR-043
│   ├── __tests__/
│   │   └── storyboard-edit-harness-querystring.test.ts  # [NEW] 5-case parser unit test — T3A
│   └── StoryboardEditHarness.tsx                     # [EDIT] Replace inline mock-extension layer with useStoryOnlyMockHandlers; spread {...handlers} onto <StoryboardPanel>; thread parsed knobs through. NO PortContext.Provider wrap.
├── playwright/
│   ├── tests/
│   │   ├── storyboard-edit.spec.ts                   # [EDIT] Add 7 new scenarios + Log Panel card assertions — FR-040, FR-041
│   │   ├── storyboard-edit-a11y.spec.ts              # [NEW] axe audit, 3 harness states + 4 story iframes × 3 themes — FR-020, FR-021, FR-023
│   │   └── storyboard-edit-interaction-gif.spec.ts   # [NEW] Records the polish-loop GIF — FR-042
│   ├── helpers/
│   │   ├── videoToGif.ts                             # [NEW] Playwright video → GIF (ffmpeg shell-out, palette pipeline)
│   │   ├── a11yCategoriser.ts                        # [NEW] Pure axe-results categoriser (serious/critical→fail, moderate→warn, minor→ignore) — T4A
│   │   └── __tests__/
│   │       ├── videoToGif.test.ts                    # [NEW] Vitest unit test against fixture webm — T2A
│   │       └── a11yCategoriser.test.ts               # [NEW] Vitest unit test on the categoriser — T4A
│   └── fixtures/
│       └── sample.webm                               # [NEW] 50 KB checked-in webm for videoToGif unit test — R11

apps/vscode/
└── .eslintrc.* (or apps/vscode/eslint.config.*)      # [EDIT] Add no-restricted-imports rule forbidding **/__testing__/** — FR-044

tests/e2e/
└── test-storyboard-edit.spec.ts                      # [NEW] Code-server chrome only — FR-010..FR-015 (path now matches spec)

Taskfile.yml                                          # [EDIT] Add verify:ffmpeg target wired into task verify — FR-045
```

**Structure Decision**: No new projects, no new workspaces. All work lands in existing directories. Evidence destined for #218's already-shipped table (vscode-native-chrome.png, interaction.gif) lands under `specs/218-storyboarding-edit/evidence/screenshots/` per FR-015 / FR-042; everything else (a11y-report, a11y-results.json, opening-context, perf-budget update) lives under this feature's `evidence/`.

**ADR-027 deltas:** the production webview entry (`apps/vscode/src/webview/web/storyboardPanel.tsx`) is **untouched**. `<StoryboardPanel>` stays purely presentational. Phase 3 work is contained to the `__testing__/` surface + harness refactor + 4 story upgrades — see Constitution Article XV note in the table below.

## Media Components

The four edit-suite stories already exist as Storybook stories — the work in this feature *upgrades* them from static to interactive. Bundling them for the blog post turns the post's "Try It Yourself" section into a live walkthrough (the headline ergonomics win for this feature).

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StoryboardPanel — WithEditForm | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx:232` | `storyboard-panel-with-edit-form.js` | Reviewer can open the inline edit form, submit, cancel — driven by the real reducer |
| StoryboardPanel — WithUndoToast | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx:256` | `storyboard-panel-with-undo-toast.js` | Reviewer can delete a Scene and click Undo to restore — full delete+undo cycle |
| StoryboardPanel — WithStaleBadge | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx:281` | `storyboard-panel-with-stale-badge.js` | Reviewer can refresh the badge in success and induced-failure modes |
| StoryboardPanel — WithMissingDataRemediation | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx:301` | `storyboard-panel-with-missing-data-remediation.js` | Reviewer can keyboard-tab to the remediation affordance and press Enter |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change *(static → interactive is the qualifying change — the stories now exhibit real state transitions)*
- [x] Interactive demo adds narrative value *(the polish loop is the feature; the stories ARE the post's primary asset)*

**Bundleability Verified**:
- [x] Stories exist in Storybook (since #218; reducer-wired post-#230)
- [x] Components render standalone — story-only mock-port replaces VS Code postMessage entirely
- [x] Reasonable bundle size expected (StoryboardPanel + reducer + Leaflet-free path is well under 500 KB; matches the existing `StoryboardPlayback` story bundle)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-storyboardpanel--with-edit-form` (one link per upgraded story; the other three follow the same `--with-*` pattern).

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx → WithEditForm` | Rendering + reducer-driven open/submit/cancel | light, dark, vscode | click chevron → edit form opens; type new title → submit → row updates; click cancel → form closes |
| `StoryboardPanel.stories.tsx → WithUndoToast` | Delete + Undo cycle, ARIA on toast | light, dark, vscode | overflow → Delete → toast appears; click Undo → row restored; toast dismisses |
| `StoryboardPanel.stories.tsx → WithStaleBadge` | Refresh success + induced-failure | light, dark, vscode | click Refresh on badge → badge clears (success); toggle failure knob → click Refresh → error toast surfaces |
| `StoryboardPanel.stories.tsx → WithMissingDataRemediation` | Keyboard reach + focus ring | light, dark, vscode | Tab through panel → focus lands on remediation affordance with visible ring; Enter dispatches |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (covered by axe spec which iterates the four stories under all three themes)
- [x] Interactive elements respond to user input (every story has at least one acceptance scenario in spec.md US1)
- [x] Accessibility attributes present (axe spec is FR-021 — gates serious/critical violations)
- [x] Screenshots captured for evidence (the interaction GIF + the four story iframes captured by the a11y run)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts` (the four stories are exercised in their iframes; story-level interaction tests stay manual + reducer-unit-test-backed, mirroring the rest of the panel)

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-storyboardpanel--with-edit-form&globals=theme:light
/iframe.html?id=components-storyboardpanel--with-edit-form&globals=theme:dark
/iframe.html?id=components-storyboardpanel--with-edit-form&globals=theme:vscode
```

## Web-Shell E2E Testing

The web-shell remains the **primary** E2E surface. The code-server chrome spec is complementary and intentionally narrow.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Scene rename (inline) | StoryboardPanel, SceneRow | `[data-testid="scene-row-title-edit"]`, `[data-testid="scene-row-title-input"]` | open chevron → edit title → submit → assert row text + Log Panel card |
| Duplicate-at-colliding-timestamp | StoryboardPanel, HardBlockModal | `[data-testid="duplicate-collision-modal"]`, Replace/Offset/Cancel buttons | invoke Duplicate on colliding row → modal surfaces → choose Offset → assert new row at offset timestamp |
| Copy-to-other (success) | StoryboardPanel, SceneOverflowMenu, picker | `[data-testid="copy-to-other-picker"]`, picker rows | overflow → Copy to other → pick destination → assert success toast + Log Panel card |
| Copy-to-other (deep-copy failure) | StoryboardPanel, SceneOverflowMenu, error toast | `[data-testid="copy-error-toast"]` | with `?induceCopyFailure=<sceneId>` → trigger copy → assert error toast + rollback (no row added in destination) |
| Update-to-current | StoryboardPanel, SceneRow | `[data-testid="scene-update-to-current"]` | overflow → Update to current → assert thumbnail + visible_feature_ids refreshed in Log Panel card |
| Storyboard rename + describe | StoryboardPanel, StoryboardHeader | `[data-testid="storyboard-rename"]`, `[data-testid="storyboard-describe"]` | edit title → blur → assert update; edit description → assert update |
| Bulk refresh partial failure | StoryboardPanel, StaleBadge, error surface | `[data-testid="refresh-all-stale"]`, mixed badges | inject mixed-stale fixture (some refreshable, one induced-failure) → click Refresh All → assert badges cleared on success rows + retained on failure row + warning toast |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell (each scenario above is a Playwright test in `storyboard-edit.spec.ts`)
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for new selectors (extend the existing `StoryboardEditHarnessPage`; do not duplicate)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/218-storyboarding-edit/evidence/screenshots/` from the spec file (the interaction GIF spec resolves the path the same way `properties-screenshots.spec.ts` does)

**Test File Location**:
- Scenarios: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` (extend)
- A11y audit: `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts` (new)
- Interaction GIF capture: `apps/web-shell/playwright/tests/storyboard-edit-interaction-gif.spec.ts` (new)

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-edit` (auto-provisions `@sparticuz/chromium`)
- Local: `pnpm --filter @debrief/web-shell test storyboard-edit`

**Optional — chrome-level VS Code Webview tests**:
`tests/e2e/test-storyboard-edit.spec.ts` (FR-010..FR-015) covers **only** palette invocation for the 11 new commands, native input-box prompts (rename / duplicate-timestamp / storyboard rename), native quick-pick (copy-to-other destination), and native `showInformationMessage` / `showWarningMessage` toasts. Captures one `vscode-native-chrome.png` for evidence. Does **not** re-test click flows covered in the web-shell suite.

## Complexity Tracking

> No constitution violations. No entries.
