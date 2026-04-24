---
title: "Building Dual-Platform E2E Tests — 18 Spec Files With Real Services"
date: 2026-03-06
layout: future-post
author: Ian
track: credibility
excerpt: "VS Code E2E suite expanded from 8 skipped specs to 18 active files, driven by real Python services parsing real REP data."
tags:
  - e2e
  - playwright
  - web-shell
---

## What We're Building

Debrief's three Python services each have unit tests. The VS Code extension has its own test suite. The web-shell has 81 Playwright tests across 13 spec files. But until now, nothing verified the complete analyst workflow through the real VS Code extension environment -- open a REP file, see tracks on the map, select features, run analysis, check results -- with actual Python services parsing actual data.

We're building a dual-platform E2E test strategy. The web-shell tests (already working, 81 tests, mock data) give fast CI feedback on orchestration regressions. The VS Code E2E tests (expanding from 8 spec files to 13+) drive openvscode-server with a sideloaded VSIX, hitting real debrief-io, debrief-stac, and debrief-calc services parsing real REP files. Same workflows exercised on both surfaces, but the VS Code suite additionally validates extension activation, VSIX packaging, and webview lifecycle -- things the web-shell simply cannot reach.

## How It Fits

The tracer bullet roadmap requires proving that components integrate correctly before investing in breadth. These E2E tests are the verification layer for that integration. They sit above unit and service-level tests, exercising the exact path a scientist follows in daily work.

The web-shell already proved the orchestration logic works. Now we extend that confidence into the real deployment environment. Both suites use the same Playwright infrastructure, the same assertion patterns, and target the same 13 workflow categories. One runs in seconds with mocks; the other takes longer but catches the problems that only surface when real services parse real files inside real VS Code.

## Key Decisions

- **openvscode-server preferred over code-server.** Our global-setup.ts prefers openvscode-server because it avoids the proprietary `vsda` module that code-server requires. Falls back to code-server if openvscode-server is unavailable. This was a pragmatic decision -- fewer licensing questions, cleaner CI.

- **Real Python services in VS Code E2E, not mocks.** The VS Code E2E environment starts actual debrief-io, debrief-stac, and debrief-calc services. Test assertions accommodate real data characteristics -- variable track counts, real coordinate values -- rather than matching against mock fixtures. This is slower but catches the integration bugs that matter most.

- **`test.fixme()` over `.skip()` for missing features.** When a VS Code E2E test reveals something not yet implemented, we annotate it with `test.fixme()` and cross-reference a backlog item. The test stays visible in reports as a known gap rather than disappearing into a skip count. This keeps the test suite honest about what works and what doesn't.

- **Dedicated CI job running in parallel.** E2E tests run in `e2e.yml`, separate from the unit test workflow. A developer pushing a one-line Python fix shouldn't wait for Docker images to build and openvscode-server to start. Unit test feedback stays fast; E2E feedback arrives alongside it, not blocking it.

- **13 spec categories on both platforms.** The VS Code E2E suite expands to match every web-shell category: catalog browse, plot load, tool execution, selection sync, time control, drawing, log panel, styling tools, undo/redo, provenance, and more. Where a category requires webview-specific adaptations (iframe traversal, page objects), the test patterns adjust but the workflow assertions remain equivalent.

- **Docker for CI, local install for development.** The Docker image layers openvscode-server, Python services, and the packaged VSIX into a reproducible environment. Developers can also install openvscode-server locally and run the same Playwright scripts. One test suite, two environments.

A month ago, the VS Code E2E test suite had 8 spec files -- all skipped. The web-shell had 81 tests across 13 categories, all passing, but those tests exercised orchestration through mock data. Nothing verified that a scientist could open a real REP file in the real extension, see real tracks parsed by real Python services, select features, and run analysis tools end-to-end.

![STAC catalog browser showing Exercise Alpha and Training Run 1 with timeline overview](/assets/images/future-debrief/005-e2e-workflow-tests/web-shell-catalog.png)
*STAC catalog browser — the entry point for both web-shell and VS Code E2E tests*

Now the VS Code E2E suite has 18 active spec files. Four previously-skipped specs have been restored with live assertions. Ten new spec files cover selection sync, time controller, drawing tools, catalog browsing, log panel, edit face, event propagation, styling tools, undo/redo, and evidence capture. The `DebriefWebview` page object gained 40+ new selectors and methods to support all of this.

Both suites run in parallel CI. The web-shell tests (~30 seconds, mock data, 13 specs) catch orchestration regressions fast. The VS Code E2E tests (~3 minutes, real services, 18 specs) catch the integration problems that only surface when debrief-io parses an actual REP file and debrief-stac stores actual STAC Items.

## How It Works

![Analysis view showing map with HMS Defender and USS Freedom tracks, time controller, tools panel, and layers panel](/assets/images/future-debrief/005-e2e-workflow-tests/web-shell-map-tracks.png)
*Full analysis view — navigation tree, time controller, tools panel, layers (left) and Leaflet map with real tracks (right)*

The VS Code E2E tests drive openvscode-server with the Debrief extension sideloaded. Behind the scenes, three Python services -- debrief-io, debrief-stac, and debrief-calc -- are running and reachable. When a test opens a REP file, the extension calls debrief-io to parse it, debrief-stac to catalogue it, and debrief-calc to run analysis. The test then inspects the webview DOM to verify tracks rendered and results appeared.

```typescript
test('loads REP file and shows tracks', async ({ codeServerPage }) => {
  await codeServerPage.openFile('samples/boat1.rep');

  const frame = await codeServerPage.getWebviewFrame();
  await frame.locator('.leaflet-container').waitFor({ state: 'visible' });

  const trackCount = await frame.locator('.leaflet-interactive').count();
  expect(trackCount).toBeGreaterThan(0);
});
```

![Selection sync — track selected on map with feature list and tools panel visible](/assets/images/future-debrief/005-e2e-workflow-tests/web-shell-selection.png)
*Selection sync — clicking a track on the map highlights it and activates context-sensitive tools*

That last assertion -- `toBeGreaterThan(0)` rather than `toEqual(3)` -- is deliberate. Real service output varies. Structural assertions ("at least one track exists") are resilient to changes in sample data or parsing improvements. Value-exact assertions against real data break constantly for the wrong reasons.

## By the Numbers

| | |
|---|---|
| VS Code E2E spec files | 18 |
| VS Code E2E active tests | ~25 |
| VS Code E2E fixme tests | ~28 |
| Web-shell spec files | 13 |
| Web-shell active tests | 81+ |
| New page object methods | 40+ |
| Platforms tested in parallel | 2 |

## The test.fixme() Strategy

Of the 18 VS Code E2E spec files, 10 contain tests marked `test.fixme()`. These cover features that don't yet exist in the extension -- time controller, drawing tools, styling, undo/redo, and others. The tests are written. The assertions are specified. The features aren't implemented yet.

```typescript
test.fixme('time scrubber updates map display', async ({ codeServerPage }) => {
  // Time controller not yet implemented in VS Code extension
  // See backlog: time-controller feature
});
```

We chose `test.fixme()` over `.skip()` for a specific reason: fixme tests appear in Playwright reports as known gaps. They're visible. They cross-reference backlog items. When someone implements the time controller feature, the test is already waiting -- remove the `.fixme()` wrapper and it either passes or tells you what's broken. With `.skip()`, these tests would vanish from reports entirely, and the gaps they represent would be invisible.

This turned the E2E expansion into a feature-completeness audit. Writing 28 fixme tests documented exactly what the extension doesn't do yet, in executable form.

## Page Object Architecture

Two page objects handle the VS Code E2E environment:

- **CodeServerPage** manages VS Code chrome -- command palette, Quick Open, file navigation, the Welcome tab focus trap, keyboard shortcuts
- **DebriefWebview** manages the extension's webview -- iframe traversal, Leaflet map interactions, feature list, tools panel, selection state

This separation matters because VS Code's webview sits inside nested iframes. The test code that opens a file through Quick Open is fundamentally different from the code that clicks a track on the map. Mixing them makes tests fragile. Keeping them in separate page objects makes the iframe boundary explicit.

## Lessons Learned

**Structural assertions save maintenance time.** Early drafts of the restored specs used exact value checks against real REP file output. Those broke immediately when we updated a sample file. Switching to existence-based assertions ("at least one track", "tool result contains measurement text") made the tests resilient without sacrificing confidence. If zero tracks render, the test still fails.

**Writing tests for unimplemented features is useful work.** The 28 fixme tests forced us to think through what each feature's testable behaviour should look like, before writing any implementation code. Several of those tests revealed UX questions we hadn't considered -- what should the time controller's DOM look like? How should drawing tool state be inspectable from Playwright? Those questions are now documented in the test files themselves.

**Dual-platform testing catches different bugs.** During development, the web-shell tests passed consistently while a VS Code E2E test failed on catalog browsing. The issue was an extension-specific activation timing problem that the web-shell's simpler lifecycle couldn't reproduce. Two test surfaces, two classes of bugs caught.

## What's Next

The 28 fixme tests are now a prioritised implementation queue. As each extension feature ships -- time controller, drawing tools, styling panel -- the corresponding fixme tests activate and immediately verify the feature works end-to-end with real services.

The CI pipeline runs both suites in parallel, so new features get validated against mock data in 30 seconds and against real services in 3 minutes, without blocking each other.

-> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/005-e2e-workflow-tests)
-> [View the evidence](https://github.com/debrief/debrief-future/tree/main/specs/005-e2e-workflow-tests/evidence)
