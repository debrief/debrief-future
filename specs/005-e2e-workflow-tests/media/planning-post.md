---
layout: future-post
title: "Planning: End-to-End Workflow Tests with Code-Server and Playwright"
date: 2026-02-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, testing, e2e, playwright, code-server]
excerpt: "Planning browser-driven tests that exercise the full user workflow through VS Code -- file load to map display to analysis results"
---

## What We're Building

Debrief's three Python services each have solid unit tests. The VS Code extension has its own test suite. But nothing currently verifies the workflow that actually matters to an analyst: open a REP file, see tracks on the map, select features, run an analysis tool, check the results in the catalog. That complete journey passes through io (parsing), stac (storage), calc (analysis), and the extension's TypeScript orchestration layer that wires them together. A subtle regression at any boundary could break the entire experience, and no existing test would notice.

We are adding true end-to-end tests that drive the real extension UI in a browser. code-server hosts VS Code as a web application, Playwright automates a Chromium browser pointed at it, and the tests interact with the actual panels, webviews, command palette, and notifications that a user would see. No mocks, no simulated environment -- the real extension running against real Python services, exercised through real DOM interactions.

## How It Fits

The tracer bullet roadmap calls for proving that the components integrate correctly before investing in breadth. These e2e tests are the verification layer for that integration. They sit above the unit and service-level tests, exercising the exact path a DSTL scientist would follow in daily work.

This also extends infrastructure the project already has. Playwright is already in the project at version 1.57 with seven test files across four configurations. The web shell tests (`plot-load.spec.ts`, `tool-execution.spec.ts`, `catalog-browse.spec.ts`) already exercise similar workflows against a Vite dev server. What changes here is the target: instead of a lightweight shell, we test against the full VS Code environment where the extension actually runs. Same patterns, higher fidelity.

## Key Decisions

- **code-server as the VS Code host.** MIT-licensed, Docker-ready, and its own test suite uses Playwright -- so we have a reference implementation for the nested iframe patterns we need. Authentication disabled for testing (`--auth none`). Current release tracks VS Code 1.108.

- **Webview access via nested frameLocator().** VS Code renders extension webviews inside two layers of iframe: an outer `iframe.webview.ready` container and an inner `#active-frame`. Playwright's `frameLocator` handles this at the CDP level. The key insight: most of our test assertions target Debrief-controlled components (Leaflet map, catalog tree, tool result panel) whose DOM we own, not VS Code's internal chrome. That reduces brittleness significantly.

- **Page object model for maintainability.** `CodeServerPage` encapsulates VS Code chrome interactions (open file, trigger command palette, read notifications). `DebriefWebview` encapsulates project-owned components (wait for map ready, count tracks, check catalog entries). Tests read like user stories.

- **Docker for CI, local code-server for dev.** The Dockerfile layers code-server, Python services, and the packaged .vsix extension into a reproducible image. Developers install code-server locally and run the same Playwright test scripts. Same tests, both environments, single `npx playwright test` command.

- **Three test files aligned to user stories.** Load-and-display (P1) covers the fundamental workflow every user hits first. Analysis-tool (P2) covers the core analytical round-trip through calc and back to the catalog. Error-feedback (P3) verifies that failures at any service boundary surface as clear user-visible messages rather than silent corruption.

- **Test workspace with symlinked fixtures.** Sample REP files point back to existing io test fixtures rather than duplicating data. STAC catalogs are created fresh for test isolation.

## What We'd Love Feedback On

- **Iframe stability in CI.** Playwright issue #36943 documents intermittent failures with nested iframe access under load. Our mitigation is generous timeouts, waiting for `.ready` class before drilling into iframes, and retry logic. If you have experience testing VS Code webviews with Playwright -- particularly in Docker-based CI -- we would value hearing what worked and what did not.

- **Which workflows matter most.** We have prioritised file loading, single-track analysis, multi-track analysis, and error feedback. For maritime analysts: are there interaction sequences you find yourself repeating that we should add? Selecting tracks across multiple plots, perhaps, or re-running a tool with different parameters?

- **code-server versus OpenVSCode Server.** We chose code-server for its documented Playwright patterns and auth handling. OpenVSCode Server (from Gitpod) tracks upstream VS Code more closely but has less Playwright reference material. If you have operational experience with either for automated testing, that context would inform whether we have picked the right horse.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
