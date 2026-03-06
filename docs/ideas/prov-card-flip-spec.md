# Log Panel: Flip-Card Interaction Model

## Overview

Replaces the current alert-dialog parameter editing with a flip-card paradigm. Cards start in **read-only** mode; clicking the edit icon triggers a CSS 3D flip to an **edit** face with rich, type-aware controls. Parameter changes trigger live tool re-execution with debounced replay.

This replaces the **Tune** action bar button entirely.

## Card Faces

### Front Face (Read-Only)

Content varies by view mode (unchanged from existing spec):

| Mode | Content |
|------|---------|
| **Compact** | Tool name + feature name |
| **Normal** | + parameters as plain read-only text, before/after summary |
| **Detailed** | + attachments, source file ref, timestamp, duration, file-size |

- Parameters are **plain text only** — no click interaction on the front face
- **Pencil/edit icon** in the card header triggers the flip
- Tool version available on hover regardless of mode
- Disabled entries appear **greyed out** on the front face

### Back Face (Edit Mode)

Shows all content from the front face plus:

- **Rich parameter controls** (type-aware, see below)
- **Metadata block**: timestamp, duration, file-size, tool version, source file ref
- **Analyst rationale** field (editable text area)
- **Disable toggle** — switch to skip this step during replay; greys out the front face
- **Delete button** — removes entry from history (with confirmation)
- **Done button** — confirms and flips back to read-only

## Rich Parameter Controls

The UI queries the tool's schema on flip to determine parameter types, then renders appropriate controls:

| Parameter Type | Control |
|----------------|---------|
| Enum | Dropdown / select |
| Continuous numeric (bounded) | Slider with numeric readout |
| Continuous numeric (unbounded) | Numeric input with step buttons |
| Boolean | Toggle switch |
| String | Text input |
| Color | Color picker |

Changing any control triggers **live replay** — the tool is re-executed with updated parameters and the map updates immediately.

### Schema Loading

- Tool schema is **lazy-loaded** on flip (not pre-fetched)
- While loading: edit face shows a **spinner/skeleton** placeholder
- Controls render in once the schema arrives
- Schemas are cached after first access per session

### Replay Debouncing

- All parameter changes debounced at **300ms**
- Slider drags fire on every change event (debounced)
- Dropdown selections trigger immediately (single discrete change)
- If replay takes longer than ~200ms, show a subtle progress indicator on the card

## Flip Behaviour

### Animation
- **CSS 3D perspective transform** — card rotates around Y-axis
- Duration: ~400ms ease-in-out
- Card **grows adaptively** in height to fit the specific tool's parameters and metadata
- Height transition animates smoothly alongside the flip

### Constraints
- **Only one card** can be in edit mode at a time
- Flipping a second card **auto-closes** the first (Done is implicit)
- The flip is triggered only by the **pencil icon** — not by clicking the card body

### Exit
- **Done button** on the edit face flips back to read-only
- Auto-close when another card is flipped
- No click-outside-to-close (deliberate confirmation required)

## Action Bar Changes

The action bar loses Tune but retains four buttons:

| Action | Behaviour |
|--------|-----------|
| Revert to here | Truncate history at selected entry |
| Revert this | Remove selected entry, replay remaining |
| Snapshot | Create pagination boundary |
| Rationale | Flips the selected card and focuses the rationale field |

Note: Rationale in the action bar flips the card and auto-focuses the rationale field — single interaction path, no duplication.

## Disable & Delete

### Disable
- Toggle switch on the **edit face only**
- Disabling triggers replay without that step
- Front face renders the card **greyed out** with strikethrough on the tool name
- Disabled entries remain in the timeline and can be re-enabled

### Delete
- Delete button on the **edit face only** (requires deliberate flip)
- Confirmation dialog: "Delete this entry? This will replay all subsequent steps without it."
- Soft-delete: entry shown struck-through until next snapshot

## Resolved Design Decisions

1. **Slider range bounds** — tool schema defines min/max/step for continuous parameters. Schema is lazy-loaded on flip. If a parameter lacks bounds in the schema, fall back to a numeric text input.
2. **Replay trigger timing** — all parameter changes debounced at 300ms. Slider drags fire continuously (debounced). Dropdown selections trigger immediately.
3. **Schema loading** — lazy-load on flip, show spinner/skeleton while loading, cache after first access per session.
4. **Rationale sync** — rationale is editable on the flip face. The action bar Rationale button is a shortcut that flips the selected card and focuses the rationale field. Single source of truth — no duplication.

5. **Compound parameters** — top-level primitives get rich controls (sliders, dropdowns, toggles, color pickers). Complex nested structures (arrays, objects) fall back to a JSON editor.
6. **Undo during tuning** — Done commits the current parameter values by updating the existing PROV entry in place. The previous values are not separately recoverable (live replay means changes apply continuously; Done simply exits edit mode and persists).
7. **Disabled entry cascading** — if entry B depends on the output of entry A, and A is disabled, B is auto-disabled with a visual warning indicating the dependency.
