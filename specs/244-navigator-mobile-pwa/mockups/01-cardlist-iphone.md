# Mockup 01 — iPhone card-list (US1, 375 × 812)

> Low-fidelity ASCII. Spacing/typography/colour are deferred to real CSS in
> Phase 3. What's locked here: information hierarchy, tap-target placement,
> what info appears on the card surface vs. inside an editor.

## Default state — five rows visible above the fold

```
┌──────────────────────────────────────────────────┐ ← 375px wide
│  ☰  Backlog Navigator              👤  ⚙        │  app chrome (44px)
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │  search input (48px)
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │  filter row (44px)
├══════════════════════════════════════════════════┤  (visible bottom of fold ↓)
│ ┌──────────────────────────────────────────────┐ │
│ │ #244  ◍   [Feature]              [10] V·M·A   │ │  ← card row 1
│ │  Backlog Navigator — full mobile parity      │ │     (one row per card,
│ │  (PWA). Extend the desktop nav so every       │ │      truncates after
│ │  workflow that works on desktop also works…   │ │      ~3 lines)
│ │  ──────────────────────────────────────────  │ │
│ │  ⚑ implementing   E03   updated 2026-05-03  │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ #243  ◍   [Tech Debt]            [ 6] V·M·A   │ │  ← card row 2
│ │  Per-scene asset key contract formalisation   │ │
│ │  ──────────────────────────────────────────  │ │
│ │  ⚑ approved        —   updated 2026-05-02   │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ #~~242~~ ◍ [Tech Debt]           [ 5] V·M·A   │ │  ← row 3, complete
│ │  ~~Migrate saveSession.ts thumbnail writes~~ │ │     (strikethrough)
│ │  ──────────────────────────────────────────  │ │
│ │  ⚑ complete        E02  updated 2026-05-02   │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ #241  ◍   [Feature]              [ 9] V·M·A   │ │
│ │  STAC best-practices upgrade — bump to       │ │
│ │  ──────────────────────────────────────────  │ │
│ │  ⚑ complete        E04  updated 2026-05-02   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│   (scroll for more — virtualised, ~230 rows)     │
└──────────────────────────────────────────────────┘
```

### Card surface — tap-targets

Each card has these tap targets, all ≥ 44 × 44 CSS pixels (FR-008):

```
┌──────────────────────────────────────────────┐
│ #244  ◍   [Feature]              [10] V·M·A  │
│   ↑                ↑              ↑          │
│   tap = open ID    tap = open     tap = open │
│   (rare; skip      Category       Score
│   editor for now)  bottom sheet   bottom sheet
│                                              │
│  Backlog Navigator…                          │
│   ↑                                          │
│   tap = open Description full-screen editor  │
│                                              │
│  ⚑ implementing   E03   updated 2026-05-03  │
│   ↑               ↑                          │
│   tap = open      tap = open                 │
│   Status sheet    Epic sheet                 │
└──────────────────────────────────────────────┘
```

### Visual conventions

- **`◍` icon**: dirty marker — appears next to the ID when this row has
  unsynced edits. Card also gets a subtle left-border accent.
- **`⚑`** before status text: just a status glyph, no semantic meaning beyond
  visual scan.
- **`[10]` then `V·M·A`**: the post-#243 score chip — Total primary, axes
  shown smaller. On phone we render Total in a bigger pill, then the axes as
  small subscript text. Tapping the pill opens score editors for all three
  axes (one bottom-sheet per axis tap, or the sheet contains all three?
  **Open question — see REVIEW-OUTCOMES.md candidate questions**).
- **Strikethrough on `complete`**: applies to ID + Description as in the
  desktop convention (FR-004). The Status chip itself stays legible.

## Empty-filter state

```
┌──────────────────────────────────────────────────┐
│  🔍  zzz                                      ╳  │  user typed nonsense
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │
├══════════════════════════════════════════════════┤
│                                                  │
│                                                  │
│              (nothing matches)                   │
│                                                  │
│         No items match your filter.              │
│           [Reset filter]                         │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Loading-skeleton state (parser hydrating)

```
┌──────────────────────────────────────────────────┐
│  ☰  Backlog Navigator              👤  ⚙        │
├──────────────────────────────────────────────────┤
│  🔍  Search backlog…                          ╳  │  ← search disabled
├──────────────────────────────────────────────────┤
│  Phase: ▾ Active     ☐ Include completed         │  ← filters disabled
├══════════════════════════════════════════════════┤
│ ┌──────────────────────────────────────────────┐ │
│ │ ▒▒▒  ▒▒▒▒▒▒▒▒▒                    ▒▒  ▒▒▒  │ │  shimmer rows
│ │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒    │ │  (4–6 of these
│ │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                      │ │   while parser
│ │  ──────────────────────────────────────────  │ │   hydrates)
│ │  ▒▒▒▒▒▒▒▒  ▒▒▒  ▒▒▒▒▒▒▒▒▒▒▒                 │ │
│ └──────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────┐ │
│ │ ▒▒▒  ▒▒▒▒▒▒▒▒▒                    ▒▒  ▒▒▒  │ │
│ │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           │ │
│ │  ──────────────────────────────────────────  │ │
│ │  ▒▒▒▒▒▒▒▒  ▒▒▒  ▒▒▒▒▒▒▒▒▒▒▒                 │ │
│ └──────────────────────────────────────────────┘ │
│  …                                               │
└──────────────────────────────────────────────────┘
```

## Open questions for the reviewer

1. **Score editor surface** — does tapping the `[10]` Total pill open a
   single sheet with V/M/A steppers (3 fields in one sheet), or three
   separate sheets (tap Total → menu → V or M or A)? Plan currently
   assumes one sheet per axis (per spec.md US2 AS1 wording "number stepper
   for V/M/A axes"); a unified sheet is fewer taps.

2. **Live status column** — if a row has a `Live status` value
   (e.g. "live preview at <url>"), do we show that *under* the meta line
   ("⚑ implementing  E03  updated 2026-05-03"), or as a separate chip
   above? Current draft assumes "below the meta line as small italic text"
   but it's not drawn here for clarity.

3. **Touched indicator** — desktop shows a "Touched" badge for rows
   touched by an in-flight branch / PR. Where does that go on a card?
   Suggestion: small chip below the meta line. Not drawn here.

4. **Header height** — 44 px top app chrome is the minimum for the menu
   button. iOS has the system status bar above that (~44 px more on
   iPhone X). With our `viewport-fit=cover`, that's `env(safe-area-inset-top)`
   added on top. Total: ~88 px before the search field starts.
