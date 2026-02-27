---
layout: future-post
title: "Planning: Log Panel Flip-Card Interaction"
date: 2026-02-27
track: [momentum]
author: Ian
reading_time: 6
tags: [tracer-bullet, prov-logging, log-panel, ui-interaction]
excerpt: "Each provenance card gets an edit face — flip it, tweak the parameters, watch the map update."
---

## What We're Building

The Log Panel (#072) shows every operation performed on a plot — imports, calculations, property edits — as a timeline of provenance cards. When an analyst wants to adjust a parameter from a past calculation, the current workflow opens a separate Tune dialog. That dialog works, but it breaks context. You leave the timeline, edit a value in isolation, confirm, and then mentally reconnect with where you were.

We're replacing that with a flip-card interaction. Each card in the Log Panel gets a pencil icon in its header. Click it, and the card performs a CSS 3D flip to reveal an editable back face. That back face shows type-aware parameter controls — sliders for bounded numerics, dropdowns for enums, toggles for booleans, colour pickers for named colours, a JSON editor fallback for complex nested structures. Drag a slider, and the tool re-executes with the new value. The map updates. No dialog, no context switch.

The edit face also surfaces things the front face doesn't have room for: the full metadata block (timestamp, duration, file size, tool version, source file reference), an editable rationale text field for analyst notes, a disable toggle that replays the timeline without that step, and a delete button behind a confirmation prompt. Click Done and the card flips back to read-only.

The controls on the back face are schema-driven. When a card flips for the first time, the webview requests the tool's parameter schema from the extension via the existing message channel. The extension queries the MCP tool registry and returns types, bounds, and constraints. A loading skeleton shows while the schema arrives. Once fetched, the schema is cached for the session — flip a second card from the same tool and controls render immediately.

## How It Fits

This is the interaction layer for the PROV Logging sequence. The schema foundation (#070) defined the data model. The recording service (#071) captures operations. The Log Panel (#072) displays the timeline. Snapshots (#074) checkpoint the chain. The replay engine (#076) re-executes operations when parameters change. The flip-card brings all of those capabilities to a single surface — the card itself — instead of scattering them across dialogs and action bar buttons.

Two things change on the action bar. The Tune button goes away — it's replaced by the pencil icon on each card. And a Rationale button is added as a shortcut: it flips the selected card and focuses the rationale text field directly. The action bar keeps four buttons total: Revert to Here, Revert This, Snapshot, and Rationale.

On the schema side, the LinkML `log-entry.yaml` gains two new fields: `disabled` (boolean, defaults to `false`) and `rationale` (string, defaults to `null`). Both are non-breaking additive changes. Existing provenance entries without these fields work unchanged.

## Key Decisions

- **CSS 3D perspective transform, no JS animation libraries.** The flip uses `transform: rotateY(180deg)` with `backface-visibility: hidden` on both faces. The codebase already uses CSS transitions throughout. Adding Framer Motion or GSAP for one animation would violate Constitution IX (minimal dependencies) and be inconsistent with everything else. The card container also animates `max-height` alongside the rotation so the card can smoothly grow when the edit face needs more vertical space — a pattern the codebase doesn't have yet, but one that stays within CSS.

- **Lazy-loaded tool schemas via webview-extension messaging.** Pre-fetching all schemas when the panel opens would add overhead the analyst might never need. Instead, the first flip triggers a `schema:request` message to the extension, which looks up the tool in the MCP registry. The response is cached in a `Map<string, ToolParameterSchema>` within the webview React state. Subsequent flips for the same tool type skip the round-trip entirely.

- **Reuse ParameterEditor with extensions.** The existing `ParameterEditor` component already maps types to controls — numeric input, dropdown, toggle, text. We're extending it with three new control types: a slider with numeric readout for bounded values (the schema provides min, max, step), a colour picker for `NamedColor` parameters, and a JSON editor for complex nested structures. The main behavioural change is removing the commit/cancel button pair and switching to live debounced replay.

- **300ms debounce for continuous inputs, immediate for discrete.** Slider drags and text inputs are debounced so rapid adjustments produce a single replay. Dropdown selections and toggle switches fire immediately — the analyst made a deliberate choice, no point waiting. If a replay is already running when a new value arrives, the current replay is cancelled via AbortController and restarted with the latest value.

- **Single-card edit constraint.** Only one card can be in edit mode at a time. Flipping a second card auto-closes the first (implicit Done). This prevents conflicting replays and keeps it clear which card the analyst is working on. The state is a simple `editingActivityId: string | null` in React local state — no Zustand needed for what is purely UI-local.

- **Disable is not delete.** Disable toggles an entry off during replay — the card goes grey with a strikethrough, but it stays in the timeline and can be re-enabled at any point. Delete is a soft-remove behind a confirmation prompt — the entry shows struck-through until the next snapshot. Both affect downstream entries: disabling or deleting entry A auto-disables any entry whose `used[]` references something in A's `generated[]`, with a visual warning on each affected card.

## What We'd Love Feedback On

- **Flip trigger discoverability.** The pencil icon is the only way to flip a card — clicking the card body does nothing. Is that discoverable enough, or should there be a secondary affordance like a hover hint or a double-click?

- **Debounce interval.** We've set 300ms for continuous inputs based on the feel of interactive tuning. If you've worked with parameter exploration interfaces, does that feel responsive or sluggish for something like adjusting a detection threshold while watching the map?

- **Disable vs. delete distinction.** Disable skips an entry during replay but keeps it visible (greyed out, recoverable). Delete soft-removes it (struck-through until the next snapshot). Is that distinction clear from the visual treatment alone, or does it need explicit labelling?

- **Dependency cascade on disable.** When disabling entry A, any entry that uses A's output gets auto-disabled with a warning badge. Should the analyst confirm the cascade before it happens, or is auto-disable with visual indicators sufficient?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
