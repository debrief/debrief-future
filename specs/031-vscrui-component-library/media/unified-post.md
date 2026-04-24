---
title: "Building vscrui as Standard Component Library"
date: 2026-01-30
layout: future-post
author: Ian
track: credibility
excerpt: "Standardized VS Code webview components across the platform with offline-first bundling."
tags:
  - component-library
  - vs-code-extension
---

## What We're Building

Every VS Code webview in Debrief needs form controls, data tables, layout primitives, and icons that look and feel native to VS Code. Rather than each developer making their own choice (or worse, rolling their own), we're documenting a single standard: [vscrui](https://github.com/nicolo-ribaudo/vscrui), a React component library purpose-built for VS Code webviews.

This is a documentation-only feature. No code changes, no new dependencies to install. We're writing the reference material so that anyone building a Debrief webview panel -- whether it's the STAC catalog browser, the time controller, or something we haven't thought of yet -- knows exactly which components to reach for and how to use them.

The documentation will live at `shared/components/vscrui.md` and be cross-referenced from `ARCHITECTURE.md`, so it's findable from the two places developers are most likely to look.

## How It Fits

Debrief's architecture follows a "thick services, thin frontends" principle. The VS Code extension is one of those thin frontends, and its webview panels are where analysts interact with plots, timelines, and analysis results. Having a consistent component library means panels built by different people at different times will still feel like one coherent application.

vscrui sits at the shared component layer of our architecture. It doesn't replace Leaflet for maps or our custom timeline rendering -- it handles the structural and interactive elements that surround them: dropdowns, checkboxes, data grids, badges, toolbars.

## Key Decisions

- **vscrui over the VS Code Webview UI Toolkit.** Microsoft deprecated their official toolkit in favour of web components that don't integrate well with React. vscrui is React-native, actively maintained, and covers the same ground.
- **Bundled, not fetched.** vscrui ships as an npm package bundled into the extension. No CDN calls, no network dependency. This matters for Debrief's offline-by-default principle -- analysts working on classified networks or at sea can't rely on external resources.
- **Documentation, not enforcement.** We're writing a reference and conventions guide, not adding linting rules or build-time checks. At this stage of the project, clear documentation is more valuable than tooling that slows people down.
- **Organised by purpose.** The docs group components into five categories: form elements, display, layout, interactive, and icons. This mirrors how developers actually think when building a panel -- "I need a dropdown" not "I need the `VSCodeDropdown` component."

Building multiple VS Code extensions for Debrief, we kept facing the same problem: how to maintain visual consistency while respecting VS Code's theming system. Microsoft's webview UI toolkit was deprecated, and we needed an explicit standard before more webviews went different directions.

We standardized on [vscrui](https://github.com/vscode-webview/ui-toolkit), a mature React component library maintained by the community. Then we documented the decision in `shared/components/vscrui.md`:

- **Component catalog**: 15 components across five categories (inputs, buttons, form controls, layout containers, and progress indicators) with guidance for when to use each
- **Installation and bundling**: Step-by-step guidance for bundling vscrui locally — critical because our platform works entirely offline, with no CDN access
- **Usage patterns**: Concrete React examples showing how webviews structure components with consistent theming across light and dark modes
- **Scope and constraints**: Clear boundaries on what vscrui provides (accessibility, VS Code theme integration) versus what needs custom implementation (layout logic, domain-specific interactions)
- **Extension process**: How to propose new components when the standard library doesn't cover a capability, including the criteria we'll use to evaluate additions

We added a cross-reference in `ARCHITECTURE.md` so new contributors see this standard immediately when designing webviews.

## Lessons Learned

We built three webviews before formalizing a component standard. Each solved the same problems slightly differently — inconsistent but not broken. It taught us that explicit architectural decisions should be documented before they become patterns.

The offline bundling constraint was the interesting technical detail. vscrui publishes as ES modules for npm. Running without a CDN means bundling everything locally within the extension package. That's now documented and testable, which prevents us from discovering it as a blocker during later builds.

We're still uncertain whether 15 components will be sufficient for the analytics workflows our users need. The timeline controller and linked map interactions will be the real test — they demand complex state synchronization and responsive interactions. We'll have a much clearer answer once those are implemented.

## What's Next

Documenting the component library sets the foundation for consistent interfaces, but it doesn't build the actual webviews yet. Next work is wiring temporal state management across the timeline and canvas, both heavy users of these standardized components.
