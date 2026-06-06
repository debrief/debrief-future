# Quickstart: Verifying the UI Review Follow-up Fixes

How to build, run, and verify each of the six fixes. All steps are offline.

## Prerequisites

```sh
# Build the shared workspace packages the web-shell depends on
pnpm -r --filter '@debrief/utils' --filter '@debrief/schemas' \
  --filter '@debrief/components' --filter '@debrief/session-state' \
  --filter '@debrief/data' build
```

## Run the web-shell

```sh
cd apps/web-shell && pnpm dev      # http://localhost:5173
```

## Manual verification per item

### P1.3 — HC-light header links
1. Open the web-shell; switch the theme to **high-contrast light**.
2. Look at the top-right links ("Component Storybook →", "VS Code Preview →",
   "⚙ Edit Backlog →").
3. **Expect**: clearly readable dark links with an underline; not faint blue on
   near-white.

### P2.1 — Wide-screen analysis layout
1. Open a plot (e.g. a Saxon Warrior dataset) at a 1920×1080 window.
2. **Expect**: the activity column shows full tool names (e.g. "Apply Symbol
   Style") without truncation; the map keeps the majority of the width.
3. Narrow the window to ~1280 and Reset Layout → the rail is ~280px, map keeps
   the majority.

### P2.2 — Properties at 720-tall
1. Resize the window to ~1280×720, open a plot, select a feature.
2. **Expect**: the Properties panel is visible/reachable without you having to
   know the activity column scrolls (upper sections auto-collapse on short
   screens).

### P2.3 — Catalog timeline+map collapse
1. On the catalog, find the clearly-labelled collapse control on the
   timeline+map row; activate it.
2. **Expect**: the row collapses and the exercise list expands. A visible restore
   control brings it back. Reload → your choice is remembered.

### P2.4 — Thumbnail size toggle
1. On the catalog exercise list, click **L**, then **M**, then **S**.
2. **Expect**: list items (thumbnail + row height) visibly change size at each
   step. Reload → the chosen size is remembered.

## Automated verification (Playwright — works in cloud sessions)

```sh
cd apps/web-shell

# P1.4 — de-flaked properties screenshots (run repeatedly, retries off)
node run-playwright.mjs properties-screenshots

# P1.3 — HC-light contrast audit
node run-playwright.mjs ui-review-contrast

# P2.1 / P2.2 — layout scaling + Properties reachability at multiple viewports
node run-playwright.mjs ui-review-layout

# P2.3 / P2.4 — catalog collapse + thumbnail resize
node run-playwright.mjs ui-review-catalog
```

Screenshots land in `specs/281-ui-review-p1-p2-fixes/evidence/screenshots/`.

### Flake check (P1.4 — must be 10/10)
```sh
cd apps/web-shell
for i in $(seq 1 10); do \
  node run-playwright.mjs properties-screenshots || { echo "FAILED on run $i"; break; }; \
done
```

## Unit tests

```sh
# Layout builder + persistence version guard
pnpm --filter @debrief/components test -- defaultLayout
pnpm --filter @debrief/components test -- layoutPersistence
```

## Full CI gate before pushing

```sh
task verify        # lint + typecheck + test (or the 4-step fallback in CLAUDE.md)
```
