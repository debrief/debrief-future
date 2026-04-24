---
title: "Building Shared React Component Library for Maritime Analysis"
date: 2026-01-17
layout: future-post
author: Future Debrief
track: momentum
tags:
  - components
  - react
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

# Shipped: Shared React Component Library

We've completed the foundational component library for Future Debrief, delivering reusable React components for maritime tactical analysis visualization.

## What We Built

The `@debrief/components` package provides three core visualization components that work together seamlessly:

### MapView
A Leaflet-based map component that renders maritime track data with automatic bounds fitting, selection support, and theme-aware styling. Display a map with track features in just 5 lines of code:

```tsx
import { MapView } from '@debrief/components';
import trackData from './tracks.json';

function App() {
  return <MapView features={trackData} />;
}
```

### Timeline
A Canvas-rendered timeline showing when tracks and events occurred. Supports time range adjustment, feature highlighting, and synchronized selection with other components.

### FeatureList
A virtualized list component for displaying feature metadata. Built with `@tanstack/react-virtual` for smooth scrolling with thousands of features.

## Key Features

**Synchronized Selection**: Click a feature in any component and it highlights everywhere. The `useSelection` hook makes state management trivial:

```tsx
const selection = useSelection();
<MapView selectedIds={selection.selectedIds} onSelect={(id) => selection.toggle(id)} />
<FeatureList selectedIds={selection.selectedIds} onSelect={(id) => selection.toggle(id)} />
```

**Cross-Context Theming**: Components automatically adapt to their host environment with CSS Custom Properties. VS Code extensions get VS Code theming. Electron apps get native OS theming. Light, dark, and system-preference modes work out of the box.

**Type Safety**: Full TypeScript coverage with types derived from `@debrief/schemas`. No runtime type errors, excellent IDE support.

**Performance**:
- Bundle size under 100KB gzipped
- 60fps interactions verified
- Virtualized lists handle 10,000+ features smoothly

## By The Numbers

- **173 tests** passing across 9 test files
- **9 Storybook stories** documenting component states
- **6 user stories** completed
- **80 tasks** implemented

## Technical Stack

- React 18+ with TypeScript 5.x strict mode
- react-leaflet v5 for map rendering
- HTML5 Canvas for Timeline rendering
- @tanstack/react-virtual for list virtualization
- CSS Custom Properties for theming
- Vitest + Testing Library for testing
- Storybook 10.x for documentation

## What's Next

This component library becomes the foundation for:
- The VS Code extension's map and timeline views
- The Electron loader application
- Any future web-based interfaces

The components are designed to be extended - custom renderers, additional feature types, and organization-specific styling can all be added without modifying the core library.

## Try It

Browse the components in Storybook or install directly:

```bash
pnpm add @debrief/components
```

Import what you need:

```tsx
import { MapView, Timeline, FeatureList, ThemeProvider } from '@debrief/components';
import '@debrief/components/style.css';
```

The maritime analysis UI building blocks are ready.
