# Mockup 05 — Sticky Push-Changes bar (US4, 375 × 812)

> Three states: hidden (no dirty edits), visible-with-dirty-count, and
> error-red after a push conflict. Always sits above the home-bar safe
> area on iPhone X+; positioned via CSS `padding-bottom:
> env(safe-area-inset-bottom)` (R-8).

## State 1 — hidden (no dirty edits)

```
┌──────────────────────────────────────────────────┐ ← 375 × 812
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │ #244     [Feature]              [10] V·M·A   │ │  no ◍ — clean
│ │  …                                           │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ #243     [Tech Debt]            [ 6] V·M·A   │ │  clean
│ │  …                                           │ │
│ └──────────────────────────────────────────────┘ │
│  …                                               │
│                                                  │
│                                                  │
│              ─── home bar ───                    │  ← no push bar visible
└──────────────────────────────────────────────────┘  (FR-010)
```

**Key invariant (FR-010)**: when `dirtyRowIds.size === 0` the push bar is
absent from the layout — not just hidden via `visibility: hidden`, but
unmounted from the DOM. So scrolling space isn't "lost" to a permanent
phantom bar.

## State 2 — visible with dirty count

```
┌──────────────────────────────────────────────────┐
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │ #244  ◍   [Feature]            [10] V·M·A    │ │  ← ◍ dirty marker
│ │  …                                           │ │     (left-border accent
│ │  ⚑ implementing                              │ │      not drawn)
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ #243  ◍   [Tech Debt]          [ 6] V·M·A    │ │  ← also dirty
│ │  …                                           │ │
│ │  ⚑ specified                                 │ │
│ └──────────────────────────────────────────────┘ │
│  (cards below scroll independently)              │
│                                                  │
├══════════════════════════════════════════════════┤  ← always above home bar
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  push bar (dark)
│ ▓ 2 unsynced edits         ┌──────────┐       ▓ │  60 px tall + safe-area
│ ▓                          │   Push   │       ▓ │
│ ▓                          └──────────┘       ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│              ─── home bar ───                    │  ← env(safe-area-inset-bottom)
└──────────────────────────────────────────────────┘
```

### Layout details

- Push bar: `position: fixed; left: 0; right: 0; bottom: 0;`
- Total height (incl. safe-area): ~60 px content + ~34 px home-bar inset
  on iPhone X+.
- Dirty count is left-aligned, Push button right-aligned.
- Push button: `min-height: 44px`, brand-coloured (white background, dark
  text on dark bar).
- Cards have `padding-bottom: 96px` so the last card isn't occluded.
- The bar sits **below** the bottom-sheet z-index (R-7 / spec.md US4 AS1):
  open the bottom-sheet → bar is covered.

## State 3 — error after push conflict (HTTP 409)

```
├══════════════════════════════════════════════════┤
│ ████████████████████████████████████████████████ │  push bar (RED)
│ █  ⚠  Remote moved — pull and review            █│  conflict message
│ █     before retrying.            ┌──────────┐ █│
│ █                                 │  Retry   │ █│
│ █                                 └──────────┘ █│
│ ████████████████████████████████████████████████ │
│              ─── home bar ───                    │
└──────────────────────────────────────────────────┘
```

### Behaviour

- Same wording as desktop's conflict path (per spec.md US4 AS2 — "same
  conflict-detection semantics").
- Retry button refetches the remote then re-renders the diff for the user
  to confirm.
- The dirty count + Push button are replaced by the conflict message and
  Retry button — no need to surface both.
- Bar stays red until the user resolves (Retry succeeds, or they undo all
  edits).

## State 4 — transient success toast (after Push)

```
├══════════════════════════════════════════════════┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  push bar (GREEN)
│ ▓  ✓  Pushed 2 changes                         ▓ │  transient — hides
│ ▓                                               ▓ │  after ~2 seconds
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│              ─── home bar ───                    │
└──────────────────────────────────────────────────┘
```

After the success toast fades, dirtyRowIds is empty → bar hides per FR-010.

## Open questions

1. **Push button label**: "Push", "Push 2 changes", or "Push to GitHub"?
   Current draft uses just "Push" with the count alongside. Reviewer
   can pick longer/explicit wording.

2. **Dirty count format**: "2 unsynced edits" (sentence case), "2 EDITS"
   (caps), or just "(2)"? Current draft uses sentence case for clarity.

3. **Auto-hide success toast**: do we auto-hide after 2s, or require user
   tap to dismiss? Current draft = auto-hide.
