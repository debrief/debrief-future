---
layout: future-post
title: "Planning: Loader Mini-App"
date: 2026-01-11
track: "Planning · This Week"
author: Ian
reading_time: 3
tags: [tracer-bullet, loader, electron, stac]
excerpt: "Building a desktop app to bridge file selection and STAC storage"
---

## What We're Building

The Loader Mini-App is the first user-facing touchpoint in Future Debrief. It's a lightweight desktop application that answers a simple question: "I have a REP file — where do I want to put it?"

Right-click a REP file, select "Open with Debrief Loader", and a wizard guides you through selecting a destination STAC store and plot. Behind the scenes, the app orchestrates three services: debrief-config tells it what stores you have, debrief-io parses your file, and debrief-stac writes everything with full provenance. The source file gets copied to assets, a provenance record links it all together, and you're ready to analyse.

## How It Fits

This is Stage 4 of our tracer bullet — the first point where all the foundational pieces come together in a real application. We've built the schemas (Stage 0), the STAC catalog service (Stage 1), the REP parser (Stage 2), and the configuration layer (Stage 3). The Loader is where a user finally *does* something with all that infrastructure.

It's deliberately minimal. No map, no analysis, no fancy visualisations — just load data reliably. The VS Code extension (Stage 6) will handle the rest.

## Key Decisions

- **Two-step wizard**: Store selection first, then plot configuration. We considered single-screen layouts but found the branching logic (new plot vs. existing) cleaner in separate steps.

- **Tabbed second step**: "Add to Existing" and "Create New" as tabs rather than radio buttons. Each mode has different UI needs (plot list vs. name/description form).

- **Python services via stdio**: The Electron app spawns Python processes and communicates via JSON-RPC over stdin/stdout. No local HTTP server, no sockets — just simple, debuggable pipes.

- **react-i18next for i18n**: We're setting up string externalisation from day one. NATO interoperability demands multilingual support, and retrofitting i18n is painful.

- **Storybook for beta preview**: Before we ship the full app, we'll deploy UI components to GitHub Pages so stakeholders can kick the tyres.

## What We'd Love Feedback On

1. **Wizard flow**: Does store-first make sense? Or would you prefer to decide new-vs-existing first, then pick a store?

2. **Information display**: We're showing store name + path + plot count for stores, and plot name + created date + feature count for plots. Is that enough? Too much?

3. **Error experience**: When parsing fails or storage is inaccessible, how much detail should we show? Line numbers? Stack traces? Or just "something went wrong, here's what to try"?

4. **Missing capability**: Is there anything about loading a file that we haven't thought of?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
