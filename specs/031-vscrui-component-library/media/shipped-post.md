---
layout: future-post
title: "Shipped: vscrui as Standard Component Library"
date: 2026-01-30
track: [credibility]
author: Ian
reading_time: 3
tags: [architecture, vs-code-extension, component-library, tracer-bullet]
excerpt: "Standardized VS Code webview components across the platform with offline-first bundling."
---

## What We Built

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
