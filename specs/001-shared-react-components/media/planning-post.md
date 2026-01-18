---
layout: future-post
title: "Planning: Shared React Component Library"
date: 2026-01-16
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, react-components, storybook, ui]
excerpt: "Building reusable map, timeline, and list components that work everywhere Debrief runs."
---

## What We're Building

The heart of Debrief is visualizing maritime data — tracks on maps, events on timelines, features in lists. Until now, every frontend (desktop app, VS Code extension, future web viewer) would need to build these visualizations from scratch. That's a recipe for inconsistency and wasted effort.

We're creating a shared React component library with three core components: **MapView** for interactive maps, **Timeline** for temporal visualization, and **FeatureList** for browsing features. All three accept standard GeoJSON, share selection state, and work identically whether you're in an Electron app or a VS Code webview.

## How It Fits

This library sits in `shared/components/` at the foundation of the Debrief architecture. Both the [Loader mini-app](/specs/004-loader-mini-app/) and the [VS Code extension](/specs/006-speckit-vscode-extension/) will consume these components. By centralizing visualization code, we ensure:

- **Consistent UX** — a track looks and behaves the same everywhere
- **Single codebase** — bug fixes and improvements flow to all consumers
- **Faster development** — new frontends start with battle-tested components

## Key Decisions

- **Leaflet for maps** — lightweight (~40KB), offline-capable, battle-tested for maritime/GIS work
- **Custom Canvas timeline** — existing libraries are too heavy and opinionated for our needs
- **CSS Custom Properties for theming** — runtime theme switching that integrates naturally with VS Code's editor themes
- **Tree-shakeable exports** — import only what you need; unused components don't bloat your bundle
- **Storybook as a core practice** — not an afterthought, but central to how we develop and review components

### Why Storybook Matters

Here's something we're particularly excited about: Storybook isn't just for developers. It's how **anyone** can review and give feedback on our UI work.

Think about what this enables:

1. **Review without installing anything** — DSTL scientists can open a browser and see exactly how components look and behave. No Electron, no VS Code, no Python services to configure.

2. **Living documentation** — every prop, every edge case, every theme variant is demonstrated interactively. New contributors understand the API without reading source code.

3. **Cross-context validation** — we can show the same component in "Electron mode" and "VS Code mode" side by side. Spot inconsistencies before they reach users.

4. **Community engagement** — Constitution Article XII requires beta previews. A public Storybook at `debrief.github.io/debrief-future/components/` lets anyone try components and provide feedback via GitHub Discussions.

5. **Accessibility testing** — the a11y addon catches accessibility issues during development, critical for government/defence requirements.

## What We'd Love Feedback On

This is exactly the kind of foundational work where early input saves rework later. We'd particularly value thoughts on:

- **Component API design** — are the props intuitive? Anything missing for your use case?
- **Theming approach** — will CSS Custom Properties work for your integration context?
- **Timeline visualization** — what features matter most for your temporal analysis workflows?
- **Performance expectations** — is 500 features with 60fps pan/zoom sufficient for your datasets?

Once the Storybook is deployed, you'll be able to try components interactively and leave feedback on specific behaviors.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
