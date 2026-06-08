## Hook

| Before | After |
|---|---|
| Activity column truncates "Apply Symbol St…" in a fixed 25% rail | Tool names show in full; the rail widens on bigger screens, map keeps the majority |
| At 1280×720 the Properties panel sits below the fold with no hint it's there | Short windows auto-collapse the upper sections so Properties is reachable |
| The S/M/L thumbnail toggle does nothing on screen | Thumbnails actually resize, and the choice sticks between visits |
| Catalog preview row hides behind a bare minus glyph | A labelled collapse/restore control with a sensible default and remembered state |
| High-contrast light header links read faint and rely on colour alone | Header links route through a theme-aware token, underlined and weighted in high-contrast modes |

## What We're Building

This is follow-up work on the UI review we ran against the web-shell — the last two open P1 items and all four P2 items from the 2026-04-26 walk-through, re-checked on 2026-06-06. None of it is a new capability. It is the seams: the truncated tool name, the panel that hides below the fold at a common laptop resolution, the size toggle that quietly did nothing, the collapse control no one would guess was a control, and the high-contrast theme links that fell short of the WCAG AAA 7:1 bar and leaned on colour alone to signal "link".

These all live on the two surfaces a first-time visitor judges us by — the catalog and the analysis view — plus the accessibility themes, which matter to a UK Defence audience where accessibility is a procurement concern rather than a nicety. Each fix is small. Together they remove the small frictions that make a tool feel unfinished, and they do it without adding a single runtime dependency.

## How It Fits

The fixes split between `apps/web-shell` (header markup and CSS, the Playwright specs that produce our before/after screenshots) and four reusable surfaces in `shared/components` — the panel-workspace default layout, the activity panel, the STAC browser, and the exercise list. Because the shared-component changes sit below the frontend boundary, the VS Code host picks them up transparently: fix the component once, both hosts benefit. That is the "thin frontends over shared components" arrangement working as intended — the host orchestrates, the component carries the behaviour.

## Key Decisions

- **No new runtime dependencies.** Every one of the six is a surgical change to code we already own. A polish pass should not grow the dependency tree.
- **localStorage for preferences, not the writer abstraction.** Panel collapse state and thumbnail size are UI-preference state, local to a browser — not domain data — so they sit outside the writer-abstraction rule and persist via localStorage.
- **Version the saved layout so it can't render broken.** The responsive default split replaces a fixed 25/75 layout, so a `LAYOUT_VERSION` bump invalidates any legacy saved layout rather than letting it restore into a broken render. No silent failure — that is Article I.
- **Evidence-first, through the test suite.** The web-shell Playwright suite is the producer of the before/after screenshots, at multiple viewports and themes. Fixing the flaky `properties-screenshots` suite (P1.4) is part of the same job — a gate that fails ~2-in-13 on first attempt hides real regressions, so we add an actionability check before the row click instead of clicking and hoping.
