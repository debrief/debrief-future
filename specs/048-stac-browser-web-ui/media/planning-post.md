---
layout: future-post
title: "Planning: Browser-Based Integration Testing Shell"
date: 2026-02-04
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, integration-testing, stac, web-shell]
excerpt: "Building a standalone web app to test component integration outside VS Code"
---

## What We're Building

Right now, testing how Future Debrief's UI components work together requires launching VS Code, loading data, and clicking around. That's fine for occasional verification, but it's slow for iterative development and impossible for automated E2E testing.

This week I'm building a standalone web application that composes our existing `@debrief/components` (MapView, ActivityPanel, CatalogOverview, TimeController) backed by mock services. The shell runs in any browser with hot reload, and Playwright can drive it for automated testing.

The important thing: we're not building new components. The React components already exist and work in Storybook stories. What we lack is proof they work correctly *together* — that selecting a track in the map updates the activity panel, that the time slider changes what's rendered, that tools activate when their requirements are met.

## How It Fits

This is part of the "thick services, thin frontends" architecture. The components in `@debrief/components` should work anywhere — Storybook, VS Code webviews, a browser app, eventually Jupyter. The web shell proves they're truly portable.

It also establishes the path for VS Code to adopt `@debrief/components/MapView`. Currently the VS Code extension has its own 744-line vanilla JS map implementation in `webview/web/map.ts`. The shared React MapView is 291 lines and already tested. Once the web shell proves the component works in a real application, VS Code can switch to it.

## Key Decisions

**Vite 5.x for build tooling** — Already used by our Storybook setup. ESM-native with fast dev server startup. Path aliases work straightforwardly via `resolve.alias`.

**Single source of truth for fixtures** — The web shell imports test data directly from `apps/vscode/test-data/local-store/` via a `@test-data` path alias. No duplicated fixtures that could drift. When someone updates the VS Code test data, the web shell sees it automatically.

**In-process JavaScript mock services** — The mock StacService and CalcService run in the browser, no network required. They implement the same interfaces as the real services. This validates API contracts while keeping tests fast and deterministic.

**Two-view architecture** — A welcome page shows `CatalogOverview` with available plots. Double-clicking a plot transitions to an analysis view with `ActivityPanel` on the left and `MapView` on the right. This matches VS Code's actual workflow where you open a plot and then work with it.

**Mock tools using @turf/turf** — Two JavaScript tools (track-length and bounding-box) demonstrate the tool execution flow. They're simple geometric calculations, enough to prove the wiring without requiring Python.

## What We'd Love Feedback On

The two-view architecture is the main design choice I'd appreciate input on:

1. Does welcome page (catalog browser) to analysis view (map + panels) match how you'd expect to work with plots?

2. Should the web shell support opening multiple plots in tabs, or is single-plot-at-a-time sufficient for integration testing?

3. Are track-length and bounding-box adequate mock tools, or would different examples better demonstrate the tool execution flow?

The test data question is also worth discussing. Currently we're reusing `apps/vscode/test-data/local-store/` which has two plots (Exercise Alpha, Training Run 1). Is that enough variety for meaningful integration testing, or should we expand the fixtures?

[Join the discussion](https://github.com/debrief/debrief-future/discussions)
