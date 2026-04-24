---
title: "Building Composite: 185-cql2-array-filter, 186-filter-chips, 187-build-time-enums, 188-nl-cql2-prompt, 189-stakeholder-demo-ui, 190-live-llm-transport"
date: 2026-04-13
layout: future-post
author: Ian
track: momentum
---

## What We're Building

Composite: 185-cql2-array-filter, 186-filter-chips, 187-build-time-enums, 188-nl-cql2-prompt, 189-stakeholder-demo-ui, 190-live-llm-transport

## How It Fits

This composite post groups specs that shipped within 4 days of each other and share the tag(s): (none).

## Key Decisions

## Members

- [185-cql2-array-filter](specs/185-cql2-array-filter) — 2026-04-13
- [186-filter-chips](specs/186-filter-chips) — 2026-04-16
- [187-build-time-enums](specs/187-build-time-enums) — 2026-04-14
- [188-nl-cql2-prompt](specs/188-nl-cql2-prompt) — 2026-04-16
- [189-stakeholder-demo-ui](specs/189-stakeholder-demo-ui) — 2026-04-16
- [190-live-llm-transport](specs/190-live-llm-transport) — 2026-04-17

## What Shipped

**185-cql2-array-filter** — ## What We Built

**186-filter-chips** — ## What We Built

#### Screenshots

![Empty filter bar](/assets/images/future-debrief/186-filter-chips/interaction-1-empty.png)
![Filter type dropdown showing Platform option](/assets/images/future-debrief/186-filter-chips/interaction-2-menu.png)
![Platform value editor with nationality and domain picked, Confirm enabled](/assets/images/future-debrief/186-filter-chips/interaction-3-editor.png)
![Confirmed platform chip in the filter bar, labelled Platform: DE · Subsurface](/assets/images/future-debrief/186-filter-chips/interaction-4-chip.png)
![Platform chip in the light theme](/assets/images/future-debrief/186-filter-chips/component-light.png)
![Platform chip in the dark theme](/assets/images/future-debrief/186-filter-chips/component-dark.png)
![Platform chip in the VS Code theme](/assets/images/future-debrief/186-filter-chips/component-vscode.png)

**187-build-time-enums** — ## What We Built

**188-nl-cql2-prompt** — ## What We Built

**189-stakeholder-demo-ui** — ## What We Built

#### Screenshots

![All 73 plots visible on load, empty chip bar, count reads "73 plots"](/assets/images/2026-04-16-nl-demo-ui/state-unfiltered.png)
![Animated walk-through: typing "uk submarines" produces nationality + vessel-class chips, the card grid filters, and clicking the × on the nationality chip broadens the result set](/assets/images/2026-04-16-nl-demo-ui/interaction.gif)
![Chips visible after "uk submarines", count reads "2 of 73 plots", card grid shows matching plots](/assets/images/2026-04-16-nl-demo-ui/state-filtered.png)
![Off-corpus banner with five clickable example phrases](/assets/images/2026-04-16-nl-demo-ui/state-off-corpus.png)
![Zero-match empty state: chips remain visible, the card grid is replaced with a helpful "No plots match — try rephrasing" card and a Clear all button](/assets/images/2026-04-16-nl-demo-ui/state-zero-match.png)

**190-live-llm-transport** — ## What We Built

#### Screenshots

![Transport-mode indicator showing "Live · Anthropic · claude-haiku-4-5-20251001" in the demo header](/assets/images/future-debrief/190-live-llm-transport/indicator-live.png)
![Demo header showing no live-mode indicator; subtitle reads "Demo: hand-authored corpus, no live LLM"](/assets/images/future-debrief/190-live-llm-transport/indicator-fixture.png)
![Banner reading "Live-mode call failed — Provider rejected the request — check credentials, then restart the proxy."](/assets/images/future-debrief/190-live-llm-transport/banner-auth-failure.png)
![Banner reading "Live-mode call failed — Provider rate limit hit — try again in a moment or use a different phrase."](/assets/images/future-debrief/190-live-llm-transport/banner-rate-limit.png)

## Lessons Learned

_Composite narrative — author may want to edit manually before publishing._

## What's Next

See each member spec's own follow-up notes; the composite is a snapshot.
