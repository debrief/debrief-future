---
layout: future-post
title: "Planning: Log Panel Flip-Card Interaction"
date: 2026-02-27
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, prov-logging, log-panel, ui-interaction]
excerpt: "Each provenance card gets an edit face — flip it, tweak the parameters, watch the map update."
---

## What We're Building

The Log Panel (#072) shows every operation performed on a plot — imports, calculations, property edits. When an analyst wants to adjust a parameter from a past calculation, the current workflow opens a separate Tune dialog. That dialog works, but it breaks context. You leave the timeline, edit a value in isolation, confirm, and then mentally reconnect with where you were.

We're replacing that with a flip-card interaction. Each card in the Log Panel gets a pencil icon. Click it, and the card performs a CSS 3D flip to reveal an editable back face. That back face shows type-aware parameter controls — sliders for bounded numerics, dropdowns for enums, toggles for booleans, colour pickers for named colours. Drag a slider, and the tool re-executes with the new value. The map updates. No dialog, no context switch.

The edit face also surfaces things the front face doesn't have room for: the full metadata block (timestamp, duration, file size, tool version), a rationale text field for analyst notes, a disable toggle that replays the timeline without that step, and a delete button behind a confirmation prompt. Click Done and the card flips back to read-only.

## How It Fits

This is the interaction layer for the PROV Logging sequence. The schema foundation (#070) defined the data model. The recording service (#071) captures operations. The Log Panel (#072) displays the timeline. Snapshots (#074) checkpoint the chain. The replay engine (#076) re-executes operations when parameters change. The flip-card brings all of those capabilities to a single surface — the card itself — instead of scattering them across dialogs and action bar buttons.

The Tune button on the action bar goes away. It's replaced by the pencil icon on each card. The action bar keeps four buttons: Revert to Here, Revert This, Snapshot, and Rationale. The Rationale button is a shortcut — it flips the selected card and focuses the rationale text field directly.

## Key Decisions

- **CSS 3D perspective transform, no JS animation libraries**: The flip uses `transform: rotateY(180deg)` with `backface-visibility: hidden`. The codebase already uses CSS transitions throughout. Adding Framer Motion or GSAP for one animation would violate Constitution IX (minimal dependencies) and be inconsistent with everything else.

- **Lazy-loaded tool schemas**: When a card flips for the first time, the webview requests the tool's schema from the extension via the existing message channel. The extension queries the MCP tool registry and returns parameter types, bounds, and constraints. A loading skeleton shows while the schema loads. Once fetched, the schema is cached for the session — flip a second card from the same tool and controls render immediately.

- **Reuse ParameterEditor with extensions**: The existing `ParameterEditor` component already maps types to controls (numeric input, dropdown, toggle, text). We're extending it with three new control types: a slider with numeric readout for bounded values, a colour picker for named colours, and a JSON editor fallback for complex nested parameters. The main change is removing the commit/cancel button pair and switching to live debounced replay.

- **300ms debounce for continuous inputs, immediate for discrete**: Slider drags and text inputs are debounced so rapid adjustments produce a single replay. Dropdown selections and toggle switches trigger immediately — the analyst made a deliberate choice, no point waiting. If a replay is already running when a new value arrives, the current replay is cancelled and restarted with the latest value.

- **Single-card edit constraint**: Only one card can be in edit mode at a time. Flipping a second card auto-closes the first (implicit Done). This prevents conflicting replays and keeps it clear which card the analyst is working on. The state is simple React `useState` — no Zustand needed for what is purely UI-local state.

- **Two new schema fields**: The LinkML schema gains `disabled` (boolean, defaults to `false`) and `rationale` (string, defaults to `null`) on `LogEntry`. Both are non-breaking additive changes. The replay engine already skips `deleted` entries — adding `disabled` to that skip list is straightforward.

## What We'd Love Feedback On

- **Flip trigger**: The pencil icon is the only way to flip a card — clicking the card body does nothing. Is that discoverable enough, or should there be a secondary affordance?

- **Debounce interval**: We've set 300ms for continuous inputs based on the feel of interactive tuning. If you've worked with parameter exploration interfaces, does that feel responsive or sluggish?

- **Disable vs. delete distinction**: Disable skips an entry during replay but keeps it visible (greyed out, recoverable). Delete soft-removes it (struck-through until the next snapshot). Is that distinction clear from the visual treatment alone, or does it need explicit labelling?

- **Dependency cascade on disable**: When disabling entry A, any entry that uses A's output gets auto-disabled with a warning. Should the analyst confirm the cascade before it happens, or is auto-disable with visual indicators sufficient?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
