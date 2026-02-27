# PROV Log Panel — Flip-Card Interaction Model

## Summary

Replaces the current alert-dialog parameter editing with a flip-card paradigm. Cards start in read-only mode; clicking a pencil icon triggers a CSS 3D flip to an edit face with rich, type-aware controls. Parameter changes trigger live replay with 300ms debounce.

This replaces the **Tune** button in the action bar entirely.

## Card Faces

### Front Face (Read-Only)

Displays content according to the existing view mode hierarchy:

| Mode | Content |
|------|---------|
| **Compact** | Tool name + feature name |
| **Normal** | + parameters (plain read-only text), before/after summary |
| **Detailed** | + attachments, source file ref, timestamp, duration, file-size |

- Tool version available on hover in all modes
- **Pencil icon** in card header area triggers flip to edit face
- Parameters are **not clickable** on the front face (no alert dialog)

### Back Face (Edit Mode)

Shows all front-face content **plus**:

- **Rich parameter controls** — type-aware, built from tool schema:
  - Enums → dropdown selects
  - Continuous numeric values → sliders (with min/max from schema)
  - Booleans → toggle switches
  - Text → text inputs
  - Fallback: text input for unrecognised types
- **Metadata section** — timestamp, duration, file-size, tool version, source file reference
- **Analyst rationale** — editable text field
- **Disable toggle** — switch to skip this step during replay (greys out card on front face)
- **Delete button** — removes entry from history (with confirmation)
- **Done button** — confirms and flips back to read-only

## Flip Behaviour

### Animation
- CSS 3D perspective transform around Y-axis
- Card height animates adaptively — grows only as much as needed for the specific tool's parameters
- Smooth transition (~400ms recommended, tune during prototyping)

### Constraints
- **Only one card flipped at a time** — flipping a second card auto-closes (Done) the first
- Flipping auto-closes without warning (parameter changes are applied live, so no unsaved state)

### Schema Loading
- Tool schema is **lazy-loaded on flip** (not pre-fetched)
- Edit face shows **spinner/skeleton** while schema loads
- Rich controls render in once schema arrives
- Schema can be cached after first access per tool type

## Live Replay

- Any parameter change (dropdown selection, slider drag, toggle) triggers tool re-execution
- **Debounce: 300ms** — rapid slider adjustments don't flood the replay engine
- Map updates live as parameters change
- If replay takes >500ms, show a subtle progress indicator on the card

## Action Bar Changes

The action bar loses **Tune** (replaced by card edit icon). Remaining actions:

1. **Revert to here** — truncate history at selected entry
2. **Revert this** — remove single entry and replay remaining
3. **Snapshot** — create pagination boundary
4. **Rationale** — add/edit annotation on selected entry (also accessible on edit face)

## Disable & Delete

### Disable
- Toggle switch on edit face only
- Disabling triggers replay without that step
- Front face shows greyed-out/struck-through appearance for disabled entries
- Disabled entries remain in history and can be re-enabled

### Delete
- Button on edit face only (requires deliberate flip — reduces accidental deletes)
- Confirmation dialog before execution
- Triggers replay of remaining entries after deletion

## Visual States

| State | Front Face Appearance |
|-------|----------------------|
| Normal | Standard card styling |
| Disabled | Greyed out, reduced opacity, struck-through tool name |
| Currently replaying | Subtle pulse or progress bar |
| Has rationale | Small annotation indicator icon |

## Storybook Stories

Interactive prototype for review/feedback:

- Flip card component showing read-only ↔ edit mode transition
- Live parameter panel showing current param values as JSON
- Slider/dropdown interactions with real-time value updates
- All three view modes (compact/normal/detailed) on front face
- Disabled state visual treatment
- Schema loading skeleton state

## Open Questions

1. **Flip direction** — flip left-to-right, or right-to-left? Or should it flip top-to-bottom since the panel is narrow and vertical?
2. **Schema caching** — how long to cache? Until tool registry changes, or time-based expiry?
3. **Undo parameter changes** — if the analyst changes a slider and doesn't like the result, is flipping back (Done) sufficient, or do they need an explicit "reset to original values" on the edit face?
4. **Keyboard accessibility** — should Enter on a focused card trigger flip? Tab navigation between parameters on edit face?
5. **Narrow panel width** — at ~20% screen width, do sliders have enough room to be usable? May need to consider vertical slider layout or a minimum panel width during edit mode.
