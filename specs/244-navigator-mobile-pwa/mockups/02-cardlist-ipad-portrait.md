# Mockup 02 — iPad-portrait card-list (US1, 768 × 1024)

> Per spec edge case: tablets in portrait still render the **mobile** card
> list (768 < 1024). The question for this mockup is whether to keep the
> one-card-per-row layout (more whitespace, comfier on tablet) or flow to
> a 2-column grid (more density, fewer scrolls).
>
> Both options are drawn below — the reviewer picks one for Phase 3.

## Option A — one card per row (consistent with iPhone)

```
┌──────────────────────────────────────────────────────────────────────────┐ ← 768px
│  ☰  Backlog Navigator                                       👤  ⚙        │
├──────────────────────────────────────────────────────────────────────────┤
│  🔍  Search backlog…                                                   ╳  │
├──────────────────────────────────────────────────────────────────────────┤
│  Phase: ▾ Active            ☐ Include completed                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ #244  ◍   [Feature]                                  [10] V·M·A      │ │
│ │  Backlog Navigator — full mobile parity (PWA). Extend the desktop    │ │
│ │  Backlog Navigator (#242) so every workflow that works on desktop    │ │
│ │  also works on phone and tablet…                                     │ │
│ │  ─────────────────────────────────────────────────────────────────   │ │
│ │  ⚑ implementing            E03            updated 2026-05-03         │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ #243  ◍   [Tech Debt]                                [ 6] V·M·A      │ │
│ │  Per-scene asset key contract formalisation — once Storyboarding…   │ │
│ │  ─────────────────────────────────────────────────────────────────   │ │
│ │  ⚑ approved                 —             updated 2026-05-02         │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│  …                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Pros**: zero visual code change from iPhone; every card has full width for
long descriptions (avg description length is 200–600 chars).

**Cons**: requires more scrolling; on a tablet held in portrait the user can
see ~6–8 cards above the fold vs. ~3–4 in option B.

## Option B — 2-column grid above 600 px-ish

```
┌──────────────────────────────────────────────────────────────────────────┐ ← 768px
│  ☰  Backlog Navigator                                       👤  ⚙        │
├──────────────────────────────────────────────────────────────────────────┤
│  🔍  Search backlog…                                                   ╳  │
├──────────────────────────────────────────────────────────────────────────┤
│  Phase: ▾ Active            ☐ Include completed                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ #244  ◍ [Feature]    [10] V·M·A │ │ #243  ◍ [Tech Debt]  [ 6] V·M·A │ │
│ │  Backlog Navigator — full       │ │  Per-scene asset key contract   │ │
│ │  mobile parity (PWA)…           │ │  formalisation — once…          │ │
│ │  ─────────────────────────────  │ │  ─────────────────────────────  │ │
│ │  ⚑ implementing  E03            │ │  ⚑ approved        —            │ │
│ │      updated 2026-05-03         │ │      updated 2026-05-02         │ │
│ └─────────────────────────────────┘ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ #~~242~~ ◍ [Tech Debt] [ 5]     │ │ #241  ◍ [Feature]    [ 9] V·M·A │ │
│ │  ~~Migrate saveSession.ts       │ │  STAC best-practices upgrade   │ │
│ │  thumbnail writes~~             │ │  bump to STAC 1.1…             │ │
│ │  ─────────────────────────────  │ │  ─────────────────────────────  │ │
│ │  ⚑ complete    E02              │ │  ⚑ complete       E04          │ │
│ │      updated 2026-05-02         │ │      updated 2026-05-02         │ │
│ └─────────────────────────────────┘ └─────────────────────────────────┘ │
│  …                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Pros**: fewer scrolls; better information density on the larger viewport.

**Cons**: descriptions truncate sooner (~80 chars vs. ~150 chars); cards
become uneven heights as descriptions vary; virtualisation has to handle
2-column layout (slightly more complex).

## Recommendation

**Option A** unless the reviewer disagrees. Reasoning:

- Spec.md A-2 says "single breakpoint at 1024px"; introducing a second
  breakpoint inside mobile mode goes against that assumption.
- Code complexity for the virtualiser stays simpler (one-column = fixed
  vertical metric).
- Long descriptions benefit from the wider single column.
- Density gain in option B is real (~30%) but isn't a critical UX win.

## Reviewer choice

- [ ] Option A — one card per row
- [ ] Option B — 2-column grid above 600 px viewport width
- [ ] Option C (specify): _________________________________________
