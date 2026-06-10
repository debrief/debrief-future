# Usage Example — How each fix manifests for an analyst

Six independent fixes from the 2026-04-26 UI review. Each is shown from the
analyst's point of view, with the evidence artefact that demonstrates it.

## P1.3 — Readable header links in high-contrast light

**Before**: In the high-contrast light theme the header links read faint and
relied on colour alone to say "link". (The first cut of this fix actually made
it worse — a dark content-area blue on the fixed dark title bar measured 1.22:1.)

**After**: Switch the web-shell to high-contrast light. The "Component
Storybook →", "VS Code Preview →" and "Edit Backlog →" links render in a bright
link colour (`#9CDCFE`, ≈8.6:1 on the `#3c3c3c` title bar) and are underlined and
bolder, so they're identifiable as links without relying on colour. A new header
link added to the same group inherits the treatment automatically.

→ `evidence/screenshots/header-hc-light.png` (plus `header-light/dark/high-contrast-dark.png` for no-regression)

## P1.4 — Reliable properties-screenshots run

**Before**: The suite failed on ~2 of 13 first attempts and passed on retry,
masking potential real regressions in the properties form.

**After**: The row-click is gated on the row being actionable
(`toBeVisible()` + `scrollIntoViewIfNeeded()`) before clicking, and the suite
runs at `retries: 0`. Ten consecutive runs pass on the first attempt every time.

→ `evidence/flake-proof.txt` (40/40 first-attempt passes)

## P2.1 — Analysis layout scales to wide screens

**Before**: A fixed 25% rail truncated "Apply Symbol St…" on big screens and
stole space on small ones.

**After**: Open a plot at 1920 — the activity rail widens to ~380px and shows
full tool names, with the map keeping the majority. At 1366 the rail stays a
compact ~280px. A previously-saved custom layout is used verbatim.

→ `evidence/screenshots/analysis-1920.png`, `analysis-1366.png`

## P2.2 — Properties discoverable on short laptops

**Before**: At 1280×720 the Properties panel sat below the fold with no hint it
existed.

**After**: Open a plot at 1280×720 and select a feature — the upper activity
sections auto-collapse so Properties is visible and reachable. Nothing is
persisted, manual toggles still win, and at ≥900px tall no adaptation is forced.

→ `evidence/screenshots/properties-720.png`

## P2.3 — Catalog preview row discoverably collapsible

**Before**: The timeline + map preview row could only be hidden via a bare minus
glyph few would recognise as a control.

**After**: Each preview panel carries a labelled "▾ Collapse" control with a
tooltip; collapsing the row lets the exercise list reclaim the space, and an
equally-visible "▴ Show Timeline / Show Map" control restores it. The choice
survives a reload.

→ `evidence/screenshots/catalog-collapse.png`

## P2.4 — Thumbnail S/M/L toggle resizes the list

**Before**: The S/M/L toggle changed an internal value but the list never
visibly resized, and the choice was forgotten on reload.

**After**: Click S, then M, then L — the exercise-list rows (thumbnail + height)
visibly change at each step because the virtualiser re-measures on the height
change. The chosen size persists across reloads.

→ `evidence/screenshots/thumbnail-sizes.png`
