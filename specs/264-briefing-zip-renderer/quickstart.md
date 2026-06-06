# Quickstart — Air-Gapped Briefing Zip

This is the developer's-eye view of how to build, exercise, and verify
the feature once it lands.

## End-to-end developer flow

```sh
# 1. Build the briefing-renderer SPA static bundle
pnpm --filter @debrief/briefing-renderer build
# Produces: apps/briefing-renderer/dist/{index.html, assets/*}

# 2. Sync the static bundle into the VS Code extension resources
#    (driven by the extension's prepare step; runs automatically as
#    part of `pnpm --filter @debrief/vscode build`)
pnpm --filter @debrief/vscode build

# 3. Launch the extension under web-shell or VS Code dev host with a
#    sample plot containing at least one Storyboard
pnpm --filter @debrief/web-shell dev
# → browse to http://localhost:5173, open a sample plot

# 4. Open the Storyboard overflow menu in the Storyboard panel,
#    invoke "Export Storyboard as briefing zip…", pick a destination.

# 5. Unzip the result; double-click index.html:
#    - In dev: open via `file://` for the production-equivalent test
#    - For CI: serve via `http-server` so Playwright can drive it
```

## Running the SPA locally during development

```sh
cd apps/briefing-renderer
pnpm dev
# Vite serves at http://localhost:5174
# Inject fixture data via the App's `inlineData` prop
# (see apps/briefing-renderer/src/fixtures/dev-fixture.ts)
```

The dev server is for component development only. The production
flow always goes through the export command — the SPA reads inlined
JSON from `index.html`, not from the dev server.

## Running the SPA from `file://` (the real user flow)

```sh
# After step 4 above, you have a zip on disk.
unzip my-briefing.zip -d /tmp/my-briefing
# Open the unzipped index.html in your browser:
xdg-open /tmp/my-briefing/index.html       # Linux
open    /tmp/my-briefing/index.html        # macOS
start   /tmp/my-briefing/index.html        # Windows
```

The SPA loads with no server, no Vite, no Node, no network.

## Running the Playwright test suite

```sh
# Build first (Playwright loads the built dist/)
pnpm --filter @debrief/briefing-renderer build

# Run the briefing-renderer Playwright suite
cd apps/briefing-renderer && node run-playwright.mjs
# Covers:
#   - briefing-zip-file-protocol.spec.ts      (loads from file://)
#   - briefing-zip-network-isolation.spec.ts  (zero external requests)
#   - briefing-zip-playback.spec.ts           (instant + time-range)
#   - briefing-zip-mode-toggle.spec.ts        (10 toggles preserve state)
```

The runner provisions Chromium via `@sparticuz/chromium`, just like
the other apps' Playwright suites.

## Running the export-command unit + integration tests

```sh
pnpm --filter @debrief/vscode test
# Covers:
#   - scopeStoryboard.test.ts
#   - buildItemJson.test.ts
#   - computeTileCoverage.test.ts
#   - exportStoryboardAsBriefingZip.test.ts
#   - export.integration.test.ts
```

Tile fetches are stubbed in tests — no actual network goes out.

## Evidence capture (for the PR)

```sh
# The briefing-zip Playwright suite writes screenshots into:
#   specs/264-briefing-zip-renderer/evidence/screenshots/
#
# Specifically:
#   - briefing-load.png       (SPA on first open, Minimal mode)
#   - briefing-present.png    (SPA in Present mode)
#   - briefing-network.png    (devtools Network panel showing 0 external requests)
#   - briefing-playback.gif   (interaction GIF of a time-range Scene)

# Plus the export command writes a sample zip alongside the screenshots:
#   - sample-briefing.zip
```

## Smoke-test checklist (for the PR reviewer)

Before approving:

- [ ] Unzip `sample-briefing.zip` into a fresh directory.
- [ ] Open `index.html` in current **Chrome** and current **Edge**
  (the two supported browsers — see research.md R6).
- [ ] In each browser, verify the SPA loads, shows Scene 0, and Play works.
- [ ] In each browser, open devtools → Network → confirm **0 external
  requests** during load → play → mode toggle → replay.
- [ ] (Optional sanity check) Open in Firefox or Safari and confirm the
  browser-probe banner appears with the supported-browser message —
  no silent half-loaded UI (Article I.3).
- [ ] Confirm Present mode hides chrome; pressing `P` returns to Minimal
  with playback state preserved.
- [ ] If the sample includes a time-range Scene, confirm the slider
  scrubs and the viewport pans/zooms in lock-step.
- [ ] Re-zip the directory; rename; copy to a path with spaces and
  non-ASCII characters; reopen — still works.

## Known limitations (called out for reviewer)

- **Tile coverage at export time uses the analyst's network.** This is
  the only network involvement; the recipient remains air-gapped.
- **Browser matrix is current Chrome and Edge only** — Firefox, Safari,
  and mobile browsers are out of supported scope (narrowed during
  `/speckit.review`, see research.md R6). The SPA surfaces a
  boot-time banner for any other browser rather than silently
  half-loading.
- **Single Storyboard per zip.** Multi-Storyboard plots produce one
  zip per export invocation.

## Where to look next

- `spec.md` — user-facing requirements and success criteria
- `research.md` — the seven design decisions and their rationale
- `data-model.md` — on-disk artefact contracts and SPA in-memory state
- `contracts/export-command.md` — VS Code command behaviour
- `contracts/spa-loading.md` — SPA boot + playback + mode contracts
- `contracts/tile-coverage.md` — pure tile-coverage algorithm
- `tasks.md` — (generated by `/speckit.tasks`, not yet present)
