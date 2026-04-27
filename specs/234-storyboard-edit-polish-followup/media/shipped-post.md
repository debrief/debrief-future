---
layout: future-post
title: "Building the Storyboard edit suite — closure pass"
date: 2026-04-27
tags: [vscode, storyboard, accessibility, playwright, perf, storybook]
spec: 234-storyboard-edit-polish-followup
track: [momentum, credibility]
author: Ian
reading_time: 9
excerpt: "Five quality-of-shipping items #230 deferred — interactive Storybook stories, code-server chrome E2E, axe a11y audit, perf budget, full Playwright scenario set + interaction GIF — closed in a single PR. With a mid-implementation architecture pivot owned in ADR-027 and three real WCAG bugs caught and fixed."
---

## Hook

| | Before (#230 shipped) | After (#234 closes) |
|---|---|---|
| Storybook stories | Frozen `args`-based props | Interactive, reducer-driven |
| Web-shell E2E | 7 smoke scenarios | 19 scenarios + chrome-only spec |
| A11y coverage | Keyboard-nav unit tests | Automated axe audit, 5 surfaces |
| Perf guarantee | Structural invariant (comment) | CI-enforced 50 ms median budget |
| #218 evidence | Partial | Table closed |

## What We're Building

The Storyboard edit suite shipped in #230, but five quality-of-shipping items were intentionally deferred so that PR could merge clean. This feature closes all of them in a single pass: the four edit-suite Storybook stories become interactive (no more frozen placeholders — they drive the same `useStoryboardEditReducer` the production panel uses), a thin code-server chrome E2E proves all the new Storyboard commands are reachable from the command palette and that the native VS Code surfaces (input box, quick pick, notification toasts) still work, an `@axe-core/playwright` audit sweeps three harness states plus the four upgraded story iframes for serious or critical violations, a vitest perf test pins the panel's per-render hot path at a 50 ms median budget so future changes can't silently walk the scene list twice, and the web-shell Playwright suite picks up the seven still-uncovered scenarios — Scene rename, duplicate-at-colliding-timestamp, copy-to-other (success and induced failure), update-to-current, Storyboard description submit, bulk refresh partial failure — plus a short interaction GIF showing rename → describe → delete + undo → refresh-stale in one continuous recording.

The headline ergonomics win is the interactive stories. The shared reducer was #230's central architectural decision but its value was invisible until the stories actually used it; reviewers opening Storybook saw frozen UIs and had to take the architecture on trust. After this feature, the stories *are* the walkthrough — chevron opens a real edit form, Delete surfaces a real Undo toast that actually undoes, Refresh clears a real stale badge, the keyboard tab order really does land on the remediation affordance.

## How It Fits

This is the closure pass on the Storyboard edit suite. #218 set out the polish loop and the evidence-requirements table; #230 shipped the wiring, the reducer, the harness, the smoke E2E, and six evidence screenshots; #234 retires the "follow-up" status and lets the #218 evidence table go fully green. The interactive stories also become bundleable assets for any future blog post — the post's "Try It Yourself" section turns into a live reducer-backed walkthrough rather than a video the reader can only watch. After this feature lands, the next chapter for storyboards (animated time-range Scenes, distraction-free briefing renderer, MP4/GIF export, tracked as #229) builds on a foundation that has demonstrable rigour: axe audit clean, perf-guarded, every documented flow exercised by an automated test.

## Key Decisions

- **Considered a typed `PortContext` + `OutboundMessage` abstraction; landed on a callback-adapter helper instead.** The original plan introduced a React context to inject an outbound port into `<StoryboardPanel>`, replacing ~20 callback props with typed message variants threaded through every emitter, and rewriting the production webview entry to wrap in a `<PortContext.Provider>`. Mid-implementation re-examination of `apps/vscode/src/webview/web/storyboardPanel.tsx` showed the panel was already cleanly presentational — the postMessage translation lived in the webview entry, and the harness already did the symmetric translation to reducer dispatches. The "prop drilling" objection in the original research compared the new port architecture against a different new architecture (port-as-prop), not against the existing callback architecture. Owned the pivot in [ADR-027](docs/project_notes/decisions.md#adr-027) + revised every spec artefact in one commit. The simpler `useStoryOnlyMockHandlers` helper landed Phase 3 in ~80 LOC + 10 unit tests + 1 smoke E2E gate — production code untouched.
- **The code-server chrome spec is intentionally narrow.** It runs all 10 new commands via the command palette (FR-010 — that's the integration-point regression guard) but only asserts on native-chrome surfaces: input box, quick pick, notification toasts. Click flows for non-prompt commands stay in the web-shell suite. The trade-off is conscious: a full code-server integration suite would duplicate web-shell coverage, run roughly ten times slower, and add CI flake without information gain.
- **Zero new npm runtime dependencies; ffmpeg made explicit.** `@axe-core/playwright` was already added to `shared/components/package.json` during #230's research. ffmpeg is a system binary (no tracked devDep — earlier review surfaced that I'd misattributed it to a non-existent `tools/screenshot/` directory; #217 had quietly relied on it being on PATH). This feature acknowledges that explicitly with a `task verify:ffmpeg` check that fails fast with a remediation message when it's missing — the assumption is now auditable rather than implicit.
- **Perf test targets the pure composer, not the webview shell.** The first draft pinned the budget on `storyboardPanelView.refresh()`, but that function is webview-coupled (`import * as vscode from 'vscode'`, operates on a `WebviewView`) and would need an obscuring pile of mocks under vitest. The actual O(active-storyboard Scenes) hot path is `composeSceneEditViewModels` — a pure function already exported from the panel package. Pinning the budget there measures the right thing, and the function gets promoted to a contracted public API in the same PR (signature pinned, perf invariant documented, CHANGELOG entry) so future regressors land on a clear contract rather than guessing what the budget guards.
- **Test-only boundary load-bearing in CI, not just convention.** The new `__testing__/` directory under the storyboard panel is the test-only export surface for the shared mock-handlers helper. An ESLint `no-restricted-imports` rule prevents `apps/vscode/` production code from importing it — caught by `pnpm lint`, not by reviewer discipline. Convention without enforcement drifts; this one won't.
- **Two symmetric harness knobs, not one.** Originally I'd planned only `?induceCopyFailure=<sceneId>` for the deep-copy rollback scenario. Review surfaced that the bulk-refresh-partial-failure scenario needs the same affordance for refresh paths, so the harness now also takes `?induceRefreshFailure=<sceneId>`. Both knobs share the same parser, both dispatch to the existing failure branches the reducer already implements.
- **Interaction GIF is captured from a Playwright video recording.** A single helper at `apps/web-shell/playwright/helpers/videoToGif.ts` handles webm-to-GIF conversion at 10 fps, max-width 960 px. The 2 MB / 5 s budget is asserted as a test failure, not a soft warning — if it breaches, the fix is to drop fps or shorten the scenario, not to relax the budget. Future GIFs (#229 and beyond) reuse the same path.

## Screenshots

The analyst's actual workflow needs the Storyboard panel and the map at the same time — that's how you pick a viewport for a new Scene and verify viewports for existing ones. So the headline shot is the workbench layout with both panes populated:

![Storyboard panel + map view side-by-side, Exercise Alpha loaded]({{ "/assets/2026-04-27-234/vscode-storyboard-panel.png" | relative_url }})

Left sidebar: TIME CONTROLLER (06:30:00 slider), TOOLS, LAYERS, PROPERTIES, **Storyboard view** (empty state with a Capture button — ready for the analyst's first Scene). Centre: the Map view rendering Exercise Alpha — maritime track, tactical contacts (HMS Defender / USS Freedom), per-point timestamps, drawing toolbar. The Storyboard view appears in the sidebar via `when: debrief.plotOpen` — load a plot, the view becomes available; close the plot, it goes away.

The interaction loop in motion (3.80 s, 1.44 MB):

![Polish-loop GIF: rename → describe → delete + undo → refresh-stale]({{ "/assets/2026-04-27-234/interaction.gif" | relative_url }})

The chrome-only test capture — the command palette mid-flow with `Storyboard: Rename Scene` typed against the Debrief test workspace:

![Command palette pre-typed with Storyboard: Rename Scene]({{ "/assets/2026-04-27-234/vscode-native-chrome.png" | relative_url }})

The empty-state Debrief sidebar (no plot loaded, Storyboard view correctly hidden):

![Debrief sidebar without a plot loaded]({{ "/assets/2026-04-27-234/vscode-debrief-sidebar.png" | relative_url }})

The six panel-state captures from the smoke suite (refreshed post-a11y-fixes) — `storyboard-panel-default.png`, `storyboard-edit-form-open.png`, `storyboard-overflow-menu-open.png`, `storyboard-undo-toast.png`, `storyboard-stale-badge.png`, `storyboard-missing-data-remediation.png` — also live in the parent #218 evidence-table, now closed.

## Try It Yourself

Each of the four upgraded stories is interactive. Click the chevron, the form opens via the real reducer; right-click for Delete, the Undo toast actually undoes; toggle the failure-injection knob on `WithStaleBadge` to exercise the per-Scene failure branch:

- [WithEditForm](https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-edit-form) — chevron opens the inline edit form, submit/cancel flows
- [WithUndoToast](https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-undo-toast) — overflow → Delete → Undo cycle
- [WithStaleBadge](https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-stale-badge) — Refresh thumbnail clears the badge; the `induceRefreshFailure` arg in Storybook controls flips the failure branch
- [WithMissingDataRemediation](https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-missing-data-remediation) — Tab through to land on the remediation affordance

## By the Numbers

- **79 new tests**, all green: 5 querystring-parser cases (dual knob), 8 a11y categoriser cases, 2 videoToGif cases, 10 mock-handlers cases (seed → state, handler → reducer, both knobs), 1 perf test, 19 web-shell Playwright tests (12 smoke + 7 new scenarios), 5 axe audits, 1 interaction-GIF capture, 12 code-server chrome tests against live openvscode-server v4.117.0, 14 inline reducer-state assertions across the new scenarios, plus 2 helper unit suites.
- **150 / 150** existing StoryboardPanel unit tests still pass after the a11y attribute deltas — no regression.
- **Perf budget**: `composeSceneEditViewModels` median **0.017 ms** vs the 50 ms hard cap (~3000× headroom). p95 0.029 ms.
- **Interaction GIF**: 1,511,545 bytes / 3.80 s — comfortably under the 1.8 MB soft warn, the 2 MB hard cap, and the 5 s hard cap.
- **A11y**: 0 serious, 0 critical, 0 moderate across 5 surfaces. Three real WCAG violations surfaced and fixed:
  - `aria-required-children` CRITICAL on `SceneList` — `role="list"` with non-listitem children (StaleBadge + SceneEditForm overlays). Dropped the role; the wrapper stays a plain div.
  - `aria-allowed-attr` CRITICAL on `SceneRow` — `aria-expanded` on a div without supporting role. Removed; the chevron `<button>` (which has the matching role) keeps it.
  - `color-contrast` SERIOUS on `StaleBadge` — `#fff` on `#ff8c00` at 10 px = 2.33 : 1, well under WCAG-AA's 4.5 : 1. Darkened the fallback to `#a04500` and bumped to 11 px bold for 5.4 : 1.
- **Zero** new npm runtime dependencies. ffmpeg surfaced as an explicit system-binary dep via `task verify:ffmpeg`.

## Lessons Learned

**Test before claiming a blocker.** I cited Issue #143 (openvscode-server webview iframe hierarchy) as blocking the code-server E2E without trying. The user pushed back, pointed at the existing `docs/project_notes/code-server-cloud-testing.md`, and the cloud-testing path worked end-to-end on the first try — preview-smoke 4 / 4, then storyboard-edit chrome spec 12 / 12 against live openvscode-server. The original spec had inherited the heavy Hybrid A+D MessagePort fixtures from the playback spec, which DID need iframe-rendered content and would have hit #143. Mine didn't — palette + native input boxes + notification toasts. Wrong base. Lesson: when a test pattern feels heavier than the assertion needs, look for the simpler pattern that actually exists in the repo — it's almost always there.

**The architecture pivot was a planning failure caught by re-examining the production code.** I'd specified `PortContext` + `OutboundMessage` after research that compared the new port architecture against a different new architecture, not against the existing callback architecture. When I actually read `storyboardPanel.tsx:170-260` mid-implementation, the panel was already cleanly presentational — the abstraction was solving a problem that wasn't there. ADR-027 owns the pivot honestly: kept the original research item with a `Superseded` banner so future readers see the path I walked, replaced it with R10b explaining what shipped and why. Phase 3 dropped from "multi-hour, cross-cutting, E2E-gated" to "30 min, additive, helper-gated". The lesson isn't "always pick the lighter abstraction" — it's "if the heavier abstraction depends on a strawman comparison, the analysis is wrong."

**The a11y audit caught real bugs.** Three CRITICAL/SERIOUS violations existed in code that had passed manual review and unit tests. The `color-contrast` failure was particularly humbling — `#fff` on the default-orange status-bar warning colour looked fine to my eye, but at 2.33 : 1 it was nearly half the WCAG-AA threshold. Axe was right. The lesson is the obvious one — automated a11y is a different category of evidence than "I tested it visually" — but the bugs are also a reminder that StaleBadge's existing styles came from a context where I'd implicitly assumed VS Code's runtime themes would supply better defaults; the fallback colour mattered.

**`getByRole` over `aria-label` for VS Code chrome.** VS Code activity-bar tabs use text content for accessible names, not literal `aria-label`. CSS selector `[aria-label="Debrief"]` matched zero elements; `getByRole('tab', { name: 'Debrief', exact: true })` matched the right one. Worth knowing for anyone testing VS Code-extension UIs.

## What's Next

Storyboard work continues with #229 (animated time-range Scenes, distraction-free briefing renderer, MP4/GIF export). With the interactive stories now live, those posts get a "Try It Yourself" section that's a real walkthrough rather than a screen recording.
