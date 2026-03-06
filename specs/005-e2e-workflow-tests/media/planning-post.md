---
layout: future-post
title: "Planning: Dual-Platform E2E Workflow Tests"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, testing, e2e, playwright, vscode, web-shell]
excerpt: "Dual-platform E2E testing that exercises the full io-stac-calc workflow through both browser and VS Code"
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

## What We'd Love Feedback On

- **Which workflows catch regressions in practice?** We've prioritised file loading, analysis execution, selection sync, and temporal control. If you regularly hit bugs in sequences we haven't covered -- say, re-running a tool after changing the time window, or switching between plots mid-analysis -- that would influence our spec file priorities.

- **Real services versus mock fidelity.** The VS Code E2E suite intentionally uses real Python services for maximum fidelity, but this makes tests slower and more sensitive to service-level changes. If you've navigated this trade-off in similar projects, we'd appreciate hearing how you balanced speed against confidence.

- **`test.fixme()` as a backlog discovery mechanism.** We're treating the E2E expansion partly as a feature-completeness audit -- tests that can't pass yet become documented gaps. If you've used a similar pattern, we're curious whether it stayed useful as the backlog grew or became noise.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
