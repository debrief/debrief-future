# Quickstart: Stakeholder Demo UI

## Running locally

Once the demo is implemented, the flow is:

```sh
# From repo root
cd apps/nl-demo

# Copy the current catalog + 188 fixture corpus into ./data/
pnpm run sync-data

# Serve the static directory (any static host works)
python -m http.server 8080
# or
pnpm dlx serve .
```

Open `http://localhost:8080` and try one of 188's supported corpus phrases:

- `UK submarines`
- `German frigates`
- `Type 23 frigates`
- `Exercise Dragonfire`
- `UK submarines during Exercise Northern Edge`

## Running the smoke test

```sh
# From repo root
pnpm --filter @debrief/nl-demo test:e2e
```

This runs the Playwright smoke test which:
1. Spins up a static server for `apps/nl-demo/`.
2. Opens the page, waits for the unfiltered state.
3. Types `UK submarines`, presses Enter.
4. Asserts the chip bar shows nationality=GB + domain=subsurface chips.
5. Asserts the results count reads 18 of 72.
6. Clicks × on the nationality chip.
7. Asserts the results count rises.

## Verifying offline behaviour

1. Load the page with network active.
2. Open browser DevTools → Network tab → tick "Disable cache".
3. Go offline (DevTools → Network → Offline).
4. Reload the page.
5. The page should still work for any cached corpus phrase — the only failure modes are catalog/fixture JSON missing from cache (the demo surfaces a clear error in that case per FR-015).

## Deploying

Deployment extends the existing `demo/` Docker image. See `demo/Dockerfile` and `apps/nl-demo/README.md` (created at implementation time) for the path-based routing setup.

## Troubleshooting

- **Blank page, no errors in console**: Babel standalone probably failed to load. Check CDN URLs in `index.html`.
- **"Failed to load fixture corpus" banner on load**: `apps/nl-demo/data/responses.json` is missing. Run `pnpm run sync-data` from the `apps/nl-demo/` directory.
- **Phrase produces off-corpus banner unexpectedly**: The phrase is not in 188's hand-authored corpus. Either use one of the suggested examples, or (for contributors) add the phrase to 188's corpus and re-sync.
- **Chip colours look wrong**: Check `styles.css` — colour custom properties may have been tweaked. Reference palette is in `specs/189-stakeholder-demo-ui/research.md` §2.
