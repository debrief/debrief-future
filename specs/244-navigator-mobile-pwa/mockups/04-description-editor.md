# Mockup 04 — Full-screen Markdown editor (US3, 375 × 812)

> Why full-screen and not bottom-sheet: Description is the only free-text
> field, routinely 200–600 characters, with embedded Markdown links and
> escaped pipes. A bottom-sheet would be either a tiny editor or a sheet
> that's already 90% of the screen — full-screen is the standard mobile
> pattern (per spec.md US3 priority rationale).

## Default state — editor open with raw Markdown source

```
┌──────────────────────────────────────────────────┐ ← 375 × 812
│  Cancel             #244 — Description    Save  │  header (44 px)
├──────────────────────────────────────────────────┤
│  ┃                                              │
│  ┃  Backlog Navigator — full mobile parity      │
│  ┃  (PWA). Extend the desktop Backlog           │
│  ┃  Navigator (#242) so every workflow that     │
│  ┃  works on desktop also works on phone        │
│  ┃  and tablet. Card list (virtualised)         │
│  ┃  replaces the 12-column table below          │
│  ┃  1024px; tap-to-edit bottom sheets           │
│  ┃  replace inline cell editors; full-          │
│  ┃  screen Markdown editor for                  │
│  ┃  Description; sticky bottom Push-            │
│  ┃  Changes bar; PWA manifest + service         │
│  ┃  worker for "Add to Home Screen" +           │
│  ┃  offline shell; multi-viewport               │
│  ┃  Playwright + Lighthouse PWA gate.           │
│  ┃                                              │
│  ┃  Single responsive React app rather          │
│  ┃  than a sibling codebase — same parser       │
│  ┃  / state / push pipeline, only the           │
│  ┃  layout + editor containers differ.          │
│  ┃                                              │
│  ┃  Article IX: hand-roll the bottom-sheet      │
│  ┃  gesture if feasible (~80 lines), evaluate   │
│  ┃  `vaul` only if hand-roll proves brittle.    │
│  ┃                                              │
│  ┃  Reuses [@tanstack/react-virtual]            │
│  ┃  (already in the project for #094) for       │
│  ┃  card-list performance.                      │
│  ┃                                              │
│  ┃  Acceptance: \`375x812\` (iPhone), …         │  ← escaped backticks +
│  ┃                                              │     pipes preserved
│  ┃                                              │
│  ┃  (cursor here ▌)                             │
│  ┃                                              │
└──────────────────────────────────────────────────┘
                                                    (no soft keyboard yet
                                                     until user taps in)
```

### Visual conventions

- Header: thin (44 px), no system-style toolbar (we control everything).
- Cancel left, Save right, both 44 × 44 minimum tap targets.
- The textarea uses **monospace** font (`ui-monospace, SFMono-Regular, Menlo`)
  to make Markdown structure obvious.
- Soft column rule (`┃`) on the left is an indent marker, not a literal pipe.
- Edges flush with viewport — no inset padding, more vertical space for text.
- Whole screen scrolls vertically when text overflows (no fixed-height box).

## Dirty state — Save button enabled

```
┌──────────────────────────────────────────────────┐
│  Cancel    ◍   #244 — Description         Save  │  ← ◍ dirty marker;
├──────────────────────────────────────────────────┤    Save button now
│  ┃                                              │    primary-styled
│  ┃  Backlog Navigator — full mobile parity      │
│  ┃  (PWA). Extend the desktop Backlog           │
│  ┃  Navigator (#242) so every workflow…         │
│  ┃                                              │
│  ┃  …and now there's an extra paragraph the     │  ← user added this
│  ┃  user just added to demonstrate the          │
│  ┃  editor.▌                                    │  ← cursor
│  ┃                                              │
│  ┃                                              │
└──────────────────────────────────────────────────┘
```

## Discard-confirm modal (FR-009) — fires on Cancel with dirty edits

```
┌──────────────────────────────────────────────────┐
│  Cancel    ◍   #244 — Description         Save  │
├──────────────────────────────────────────────────┤
│  (description text behind, dimmed by backdrop)   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░ ┌─────────────────────────────────────┐ ░░  │
│  ░░ │  Discard your changes?              │ ░░  │
│  ░░ │                                     │ ░░  │
│  ░░ │  You have unsaved changes. What     │ ░░  │
│  ░░ │  would you like to do?              │ ░░  │
│  ░░ │                                     │ ░░  │
│  ░░ │  ┌───────────────────────────────┐  │ ░░  │
│  ░░ │  │            Save               │  │ ░░  │  primary action
│  ░░ │  └───────────────────────────────┘  │ ░░  │
│  ░░ │  ┌───────────────────────────────┐  │ ░░  │
│  ░░ │  │           Discard             │  │ ░░  │  destructive (red text)
│  ░░ │  └───────────────────────────────┘  │ ░░  │
│  ░░ │  ┌───────────────────────────────┐  │ ░░  │
│  ░░ │  │     Continue editing          │  │ ░░  │  no-op, returns to editor
│  ░░ │  └───────────────────────────────┘  │ ░░  │
│  ░░ └─────────────────────────────────────┘ ░░  │
└──────────────────────────────────────────────────┘
```

### Notes

- All three buttons are 44 px tall.
- Modal is centred vertically; padding 16 px on all sides.
- Dialog max-width 320 px so it never spans the full viewport.
- Tapping the backdrop does **NOT** dismiss — only an explicit button choice.
  This is deliberate — the dialog asks an explicit question, an accidental
  backdrop tap shouldn't drop the user's edits.
- ESC dismisses with the same effect as "Continue editing".

## Cross-mode rotation reuse

The same dialog appears when the layout mode crosses the breakpoint while
an editor is open with a dirty edit. In that case:
- Title becomes "Save your changes?"
- Body becomes "The layout is changing because the screen rotated. Save
  your edit before it's discarded?"
- Buttons are the same three.

Same component, same `data-testid=discard-confirm` — covered by the unit
test in T012 and the regression E2E in T051.

## Open questions

1. **Save vs. Save and close**: when the user taps Save, do we commit the
   edit and close, or commit and stay open? Current draft assumes
   **commit-and-close**; reviewer can override.

2. **Markdown preview tab**: out of scope for v1 (spec.md doesn't mention
   it). Worth flagging as a future enhancement after v1 ships.

3. **Word count or char count**: any value? Description has no length
   limit beyond what the table column can express in `BACKLOG.md`, but a
   "500 chars" indicator might help avoid blowing up the row.
