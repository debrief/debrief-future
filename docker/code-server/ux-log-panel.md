# Log Panel — UX Specification

**Version:** 0.1 Draft
**Date:** 2026-02-08
**Status:** For review
**Related:** [Provenance & Undo SRD](srd-prov-undo.md)

---

## 1. Overview

The Log Panel is the analyst's interface for viewing, navigating, and acting on the provenance history of a plot. It supports three use cases, all infrequent:

- **Audit** — A supervisor reviews the steps taken to produce the current plot (read-only browsing)
- **Revert** — An analyst regrets a line of inquiry and wants to return to a previous comfortable state
- **Tune** — Something doesn't look right in a TMA reconstruction; the analyst adjusts parameters and watches the track update

---

## 2. Placement

The Log Panel lives on its **own Activity Panel** in the VS Code sidebar, with a dedicated icon in the Activity Bar.

### Rationale

The analyst's normal working layout uses the Debrief Activity Panel (Time Controller, Layers, Tools) in the left sidebar (~20% width), the map in the centre, and often a performance chart in the bottom panel. During the most interactive Log use case (tuning TMA), the analyst needs:

```
┌──────────┬───────────────────────────────┐
│          │                               │
│   Log    │          Map                  │
│  Panel   │                               │
│          │                               │
│          │                               │
│          ├───────────────────────────────┤
│          │  Performance Chart (bottom)   │
└──────────┴───────────────────────────────┘
```

A separate activity panel means:

- Clicking the Log icon replaces the Debrief panel — acceptable since Layers aren't needed during tuning
- The map remains fully visible for judging track shape changes
- The bottom panel remains available for performance measures
- Clicking back to the Debrief icon restores the normal working layout
- No permanent clutter added to the heavily-used Debrief panel

---

## 3. Panel Layout

```
┌─────────────────────────────────┐
│  Action Bar                     │
│  [Revert to] [Revert this]     │
│  [Tune] [Snapshot] [Rationale] │
│  [🔍 Search] [Timeline|Feature]│
│  [Compact|Normal|Detailed]     │
├─────────────────────────────────┤
│  ┌─ Filter Row (collapsible) ──┐│
│  │ [text search] [tool ▼]      ││
│  │ [category ▼] [feature ▼]   ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│                                 │
│  Entry list                     │
│  (most recent at top)           │
│                                 │
│  ...                            │
│                                 │
│  ── Snapshot boundary ──        │
│  [Show earlier history]         │
│                                 │
└─────────────────────────────────┘
```

### Action Bar

All actions operate on the currently selected entry. Buttons are enabled/disabled based on what is selected.

| Action | Behaviour |
|--------|-----------|
| Revert to here | Two-step: greyed entries + live map preview → Cancel/Escape to abort, confirm to permanently truncate |
| Revert this | Soft-delete: entry shown struck-through, replay runs immediately, restorable |
| Tune | Auto-expands entry, parameters become editable, map updates live on change |
| Snapshot | Creates a pagination boundary; pre-snapshot entries removed from view |
| Rationale | Inline text field appears on the selected entry for annotation |

### Search & Filter

A search icon in the action bar toggles a collapsible filter row with four mechanisms:

- **Free text search** — matches against rationale text and tool name
- **Filter by tool name** — dropdown or chips
- **Filter by tool category** — dropdown or chips
- **Filter by feature name** — dropdown or chips

No date range filter. Temporal orientation is handled by the adaptive recency display (see §5).

### View Toggle

A toggle button switches between two views:

- **Timeline** (default) — flat chronological list, most recent at top
- **By Feature** — first grouped by feature type (Tracks, Contacts, etc.), then individual features within each type sorted by most recently edited first, each with a flat entry list

### Presentation Mode

A three-way selector: **Compact | Normal | Detailed**. The analyst's choice is persisted across sessions.

---

## 4. Entry Display

### Metadata Tiers

| Mode | Content Shown |
|------|---------------|
| **Compact** | Tool name, feature name |
| **Normal** | + parameters used, before/after summary of change |
| **Detailed** | + attachment count (hover to list), source file reference, timestamp, execution duration, file-size of change |

Tool version is available on hover in all modes.

### Entry Interactions

- **Select** — highlights the entry; highlights affected feature(s) on the map
- **Expand** (in Tune mode) — parameters become editable inline; map updates live as values change
- **Rationale** — inline text field appears for adding/editing annotation

### Soft-Deleted Entries

Entries removed via "Revert this" are displayed with struck-through text. They remain visible and can be restored.

### Revert-to-here Preview

Entries beyond the revert point are greyed out. The map simultaneously previews the post-truncation state. The analyst can:

- **Confirm** — permanently removes the greyed entries
- **Cancel** (button or Escape) — restores all entries and the map

---

## 5. Adaptive Recency Highlighting (MAY)

Recent entries are displayed with bolder/darker text, progressively fading for older entries. The recency window adapts to edit frequency:

- If the analyst makes a few edits per day, "today's" entries appear prominent
- If edits are frequent (several per hour), "the last hour's" entries appear prominent

The algorithm inspects entry timestamps to determine the adaptive boundary. This visual treatment works across all three presentation modes and both VS Code light/dark themes, since it is based on relative text weight/opacity rather than colour.

This feature is a MAY — desirable but not required for the tracer bullet.

---

## 6. Snapshot Boundaries

Snapshots create pagination boundaries in the Log. When a snapshot exists:

- Only entries since the most recent snapshot are shown
- A **"Show earlier history"** link appears at the bottom of the entry list (below the snapshot boundary)
- Clicking it loads entries from the previous snapshot era

The snapshot boundary is displayed as a visual separator in the timeline.

Execution duration and file-size metadata on entries may help the analyst decide when to take a snapshot, as these indicate growing plot complexity.

---

## 7. Replay Feedback

When replay occurs (during tuning, soft-delete, or revert preview), a subtle pulsing/spinning icon appears inline on the entry currently being replayed. This provides progress feedback without obscuring the map or Log content.

For tuning, parameter changes trigger replay with appropriate debouncing to prevent excessive replays during rapid adjustments.

---

## 8. Interaction Summary

```
                  ┌──────────────┐
                  │ Select Entry │
                  └──────┬───────┘
                         │
              ┌──────────┼──────────┐──────────┐──────────┐
              ▼          ▼          ▼          ▼          ▼
        ┌───────┐  ┌──────────┐ ┌──────┐ ┌────────┐ ┌─────────┐
        │ Tune  │  │Revert to │ │Revert│ │Snapshot│ │Rationale│
        └───┬───┘  │  here    │ │ this │ └───┬────┘ └────┬────┘
            │      └────┬─────┘ └──┬───┘     │          │
            ▼           ▼          ▼         ▼          ▼
       Entry         Entries     Entry    Boundary   Inline
       expands,      grey out,   struck-  inserted,  text
       params        map         through, older      field
       editable      previews    replay   entries    appears
            │        result      runs     hidden
            │           │       immediately
            ▼           │
        Map updates     ├── Cancel/Esc ──▶ Restore all
        live on         │
        each change     └── Confirm ─────▶ Permanent
                                           truncation
```

---

## 9. Open Questions

1. **Debounce timing for live tuning** — what delay feels responsive without excessive replay? Needs prototyping.
2. **Maximum history depth before performance degrades** — how many entries can the Log panel handle before we need virtualised scrolling?
3. **Snapshot naming** — should snapshots have analyst-provided labels, or are timestamps sufficient?
4. **Keyboard shortcuts** — should Tune, Revert, Snapshot have keyboard bindings?
5. **Restore soft-deleted entries** — what's the interaction? Click the struck-through entry and use an action bar "Restore" button?
