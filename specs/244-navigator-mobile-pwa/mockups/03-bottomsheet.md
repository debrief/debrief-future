# Mockup 03 — Bottom-sheet editor (US2, 375 × 812)

> Three editor variants drawn: Status dropdown, Score V·M·A steppers,
> Category dropdown. Plus the keyboard-up state (Category needs an
> autocomplete input that may show the on-screen keyboard).
>
> Drag-handle is the small pill at the top. Save / Cancel buttons are
> always at the top-right of the sheet header (large tap targets).

## Variant A — Status editor

```
┌──────────────────────────────────────────────────┐ ← 375 × 812 viewport
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  (card list dimmed — backdrop fades it)          │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  backdrop overlay
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  (rgba(0,0,0,0.4))
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ┌──────────────────────────────────────────┐  │
│  │              ▭▭▭▭▭▭▭▭                    │  │  drag handle (36×4)
│  ├──────────────────────────────────────────┤  │
│  │  Status — #244             Cancel │ Save │  │  header (44 px)
│  ├──────────────────────────────────────────┤  │
│  │                                          │  │
│  │   ○ proposed                             │  │
│  │   ○ approved                             │  │
│  │   ○ specified                            │  │
│  │   ● implementing       ←  current        │  │  (radio list, all 44px tall)
│  │   ○ complete                             │  │
│  │   ○ blocked                              │  │
│  │                                          │  │
│  │   (parked / rejected hidden — see desktop│  │
│  │    EDITABLE_STATUS_VALUES convention)    │  │
│  │                                          │  │
│  │              ─── home bar ───            │  │  safe-area inset
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Behaviour

- **Drag down past ~80 px** → close sheet (calls `requestCloseBottomSheet`,
  which surfaces FR-009 confirm if dirty).
- **Tap-outside backdrop** → same as drag-down.
- **ESC key** (Bluetooth keyboard) → same as drag-down.
- **Tap a radio** → updates `pendingValue`, sets `dirty=true`. Save button
  becomes active.
- **Tap Save** → calls `saveBottomSheet` → reducer.stageEdit → sheet closes.

## Variant B — Score (V · M · A) editor

> Open question 1 from mockup 01: do we render one sheet with all three
> axes, or one sheet per tap? Below shows the **unified** option (3-in-1).
> Reviewer picks during T033.

```
┌──────────────────────────────────────────────────┐
│  ░░░░░ (backdrop) ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ┌──────────────────────────────────────────┐  │
│  │              ▭▭▭▭▭▭▭▭                    │  │
│  ├──────────────────────────────────────────┤  │
│  │  Score — #244              Cancel │ Save │  │
│  ├──────────────────────────────────────────┤  │
│  │                                          │  │
│  │   Total: 11   ← live-updates as steppers │  │
│  │              change                      │  │
│  │                                          │  │
│  │   Value (V)         ─                    │  │
│  │   ┌──┐    ┌──┐    ┌──┐    ┌──┐    ┌──┐  │  │  steppers — 5 buttons
│  │   │ -│    │ 1│    │ 3│    │ 5│    │  │  │  │  ("absent", "1", "3", "5"
│  │   └──┘    └──┘    ●●●     └──┘           │  │   plus tap-anywhere-else
│  │                  current                 │  │   to select)
│  │                                          │  │
│  │   Media (M)         3                    │  │
│  │   ┌──┐    ┌──┐    ┌──┐    ┌──┐          │  │
│  │   │ -│    │ 1│    ●●●     │ 5│          │  │
│  │   └──┘    └──┘             └──┘          │  │
│  │                                          │  │
│  │   Autonomy (A)      3                    │  │
│  │   ┌──┐    ┌──┐    ┌──┐    ┌──┐          │  │
│  │   │ -│    │ 1│    ●●●     │ 5│          │  │
│  │   └──┘    └──┘             └──┘          │  │
│  │                                          │  │
│  │              ─── home bar ───            │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Alt: per-axis sheets** — the user taps the Total chip → menu pops up
("Edit Value / Edit Media / Edit Autonomy") → a small per-axis sheet
opens with one stepper. Two extra taps per edit. Rejected unless reviewer
prefers it.

## Variant C — Category editor (with keyboard up)

```
┌──────────────────────────────────────────────────┐
│  ░░░░░ (backdrop) ░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ┌──────────────────────────────────────────┐  │
│  │              ▭▭▭▭▭▭▭▭                    │  │
│  ├──────────────────────────────────────────┤  │
│  │  Category — #244           Cancel │ Save │  │
│  ├──────────────────────────────────────────┤  │
│  │                                          │  │
│  │   ┌──────────────────────────────────┐  │  │  free-text input with
│  │   │ Featu                          ╳ │  │  │  datalist autocomplete
│  │   └──────────────────────────────────┘  │  │
│  │                                          │  │
│  │   Suggestions:                           │  │
│  │   ▸ Feature                              │  │  list of existing
│  │   ▸ Feature (UI)                         │  │  categories filtered
│  │   ▸ Feature (Schema)                     │  │  by current input
│  │                                          │  │
│  ├──────────────────────────────────────────┤  │
│  │   q  w  e  r  t  y  u  i  o  p          │  │  iOS soft keyboard
│  │   a  s  d  f  g  h  j  k  l              │  │  (drawn for spatial
│  │   ⇧  z  x  c  v  b  n  m  ⌫              │  │   reference; not part
│  │   123     ⎵ space                ⏎       │  │   of our UI)
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Keyboard behaviour (FR per spec.md US2 AS3)

- The active input field stays visible above the keyboard.
- Sheet content scrolls if necessary so the input is never hidden.
- `visualViewport` API used to detect keyboard height (browsers vary).
- Sheet itself does NOT shrink to fit above keyboard — it scrolls.

### Tap targets

- Input field: 48 px tall (above the FR-008 floor).
- Each suggestion row: 44 px tall.
- Save / Cancel: 44 px tall.

## Open questions for reviewer

1. **Score editor**: unified V·M·A sheet (variant B) or per-axis sheets?
2. **Score "absent" affordance**: the `-` value shown as a separate stepper
   button, or as a "Clear" link below the steppers?
3. **Category suggestions**: show all existing categories on first focus,
   or only after the user types ≥ 1 character?
